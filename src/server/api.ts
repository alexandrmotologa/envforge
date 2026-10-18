import path from 'node:path';
import fs from 'node:fs';
import Fastify, { FastifyInstance, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { discoverEnvironmentSources } from '../parsers/detector.js';
import { scanCodebase } from '../scanner/orchestrator.js';
import { buildParityMatrix } from '../matrix/comparator.js';
import { compareTwoEnvironments } from '../matrix/diff.js';
import { generateZodSchema } from '../generator/zod.js';
import { generateTypeScriptDeclarations } from '../generator/typescript.js';
import { generateJsonSchema } from '../generator/json_schema.js';
import { generateEnvExample } from '../generator/example.js';
import { generateT3EnvSchema } from '../generator/t3_env.js';
import { generatePydanticSettings } from '../generator/pydantic.js';
import { generateValibotSchema } from '../generator/valibot.js';
import { appendMissingKeysToEnvFile, getMissingKeysForEnv, updateOrInsertEnvVariable } from '../generator/sync.js';
import { startWorkspaceWatcher } from './watcher.js';
import { ParityReport, CodeReference } from '../types/index.js';

export interface ServerOptions {
  workspacePath: string;
  port?: number;
  host?: string;
  enableWatcher?: boolean;
}

export async function createServer(options: ServerOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const workspacePath = path.resolve(options.workspacePath || process.cwd());

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  let cachedReport: ParityReport | null = null;
  let cachedRefs: Map<string, CodeReference[]> = new Map();
  const sseClients = new Set<FastifyReply>();

  function broadcastSSE(data: any) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try {
        client.raw.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  async function performScan(): Promise<ParityReport> {
    const sources = await discoverEnvironmentSources(workspacePath);
    cachedRefs = await scanCodebase(workspacePath);
    cachedReport = buildParityMatrix(sources, cachedRefs, workspacePath);
    return cachedReport;
  }

  // Initial scan
  await performScan();

  // Initialize workspace watcher
  if (options.enableWatcher !== false) {
    startWorkspaceWatcher({
      workspacePath,
      onChanged: async (changedFile) => {
        try {
          const updated = await performScan();
          broadcastSSE({
            type: 'scan_updated',
            changedFile,
            report: updated,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Error during live scan on file change:', err);
        }
      },
    });
  }

  // GET /api/events (SSE)
  app.get('/api/events', async (req, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial ping
    reply.raw.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
    sseClients.add(reply);

    req.raw.on('close', () => {
      sseClients.delete(reply);
    });

    // Keep connection alive
    const keepAlive = setInterval(() => {
      try {
        reply.raw.write(`: keepalive\n\n`);
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(reply);
      }
    }, 20000);

    return new Promise(() => {}); // Keep connection open
  });

  // GET /api/matrix
  app.get('/api/matrix', async () => {
    if (!cachedReport) {
      await performScan();
    }
    return cachedReport;
  });

  // GET /api/diff
  app.get<{ Querystring: { envA?: string; envB?: string } }>('/api/diff', async (req, reply) => {
    if (!cachedReport) {
      await performScan();
    }
    const envA = req.query.envA || cachedReport!.environments[0] || 'local';
    const envB = req.query.envB || cachedReport!.environments[1] || 'production';

    const diff = compareTwoEnvironments(cachedReport!, envA, envB);
    return diff;
  });

  // GET /api/references
  app.get('/api/references', async () => {
    const refsObj: Record<string, CodeReference[]> = {};
    for (const [key, refs] of cachedRefs.entries()) {
      refsObj[key] = refs;
    }
    return { references: refsObj };
  });

  // GET /api/schemas
  app.get('/api/schemas', async () => {
    if (!cachedReport) {
      await performScan();
    }
    const rows = cachedReport!.rows;
    return {
      zod: generateZodSchema(rows),
      typescript: generateTypeScriptDeclarations(rows),
      json: generateJsonSchema(rows),
      example: generateEnvExample(rows),
      t3: generateT3EnvSchema(rows),
      pydantic: generatePydanticSettings(rows),
      valibot: generateValibotSchema(rows),
    };
  });

  // PUT /api/matrix/cell (In-place edit)
  app.put<{ Body: { envName: string; key: string; value: string; filePath?: string } }>(
    '/api/matrix/cell',
    async (req, reply) => {
      const { envName, key, value, filePath } = req.body || {};
      if (!envName || !key || value === undefined) {
        return reply.status(400).send({ error: 'envName, key, and value are required' });
      }

      let targetFile = filePath;
      if (!targetFile) {
        if (envName === 'example') {
          targetFile = path.join(workspacePath, '.env.example');
        } else if (envName === 'local') {
          targetFile = fs.existsSync(path.join(workspacePath, '.env.local'))
            ? path.join(workspacePath, '.env.local')
            : path.join(workspacePath, '.env');
        } else {
          targetFile = path.join(workspacePath, `.env.${envName}`);
        }
      } else {
        targetFile = path.resolve(workspacePath, targetFile);
      }

      const res = updateOrInsertEnvVariable(targetFile, key, value);
      await performScan();

      broadcastSSE({
        type: 'scan_updated',
        report: cachedReport,
        action: 'cell_updated',
        key,
        envName,
      });

      return {
        message: `Successfully ${res.action} "${key}" in ${path.basename(res.filePath)}`,
        action: res.action,
        updatedReport: cachedReport,
      };
    }
  );

  // POST /api/sync
  app.post<{ Body: { targetEnv: string; filePath?: string } }>('/api/sync', async (req, reply) => {
    const { targetEnv, filePath } = req.body || {};
    if (!targetEnv) {
      return reply.status(400).send({ error: 'targetEnv is required' });
    }

    if (!cachedReport) {
      await performScan();
    }

    const missingKeys = getMissingKeysForEnv(cachedReport!.rows, targetEnv);
    if (missingKeys.length === 0) {
      return { message: `No missing keys to sync for environment "${targetEnv}"`, added: [] };
    }

    let targetFile = filePath;
    if (!targetFile) {
      if (targetEnv === 'example') {
        targetFile = path.join(workspacePath, '.env.example');
      } else {
        targetFile = path.join(workspacePath, `.env.${targetEnv}`);
      }
    } else {
      targetFile = path.resolve(workspacePath, targetFile);
    }

    const res = appendMissingKeysToEnvFile(targetFile, missingKeys);
    await performScan();

    broadcastSSE({
      type: 'scan_updated',
      report: cachedReport,
      action: 'sync_applied',
      targetEnv,
    });

    return {
      message: `Successfully synchronized ${res.added.length} keys to ${path.basename(res.filePath)}`,
      added: res.added,
      filePath: res.filePath,
      updatedReport: cachedReport,
    };
  });

  // POST /api/export
  app.post<{ Body: { type: string; targetPath: string } }>('/api/export', async (req, reply) => {
    const { type, targetPath } = req.body || {};
    if (!type || !targetPath) {
      return reply.status(400).send({ error: 'type and targetPath are required' });
    }

    if (!cachedReport) {
      await performScan();
    }

    const rows = cachedReport!.rows;
    let content = '';

    switch (type) {
      case 'zod':
        content = generateZodSchema(rows);
        break;
      case 'typescript':
        content = generateTypeScriptDeclarations(rows);
        break;
      case 'json':
        content = generateJsonSchema(rows);
        break;
      case 'example':
        content = generateEnvExample(rows);
        break;
      case 't3':
        content = generateT3EnvSchema(rows);
        break;
      case 'pydantic':
        content = generatePydanticSettings(rows);
        break;
      case 'valibot':
        content = generateValibotSchema(rows);
        break;
      default:
        return reply.status(400).send({ error: `Unknown schema type: ${type}` });
    }

    const fullPath = path.resolve(workspacePath, targetPath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf8');

    return {
      message: `Successfully exported ${type} schema to ${targetPath}`,
      path: fullPath,
    };
  });

  // POST /api/rescan
  app.post('/api/rescan', async () => {
    const report = await performScan();
    broadcastSSE({
      type: 'scan_updated',
      report,
    });
    return {
      message: 'Workspace rescan complete',
      report,
    };
  });

  return app;
}

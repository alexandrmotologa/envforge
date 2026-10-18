import path from 'node:path';
import fs from 'node:fs';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { discoverEnvironmentSources } from '../parsers/detector.js';
import { scanCodebase } from '../scanner/orchestrator.js';
import { buildParityMatrix } from '../matrix/comparator.js';
import { generateZodSchema } from '../generator/zod.js';
import { generateTypeScriptDeclarations } from '../generator/typescript.js';
import { generateJsonSchema } from '../generator/json_schema.js';
import { generateEnvExample } from '../generator/example.js';
import { appendMissingKeysToEnvFile, getMissingKeysForEnv } from '../generator/sync.js';
import { ParityReport, CodeReference } from '../types/index.js';

export interface ServerOptions {
  workspacePath: string;
  port?: number;
  host?: string;
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

  async function performScan(): Promise<ParityReport> {
    const sources = await discoverEnvironmentSources(workspacePath);
    cachedRefs = await scanCodebase(workspacePath);
    cachedReport = buildParityMatrix(sources, cachedRefs, workspacePath);
    return cachedReport;
  }

  // Initial scan
  await performScan();

  // GET /api/matrix
  app.get('/api/matrix', async () => {
    if (!cachedReport) {
      await performScan();
    }
    return cachedReport;
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
    };
  });

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

    // Resolve target file path
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

    return {
      message: `Successfully synchronized ${res.added.length} keys to ${path.basename(res.filePath)}`,
      added: res.added,
      filePath: res.filePath,
      updatedReport: cachedReport,
    };
  });

  // POST /api/export
  app.post<{ Body: { type: 'zod' | 'typescript' | 'json' | 'example'; targetPath: string } }>('/api/export', async (req, reply) => {
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
    return {
      message: 'Workspace rescan complete',
      report,
    };
  });

  return app;
}

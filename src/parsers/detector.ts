import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { ConfigFormat, EnvironmentSource, EnvEntry } from '../types/index.js';
import { parseDotenv } from './dotenv.js';
import { parseDockerCompose } from './compose.js';
import { parseKubernetes } from './kubernetes.js';
import { parseTerraformVars } from './terraform.js';

export interface DiscoverOptions {
  cwd?: string;
  ignore?: string[];
}

export function inferEnvironmentName(filename: string): string {
  const base = path.basename(filename).toLowerCase();

  if (base.includes('example') || base.includes('sample') || base.includes('template')) {
    return 'example';
  }
  if (base.includes('prod') || base.includes('production')) {
    return 'production';
  }
  if (base.includes('stage') || base.includes('staging')) {
    return 'staging';
  }
  if (base.includes('dev') || base.includes('development')) {
    return 'development';
  }
  if (base.includes('test')) {
    return 'test';
  }
  if (base.includes('local')) {
    return 'local';
  }
  if (base === '.env') {
    return 'local';
  }
  if (base.includes('compose')) {
    return 'compose';
  }
  return base.replace(/^\./, '').replace(/\.[^/.]+$/, '');
}

export async function discoverEnvironmentSources(
  dirPath: string,
  options: DiscoverOptions = {}
): Promise<EnvironmentSource[]> {
  const cwd = path.resolve(options.cwd || dirPath);
  const ignorePatterns = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    ...(options.ignore || []),
  ];

  const searchPatterns = [
    '**/.env*',
    '**/docker-compose*.yml',
    '**/docker-compose*.yaml',
    '**/compose*.yml',
    '**/compose*.yaml',
    '**/*.tfvars',
    '**/*.tfvars.json',
    '**/*k8s*.yaml',
    '**/*k8s*.yml',
    '**/k8s/**/*.yaml',
    '**/k8s/**/*.yml',
    '**/deploy/**/*.yaml',
    '**/deploy/**/*.yml',
    '**/manifests/**/*.yaml',
    '**/manifests/**/*.yml',
  ];

  const files = await fg(searchPatterns, {
    cwd,
    ignore: ignorePatterns,
    dot: true,
    absolute: true,
  });

  const sources: EnvironmentSource[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const relativePath = path.relative(cwd, file);
    const basename = path.basename(file).toLowerCase();
    let format: ConfigFormat = 'dotenv';
    let entries = new Map<string, EnvEntry>();

    if (basename.includes('compose')) {
      format = 'docker-compose';
      entries = parseDockerCompose(content, relativePath);
    } else if (basename.endsWith('.tfvars') || basename.endsWith('.tfvars.json')) {
      format = 'terraform';
      entries = parseTerraformVars(content, relativePath);
    } else if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      if (content.includes('kind: ConfigMap') || content.includes('kind: Secret')) {
        format = 'kubernetes';
        entries = parseKubernetes(content, relativePath);
      } else {
        continue;
      }
    } else if (basename.startsWith('.env') || basename.endsWith('.env')) {
      format = 'dotenv';
      entries = parseDotenv(content, relativePath);
    }

    if (entries.size > 0 || basename.includes('example') || basename.startsWith('.env')) {
      const envName = inferEnvironmentName(relativePath);
      sources.push({
        name: envName,
        filePath: relativePath,
        format,
        entries,
      });
    }
  }

  // Ensure consistent sorting: example, local, development, staging, production, others
  const priorityOrder = ['example', 'local', 'development', 'staging', 'production'];
  sources.sort((a, b) => {
    const idxA = priorityOrder.indexOf(a.name);
    const idxB = priorityOrder.indexOf(b.name);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  return sources;
}

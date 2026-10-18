import { parse as parseYaml } from 'yaml';
import { EnvEntry } from '../types/index.js';
import { inferType } from '../matrix/type_infer.js';

export function parseDockerCompose(
  content: string,
  sourceFile: string = 'docker-compose.yml'
): Map<string, EnvEntry> {
  const result = new Map<string, EnvEntry>();

  let parsed: any;
  try {
    parsed = parseYaml(content);
  } catch (err) {
    return result;
  }

  if (!parsed || typeof parsed !== 'object' || !parsed.services || typeof parsed.services !== 'object') {
    return result;
  }

  for (const [serviceName, serviceConfig] of Object.entries(parsed.services)) {
    if (!serviceConfig || typeof serviceConfig !== 'object') {
      continue;
    }

    const env = (serviceConfig as any).environment;
    if (!env) {
      continue;
    }

    if (Array.isArray(env)) {
      // List syntax: - PORT=3000 or - DEBUG
      for (const item of env) {
        if (typeof item !== 'string') continue;
        const eqIdx = item.indexOf('=');
        let key = '';
        let val = '';
        if (eqIdx === -1) {
          key = item.trim();
          val = 'true'; // Flag without value
        } else {
          key = item.substring(0, eqIdx).trim();
          val = item.substring(eqIdx + 1).trim();
        }

        if (key && !result.has(key)) {
          result.set(key, {
            key,
            value: val,
            rawValue: item,
            type: inferType(val, key),
            sourceFile,
            format: 'docker-compose',
            comment: `From service: ${serviceName}`,
          });
        }
      }
    } else if (typeof env === 'object') {
      // Map syntax: PORT: 3000
      for (const [key, rawVal] of Object.entries(env)) {
        if (!key) continue;
        const strVal = rawVal === null || rawVal === undefined ? '' : String(rawVal);
        if (!result.has(key)) {
          result.set(key, {
            key,
            value: strVal,
            rawValue: strVal,
            type: inferType(strVal, key),
            sourceFile,
            format: 'docker-compose',
            comment: `From service: ${serviceName}`,
          });
        }
      }
    }
  }

  return result;
}

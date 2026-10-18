import { parseAllDocuments } from 'yaml';
import { EnvEntry } from '../types/index.js';
import { inferType } from '../matrix/type_infer.js';

export function parseKubernetes(
  content: string,
  sourceFile: string = 'k8s.yaml'
): Map<string, EnvEntry> {
  const result = new Map<string, EnvEntry>();

  let docs: any[];
  try {
    docs = parseAllDocuments(content);
  } catch {
    return result;
  }

  for (const doc of docs) {
    const json = doc.toJSON();
    if (!json || typeof json !== 'object') {
      continue;
    }

    const kind = json.kind;
    const name = json.metadata?.name || 'unknown';
    const namespace = json.metadata?.namespace || 'default';

    if (kind === 'ConfigMap') {
      const data = json.data;
      if (data && typeof data === 'object') {
        for (const [key, rawVal] of Object.entries(data)) {
          if (!key) continue;
          const val = String(rawVal ?? '');
          if (!result.has(key)) {
            result.set(key, {
              key,
              value: val,
              rawValue: val,
              type: inferType(val, key),
              sourceFile,
              format: 'kubernetes',
              comment: `ConfigMap: ${namespace}/${name}`,
            });
          }
        }
      }
    } else if (kind === 'Secret') {
      // Decode data (base64)
      const data = json.data;
      if (data && typeof data === 'object') {
        for (const [key, rawVal] of Object.entries(data)) {
          if (!key) continue;
          let decoded = '';
          try {
            decoded = Buffer.from(String(rawVal), 'base64').toString('utf8');
          } catch {
            decoded = String(rawVal);
          }

          if (!result.has(key)) {
            result.set(key, {
              key,
              value: decoded,
              rawValue: String(rawVal),
              type: inferType(decoded, key),
              sourceFile,
              format: 'kubernetes',
              comment: `Secret (base64 decoded): ${namespace}/${name}`,
            });
          }
        }
      }

      // stringData (unencoded plaintext)
      const stringData = json.stringData;
      if (stringData && typeof stringData === 'object') {
        for (const [key, rawVal] of Object.entries(stringData)) {
          if (!key) continue;
          const val = String(rawVal ?? '');
          if (!result.has(key)) {
            result.set(key, {
              key,
              value: val,
              rawValue: val,
              type: inferType(val, key),
              sourceFile,
              format: 'kubernetes',
              comment: `Secret (stringData): ${namespace}/${name}`,
            });
          }
        }
      }
    }
  }

  return result;
}

import fs from 'node:fs';
import { ParityMatrixRow } from '../types/index.js';

export interface SyncKeyItem {
  key: string;
  defaultValue?: string;
  comment?: string;
}

export function appendMissingKeysToEnvFile(
  filePath: string,
  keysToAdd: SyncKeyItem[]
): { added: string[]; filePath: string } {
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
  }

  const existingKeys = new Set<string>();
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        existingKeys.add(trimmed.substring(0, eqIdx).trim());
      }
    }
  }

  const newLines: string[] = [];
  const added: string[] = [];

  for (const item of keysToAdd) {
    if (!existingKeys.has(item.key)) {
      if (item.comment) {
        newLines.push(`# ${item.comment}`);
      }
      newLines.push(`${item.key}=${item.defaultValue ?? ''}`);
      added.push(item.key);
    }
  }

  if (newLines.length > 0) {
    const separator = content.endsWith('\n') || content === '' ? '' : '\n';
    const updated = content + separator + newLines.join('\n') + '\n';
    fs.writeFileSync(filePath, updated, 'utf8');
  }

  return { added, filePath };
}

export function getMissingKeysForEnv(
  rows: ParityMatrixRow[],
  targetEnv: string
): SyncKeyItem[] {
  const missing: SyncKeyItem[] = [];

  for (const row of rows) {
    const cell = row.environments[targetEnv];
    if (!cell || cell.status === 'MISSING') {
      missing.push({
        key: row.key,
        defaultValue: row.suggestedDefault || '',
        comment: row.description || `Inferred type: ${row.inferredType}`,
      });
    }
  }

  return missing;
}

export function updateOrInsertEnvVariable(
  filePath: string,
  key: string,
  value: string
): { success: boolean; action: 'updated' | 'inserted'; filePath: string } {
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
  }

  const lines = content.split(/\r?\n/);
  let updated = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const lineKey = line.substring(0, eqIdx).trim();
        if (lineKey === key) {
          // Check for existing inline comment
          const commentMatch = line.substring(eqIdx + 1).match(/\s+(#.*)$/);
          const inlineComment = commentMatch ? commentMatch[1] : '';
          const quote = value.includes(' ') || value.includes('\n') ? '"' : '';
          lines[i] = `${key}=${quote}${value}${quote}${inlineComment ? ' ' + inlineComment : ''}`;
          updated = true;
          break;
        }
      }
    }
  }

  if (!updated) {
    const quote = value.includes(' ') || value.includes('\n') ? '"' : '';
    lines.push(`${key}=${quote}${value}${quote}`);
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return { success: true, action: updated ? 'updated' : 'inserted', filePath };
}

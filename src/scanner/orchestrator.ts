import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { CodeReference } from '../types/index.js';
import { scanJsTsCode } from './js_scanner.js';
import { scanPythonCode } from './python_scanner.js';
import { scanGoCode } from './go_scanner.js';

export interface ScanOptions {
  cwd?: string;
  ignore?: string[];
}

export async function scanCodebase(
  dirPath: string,
  options: ScanOptions = {}
): Promise<Map<string, CodeReference[]>> {
  const cwd = path.resolve(options.cwd || dirPath);
  const referencesByVar = new Map<string, CodeReference[]>();

  const ignorePatterns = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/web/dist/**',
    '**/tests/fixtures/**',
    ...(options.ignore || []),
  ];

  const codeFiles = await fg(
    ['**/*.{ts,tsx,js,jsx,mjs,cjs,py,go}'],
    {
      cwd,
      ignore: ignorePatterns,
      absolute: true,
      dot: false,
    }
  );

  for (const file of codeFiles) {
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const relativePath = path.relative(cwd, file);
    const ext = path.extname(file).toLowerCase();
    let fileRefs: CodeReference[] = [];

    if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
      fileRefs = scanJsTsCode(content, relativePath);
    } else if (ext === '.py') {
      fileRefs = scanPythonCode(content, relativePath);
    } else if (ext === '.go') {
      fileRefs = scanGoCode(content, relativePath);
    }

    for (const ref of fileRefs) {
      const existing = referencesByVar.get(ref.variable) || [];
      existing.push(ref);
      referencesByVar.set(ref.variable, existing);
    }
  }

  return referencesByVar;
}

export function findGhostVariables(
  codeRefs: Map<string, CodeReference[]>,
  declaredKeys: Set<string>
): string[] {
  const ghosts: string[] = [];
  for (const [varName] of codeRefs.entries()) {
    if (!declaredKeys.has(varName)) {
      ghosts.push(varName);
    }
  }
  return ghosts.sort();
}

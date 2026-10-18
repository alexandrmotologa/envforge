import { CodeReference } from '../types/index.js';

export function scanGoCode(code: string, filePath: string): CodeReference[] {
  const references: CodeReference[] = [];
  const lines = code.split(/\r?\n/);

  // Regex matching os.Getenv("VAR") or os.LookupEnv("VAR")
  const regex = /os\.(?:Getenv|LookupEnv)\(["']([A-Za-z_][A-Za-z0-9_]*)["']\)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      continue;
    }

    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      const varName = match[1];
      if (varName) {
        references.push({
          filePath,
          line: i + 1,
          column: match.index,
          variable: varName,
          language: 'go',
          snippet: trimmed,
        });
      }
    }
  }

  return references;
}

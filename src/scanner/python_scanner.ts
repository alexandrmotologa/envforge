import { CodeReference } from '../types/index.js';

export function scanPythonCode(code: string, filePath: string): CodeReference[] {
  const references: CodeReference[] = [];
  const lines = code.split(/\r?\n/);

  // Regex matching os.environ["VAR"], os.environ.get("VAR"), os.getenv("VAR")
  const regex = /os\.(?:environ\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]|environ\.get\(['"]([A-Za-z_][A-Za-z0-9_]*)['"]|getenv\(['"]([A-Za-z_][A-Za-z0-9_]*)['"]\))/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      continue;
    }

    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      const varName = match[1] || match[2] || match[3];
      if (varName) {
        references.push({
          filePath,
          line: i + 1,
          column: match.index,
          variable: varName,
          language: 'python',
          snippet: trimmed,
        });
      }
    }
  }

  return references;
}

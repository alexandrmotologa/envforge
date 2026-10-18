import { describe, it, expect } from 'vitest';
import { scanJsTsCode } from '../src/scanner/js_scanner.js';
import { scanPythonCode } from '../src/scanner/python_scanner.js';
import { scanGoCode } from '../src/scanner/go_scanner.js';
import { findGhostVariables } from '../src/scanner/orchestrator.js';

describe('js/ts scanner', () => {
  it('detects process.env member expressions and brackets', () => {
    const code = `
const port = process.env.PORT || 3000;
const dbUrl = process.env['DATABASE_URL'];
const token = process.env?.API_KEY;
`;
    const refs = scanJsTsCode(code, 'src/server.ts');
    const vars = refs.map((r) => r.variable);

    expect(vars).toContain('PORT');
    expect(vars).toContain('DATABASE_URL');
    expect(vars).toContain('API_KEY');
    expect(refs[0].language).toBe('typescript');
  });

  it('detects destructuring from process.env', () => {
    const code = `
const { NODE_ENV, REDIS_HOST = 'localhost', REDIS_PORT } = process.env;
`;
    const refs = scanJsTsCode(code, 'src/config.js');
    const vars = refs.map((r) => r.variable);

    expect(vars).toContain('NODE_ENV');
    expect(vars).toContain('REDIS_HOST');
    expect(vars).toContain('REDIS_PORT');
  });

  it('detects Vite import.meta.env references', () => {
    const code = `
const title = import.meta.env.VITE_APP_TITLE;
const apiUrl = import.meta.env['VITE_API_URL'];
`;
    const refs = scanJsTsCode(code, 'src/client.tsx');
    const vars = refs.map((r) => r.variable);

    expect(vars).toContain('VITE_APP_TITLE');
    expect(vars).toContain('VITE_API_URL');
  });
});

describe('python scanner', () => {
  it('detects os.environ and os.getenv patterns', () => {
    const code = `
import os

db_pass = os.environ["DB_PASSWORD"]
bucket = os.environ.get('S3_BUCKET', 'my-bucket')
secret = os.getenv("JWT_SECRET")
# os.getenv("COMMENTED_VAR")
`;
    const refs = scanPythonCode(code, 'app/main.py');
    const vars = refs.map((r) => r.variable);

    expect(vars).toContain('DB_PASSWORD');
    expect(vars).toContain('S3_BUCKET');
    expect(vars).toContain('JWT_SECRET');
    expect(vars).not.toContain('COMMENTED_VAR');
  });
});

describe('go scanner', () => {
  it('detects os.Getenv and os.LookupEnv patterns', () => {
    const code = `
package main
import "os"

func main() {
    port := os.Getenv("SERVICE_PORT")
    db, exists := os.LookupEnv("DB_URI")
    // os.Getenv("COMMENTED_GO_VAR")
}
`;
    const refs = scanGoCode(code, 'cmd/main.go');
    const vars = refs.map((r) => r.variable);

    expect(vars).toContain('SERVICE_PORT');
    expect(vars).toContain('DB_URI');
    expect(vars).not.toContain('COMMENTED_GO_VAR');
  });
});

describe('ghost variables detection', () => {
  it('identifies undeclared variables in source code', () => {
    const refsMap = new Map([
      ['PORT', [{ filePath: 'src/index.ts', line: 10, column: 5, variable: 'PORT', language: 'typescript' as const, snippet: 'PORT' }]],
      ['UNDECLARED_SECRET', [{ filePath: 'src/auth.ts', line: 20, column: 5, variable: 'UNDECLARED_SECRET', language: 'typescript' as const, snippet: 'UNDECLARED_SECRET' }]],
    ]);

    const declared = new Set(['PORT', 'DATABASE_URL']);
    const ghosts = findGhostVariables(refsMap, declared);

    expect(ghosts).toEqual(['UNDECLARED_SECRET']);
  });
});

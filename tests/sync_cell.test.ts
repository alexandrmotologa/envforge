import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { updateOrInsertEnvVariable } from '../src/generator/sync.js';

describe('In-place Environment Variable Editor', () => {
  let tmpDir: string;
  let testEnvFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envforge-test-'));
    testEnvFile = path.join(tmpDir, '.env.test');
    fs.writeFileSync(
      testEnvFile,
      `# Test environment configuration\nPORT=3000\nDATABASE_URL=postgres://localhost:5432/db\n`,
      'utf8'
    );
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('updates an existing variable in place while preserving comments and order', () => {
    updateOrInsertEnvVariable(testEnvFile, 'PORT', '8080');

    const content = fs.readFileSync(testEnvFile, 'utf8');
    expect(content).toContain('PORT=8080');
    expect(content).toContain('# Test environment configuration');
    expect(content).toContain('DATABASE_URL=postgres://localhost:5432/db');
  });

  it('quotes values with spaces or special characters', () => {
    updateOrInsertEnvVariable(testEnvFile, 'APP_TITLE', 'My Awesome App');

    const content = fs.readFileSync(testEnvFile, 'utf8');
    expect(content).toContain('APP_TITLE="My Awesome App"');
  });

  it('appends a new variable if it does not exist', () => {
    updateOrInsertEnvVariable(testEnvFile, 'NEW_FEATURE_FLAG', 'true');

    const content = fs.readFileSync(testEnvFile, 'utf8');
    expect(content).toContain('PORT=3000');
    expect(content).toContain('NEW_FEATURE_FLAG=true');
  });
});

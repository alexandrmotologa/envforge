import { describe, it, expect } from 'vitest';
import { generateZodSchema } from '../src/generator/zod.js';
import { generateTypeScriptDeclarations } from '../src/generator/typescript.js';
import { generateJsonSchema } from '../src/generator/json_schema.js';
import { generateEnvExample } from '../src/generator/example.js';
import { ParityMatrixRow } from '../src/types/index.js';

describe('generator suite', () => {
  const sampleRows: ParityMatrixRow[] = [
    {
      key: 'PORT',
      inferredType: 'port',
      suggestedDefault: '3000',
      description: 'HTTP server port',
      environments: {
        local: { status: 'OK', value: '3000' },
        production: { status: 'OK', value: '8080' },
      },
      codeReferences: [],
      isOrphaned: false,
      isUndeclared: false,
    },
    {
      key: 'DATABASE_URL',
      inferredType: 'url',
      description: 'PostgreSQL connection URI',
      environments: {
        local: { status: 'OK', value: 'postgres://localhost/db' },
        production: { status: 'OK', value: 'postgres://prod/db' },
      },
      codeReferences: [],
      isOrphaned: false,
      isUndeclared: false,
    },
    {
      key: 'OPTIONAL_FLAG',
      inferredType: 'boolean',
      environments: {
        local: { status: 'OK', value: 'true' },
        production: { status: 'MISSING' },
      },
      codeReferences: [],
      isOrphaned: false,
      isUndeclared: false,
    },
  ];

  it('generates executable Zod schema module', () => {
    const zodCode = generateZodSchema(sampleRows);
    expect(zodCode).toContain('export const envSchema = z.object({');
    expect(zodCode).toContain('PORT: z.coerce.number().int().min(1).max(65535).default(3000),');
    expect(zodCode).toContain('DATABASE_URL: z.string().url(),');
    expect(zodCode).toContain('OPTIONAL_FLAG: z.coerce.boolean().optional(),');
    expect(zodCode).toContain('export const env = validateEnv();');
  });

  it('generates TypeScript ProcessEnv declarations', () => {
    const tsCode = generateTypeScriptDeclarations(sampleRows);
    expect(tsCode).toContain('declare global');
    expect(tsCode).toContain('interface ProcessEnv');
    expect(tsCode).toContain('PORT?: string;');
    expect(tsCode).toContain('DATABASE_URL?: string;');
  });

  it('generates JSON Schema draft-07', () => {
    const jsonStr = generateJsonSchema(sampleRows);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.$schema).toContain('json-schema.org');
    expect(parsed.properties.PORT.type).toBe('number');
    expect(parsed.properties.PORT.minimum).toBe(1);
    expect(parsed.properties.DATABASE_URL.format).toBe('uri');
  });

  it('generates sanitized .env.example with comments', () => {
    const example = generateEnvExample(sampleRows);
    expect(example).toContain('PORT=3000');
    expect(example).toContain('DATABASE_URL=https://api.example.com');
    expect(example).toContain('# HTTP server port');
  });
});

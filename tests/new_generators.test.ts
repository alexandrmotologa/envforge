import { describe, it, expect } from 'vitest';
import { generateT3EnvSchema } from '../src/generator/t3_env.js';
import { generatePydanticSettings } from '../src/generator/pydantic.js';
import { generateValibotSchema } from '../src/generator/valibot.js';
import { ParityMatrixRow } from '../src/types/index.js';

describe('Modern Schema Generators (T3-Env, Pydantic, Valibot)', () => {
  const sampleRows: ParityMatrixRow[] = [
    {
      key: 'DATABASE_URL',
      inferredType: 'url',
      description: 'Primary postgres database connection string',
      environments: {
        prod: { key: 'DATABASE_URL', value: 'postgres://db:5432/db', rawValue: 'postgres://db:5432/db', type: 'url', sourceFile: '.env.prod', format: 'dotenv', status: 'OK' },
      },
      codeReferences: [],
      isOrphaned: false,
      isUndeclared: false,
    },
    {
      key: 'NEXT_PUBLIC_API_URL',
      inferredType: 'url',
      environments: {
        prod: { key: 'NEXT_PUBLIC_API_URL', value: 'https://api.example.com', rawValue: 'https://api.example.com', type: 'url', sourceFile: '.env.prod', format: 'dotenv', status: 'OK' },
      },
      codeReferences: [],
      isOrphaned: false,
      isUndeclared: false,
    },
    {
      key: 'PORT',
      inferredType: 'port',
      suggestedDefault: '3000',
      environments: {
        prod: { key: 'PORT', value: '3000', rawValue: '3000', type: 'port', sourceFile: '.env.prod', format: 'dotenv', status: 'OK' },
      },
      codeReferences: [],
      isOrphaned: false,
      isUndeclared: false,
    },
    {
      key: 'STRIPE_SECRET_KEY',
      inferredType: 'string',
      secretFinding: {
        ruleId: 'stripe-secret',
        ruleName: 'Stripe Secret Key',
        severity: 'CRITICAL',
        valueMasked: 'sk_live_****',
        environment: 'prod',
        filePath: '.env.prod',
      },
      environments: {
        prod: { key: 'STRIPE_SECRET_KEY', value: 'sk_live_123', rawValue: 'sk_live_123', type: 'string', sourceFile: '.env.prod', format: 'dotenv', status: 'OK' },
      },
      codeReferences: [],
      isOrphaned: false,
      isUndeclared: false,
    },
  ];

  it('generates T3-Env schema with client/server split', () => {
    const code = generateT3EnvSchema(sampleRows, { framework: 'nextjs' });
    expect(code).toContain("import { createEnv } from '@t3-oss/env-nextjs';");
    expect(code).toContain("server: {");
    expect(code).toContain("DATABASE_URL: z.string().url(),");
    expect(code).toContain("clientPrefix: 'NEXT_PUBLIC_',");
    expect(code).toContain("client: {");
    expect(code).toContain("NEXT_PUBLIC_API_URL: z.string().url(),");
    expect(code).toContain("runtimeEnv: process.env,");
  });

  it('generates Python Pydantic Settings class with BaseSettings', () => {
    const code = generatePydanticSettings(sampleRows, { className: 'AppSettings' });
    expect(code).toContain('from pydantic_settings import BaseSettings, SettingsConfigDict');
    expect(code).toContain('from pydantic import Field, SecretStr');
    expect(code).toContain('class AppSettings(BaseSettings):');
    expect(code).toContain('DATABASE_URL: str = Field(..., description="Primary postgres database connection string")');
    expect(code).toContain('PORT: int = Field(default=3000, ge=1, le=65535)');
    expect(code).toContain('STRIPE_SECRET_KEY: SecretStr = Field(...)');
    expect(code).toContain('settings = AppSettings()');
  });

  it('generates Valibot type-safe schema', () => {
    const code = generateValibotSchema(sampleRows);
    expect(code).toContain("import * as v from 'valibot';");
    expect(code).toContain('export const envSchema = v.object({');
    expect(code).toContain('DATABASE_URL: v.pipe(v.string(), v.url()),');
    expect(code).toContain('STRIPE_SECRET_KEY: v.pipe(v.string(), v.nonEmpty(\'Secret cannot be empty\')),');
    expect(code).toContain('export type Env = v.InferOutput<typeof envSchema>;');
    expect(code).toContain('export function validateEnv(');
  });
});

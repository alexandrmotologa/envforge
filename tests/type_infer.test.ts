import { describe, it, expect } from 'vitest';
import { inferType } from '../src/matrix/type_infer.js';

describe('type inference', () => {
  it('identifies port numbers and names', () => {
    expect(inferType('3000', 'PORT')).toBe('port');
    expect(inferType('8080', 'SERVER_PORT')).toBe('port');
    expect(inferType('5432', 'APP_PORT')).toBe('port');
  });

  it('identifies urls and database connection strings', () => {
    expect(inferType('https://api.example.com/v1', 'API_URL')).toBe('url');
    expect(inferType('postgres://user:pass@localhost:5432/mydb', 'DATABASE_URL')).toBe('url');
    expect(inferType('redis://default:secret@cache:6379', 'REDIS_URL')).toBe('url');
  });

  it('identifies boolean flags', () => {
    expect(inferType('true', 'ENABLE_FEATURE')).toBe('boolean');
    expect(inferType('false', 'DEBUG')).toBe('boolean');
    expect(inferType('yes', 'ALLOW_SIGNUP')).toBe('boolean');
  });

  it('identifies email addresses', () => {
    expect(inferType('support@company.com', 'ADMIN_EMAIL')).toBe('email');
  });

  it('identifies uuid strings', () => {
    expect(inferType('123e4567-e89b-12d3-a456-426614174000', 'TENANT_ID')).toBe('uuid');
  });

  it('identifies json strings', () => {
    expect(inferType('{"theme":"dark","retries":3}', 'CONFIG_JSON')).toBe('json');
    expect(inferType('["alpha", "beta"]', 'ALLOWED_ORIGINS')).toBe('json');
  });

  it('identifies general numbers', () => {
    expect(inferType('42', 'MAX_CONNECTIONS')).toBe('number');
    expect(inferType('-10.5', 'TEMPERATURE_OFFSET')).toBe('number');
  });

  it('defaults to string', () => {
    expect(inferType('hello world', 'GREETING')).toBe('string');
  });
});

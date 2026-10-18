import { describe, it, expect } from 'vitest';
import { parseDotenv } from '../src/parsers/dotenv.js';
import { parseDockerCompose } from '../src/parsers/compose.js';
import { parseKubernetes } from '../src/parsers/kubernetes.js';
import { parseTerraformVars } from '../src/parsers/terraform.js';
import { inferEnvironmentName } from '../src/parsers/detector.js';

describe('dotenv parser', () => {
  it('parses basic key-value pairs with comments', () => {
    const raw = `
# Server port
PORT=3000
# Database connection
DATABASE_URL="postgres://user:pass@localhost:5432/app" # inline comment
DEBUG=true
`;
    const res = parseDotenv(raw, '.env');
    expect(res.get('PORT')?.value).toBe('3000');
    expect(res.get('PORT')?.type).toBe('port');
    expect(res.get('PORT')?.comment).toContain('Server port');

    expect(res.get('DATABASE_URL')?.value).toBe('postgres://user:pass@localhost:5432/app');
    expect(res.get('DATABASE_URL')?.type).toBe('url');
    expect(res.get('DATABASE_URL')?.comment).toBe('inline comment');

    expect(res.get('DEBUG')?.value).toBe('true');
    expect(res.get('DEBUG')?.type).toBe('boolean');
  });

  it('handles multiline double-quoted values and escapes', () => {
    const raw = `
PRIVATE_KEY="line1\\nline2"
CERTIFICATE="-----BEGIN CERTIFICATE-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
-----END CERTIFICATE-----"
`;
    const res = parseDotenv(raw, '.env');
    expect(res.get('PRIVATE_KEY')?.value).toBe('line1\nline2');
    expect(res.get('CERTIFICATE')?.value).toContain('MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A');
  });

  it('expands variables with fallback values', () => {
    const raw = `
HOST=localhost
PORT=8080
API_URL="http://\${HOST}:\${PORT}/api"
CACHE_TTL=\${TTL:-3600}
`;
    const res = parseDotenv(raw, '.env');
    expect(res.get('API_URL')?.value).toBe('http://localhost:8080/api');
    expect(res.get('CACHE_TTL')?.value).toBe('3600');
  });

  it('supports export prefix', () => {
    const raw = `export NODE_ENV=production`;
    const res = parseDotenv(raw, '.env');
    expect(res.get('NODE_ENV')?.value).toBe('production');
  });
});

describe('docker compose parser', () => {
  it('parses list and mapping syntax in environment', () => {
    const raw = `
services:
  web:
    image: node:22
    environment:
      - PORT=4000
      - NODE_ENV=production
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: secretpassword
`;
    const res = parseDockerCompose(raw, 'docker-compose.yml');
    expect(res.get('PORT')?.value).toBe('4000');
    expect(res.get('PORT')?.type).toBe('port');
    expect(res.get('POSTGRES_DB')?.value).toBe('app');
    expect(res.get('POSTGRES_PASSWORD')?.value).toBe('secretpassword');
  });
});

describe('kubernetes parser', () => {
  it('parses ConfigMap and decodes base64 Secret data', () => {
    const secretB64 = Buffer.from('supersecretpass').toString('base64');
    const raw = `
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: staging
  APP_PORT: "8080"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
data:
  DB_PASSWORD: ${secretB64}
stringData:
  API_KEY: plain-api-key
`;
    const res = parseKubernetes(raw, 'k8s.yaml');
    expect(res.get('APP_ENV')?.value).toBe('staging');
    expect(res.get('APP_PORT')?.value).toBe('8080');
    expect(res.get('APP_PORT')?.type).toBe('port');
    expect(res.get('DB_PASSWORD')?.value).toBe('supersecretpass');
    expect(res.get('API_KEY')?.value).toBe('plain-api-key');
  });
});

describe('terraform parser', () => {
  it('parses .tfvars HCL2 syntax and JSON', () => {
    const rawHcl = `
# AWS Region
aws_region = "us-east-1"
cluster_size = 3 // worker nodes
is_production = true
`;
    const resHcl = parseTerraformVars(rawHcl, 'terraform.tfvars');
    expect(resHcl.get('aws_region')?.value).toBe('us-east-1');
    expect(resHcl.get('cluster_size')?.value).toBe('3');
    expect(resHcl.get('cluster_size')?.type).toBe('number');
    expect(resHcl.get('is_production')?.value).toBe('true');
    expect(resHcl.get('is_production')?.type).toBe('boolean');

    const rawJson = JSON.stringify({ db_host: 'db.internal', port: 5432 });
    const resJson = parseTerraformVars(rawJson, 'terraform.tfvars.json');
    expect(resJson.get('db_host')?.value).toBe('db.internal');
    expect(resJson.get('port')?.value).toBe('5432');
  });
});

describe('detector', () => {
  it('correctly categorizes environment names', () => {
    expect(inferEnvironmentName('.env.example')).toBe('example');
    expect(inferEnvironmentName('.env.production')).toBe('production');
    expect(inferEnvironmentName('prod.tfvars')).toBe('production');
    expect(inferEnvironmentName('.env.staging')).toBe('staging');
    expect(inferEnvironmentName('.env.development')).toBe('development');
    expect(inferEnvironmentName('.env.local')).toBe('local');
    expect(inferEnvironmentName('docker-compose.yml')).toBe('compose');
  });
});

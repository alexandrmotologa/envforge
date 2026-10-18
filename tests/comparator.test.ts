import { describe, it, expect } from 'vitest';
import { buildParityMatrix } from '../src/matrix/comparator.js';
import { EnvironmentSource, CodeReference } from '../src/types/index.js';

describe('comparator and parity matrix', () => {
  it('constructs matrix, identifies missing keys and computes parity score', () => {
    const sources: EnvironmentSource[] = [
      {
        name: 'local',
        filePath: '.env.local',
        format: 'dotenv',
        entries: new Map([
          ['PORT', { key: 'PORT', value: '3000', rawValue: '3000', type: 'port', sourceFile: '.env.local', format: 'dotenv' }],
          ['DEBUG', { key: 'DEBUG', value: 'true', rawValue: 'true', type: 'boolean', sourceFile: '.env.local', format: 'dotenv' }],
        ]),
      },
      {
        name: 'production',
        filePath: '.env.production',
        format: 'dotenv',
        entries: new Map([
          ['PORT', { key: 'PORT', value: '8080', rawValue: '8080', type: 'port', sourceFile: '.env.production', format: 'dotenv' }],
          // DEBUG is missing in production
        ]),
      },
    ];

    const codeRefs = new Map<string, CodeReference[]>([
      ['PORT', [{ filePath: 'src/index.ts', line: 5, column: 1, variable: 'PORT', language: 'typescript', snippet: 'process.env.PORT' }]],
      ['UNDECLARED_VAR', [{ filePath: 'src/feature.ts', line: 12, column: 1, variable: 'UNDECLARED_VAR', language: 'typescript', snippet: 'process.env.UNDECLARED_VAR' }]],
    ]);

    const report = buildParityMatrix(sources, codeRefs);

    expect(report.environments).toEqual(['local', 'production']);
    expect(report.summary.totalVariables).toBe(3); // PORT, DEBUG, UNDECLARED_VAR

    const portRow = report.rows.find((r) => r.key === 'PORT');
    expect(portRow).toBeDefined();
    expect(portRow?.environments['local'].status).toBe('OK');
    expect(portRow?.environments['production'].status).toBe('OK');
    expect(portRow?.isOrphaned).toBe(false);

    const debugRow = report.rows.find((r) => r.key === 'DEBUG');
    expect(debugRow).toBeDefined();
    expect(debugRow?.environments['local'].status).toBe('OK');
    expect(debugRow?.environments['production'].status).toBe('MISSING');
    expect(debugRow?.isOrphaned).toBe(true); // defined in local but 0 code refs

    const undeclaredRow = report.rows.find((r) => r.key === 'UNDECLARED_VAR');
    expect(undeclaredRow).toBeDefined();
    expect(undeclaredRow?.isUndeclared).toBe(true);
    expect(undeclaredRow?.environments['local'].status).toBe('MISSING');
    expect(undeclaredRow?.environments['production'].status).toBe('MISSING');
  });

  it('detects exposed secrets in non-production environments', () => {
    const sources: EnvironmentSource[] = [
      {
        name: 'local',
        filePath: '.env.local',
        format: 'dotenv',
        entries: new Map([
          ['AWS_KEY', { key: 'AWS_KEY', value: ['AKIA', 'IOSFODNN7EXAMPLE'].join(''), rawValue: ['AKIA', 'IOSFODNN7EXAMPLE'].join(''), type: 'string', sourceFile: '.env.local', format: 'dotenv' }],
        ]),
      },
    ];

    const report = buildParityMatrix(sources);
    const row = report.rows.find((r) => r.key === 'AWS_KEY');

    expect(row).toBeDefined();
    expect(row?.secretFinding).toBeDefined();
    expect(row?.environments['local'].status).toBe('SECRET_EXPOSED');
  });
});

import { describe, it, expect } from 'vitest';
import { compareTwoEnvironments } from '../src/matrix/diff.js';
import { ParityReport, ParityMatrixRow } from '../src/types/index.js';

describe('Environment Visual Diff Engine', () => {
  const sampleRows: ParityMatrixRow[] = [
    {
      key: 'PORT',
      inferredType: 'port',
      suggestedDefault: '3000',
      environments: {
        local: { key: 'PORT', value: '3000', rawValue: '3000', type: 'port', sourceFile: '.env.local', format: 'dotenv', status: 'OK' },
        staging: { key: 'PORT', value: '3000', rawValue: '3000', type: 'port', sourceFile: '.env.staging', format: 'dotenv', status: 'OK' },
      },
      codeReferences: [],
      isOrphaned: false,
      isUndeclared: false,
    },
    {
      key: 'DATABASE_URL',
      inferredType: 'url',
      environments: {
        local: { key: 'DATABASE_URL', value: 'postgres://localhost:5432/dev', rawValue: 'postgres://localhost:5432/dev', type: 'url', sourceFile: '.env.local', format: 'dotenv', status: 'OK' },
        staging: { key: 'DATABASE_URL', value: 'postgres://db.staging.internal:5432/stage', rawValue: 'postgres://db.staging.internal:5432/stage', type: 'url', sourceFile: '.env.staging', format: 'dotenv', status: 'OK' },
      },
      codeReferences: [],
      isOrphaned: false,
      isUndeclared: false,
    },
    {
      key: 'DEBUG_MODE',
      inferredType: 'boolean',
      environments: {
        local: { key: 'DEBUG_MODE', value: 'true', rawValue: 'true', type: 'boolean', sourceFile: '.env.local', format: 'dotenv', status: 'OK' },
      },
      codeReferences: [],
      isOrphaned: false,
      isUndeclared: false,
    },
    {
      key: 'SENTRY_DSN',
      inferredType: 'url',
      environments: {
        staging: { key: 'SENTRY_DSN', value: 'https://xxx@sentry.io/123', rawValue: 'https://xxx@sentry.io/123', type: 'url', sourceFile: '.env.staging', format: 'dotenv', status: 'OK' },
      },
      codeReferences: [],
      isOrphaned: false,
      isUndeclared: false,
    },
  ];

  const mockReport: ParityReport = {
    workspacePath: '/test',
    environments: ['local', 'staging'],
    rows: sampleRows,
    summary: {
      totalVariables: 4,
      missingVariablesCount: 2,
      driftCount: 1,
      secretCount: 0,
      orphanedCount: 0,
      undeclaredCount: 0,
      parityScore: 75,
    },
    timestamp: new Date().toISOString(),
  };

  it('correctly compares two environments and classifies items', () => {
    const diff = compareTwoEnvironments(mockReport, 'local', 'staging');

    expect(diff.envA).toBe('local');
    expect(diff.envB).toBe('staging');
    expect(diff.summary.identicalCount).toBe(1); // PORT
    expect(diff.summary.differentCount).toBe(1); // DATABASE_URL
    expect(diff.summary.onlyInACount).toBe(1);  // DEBUG_MODE
    expect(diff.summary.onlyInBCount).toBe(1);  // SENTRY_DSN

    const portDiff = diff.items.find((i) => i.key === 'PORT');
    expect(portDiff?.status).toBe('IDENTICAL');

    const dbDiff = diff.items.find((i) => i.key === 'DATABASE_URL');
    expect(dbDiff?.status).toBe('VALUE_DIFFERENT');

    const debugDiff = diff.items.find((i) => i.key === 'DEBUG_MODE');
    expect(debugDiff?.status).toBe('ONLY_IN_A');

    const sentryDiff = diff.items.find((i) => i.key === 'SENTRY_DSN');
    expect(sentryDiff?.status).toBe('ONLY_IN_B');
  });
});

/**
 * Core type definitions for EnvForge
 */

export type ConfigFormat =
  | 'dotenv'
  | 'docker-compose'
  | 'kubernetes'
  | 'terraform'
  | 'json';

export type InferredType =
  | 'string'
  | 'number'
  | 'port'
  | 'boolean'
  | 'url'
  | 'email'
  | 'json'
  | 'enum'
  | 'uuid';

export type CellStatus =
  | 'OK'
  | 'MISSING'
  | 'DRIFTED'
  | 'TYPE_MISMATCH'
  | 'SECRET_EXPOSED'
  | 'ORPHANED'
  | 'UNDECLARED';

export interface EnvEntry {
  key: string;
  value: string;
  rawValue: string;
  type: InferredType;
  sourceFile: string;
  format: ConfigFormat;
  line?: number;
  comment?: string;
  isSecretCandidate?: boolean;
}

export interface EnvironmentSource {
  name: string; // e.g. 'local', 'development', 'staging', 'production', 'example'
  filePath: string;
  format: ConfigFormat;
  entries: Map<string, EnvEntry>;
}

export interface CodeReference {
  filePath: string;
  line: number;
  column: number;
  variable: string;
  language: 'typescript' | 'javascript' | 'python' | 'go';
  snippet: string;
}

export interface SecretFinding {
  key: string;
  valueMasked: string;
  ruleName: string;
  severity: 'high' | 'critical' | 'warning';
  entropy: number;
  description: string;
}

export interface ParityCell {
  value?: string;
  status: CellStatus;
  inferredType?: InferredType;
  reason?: string;
  sourceFile?: string;
  line?: number;
}

export interface ParityMatrixRow {
  key: string;
  inferredType: InferredType;
  suggestedDefault?: string;
  description?: string;
  environments: Record<string, ParityCell>;
  codeReferences: CodeReference[];
  isOrphaned: boolean;
  isUndeclared: boolean;
  secretFinding?: SecretFinding;
}

export interface ParitySummary {
  totalVariables: number;
  missingVariablesCount: number;
  driftCount: number;
  secretCount: number;
  orphanedCount: number;
  undeclaredCount: number;
  parityScore: number; // 0 to 100 percentage
}

export interface ParityReport {
  rows: ParityMatrixRow[];
  environments: string[];
  summary: ParitySummary;
  timestamp: string;
  workspacePath: string;
}

export interface SchemaGenerationOptions {
  library: 'zod' | 'typescript' | 'json' | 'example';
  includeDefaults?: boolean;
  strict?: boolean;
}

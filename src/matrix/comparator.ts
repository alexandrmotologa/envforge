import {
  EnvironmentSource,
  CodeReference,
  ParityReport,
  ParityMatrixRow,
  ParityCell,
  InferredType,
  SecretFinding,
} from '../types/index.js';
import { inferType } from './type_infer.js';
import { detectSecret } from './secret_detector.js';
import { evaluateCellStatus } from './drift_rules.js';

export function buildParityMatrix(
  sources: EnvironmentSource[],
  codeRefs: Map<string, CodeReference[]> = new Map(),
  workspacePath: string = process.cwd()
): ParityReport {
  // Collect all unique environment names
  const envNames = Array.from(new Set(sources.map((s) => s.name)));

  // If no sources found, return empty report
  if (envNames.length === 0 && codeRefs.size === 0) {
    return {
      rows: [],
      environments: [],
      summary: {
        totalVariables: 0,
        missingVariablesCount: 0,
        driftCount: 0,
        secretCount: 0,
        orphanedCount: 0,
        undeclaredCount: 0,
        parityScore: 100,
      },
      timestamp: new Date().toISOString(),
      workspacePath,
    };
  }

  // Collect all keys across all environments and AST references
  const allKeys = new Set<string>();
  for (const source of sources) {
    for (const key of source.entries.keys()) {
      allKeys.add(key);
    }
  }
  for (const varName of codeRefs.keys()) {
    allKeys.add(varName);
  }

  const rows: ParityMatrixRow[] = [];
  let totalMissing = 0;
  let totalDrift = 0;
  let totalSecrets = 0;
  let totalOrphaned = 0;
  let totalUndeclared = 0;

  for (const key of Array.from(allKeys).sort()) {
    const references = codeRefs.get(key) || [];
    let detectedSecretFinding: SecretFinding | undefined;
    let description: string | undefined;
    let suggestedDefault: string | undefined;

    // Collect types and values across environments
    const envValues: Record<string, { value: string; entryType: InferredType; sourceFile: string; line?: number }> = {};
    const typeCounts: Record<InferredType, number> = {
      string: 0,
      number: 0,
      port: 0,
      boolean: 0,
      url: 0,
      email: 0,
      json: 0,
      enum: 0,
      uuid: 0,
    };

    for (const source of sources) {
      const entry = source.entries.get(key);
      if (entry) {
        envValues[source.name] = {
          value: entry.value,
          entryType: entry.type,
          sourceFile: entry.sourceFile,
          line: entry.line,
        };
        typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;

        if (!description && entry.comment) {
          description = entry.comment;
        }

        // Check for secret
        if (!detectedSecretFinding) {
          const secret = detectSecret(key, entry.value);
          if (secret) {
            detectedSecretFinding = secret;
          }
        }

        // Suggested default from example or local
        if (!suggestedDefault && (source.name === 'example' || source.name === 'local' || source.name === 'development')) {
          suggestedDefault = entry.value;
        }
      }
    }

    // Determine dominant type
    let dominantType: InferredType = 'string';
    let maxTypeCount = 0;
    for (const [t, count] of Object.entries(typeCounts)) {
      if (count > maxTypeCount) {
        maxTypeCount = count;
        dominantType = t as InferredType;
      }
    }

    if (maxTypeCount === 0) {
      dominantType = inferType(undefined, key);
    }

    // Check orphaned / undeclared status
    const declaredInAnyEnv = Object.keys(envValues).length > 0;
    const hasCodeReferences = references.length > 0;
    const isOrphaned = declaredInAnyEnv && !hasCodeReferences;
    const isUndeclared = !declaredInAnyEnv && hasCodeReferences;

    if (isOrphaned) totalOrphaned++;
    if (isUndeclared) totalUndeclared++;
    if (detectedSecretFinding) totalSecrets++;

    // Build environment cells
    const environmentCells: Record<string, ParityCell> = {};
    let rowHasDrift = false;

    for (const envName of envNames) {
      const envData = envValues[envName];

      if (!envData) {
        // Missing in this environment
        environmentCells[envName] = {
          status: 'MISSING',
          reason: `Variable ${key} is not defined in ${envName}`,
        };
        totalMissing++;
        rowHasDrift = true;
      } else {
        const evalRes = evaluateCellStatus(
          envName,
          key,
          envData.value,
          envData.entryType,
          dominantType,
          detectedSecretFinding
        );

        environmentCells[envName] = {
          value: envData.value,
          inferredType: envData.entryType,
          status: evalRes.status,
          reason: evalRes.reason,
          sourceFile: envData.sourceFile,
          line: envData.line,
        };

        if (evalRes.status !== 'OK') {
          rowHasDrift = true;
          if (evalRes.status === 'TYPE_MISMATCH') {
            totalDrift++;
          }
        }
      }
    }

    rows.push({
      key,
      inferredType: dominantType,
      suggestedDefault,
      description,
      environments: environmentCells,
      codeReferences: references,
      isOrphaned,
      isUndeclared,
      secretFinding: detectedSecretFinding,
    });
  }

  // Calculate Parity Score
  // Max possible points = totalKeys * totalEnvironments
  const totalCells = rows.length * Math.max(1, envNames.length);
  let penalty = 0;
  for (const row of rows) {
    if (row.secretFinding) penalty += 2;
    if (row.isUndeclared) penalty += 1.5;
    for (const cell of Object.values(row.environments)) {
      if (cell.status === 'MISSING') penalty += 1;
      else if (cell.status === 'SECRET_EXPOSED') penalty += 2;
      else if (cell.status === 'TYPE_MISMATCH') penalty += 1.5;
    }
  }

  const rawScore = totalCells > 0 ? Math.max(0, 100 - (penalty / totalCells) * 100) : 100;
  const parityScore = Math.round(rawScore);

  return {
    rows,
    environments: envNames,
    summary: {
      totalVariables: rows.length,
      missingVariablesCount: totalMissing,
      driftCount: totalDrift,
      secretCount: totalSecrets,
      orphanedCount: totalOrphaned,
      undeclaredCount: totalUndeclared,
      parityScore,
    },
    timestamp: new Date().toISOString(),
    workspacePath,
  };
}

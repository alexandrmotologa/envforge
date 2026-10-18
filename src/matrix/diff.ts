import { ParityReport, InferredType } from '../types/index.js';

export type DiffItemStatus =
  | 'IDENTICAL'
  | 'VALUE_DIFFERENT'
  | 'TYPE_MISMATCH'
  | 'ONLY_IN_A'
  | 'ONLY_IN_B';

export interface EnvDiffItem {
  key: string;
  inferredType: InferredType;
  status: DiffItemStatus;
  valueA?: string;
  valueB?: string;
  sourceFileA?: string;
  sourceFileB?: string;
}

export interface EnvironmentDiffReport {
  envA: string;
  envB: string;
  items: EnvDiffItem[];
  summary: {
    totalKeys: number;
    identicalCount: number;
    differentCount: number;
    onlyInACount: number;
    onlyInBCount: number;
  };
}

export function compareTwoEnvironments(
  report: ParityReport,
  envA: string,
  envB: string
): EnvironmentDiffReport {
  const items: EnvDiffItem[] = [];
  let identicalCount = 0;
  let differentCount = 0;
  let onlyInACount = 0;
  let onlyInBCount = 0;

  for (const row of report.rows) {
    const cellA = row.environments[envA];
    const cellB = row.environments[envB];

    const hasA = cellA && cellA.status !== 'MISSING';
    const hasB = cellB && cellB.status !== 'MISSING';

    if (!hasA && !hasB) {
      continue;
    }

    if (hasA && !hasB) {
      onlyInACount++;
      items.push({
        key: row.key,
        inferredType: row.inferredType,
        status: 'ONLY_IN_A',
        valueA: cellA?.value,
        sourceFileA: cellA?.sourceFile,
      });
    } else if (!hasA && hasB) {
      onlyInBCount++;
      items.push({
        key: row.key,
        inferredType: row.inferredType,
        status: 'ONLY_IN_B',
        valueB: cellB?.value,
        sourceFileB: cellB?.sourceFile,
      });
    } else {
      // Both present
      const valA = cellA?.value ?? '';
      const valB = cellB?.value ?? '';
      const typeA = cellA?.inferredType || row.inferredType;
      const typeB = cellB?.inferredType || row.inferredType;

      if (typeA !== typeB && typeA !== 'string' && typeB !== 'string') {
        differentCount++;
        items.push({
          key: row.key,
          inferredType: row.inferredType,
          status: 'TYPE_MISMATCH',
          valueA: valA,
          valueB: valB,
          sourceFileA: cellA?.sourceFile,
          sourceFileB: cellB?.sourceFile,
        });
      } else if (valA !== valB) {
        differentCount++;
        items.push({
          key: row.key,
          inferredType: row.inferredType,
          status: 'VALUE_DIFFERENT',
          valueA: valA,
          valueB: valB,
          sourceFileA: cellA?.sourceFile,
          sourceFileB: cellB?.sourceFile,
        });
      } else {
        identicalCount++;
        items.push({
          key: row.key,
          inferredType: row.inferredType,
          status: 'IDENTICAL',
          valueA: valA,
          valueB: valB,
          sourceFileA: cellA?.sourceFile,
          sourceFileB: cellB?.sourceFile,
        });
      }
    }
  }

  // Sort by priority: differences first, then identical
  const statusPriority: Record<DiffItemStatus, number> = {
    TYPE_MISMATCH: 1,
    ONLY_IN_A: 2,
    ONLY_IN_B: 3,
    VALUE_DIFFERENT: 4,
    IDENTICAL: 5,
  };

  items.sort((a, b) => statusPriority[a.status] - statusPriority[b.status] || a.key.localeCompare(b.key));

  return {
    envA,
    envB,
    items,
    summary: {
      totalKeys: items.length,
      identicalCount,
      differentCount,
      onlyInACount,
      onlyInBCount,
    },
  };
}

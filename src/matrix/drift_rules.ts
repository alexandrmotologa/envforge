import { InferredType, CellStatus, SecretFinding } from '../types/index.js';

export interface CellEvaluation {
  status: CellStatus;
  reason?: string;
}

export function evaluateCellStatus(
  envName: string,
  key: string,
  value: string | undefined,
  cellType: InferredType | undefined,
  dominantType: InferredType,
  secretFinding?: SecretFinding
): CellEvaluation {
  // If value is missing
  if (value === undefined || value === null) {
    return {
      status: 'MISSING',
      reason: `Key "${key}" is missing in ${envName}`,
    };
  }

  // If secret exposed in non-production environment
  const isNonProd = ['local', 'development', 'example', 'test', 'sample'].includes(envName.toLowerCase());
  if (secretFinding && isNonProd) {
    return {
      status: 'SECRET_EXPOSED',
      reason: `Potential credential exposed in ${envName}: ${secretFinding.ruleName}`,
    };
  }

  // Type mismatch check
  if (cellType && dominantType && cellType !== dominantType) {
    // If dominant type is port and cell is number, that's compatible
    const isPortNumCompatible =
      (dominantType === 'port' && cellType === 'number') ||
      (dominantType === 'number' && cellType === 'port');

    if (!isPortNumCompatible && cellType !== 'string' && dominantType !== 'string') {
      return {
        status: 'TYPE_MISMATCH',
        reason: `Type mismatch in ${envName}: got ${cellType}, expected ${dominantType}`,
      };
    }
  }

  return {
    status: 'OK',
  };
}

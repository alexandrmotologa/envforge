import React from 'react';
import { ParityMatrixRow } from '../hooks/useEnvData.js';
import { ShieldAlert, AlertTriangle, FileWarning } from 'lucide-react';

interface DriftAlertCardProps {
  rows: ParityMatrixRow[];
  onSelectRow: (row: ParityMatrixRow) => void;
}

export const DriftAlertCard: React.FC<DriftAlertCardProps> = ({ rows, onSelectRow }) => {
  const secretRows = rows.filter((r) => !!r.secretFinding);
  const undeclaredRows = rows.filter((r) => r.isUndeclared);
  const missingInProd = rows.filter((r) => r.environments['production']?.status === 'MISSING');

  if (secretRows.length === 0 && undeclaredRows.length === 0 && missingInProd.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Secret Leaks */}
      {secretRows.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h3 className="font-semibold text-sm text-rose-100">Exposed Credentials</h3>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold">
              {secretRows.length}
            </span>
          </div>
          <p className="text-xs text-rose-300/80 mb-3">
            Potential API keys or private tokens detected in local or template configurations:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {secretRows.slice(0, 5).map((row) => (
              <button
                key={row.key}
                onClick={() => onSelectRow(row)}
                className="px-2 py-0.5 rounded text-xs font-mono bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 transition-colors"
              >
                {row.key}
              </button>
            ))}
            {secretRows.length > 5 && (
              <span className="text-xs text-rose-400 self-center">+{secretRows.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      {/* Missing in Production */}
      {missingInProd.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-sm text-amber-100">Missing in Production</h3>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
              {missingInProd.length}
            </span>
          </div>
          <p className="text-xs text-amber-300/80 mb-3">
            Variables configured in development or staging but absent from production manifests:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingInProd.slice(0, 5).map((row) => (
              <button
                key={row.key}
                onClick={() => onSelectRow(row)}
                className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-colors"
              >
                {row.key}
              </button>
            ))}
            {missingInProd.length > 5 && (
              <span className="text-xs text-amber-400 self-center">+{missingInProd.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      {/* Undeclared Code References */}
      {undeclaredRows.length > 0 && (
        <div className="p-4 rounded-xl bg-orange-950/30 border border-orange-500/30 text-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <FileWarning className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold text-sm text-orange-100">Ghost Variables in Code</h3>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-mono font-bold">
              {undeclaredRows.length}
            </span>
          </div>
          <p className="text-xs text-orange-300/80 mb-3">
            Variables referenced in source code with zero definitions in any environment file:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {undeclaredRows.slice(0, 5).map((row) => (
              <button
                key={row.key}
                onClick={() => onSelectRow(row)}
                className="px-2 py-0.5 rounded text-xs font-mono bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 border border-orange-500/30 transition-colors"
              >
                {row.key}
              </button>
            ))}
            {undeclaredRows.length > 5 && (
              <span className="text-xs text-orange-400 self-center">+{undeclaredRows.length - 5} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

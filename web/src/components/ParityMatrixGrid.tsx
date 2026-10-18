import React from 'react';
import { ParityMatrixRow, CellStatus } from '../hooks/useEnvData.js';
import { ShieldAlert, Code2, AlertTriangle, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

interface ParityMatrixGridProps {
  rows: ParityMatrixRow[];
  environments: string[];
  onSelectRow: (row: ParityMatrixRow) => void;
  onOpenCodeTrace: (row: ParityMatrixRow) => void;
}

export const ParityMatrixGrid: React.FC<ParityMatrixGridProps> = ({
  rows,
  environments,
  onSelectRow,
  onOpenCodeTrace,
}) => {
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center bg-dark-900/50 border border-slate-800 rounded-xl">
        <p className="text-slate-400 text-sm">No environment variables match the current criteria.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-800 rounded-xl bg-dark-900/60 shadow-xl backdrop-blur-md">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-800 bg-dark-850/80 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <th className="py-3 px-4 min-w-[220px]">Variable Key</th>
            <th className="py-3 px-4 min-w-[100px]">Type</th>
            <th className="py-3 px-4 min-w-[90px] text-center">Code Traces</th>
            {environments.map((env) => (
              <th key={env} className="py-3 px-4 min-w-[140px] text-center capitalize">
                {env}
              </th>
            ))}
            <th className="py-3 px-4 min-w-[100px] text-right">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
          {rows.map((row) => {
            const hasSecret = !!row.secretFinding;
            return (
              <tr
                key={row.key}
                className="hover:bg-dark-800/50 transition-colors group"
              >
                {/* Key Column */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {row.key}
                    </span>
                    {hasSecret && (
                      <span
                        title={row.secretFinding?.description}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      >
                        <ShieldAlert className="w-3 h-3 text-rose-400" />
                        Secret
                      </span>
                    )}
                    {row.isUndeclared && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Undeclared
                      </span>
                    )}
                    {row.isOrphaned && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        Orphaned
                      </span>
                    )}
                  </div>
                  {row.description && (
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5 truncate max-w-sm">
                      {row.description}
                    </div>
                  )}
                </td>

                {/* Type Badge */}
                <td className="py-3 px-4">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {row.inferredType}
                  </span>
                </td>

                {/* Code Traces */}
                <td className="py-3 px-4 text-center">
                  {row.codeReferences.length > 0 ? (
                    <button
                      onClick={() => onOpenCodeTrace(row)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-all font-sans text-xs"
                      title="View occurrences in codebase"
                    >
                      <Code2 className="w-3 h-3 text-cyan-400" />
                      {row.codeReferences.length}
                    </button>
                  ) : (
                    <span className="text-slate-600 font-sans text-xs">0</span>
                  )}
                </td>

                {/* Environment Cells */}
                {environments.map((env) => {
                  const cell = row.environments[env];
                  return (
                    <td key={env} className="py-3 px-4 text-center">
                      <CellBadge cell={cell} />
                    </td>
                  );
                })}

                {/* Action Column */}
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onSelectRow(row)}
                    className="px-2.5 py-1 text-xs font-sans text-slate-300 hover:text-white bg-dark-800 hover:bg-dark-700 border border-slate-700 rounded-md transition-colors"
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const CellBadge: React.FC<{ cell?: { status: CellStatus; value?: string; reason?: string } }> = ({ cell }) => {
  if (!cell) {
    return <span className="text-slate-600">-</span>;
  }

  switch (cell.status) {
    case 'OK':
      return (
        <span
          title={cell.value}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Present
        </span>
      );
    case 'MISSING':
      return (
        <span
          title={cell.reason || 'Missing in this environment'}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20"
        >
          <XCircle className="w-3 h-3 text-rose-400" />
          Missing
        </span>
      );
    case 'TYPE_MISMATCH':
      return (
        <span
          title={cell.reason || 'Type mismatch detected'}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
        >
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          Mismatch
        </span>
      );
    case 'SECRET_EXPOSED':
      return (
        <span
          title={cell.reason || 'Secret exposed in non-production environment'}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-rose-600/20 text-rose-300 border border-rose-500/40 animate-pulse"
        >
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          Leaked
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-slate-800 text-slate-400">
          <HelpCircle className="w-3 h-3" />
          {cell.status}
        </span>
      );
  }
};

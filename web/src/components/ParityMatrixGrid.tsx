import React, { useState } from 'react';
import { ParityMatrixRow, CellStatus } from '../hooks/useEnvData.js';
import { ShieldAlert, Code2, AlertTriangle, CheckCircle2, XCircle, HelpCircle, Pencil, Check, X } from 'lucide-react';

interface ParityMatrixGridProps {
  rows: ParityMatrixRow[];
  environments: string[];
  onSelectRow: (row: ParityMatrixRow) => void;
  onOpenCodeTrace: (row: ParityMatrixRow) => void;
  onUpdateCell?: (env: string, key: string, value: string) => Promise<{ success: boolean; error?: string }>;
  maskSecrets?: boolean;
}

export const ParityMatrixGrid: React.FC<ParityMatrixGridProps> = ({
  rows,
  environments,
  onSelectRow,
  onOpenCodeTrace,
  onUpdateCell,
  maskSecrets = true,
}) => {
  const [editingCell, setEditingCell] = useState<{ key: string; env: string } | null>(null);
  const [cellValue, setCellValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (rows.length === 0) {
    return (
      <div className="py-16 text-center bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <p className="text-zinc-400 text-sm">No environment variables match the current criteria.</p>
      </div>
    );
  }

  const startEditing = (key: string, env: string, currentValue?: string) => {
    setEditingCell({ key, env });
    setCellValue(currentValue || '');
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setCellValue('');
  };

  const saveCell = async (key: string, env: string) => {
    if (!onUpdateCell) return;
    setIsSaving(true);
    try {
      const res = await onUpdateCell(env, key, cellValue);
      if (res.success) {
        setEditingCell(null);
      } else {
        alert(res.error || 'Failed to save value');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="overflow-x-auto border border-zinc-800 rounded-xl bg-zinc-900/60 shadow-xl backdrop-blur-md">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <th className="py-3 px-4 min-w-[220px]">Variable Key</th>
            <th className="py-3 px-4 min-w-[100px]">Type</th>
            <th className="py-3 px-4 min-w-[90px] text-center">Code Traces</th>
            {environments.map((env) => (
              <th key={env} className="py-3 px-4 min-w-[150px] text-center capitalize">
                {env}
              </th>
            ))}
            <th className="py-3 px-4 min-w-[100px] text-right">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
          {rows.map((row) => {
            const hasSecret = !!row.secretFinding;
            return (
              <tr
                key={row.key}
                className="hover:bg-zinc-800/40 transition-colors group"
              >
                {/* Key Column */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">
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
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-zinc-700/30 text-zinc-400 border border-zinc-700/40">
                        Orphaned
                      </span>
                    )}
                  </div>
                  {row.description && (
                    <div className="text-[11px] text-zinc-400 font-sans mt-0.5 truncate max-w-sm">
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
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-cyan-300 border border-zinc-700 transition-all font-sans text-xs"
                      title="View occurrences in codebase"
                    >
                      <Code2 className="w-3 h-3 text-cyan-400" />
                      {row.codeReferences.length}
                    </button>
                  ) : (
                    <span className="text-zinc-600 font-sans text-xs">0</span>
                  )}
                </td>

                {/* Environment Cells */}
                {environments.map((env) => {
                  const cell = row.environments[env];
                  const isEditing = editingCell?.key === row.key && editingCell?.env === env;

                  if (isEditing) {
                    return (
                      <td key={env} className="py-2 px-2 text-center bg-zinc-800/80">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={cellValue}
                            onChange={(e) => setCellValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCell(row.key, env);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            autoFocus
                            placeholder="Value"
                            className="w-full bg-zinc-950 border border-cyan-500 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:outline-none"
                          />
                          <button
                            onClick={() => saveCell(row.key, env)}
                            disabled={isSaving}
                            className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                            title="Save"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td key={env} className="py-3 px-4 text-center relative group/cell">
                      <div className="flex items-center justify-center gap-1">
                        <CellBadge cell={cell} maskSecrets={maskSecrets} />
                        {onUpdateCell && (
                          <button
                            onClick={() => startEditing(row.key, env, cell?.value)}
                            className="opacity-0 group-hover/cell:opacity-100 p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-cyan-300 transition-opacity"
                            title="Edit value"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}

                {/* Action Column */}
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onSelectRow(row)}
                    className="px-2.5 py-1 text-xs font-sans text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition-colors"
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

const CellBadge: React.FC<{
  cell?: { status: CellStatus; value?: string; reason?: string };
  maskSecrets?: boolean;
}> = ({ cell, maskSecrets = true }) => {
  if (!cell) {
    return <span className="text-zinc-600">-</span>;
  }

  const tooltipValue = maskSecrets && cell.value && cell.value.length > 4
    ? '•••••••• (Masked)'
    : cell.value;

  switch (cell.status) {
    case 'OK':
      return (
        <span
          title={tooltipValue}
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-zinc-800 text-zinc-400">
          <HelpCircle className="w-3 h-3" />
          {cell.status}
        </span>
      );
  }
};

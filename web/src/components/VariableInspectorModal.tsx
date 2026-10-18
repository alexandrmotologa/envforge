import React from 'react';
import { ParityMatrixRow } from '../hooks/useEnvData.js';
import { X, ShieldAlert, Code2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface VariableInspectorModalProps {
  row: ParityMatrixRow | null;
  onClose: () => void;
  onOpenCodeTrace: (row: ParityMatrixRow) => void;
}

export const VariableInspectorModal: React.FC<VariableInspectorModalProps> = ({
  row,
  onClose,
  onOpenCodeTrace,
}) => {
  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-dark-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 font-mono">{row.key}</h2>
              <span className="px-2 py-0.5 rounded text-xs font-sans font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {row.inferredType}
              </span>
            </div>
            {row.description && (
              <p className="text-xs text-slate-400 mt-1">{row.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Secret Alert Banner if any */}
          {row.secretFinding && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200">
              <div className="flex items-center gap-2 mb-1.5 font-semibold text-sm">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Security Alert: {row.secretFinding.ruleName}</span>
              </div>
              <p className="text-xs text-rose-300 mb-2">{row.secretFinding.description}</p>
              <div className="text-xs font-mono bg-dark-950/80 p-2.5 rounded border border-rose-500/20 flex items-center justify-between">
                <span>Masked value: <strong>{row.secretFinding.valueMasked}</strong></span>
                <span className="text-[11px] text-rose-400">Entropy: {row.secretFinding.entropy}</span>
              </div>
            </div>
          )}

          {/* Environment Values Grid */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Values Across Environments
            </h3>
            <div className="space-y-2">
              {Object.entries(row.environments).map(([env, cell]) => (
                <div
                  key={env}
                  className="p-3 rounded-lg bg-dark-850 border border-slate-800 flex items-center justify-between gap-4 font-mono text-xs"
                >
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <span className="capitalize font-sans font-medium text-slate-300">{env}</span>
                    {cell.status === 'OK' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {cell.status === 'MISSING' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                    {cell.status === 'TYPE_MISMATCH' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                    {cell.status === 'SECRET_EXPOSED' && <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />}
                  </div>

                  <div className="flex-1 truncate text-slate-300">
                    {cell.value !== undefined ? (
                      <span className="bg-dark-950 px-2 py-1 rounded text-cyan-200 block truncate">
                        {cell.value}
                      </span>
                    ) : (
                      <span className="text-rose-400/80 italic font-sans">{cell.reason || 'Missing'}</span>
                    )}
                  </div>

                  {cell.sourceFile && (
                    <span className="text-[11px] text-slate-500 font-sans truncate max-w-[150px]" title={cell.sourceFile}>
                      {cell.sourceFile}:{cell.line || 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AST References Count */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-dark-850 border border-slate-800">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">AST Code References</h4>
              <p className="text-xs text-slate-400">
                {row.codeReferences.length > 0
                  ? `Found in ${row.codeReferences.length} locations across source files.`
                  : 'Zero code references found (potential orphaned variable).'}
              </p>
            </div>
            {row.codeReferences.length > 0 && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCodeTrace(row);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-cyan-300 border border-slate-700 text-xs font-medium transition-colors"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>View Traces</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-dark-850/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

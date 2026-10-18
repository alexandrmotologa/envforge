import React from 'react';
import { ParityMatrixRow } from '../hooks/useEnvData.js';
import { X, Code2, FileCode, ExternalLink } from 'lucide-react';

interface CodebaseAuditViewProps {
  row: ParityMatrixRow | null;
  onClose: () => void;
}

export const CodebaseAuditView: React.FC<CodebaseAuditViewProps> = ({ row, onClose }) => {
  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-xl bg-dark-900 border-l border-slate-800 h-full flex flex-col shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-semibold text-slate-100 font-mono">{row.key}</h2>
              <p className="text-xs text-slate-400">AST Codebase Occurrences ({row.codeReferences.length})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* References List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {row.codeReferences.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <p>No direct references found in scanned source files.</p>
              <p className="text-xs text-slate-600 mt-1">This key may be dynamically looked up or orphaned.</p>
            </div>
          ) : (
            row.codeReferences.map((ref, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-dark-850 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-mono">
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{ref.filePath}:{ref.line}:{ref.column}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-dark-800 text-slate-400 border border-slate-700">
                    {ref.language}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-dark-950 border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto">
                  <code>{ref.snippet}</code>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <span>Inferred Type: <strong className="text-cyan-400 font-mono">{row.inferredType}</strong></span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

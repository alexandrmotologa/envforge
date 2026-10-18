import React, { useState } from 'react';
import { X, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { ParityMatrixRow } from '../hooks/useEnvData.js';

interface QuickSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  environments: string[];
  rows: ParityMatrixRow[];
  onSyncSuccess: () => void;
}

export const QuickSyncModal: React.FC<QuickSyncModalProps> = ({
  isOpen,
  onClose,
  environments,
  rows,
  onSyncSuccess,
}) => {
  const [targetEnv, setTargetEnv] = useState<string>(environments[0] || 'example');
  const [syncing, setSyncing] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate missing keys for selected targetEnv
  const missingKeys = rows
    .filter((r) => r.environments[targetEnv]?.status === 'MISSING')
    .map((r) => ({
      key: r.key,
      type: r.inferredType,
      default: r.suggestedDefault,
    }));

  const handleSync = async () => {
    setSyncing(true);
    setResultMessage(null);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEnv }),
      });
      const data = await res.json();
      if (res.ok) {
        setResultMessage(data.message);
        onSyncSuccess();
      } else {
        setResultMessage(data.error || 'Sync failed');
      }
    } catch {
      setResultMessage('Failed to trigger synchronization');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-dark-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-100">1-Click Environment Sync</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Select Target Environment to Patch
            </label>
            <div className="flex flex-wrap gap-2">
              {environments.map((env) => (
                <button
                  key={env}
                  onClick={() => setTargetEnv(env)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    targetEnv === env
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-dark-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-dark-850 border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400 font-medium">Missing Keys in <strong className="text-slate-200 capitalize">{targetEnv}</strong></span>
              <span className="font-mono text-cyan-400 font-bold">{missingKeys.length}</span>
            </div>
            {missingKeys.length === 0 ? (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5 mt-2">
                <CheckCircle2 className="w-4 h-4" />
                This environment is already 100% synchronized!
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                {missingKeys.map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1 px-2 rounded bg-dark-900 border border-slate-800/80">
                    <span className="text-slate-200">{item.key}</span>
                    <span className="text-[10px] text-cyan-400 font-sans">{item.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {resultMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
              {resultMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-dark-800 hover:bg-dark-700 border border-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || missingKeys.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Synchronizing...' : `Sync ${missingKeys.length} Keys`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

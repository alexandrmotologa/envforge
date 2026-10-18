import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { ParityReport } from '../hooks/useEnvData';

interface VisualDiffViewProps {
  report: ParityReport;
  onUpdateCell: (env: string, key: string, value: string) => Promise<{ success: boolean; error?: string }>;
}

interface DiffItem {
  key: string;
  inferredType: string;
  status: 'IDENTICAL' | 'VALUE_DIFFERENT' | 'TYPE_MISMATCH' | 'ONLY_IN_A' | 'ONLY_IN_B';
  valueA?: string;
  valueB?: string;
  sourceFileA?: string;
  sourceFileB?: string;
}

interface DiffReport {
  envA: string;
  envB: string;
  items: DiffItem[];
  summary: {
    totalKeys: number;
    identicalCount: number;
    differentCount: number;
    onlyInACount: number;
    onlyInBCount: number;
  };
}

export const VisualDiffView: React.FC<VisualDiffViewProps> = ({ report, onUpdateCell }) => {
  const envs = report.environments;
  const [envA, setEnvA] = useState(envs[0] || 'local');
  const [envB, setEnvB] = useState(envs[1] || envs[0] || 'staging');
  const [diffReport, setDiffReport] = useState<DiffReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'diff' | 'only'>('all');
  const [maskValues, setMaskValues] = useState(true);

  const fetchDiff = async () => {
    if (!envA || !envB) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/diff?envA=${encodeURIComponent(envA)}&envB=${encodeURIComponent(envB)}`);
      if (res.ok) {
        const data = await res.json();
        setDiffReport(data);
      }
    } catch (err) {
      console.error('Failed to fetch diff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiff();
  }, [envA, envB, report]);

  const copyToEnv = async (targetEnv: string, key: string, value: string) => {
    const res = await onUpdateCell(targetEnv, key, value);
    if (res.success) {
      setCopiedKey(`${targetEnv}-${key}`);
      setTimeout(() => setCopiedKey(null), 2000);
      fetchDiff();
    }
  };

  const swapEnvs = () => {
    const temp = envA;
    setEnvA(envB);
    setEnvB(temp);
  };

  const filteredItems = (diffReport?.items || []).filter((item) => {
    if (filter === 'diff') return item.status === 'VALUE_DIFFERENT' || item.status === 'TYPE_MISMATCH';
    if (filter === 'only') return item.status === 'ONLY_IN_A' || item.status === 'ONLY_IN_B';
    return true;
  });

  const renderValue = (val?: string) => {
    if (val === undefined) return <span className="text-zinc-600 italic">Not set</span>;
    if (maskValues && val.length > 3) {
      return <span className="font-mono text-zinc-400">••••••••</span>;
    }
    return <span className="font-mono text-zinc-200">{val}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-zinc-400 mb-1">Source Environment (A)</label>
            <select
              value={envA}
              onChange={(e) => setEnvA(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-cyan-500"
            >
              {envs.map((e) => (
                <option key={e} value={e}>
                  {e.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={swapEnvs}
            className="mt-5 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Swap environments"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          <div className="flex flex-col">
            <label className="text-xs font-medium text-zinc-400 mb-1">Target Environment (B)</label>
            <select
              value={envB}
              onChange={(e) => setEnvB(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-cyan-500"
            >
              {envs.map((e) => (
                <option key={e} value={e}>
                  {e.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === 'all' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Keys ({diffReport?.summary.totalKeys || 0})
            </button>
            <button
              onClick={() => setFilter('diff')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === 'diff' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Differences ({diffReport?.summary.differentCount || 0})
            </button>
            <button
              onClick={() => setFilter('only')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === 'only' ? 'bg-purple-500/20 text-purple-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Missing In One ({(diffReport?.summary.onlyInACount || 0) + (diffReport?.summary.onlyInBCount || 0)})
            </button>
          </div>

          <button
            onClick={() => setMaskValues(!maskValues)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium transition-colors"
          >
            {maskValues ? <Eye className="w-3.5 h-3.5 text-zinc-400" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
            {maskValues ? 'Reveal' : 'Mask'}
          </button>

          <button
            onClick={fetchDiff}
            disabled={loading}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
            title="Refresh diff"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {diffReport && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span>Identical Values</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
              {diffReport.summary.identicalCount}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Exact match across both</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span>Value Differences</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">
              {diffReport.summary.differentCount}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Configured differently</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span>Only in {envA.toUpperCase()}</span>
              <MinusCircle className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-400 mt-2 font-mono">
              {diffReport.summary.onlyInACount}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Missing in {envB}</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span>Only in {envB.toUpperCase()}</span>
              <PlusCircle className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400 mt-2 font-mono">
              {diffReport.summary.onlyInBCount}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Missing in {envA}</div>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/80 text-zinc-400 font-mono text-xs uppercase border-b border-zinc-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Variable Key</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">{envA.toUpperCase()} Value</th>
                <th className="py-3.5 px-4 font-semibold text-center w-12"></th>
                <th className="py-3.5 px-4 font-semibold">{envB.toUpperCase()} Value</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {filteredItems.map((item) => {
                const isCopiedToB = copiedKey === `${envB}-${item.key}`;
                const isCopiedToA = copiedKey === `${envA}-${item.key}`;

                return (
                  <tr key={item.key} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-zinc-200">
                      {item.key}
                      <span className="block text-[11px] text-zinc-500 font-sans font-normal mt-0.5">
                        {item.inferredType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.status === 'IDENTICAL' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Identical
                        </span>
                      )}
                      {item.status === 'VALUE_DIFFERENT' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" /> Different
                        </span>
                      )}
                      {item.status === 'ONLY_IN_A' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <MinusCircle className="w-3 h-3" /> Only in {envA}
                        </span>
                      )}
                      {item.status === 'ONLY_IN_B' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <PlusCircle className="w-3 h-3" /> Only in {envB}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate">{renderValue(item.valueA)}</td>

                    <td className="py-3.5 px-4 text-center">
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-600 inline" />
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate">{renderValue(item.valueB)}</td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {item.status === 'ONLY_IN_A' && item.valueA && (
                        <button
                          onClick={() => copyToEnv(envB, item.key, item.valueA!)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-medium transition-colors"
                        >
                          {isCopiedToB ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy to {envB}
                        </button>
                      )}

                      {item.status === 'ONLY_IN_B' && item.valueB && (
                        <button
                          onClick={() => copyToEnv(envA, item.key, item.valueB!)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-medium transition-colors"
                        >
                          {isCopiedToA ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy to {envA}
                        </button>
                      )}

                      {item.status === 'VALUE_DIFFERENT' && item.valueA && (
                        <button
                          onClick={() => copyToEnv(envB, item.key, item.valueA!)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                          title={`Sync value from ${envA} to ${envB}`}
                        >
                          {isCopiedToB ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          Sync to {envB}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

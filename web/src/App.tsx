import React, { useState } from 'react';
import { useEnvData, ParityMatrixRow } from './hooks/useEnvData.js';
import { ParityMatrixGrid } from './components/ParityMatrixGrid.js';
import { VisualDiffView } from './components/VisualDiffView.js';
import { DriftAlertCard } from './components/DriftAlertCard.js';
import { CodebaseAuditView } from './components/CodebaseAuditView.js';
import { SchemaExportModal } from './components/SchemaExportModal.js';
import { QuickSyncModal } from './components/QuickSyncModal.js';
import { VariableInspectorModal } from './components/VariableInspectorModal.js';
import {
  Layers,
  Search,
  RefreshCw,
  Code,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  XCircle,
  Sparkles,
  SlidersHorizontal,
  ArrowLeftRight,
  Radio,
  Eye,
  EyeOff,
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    report,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filteredRows,
    selectedRow,
    setSelectedRow,
    isLive,
    fetchReport,
    rescan,
    updateCell,
  } = useEnvData();

  const [activeTab, setActiveTab] = useState<'matrix' | 'diff'>('matrix');
  const [activeCodeTraceRow, setActiveCodeTraceRow] = useState<ParityMatrixRow | null>(null);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [maskSecrets, setMaskSecrets] = useState(true);

  const summary = report?.summary;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight text-white">EnvForge</h1>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Studio
                </span>
                {isLive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live Sync
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">Configuration & Secret Parity Auditor</p>
            </div>
          </div>

          {/* View Modes Switcher (Responsive for all screen sizes) */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'matrix'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Parity Matrix</span>
              <span className="sm:hidden">Matrix</span>
            </button>
            <button
              onClick={() => setActiveTab('diff')}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'diff'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Visual Diff</span>
              <span className="sm:hidden">Diff</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMaskSecrets(!maskSecrets)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition-colors"
              title={maskSecrets ? 'Reveal secret values' : 'Mask secret values'}
            >
              {maskSecrets ? <Eye className="w-3.5 h-3.5 text-zinc-400" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
              <span className="hidden sm:inline">{maskSecrets ? 'Masked' : 'Revealed'}</span>
            </button>

            <button
              onClick={rescan}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors"
              title="Rescan workspace files"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Rescan</span>
            </button>

            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>1-Click Sync</span>
            </button>

            <button
              onClick={() => setIsSchemaModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium shadow-md shadow-cyan-600/20 transition-colors"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Export Schemas</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Parity KPI Overview Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {/* Parity Score */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span>Parity Score</span>
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-400">
                {summary.parityScore}%
              </div>
            </div>

            {/* Total Variables */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span>Total Keys</span>
                <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-zinc-100">
                {summary.totalVariables}
              </div>
            </div>

            {/* Missing Keys */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span>Missing</span>
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <div className={`text-2xl font-bold font-mono ${summary.missingVariablesCount > 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
                {summary.missingVariablesCount}
              </div>
            </div>

            {/* Drift / Mismatch */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span>Type Drift</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className={`text-2xl font-bold font-mono ${summary.driftCount > 0 ? 'text-amber-400' : 'text-zinc-100'}`}>
                {summary.driftCount}
              </div>
            </div>

            {/* Exposed Secrets */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span>Secrets Found</span>
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              </div>
              <div className={`text-2xl font-bold font-mono ${summary.secretCount > 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
                {summary.secretCount}
              </div>
            </div>

            {/* Undeclared Code References */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span>Ghost In Code</span>
                <Code className="w-4 h-4 text-orange-400" />
              </div>
              <div className={`text-2xl font-bold font-mono ${summary.undeclaredCount > 0 ? 'text-orange-400' : 'text-zinc-100'}`}>
                {summary.undeclaredCount}
              </div>
            </div>
          </div>
        )}

        {/* Priority Drift Alert Cards */}
        {report && <DriftAlertCard rows={report.rows} onSelectRow={setSelectedRow} />}

        {/* View Selection: Matrix or Diff */}
        {activeTab === 'diff' ? (
          report ? (
            <VisualDiffView report={report} onUpdateCell={updateCell} />
          ) : (
            <div className="py-24 text-center text-zinc-500 text-sm">
              Loading environments for diff...
            </div>
          )
        ) : (
          <>
            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search variables or descriptions..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    statusFilter === 'all'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  All ({report?.rows.length || 0})
                </button>
                <button
                  onClick={() => setStatusFilter('missing')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    statusFilter === 'missing'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  Missing ({summary?.missingVariablesCount || 0})
                </button>
                <button
                  onClick={() => setStatusFilter('drift')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    statusFilter === 'drift'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  Drift ({summary?.driftCount || 0})
                </button>
                <button
                  onClick={() => setStatusFilter('secrets')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    statusFilter === 'secrets'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  Secrets ({summary?.secretCount || 0})
                </button>
                <button
                  onClick={() => setStatusFilter('undeclared')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    statusFilter === 'undeclared'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  Undeclared ({summary?.undeclaredCount || 0})
                </button>
                <button
                  onClick={() => setStatusFilter('orphaned')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    statusFilter === 'orphaned'
                      ? 'bg-zinc-700/50 text-zinc-200 border border-zinc-600'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  Orphaned ({summary?.orphanedCount || 0})
                </button>
              </div>
            </div>

            {/* Parity Grid */}
            {loading && !report ? (
              <div className="py-24 text-center text-zinc-500 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-cyan-400" />
                Scanning workspace configurations and codebase AST...
              </div>
            ) : error ? (
              <div className="p-6 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-sm text-center">
                {error}
              </div>
            ) : (
              <ParityMatrixGrid
                rows={filteredRows}
                environments={report?.environments || []}
                onSelectRow={setSelectedRow}
                onOpenCodeTrace={setActiveCodeTraceRow}
                onUpdateCell={updateCell}
                maskSecrets={maskSecrets}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-4 text-center text-xs text-zinc-500 font-sans">
        EnvForge &bull; Universal Cross-Environment Parity Auditor &bull; Node.js 22 + TypeScript + React 19
      </footer>

      {/* Modals and Drawers */}
      <CodebaseAuditView
        row={activeCodeTraceRow}
        onClose={() => setActiveCodeTraceRow(null)}
      />

      <VariableInspectorModal
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
        onOpenCodeTrace={setActiveCodeTraceRow}
      />

      <SchemaExportModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
      />

      <QuickSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        environments={report?.environments || []}
        rows={report?.rows || []}
        onSyncSuccess={rescan}
      />
    </div>
  );
};

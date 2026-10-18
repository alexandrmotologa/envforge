import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, Code } from 'lucide-react';

interface SchemaExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'zod' | 'typescript' | 't3' | 'valibot' | 'pydantic' | 'json' | 'example';

export const SchemaExportModal: React.FC<SchemaExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('zod');
  const [schemas, setSchemas] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/schemas')
        .then((res) => res.json())
        .then((data) => {
          setSchemas(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentContent = schemas ? schemas[activeTab] || '' : '';

  const handleCopy = () => {
    if (!currentContent) return;
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportToFile = async () => {
    setExporting(true);
    setExportMessage(null);

    const filenameMap: Record<TabType, string> = {
      zod: 'src/env.ts',
      typescript: 'src/env.d.ts',
      t3: 'src/env.mjs',
      valibot: 'src/env.valibot.ts',
      pydantic: 'settings.py',
      json: '.env.schema.json',
      example: '.env.example',
    };

    const targetPath = filenameMap[activeTab];

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, targetPath }),
      });
      const data = await res.json();
      if (res.ok) {
        setExportMessage(`Saved to ${targetPath}`);
      } else {
        setExportMessage(data.error || 'Export failed');
      }
    } catch {
      setExportMessage('Export failed');
    } finally {
      setExporting(false);
      setTimeout(() => setExportMessage(null), 3000);
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'zod', label: 'Zod' },
    { id: 't3', label: 'T3-Env' },
    { id: 'valibot', label: 'Valibot' },
    { id: 'pydantic', label: 'Pydantic (Python)' },
    { id: 'typescript', label: 'TypeScript .d.ts' },
    { id: 'json', label: 'JSON Schema' },
    { id: 'example', label: '.env.example' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-zinc-100">Type-Safe Schema & Template Synthesizer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-zinc-950/80 border-b border-zinc-800 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {exportMessage && (
              <span className="text-xs text-emerald-400 font-medium">{exportMessage}</span>
            )}
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleExportToFile}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exporting...' : 'Write to File'}</span>
            </button>
          </div>
        </div>

        {/* Code Preview Area */}
        <div className="flex-1 overflow-auto p-6 bg-zinc-950 font-mono text-xs text-zinc-300">
          {loading ? (
            <div className="py-20 text-center text-zinc-500">Generating type-safe schema...</div>
          ) : (
            <pre className="whitespace-pre">
              <code>{currentContent}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

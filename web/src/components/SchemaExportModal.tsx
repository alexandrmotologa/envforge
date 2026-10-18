import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, Code, FileText } from 'lucide-react';

interface SchemaExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaExportModal: React.FC<SchemaExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'zod' | 'typescript' | 'json' | 'example'>('zod');
  const [schemas, setSchemas] = useState<{ zod: string; typescript: string; json: string; example: string } | null>(null);
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

  const currentContent = schemas ? schemas[activeTab] : '';

  const handleCopy = () => {
    if (!currentContent) return;
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportToFile = async () => {
    setExporting(true);
    setExportMessage(null);

    const filenameMap: Record<string, string> = {
      zod: 'src/env.ts',
      typescript: 'src/env.d.ts',
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

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-dark-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-100">Type-Safe Schema & Template Synthesizer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation & Actions */}
        <div className="flex items-center justify-between px-6 py-3 bg-dark-850/80 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('zod')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'zod'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
              }`}
            >
              Zod (src/env.ts)
            </button>
            <button
              onClick={() => setActiveTab('typescript')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'typescript'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
              }`}
            >
              TypeScript (env.d.ts)
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'json'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
              }`}
            >
              JSON Schema
            </button>
            <button
              onClick={() => setActiveTab('example')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'example'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
              }`}
            >
              .env.example
            </button>
          </div>

          <div className="flex items-center gap-2">
            {exportMessage && (
              <span className="text-xs text-emerald-400 font-medium animate-fade-in">{exportMessage}</span>
            )}
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-200 border border-slate-700 transition-colors"
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
        <div className="flex-1 overflow-auto p-6 bg-dark-950 font-mono text-xs text-slate-300">
          {loading ? (
            <div className="py-20 text-center text-slate-500">Generating type-safe schema...</div>
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

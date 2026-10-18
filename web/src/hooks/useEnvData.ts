import { useState, useEffect, useMemo, useCallback } from 'react';

export type CellStatus =
  | 'OK'
  | 'MISSING'
  | 'DRIFTED'
  | 'TYPE_MISMATCH'
  | 'SECRET_EXPOSED'
  | 'ORPHANED'
  | 'UNDECLARED';

export interface ParityCell {
  value?: string;
  status: CellStatus;
  inferredType?: string;
  reason?: string;
  sourceFile?: string;
  line?: number;
}

export interface CodeReference {
  filePath: string;
  line: number;
  column: number;
  variable: string;
  language: string;
  snippet: string;
}

export interface SecretFinding {
  key: string;
  valueMasked: string;
  ruleName: string;
  severity: 'high' | 'critical' | 'warning';
  entropy: number;
  description: string;
}

export interface ParityMatrixRow {
  key: string;
  inferredType: string;
  suggestedDefault?: string;
  description?: string;
  environments: Record<string, ParityCell>;
  codeReferences: CodeReference[];
  isOrphaned: boolean;
  isUndeclared: boolean;
  secretFinding?: SecretFinding;
}

export interface ParitySummary {
  totalVariables: number;
  missingVariablesCount: number;
  driftCount: number;
  secretCount: number;
  orphanedCount: number;
  undeclaredCount: number;
  parityScore: number;
}

export interface ParityReport {
  rows: ParityMatrixRow[];
  environments: string[];
  summary: ParitySummary;
  timestamp: string;
  workspacePath: string;
}

export function useEnvData() {
  const [report, setReport] = useState<ParityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRow, setSelectedRow] = useState<ParityMatrixRow | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/matrix');
      if (!res.ok) {
        throw new Error(`Failed to fetch parity matrix: ${res.statusText}`);
      }
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, []);

  const rescan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rescan', { method: 'POST' });
      if (!res.ok) throw new Error('Rescan failed');
      const data = await res.json();
      setReport(data.report);
    } catch (err: any) {
      setError(err.message || 'Rescan failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filteredRows = useMemo(() => {
    if (!report) return [];

    return report.rows.filter((row) => {
      // Search filter
      const matchesSearch =
        row.key.toLowerCase().includes(search.toLowerCase()) ||
        (row.description && row.description.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === 'all') return true;
      if (statusFilter === 'missing') {
        return Object.values(row.environments).some((c) => c.status === 'MISSING');
      }
      if (statusFilter === 'drift') {
        return Object.values(row.environments).some((c) => c.status === 'TYPE_MISMATCH' || c.status === 'DRIFTED');
      }
      if (statusFilter === 'secrets') {
        return !!row.secretFinding;
      }
      if (statusFilter === 'orphaned') {
        return row.isOrphaned;
      }
      if (statusFilter === 'undeclared') {
        return row.isUndeclared;
      }
      if (statusFilter === 'ok') {
        return (
          !row.secretFinding &&
          !row.isOrphaned &&
          !row.isUndeclared &&
          Object.values(row.environments).every((c) => c.status === 'OK')
        );
      }

      return true;
    });
  }, [report, search, statusFilter]);

  return {
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
    fetchReport,
    rescan,
  };
}

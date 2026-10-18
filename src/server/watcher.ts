import fs from 'node:fs';
import path from 'node:path';

export interface WatcherOptions {
  workspacePath: string;
  onChanged: (filePath: string) => void;
  debounceMs?: number;
}

const RELEVANT_EXTENSIONS = new Set([
  '.env',
  '.local',
  '.development',
  '.staging',
  '.production',
  '.test',
  '.example',
  '.yaml',
  '.yml',
  '.tfvars',
  '.json',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.go',
]);

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.turbo',
]);

export function startWorkspaceWatcher(options: WatcherOptions): { close: () => void } {
  const rootDir = path.resolve(options.workspacePath);
  const debounceMs = options.debounceMs ?? 350;
  let debounceTimer: NodeJS.Timeout | null = null;
  let watcher: fs.FSWatcher | null = null;

  try {
    watcher = fs.watch(
      rootDir,
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return;

        // Check if file is in an ignored directory
        const normalized = filename.replace(/\\/g, '/');
        const segments = normalized.split('/');
        for (const segment of segments) {
          if (IGNORED_DIRS.has(segment)) {
            return;
          }
        }

        // Check file extension or name
        const ext = path.extname(filename).toLowerCase();
        const base = path.basename(filename).toLowerCase();
        const isDotenv = base.startsWith('.env');
        const isRelevant = isDotenv || RELEVANT_EXTENSIONS.has(ext);

        if (!isRelevant) {
          return;
        }

        // Debounce event
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          options.onChanged(path.join(rootDir, filename));
        }, debounceMs);
      }
    );
  } catch (err) {
    console.error('File watcher could not be initialized:', err);
  }

  return {
    close: () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (watcher) watcher.close();
    },
  };
}

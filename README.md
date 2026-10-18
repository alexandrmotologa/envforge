<p align="center">
  <img src="docs/images/envforge_logo.svg" alt="EnvForge Logo" width="650"/>
</p>

<p align="center">
  <strong>Cross-Environment Configuration and Secret Parity Auditor with Drift Detection and Type-Safe Schema Generation</strong>
</p>

<p align="center">
  <a href="https://github.com/alexandrmotologa/envforge/actions"><img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square" alt="Build Status"/></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D22.0.0-blue?style=flat-square" alt="Node Version"/></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/typescript-5.8-blue?style=flat-square" alt="TypeScript"/></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/react-19-61dafb?style=flat-square" alt="React 19"/></a>
  <a href="https://zod.dev"><img src="https://img.shields.io/badge/schema-zod-3068b7?style=flat-square" alt="Zod"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License"/></a>
</p>

---

## Overview

EnvForge audits environment configurations across multiple formats and execution tiers. It resolves configuration discrepancies by providing:

1. **Multi-Format Configuration Ingestion**: parses `.env.*`, `docker-compose.yml`, Kubernetes ConfigMaps and Secrets, and Terraform `.tfvars`.
2. **Cross-Environment Parity Matrix**: constructs a unified alignment grid across Local, Development, Staging, and Production environments, classifying missing, drifted, and type-mismatched keys.
3. **1-to-1 Visual Diff Mode**: direct side-by-side comparison between any two environments, tracking identical values, drifted configurations, and missing keys with one-click transfer.
4. **AST Codebase Reference Scanner**: parses TypeScript, JavaScript, Python, and Go source code to track exact variable usage, flagging ghost variables used in code but absent from configuration templates.
5. **Secret Leak Detection**: calculates Shannon entropy and validates against deterministic token signatures to prevent accidental exposure of production credentials in local or example files.
6. **Type-Safe Schema Synthesizer**: automatically generates executable validation modules for Zod, T3-Env, Valibot, Python Pydantic Settings (`BaseSettings`), TypeScript global declarations, JSON Schemas, and sanitized `.env.example` templates.
7. **CI Gating and Pre-Commit Hooks**: blocks pull requests on drift using strict exit codes, writes Markdown job summaries to `$GITHUB_STEP_SUMMARY`, and installs pre-commit hooks via `envforge init-hook`.
8. **Interactive Web Studio with Live Watcher**: local web dashboard with real-time file monitoring over Server-Sent Events (SSE), in-place cell editing, and secret masking.

---

## Demo

<p align="center">
  <img src="docs/images/envforge_demo.gif" alt="EnvForge Interactive Studio Demo" width="100%"/>
</p>

---

## Visual Studio Highlights

<p align="center">
  <img src="docs/images/envforge_matrix.png" alt="Parity Matrix Grid" width="100%"/>
  <em>Figure 1: Cross-environment parity grid with real-time status indicators, in-place cell editing, and drift alerts.</em>
</p>

<p align="center">
  <img src="docs/images/envforge_code_trace.png" alt="Codebase AST Trace Drawer" width="100%"/>
  <em>Figure 2: AST code reference drawer displaying exact file paths, line numbers, and context snippets.</em>
</p>

<p align="center">
  <img src="docs/images/envforge_schema_export.png" alt="Type-Safe Schema Export Modal" width="100%"/>
  <em>Figure 3: Schema generator supporting Zod, T3-Env, Valibot, Python Pydantic Settings, TypeScript, JSON Schema, and .env.example.</em>
</p>

<p align="center">
  <img src="docs/images/envforge_sync.png" alt="1-Click Environment Sync" width="100%"/>
  <em>Figure 4: 1-Click synchronization dialog to align missing keys across environments.</em>
</p>

---

## Installation

### Global or NPX Execution
```bash
npx envforge check --strict
```

### Local Project Dependency
```bash
npm install -D envforge
```

---

## CLI Reference

### 1. Parity Check (CI/CD Gating)
Evaluate configuration consistency and exit with non-zero status when violations occur:
```bash
# General parity check
npx envforge check

# Fail pull requests if variables are missing in production or types drift
npx envforge check --fail-on-drift

# Fail if plaintext credentials or high-entropy tokens are exposed in non-production files
npx envforge check --fail-on-secrets

# Strict mode: fail on drift, secrets, or undeclared ghost variables
npx envforge check --strict --path ./services/api

# Output report into GitHub Actions step summary
npx envforge check --strict --github-summary
```

### 2. Git Pre-Commit Hook Setup
Install automated pre-commit verification to prevent secrets from entering version control:
```bash
# Auto-detects .husky or native .git hooks
npx envforge init-hook

# Explicitly install to Husky
npx envforge init-hook --husky
```

### 3. Comprehensive Diagnostic Audit
Print a formatted parity table directly in the terminal:
```bash
npx envforge audit
```

Export structured audit reports for CI pipelines:
```bash
# JSON output
npx envforge audit --json > parity-audit.json

# Markdown output
npx envforge audit --markdown > PARITY_REPORT.md
```

### 4. Codebase AST Reference Scan
Find all locations where environment variables are referenced in source files:
```bash
npx envforge scan --path ./src
```

Output:
```
🔍 Scanning source code AST in /workspace/src...

Found 7 distinct environment variables referenced in code:

  CACHE_TTL (1 references)
    src/server.ts:4:22 -> const { DB_POOL_SIZE, CACHE_TTL } = process.env;
  DATABASE_URL (1 references)
    src/server.ts:3:14 -> const dbUrl = process.env.DATABASE_URL;
  PORT (1 references)
    src/server.ts:1:13 -> const port = process.env.PORT || 3000;
  STRIPE_WEBHOOK_SECRET (1 references)
    src/server.ts:8:21 -> const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET;
```

### 5. Schema Generation
Synthesize ready-to-use validation files for multiple ecosystems:
```bash
# Generate Zod validation module
npx envforge generate --schema zod --out src/env.ts

# Generate T3-Env schema (server and client split)
npx envforge generate --schema t3 --out src/env.mjs

# Generate Valibot schema
npx envforge generate --schema valibot --out src/env.valibot.ts

# Generate Python Pydantic Settings class
npx envforge generate --schema pydantic --out settings.py

# Generate TypeScript global declarations
npx envforge generate --schema typescript --out src/env.d.ts

# Generate JSON Schema
npx envforge generate --schema json --out .env.schema.json

# Generate sanitized .env.example with masked secrets
npx envforge generate --schema example --out .env.example
```

### 6. 1-Click Synchronization
Append missing keys from other environments to a target file:
```bash
# Preview missing keys
npx envforge sync --target example --dry-run

# Patch missing keys into .env.example
npx envforge sync --target example

# Patch missing keys into staging configuration
npx envforge sync --target staging --file .env.staging
```

### 7. Interactive Web Studio
Launch the local web studio with visual parity grid, 1-to-1 diff mode, live file watcher, and AST explorer:
```bash
npx envforge studio --port 4300
```
Open your browser at `http://localhost:4300`.

---

## Generated Code Examples

### Zod Schema Output (`src/env.ts`)
```typescript
// Generated by EnvForge
import { z } from 'zod';

export const envSchema = z.object({
  /** HTTP server listening port */
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /** PostgreSQL connection URI */
  DATABASE_URL: z.string().url(),
  /** Enable debug telemetry */
  DEBUG: z.coerce.boolean().default(false),
  /** Secret API token */
  JWT_SECRET: z.string().min(1).default("<your-jwt-secret>"),
  /** Webhook signing key */
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(runtimeEnv: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(runtimeEnv);
  if (!result.success) {
    console.error('Environment variable validation failed:', JSON.stringify(result.error.format(), null, 2));
    throw new Error('Invalid environment variables configuration');
  }
  return result.data;
}

export const env = validateEnv();
```

### Python Pydantic Settings (`settings.py`)
```python
# Generated by EnvForge
from typing import Optional
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    DATABASE_URL: SecretStr = Field(..., description="PostgreSQL database connection string")
    PORT: int = Field(default=3000, ge=1, le=65535)
    DEBUG: bool = Field(default=False)
    JWT_SECRET: SecretStr = Field(...)
    STRIPE_WEBHOOK_SECRET: Optional[str] = Field(default=None)

settings = Settings()
```

---

## Programmatic API

EnvForge can be used programmatically in Node.js applications and custom test suites:

```typescript
import {
  discoverEnvironmentSources,
  scanCodebase,
  buildParityMatrix,
  compareTwoEnvironments,
  generateZodSchema,
  generatePydanticSettings,
  generateT3EnvSchema,
} from 'envforge';

// 1. Discover all configuration sources
const sources = await discoverEnvironmentSources(process.cwd());

// 2. Scan source code AST
const codeRefs = await scanCodebase(process.cwd());

// 3. Compute cross-environment parity matrix
const report = buildParityMatrix(sources, codeRefs);

console.log(`Parity Score: ${report.summary.parityScore}%`);
console.log(`Missing Keys: ${report.summary.missingVariablesCount}`);
console.log(`Secrets Exposed: ${report.summary.secretCount}`);

// 4. Compare two environments side-by-side
const diff = compareTwoEnvironments(report, 'local', 'production');
console.log(`Identical keys: ${diff.summary.identicalCount}`);
console.log(`Differing keys: ${diff.summary.differentCount}`);

// 5. Generate schemas
const zodCode = generateZodSchema(report.rows);
const pydanticCode = generatePydanticSettings(report.rows);
```

---

## Architecture

For an in-depth explanation of AST visitor algorithms, Shannon entropy detection formulas, and parser specifications, read [ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Testing

Run the automated test suite covering all parsers, AST visitors, secret detection rules, diff engines, and schema synthesizers:
```bash
npm test
```

---

## License

MIT License. Authored by Alexandr Motologa.

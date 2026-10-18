# EnvForge: Master Implementation Plan

> Cross-Environment Configuration and Secret Parity Auditor with Drift Detection and Type-Safe Schema Generation

Configuration synchronization and parity engine for microservices and full-stack applications. Ingests `.env`, Docker Compose, Kubernetes ConfigMaps/Secrets, and Terraform vars; detects configuration drift across environments; flags undeclared variables in source code; and synthesizes type-safe Zod and TypeScript schemas.

## 1. Project Overview and Architecture

Configuration drift creates preventable production failures:
1. Undocumented environment variables working on developer laptops but missing in staging or production.
2. Fragmented configuration formats split across `.env` files, `docker-compose.yml`, Kubernetes manifests, Helm values, and Terraform `.tfvars`.
3. Type mismatches, such as strings where numbers or booleans are expected, or malformed connection URIs.
4. Production API keys and credentials inadvertently committed or placed into local development files.
5. Deprecated configuration keys lingering in production long after the underlying code was removed.

EnvForge provides an automated parity matrix, codebase AST scanner, and schema synthesizer:
- Universal multi-format ingestion: `.env.*`, `docker-compose.yml`, Kubernetes ConfigMap and Secret YAML, Helm `values.yaml`, Terraform `.tfvars`, and cloud secret JSON dumps.
- Cross-environment parity matrix: maps every key across environments (Local, Dev, Staging, Production), identifying missing, drifted, type-mismatched, and orphaned keys.
- Codebase reference AST scanner: scans TypeScript, JavaScript, Python, and Go code to detect environment variable lookups, flagging variables used in code but missing from configurations.
- Automated type-safe schema synthesizer: infers strict Zod, TypeScript, and JSON Schema files with automatic type detection for ports, URLs, booleans, enums, numbers, and emails.
- CI gating and interactive studio: exits with failure codes on drift in CI pipelines, and provides an interactive web UI with visual matrix inspection and 1-click synchronization.

```
+-----------------------------------------------------------------------------------+
|                                     ENVFORGE                                      |
+-----------------------------------------+-----------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                                                   |
+-------v-------------------------+                 +-----------------------v-------+
|   Multi-Format Ingestion Engine |                 |     Codebase AST Scanner      |
|  * .env.* (dotenv parser)       |                 |  * TS/JS (process.env.*)      |
|  * docker-compose.yml           |                 |  * Python (os.environ/getenv) |
|  * K8s ConfigMap & Secret YAML  |                 |  * Go (os.Getenv, LookupEnv)  |
|  * Terraform .tfvars            |                 |  * Undeclared Key Detection   |
+-------+-------------------------+                 +-----------------------+-------+
        |                                                                   |
        +---------------------------------+---------------------------------+
                                          |
                        +-----------------v-----------------+
                        |    Parity & Drift Matrix Engine   |
                        |  * Key Existence Across Envs      |
                        |  * Type & Format Validation       |
                        |  * Plaintext Secret Leak Warning  |
                        |  * Orphaned Variable Identifier   |
                        +-----------------+-----------------+
                                          |
                        +-----------------v-----------------+
                        |    Type-Safe Schema Synthesizer   |
                        |  * Strict Zod Schema Generator    |
                        |  * TypeScript Type Declarations   |
                        |  * JSON Schema / .env.example Gen |
                        +-----------------+-----------------+
                                          |
                        +-----------------v-----------------+
                        |   Interactive Web Studio & CLI    |
                        |  * Visual Parity Heatmap Grid     |
                        |  * 1-Click Sync & .env.example Fix|
                        |  * CI Gating (--fail-on-drift)    |
                        +-----------------------------------+
```

## 2. Directory Structure

```
envforge/
├── src/
│   ├── types/
│   │   └── index.ts              # Core domain models, entry types, matrix interfaces
│   ├── parsers/
│   │   ├── dotenv.ts             # Dotenv parser with comments, multiline, expansions
│   │   ├── compose.ts            # Docker Compose parser (mapping & sequence envs)
│   │   ├── kubernetes.ts         # Kubernetes ConfigMap and Secret parser (b64 decoder)
│   │   ├── terraform.ts          # Terraform .tfvars and .tfvars.json parser
│   │   └── detector.ts           # Auto-discovery and environment grouping engine
│   ├── scanner/
│   │   ├── js_scanner.ts         # Babel AST parser for TS/JS process.env & import.meta
│   │   ├── python_scanner.ts     # Python AST/regex scanner for os.environ & os.getenv
│   │   ├── go_scanner.ts         # Go scanner for os.Getenv and os.LookupEnv
│   │   └── orchestrator.ts       # Workspace scanner with ignore rules and ghost detector
│   ├── matrix/
│   │   ├── type_infer.ts         # Inferred type classifier (port, url, bool, num, enum)
│   │   ├── secret_detector.ts    # Shannon entropy and deterministic token patterns
│   │   ├── comparator.ts         # Parity matrix constructor and score calculator
│   │   └── drift_rules.ts        # Drift severity and failure conditions
│   ├── generator/
│   │   ├── zod.ts                # Type-safe Zod schema code synthesizer
│   │   ├── typescript.ts         # ProcessEnv interface declaration generator
│   │   ├── json_schema.ts        # Standard JSON Schema (.env.schema.json) generator
│   │   ├── example.ts            # Sanitized .env.example template generator
│   │   └── sync.ts               # Synchronization and auto-fix patch generator
│   ├── server/
│   │   ├── api.ts                # Fastify backend REST API
│   │   └── static.ts             # Static asset server for embedded web studio
│   └── cli.ts                    # Commander CLI entry point (check, audit, scan, generate, studio)
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ParityMatrixGrid.tsx  # Interactive parity grid with filters and badges
│   │   │   ├── DriftAlertCard.tsx    # Priority alert drawer for drift and secrets
│   │   │   ├── CodebaseAuditView.tsx # AST trace explorer with code line context
│   │   │   ├── SchemaExportModal.tsx # Live code preview and copy for Zod and TS
│   │   │   └── QuickSyncModal.tsx    # 1-click sync dialog for missing keys
│   │   ├── hooks/
│   │   │   └── useEnvData.ts         # Data fetching, search, and filter state
│   │   ├── App.tsx                   # Main studio application layout
│   │   ├── index.css                 # Tailwind CSS styles and custom styling
│   │   └── main.tsx                  # React 19 mount point
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── tests/
│   ├── parsers.test.ts           # Tests for dotenv, compose, k8s, tfvars
│   ├── scanner.test.ts           # Tests for JS/TS, Python, Go AST references
│   ├── type_infer.test.ts        # Tests for type classification
│   ├── secret_detector.test.ts   # Tests for entropy and secret regexes
│   ├── comparator.test.ts        # Tests for parity matrix and drift rules
│   └── generator.test.ts         # Tests for Zod, TS, JSON Schema, and example generation
├── docs/
│   ├── ARCHITECTURE.md           # Detailed architecture breakdown
│   └── images/                   # Screenshots and demo recording
├── package.json
├── tsconfig.json
└── README.md
```

## 3. Implementation Roadmap and Checklist

- [x] **Task 1: Project Initialization and Infrastructure**
  - [x] Initialize root `package.json` with Node.js 22+ engine requirements.
  - [x] Configure `tsconfig.json` for ESM and strict type checking.
  - [x] Install core dependencies (`zod`, `dotenv`, `yaml`, `@babel/parser`, `@babel/traverse`, `commander`, `picocolors`, `fastify`, `@fastify/cors`, `@fastify/static`).
  - [x] Setup Vitest for automated testing.
  - [x] Define core TypeScript interfaces and domain types in `src/types/index.ts`.

- [x] **Task 2: Universal Multi-Format Configuration Parsers**
  - [x] Implement `src/parsers/dotenv.ts` with support for comments, unquoted values, multiline strings, and variable expansions.
  - [x] Implement `src/parsers/compose.ts` for Docker Compose environment mappings and arrays.
  - [x] Implement `src/parsers/kubernetes.ts` for ConfigMap and Secret manifests with base64 decoding.
  - [x] Implement `src/parsers/terraform.ts` for `.tfvars` variable assignments.
  - [x] Implement `src/parsers/detector.ts` for automatic workspace file discovery and environment mapping.
  - [x] Write comprehensive unit tests in `tests/parsers.test.ts`.

- [x] **Task 3: Codebase Reference AST Scanner**
  - [x] Implement `src/scanner/js_scanner.ts` with Babel AST traversal for `process.env`, `import.meta.env`, and destructuring patterns.
  - [x] Implement `src/scanner/python_scanner.ts` for `os.environ` and `os.getenv`.
  - [x] Implement `src/scanner/go_scanner.ts` for `os.Getenv` and `os.LookupEnv`.
  - [x] Implement `src/scanner/orchestrator.ts` with `.gitignore` filtering and ghost variable detection.
  - [x] Write unit tests in `tests/scanner.test.ts`.

- [x] **Task 4: Type Inference, Secret Detection, and Parity Comparator**
  - [x] Implement `src/matrix/type_infer.ts` for port, URL, email, boolean, number, enum, and string classification.
  - [x] Implement `src/matrix/secret_detector.ts` with Shannon entropy calculations and deterministic token regex patterns.
  - [x] Implement `src/matrix/drift_rules.ts` defining drift conditions and severity levels.
  - [x] Implement `src/matrix/comparator.ts` constructing the complete parity matrix and scoring.
  - [x] Write unit tests in `tests/type_infer.test.ts`, `tests/secret_detector.test.ts`, and `tests/comparator.test.ts`.

- [x] **Task 5: Schema and Template Synthesizers**
  - [x] Implement `src/generator/zod.ts` producing valid, executable Zod validation modules.
  - [x] Implement `src/generator/typescript.ts` producing `env.d.ts` declaration files.
  - [x] Implement `src/generator/json_schema.ts` producing standard JSON Schema definitions.
  - [x] Implement `src/generator/example.ts` generating clean `.env.example` templates with sanitized placeholders.
  - [x] Implement `src/generator/sync.ts` for synchronizing missing keys between environments.
  - [x] Write unit tests in `tests/generator.test.ts`.

- [x] **Task 6: Fastify Server and Web Studio**
  - [x] Implement `src/server/api.ts` with REST endpoints (`/api/matrix`, `/api/references`, `/api/schemas`, `/api/sync`, `/api/rescan`).
  - [x] Scaffold React 19 web application in `web/` using Vite and Tailwind CSS.
  - [x] Implement `ParityMatrixGrid.tsx` with search, filter badges, and detailed cell inspection.
  - [x] Implement `DriftAlertCard.tsx` displaying critical drift warnings and exposed secrets.
  - [x] Implement `CodebaseAuditView.tsx` with file path, line numbers, and code context.
  - [x] Implement `SchemaExportModal.tsx` with live schema generation and copy actions.
  - [x] Build production assets into `dist/web` and wire up static serving in `src/server/static.ts`.

- [x] **Task 7: Command Line Interface (CLI)**
  - [x] Implement `src/cli.ts` with commands: `check`, `audit`, `scan`, `generate`, and `studio`.
  - [x] Add ANSI color output, structured error exit codes for CI/CD pipelines, and JSON/Markdown export formats.
  - [x] Test all CLI commands against fixture projects.

- [x] **Task 8: Documentation, Real Assets, and Release Validation**
  - [x] Create detailed `README.md` following humanizer principles with architecture diagrams and usage guides.
  - [x] Create `docs/ARCHITECTURE.md`.
  - [x] Generate real UI screenshots and terminal recordings.
  - [x] Create animated demo GIF (`docs/images/envforge_demo.gif`).
  - [x] Run full test suite, verify 100% pass rate, and push commits to GitHub.

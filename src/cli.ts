#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import { Command } from 'commander';
import pc from 'picocolors';
import { discoverEnvironmentSources } from './parsers/detector.js';
import { scanCodebase, findGhostVariables } from './scanner/orchestrator.js';
import { buildParityMatrix } from './matrix/comparator.js';
import { generateZodSchema } from './generator/zod.js';
import { generateTypeScriptDeclarations } from './generator/typescript.js';
import { generateJsonSchema } from './generator/json_schema.js';
import { generateEnvExample } from './generator/example.js';
import { appendMissingKeysToEnvFile, getMissingKeysForEnv } from './generator/sync.js';
import { createServer } from './server/api.js';
import { registerStaticFrontend } from './server/static.js';

const program = new Command();

program
  .name('envforge')
  .description('Cross-environment configuration parity auditor and drift detector with AST source scanning and type-safe Zod schema generation.')
  .version('1.0.0');

// Command: check
program
  .command('check')
  .description('Verify configuration parity across environments and exit with failure on drift')
  .option('-p, --path <path>', 'Workspace directory path', '.')
  .option('--fail-on-drift', 'Exit with code 1 if configuration drift or missing keys are found')
  .option('--fail-on-secrets', 'Exit with code 2 if plaintext secrets are found in non-prod environments')
  .option('--strict', 'Fail on any drift, missing keys, exposed secrets, or ghost code references')
  .action(async (options) => {
    const cwd = path.resolve(options.path);
    console.log(pc.cyan(`\n🔍 EnvForge Parity Check: ${cwd}\n`));

    const sources = await discoverEnvironmentSources(cwd);
    const codeRefs = await scanCodebase(cwd);
    const report = buildParityMatrix(sources, codeRefs, cwd);

    printSummaryBanner(report);

    let hasDriftOrMissing = report.summary.missingVariablesCount > 0 || report.summary.driftCount > 0;
    let hasSecrets = report.summary.secretCount > 0;
    let hasGhosts = report.summary.undeclaredCount > 0;

    if (hasSecrets) {
      console.log(pc.red(`\n🚨 CRITICAL: ${report.summary.secretCount} exposed secrets detected!`));
      for (const row of report.rows) {
        if (row.secretFinding) {
          console.log(`  - ${pc.bold(row.key)}: ${row.secretFinding.ruleName} (${row.secretFinding.valueMasked})`);
        }
      }
    }

    if (hasDriftOrMissing) {
      console.log(pc.yellow(`\n⚠️  Configuration Drift Detected:`));
      for (const row of report.rows) {
        const missingIn = Object.entries(row.environments)
          .filter(([_, cell]) => cell.status === 'MISSING')
          .map(([env]) => env);
        if (missingIn.length > 0) {
          console.log(`  - ${pc.bold(row.key)}: Missing in [${missingIn.join(', ')}]`);
        }
      }
    }

    if (hasGhosts) {
      console.log(pc.magenta(`\n👻 Ghost Variables in Code (referenced in AST but not in configs):`));
      for (const row of report.rows) {
        if (row.isUndeclared) {
          console.log(`  - ${pc.bold(row.key)} (${row.codeReferences.length} references in source code)`);
        }
      }
    }

    if (options.strict && (hasDriftOrMissing || hasSecrets || hasGhosts)) {
      console.log(pc.red(`\n❌ Strict check failed! Run "envforge audit" or "envforge studio" to resolve.\n`));
      process.exit(1);
    }

    if (options.failOnSecrets && hasSecrets) {
      console.log(pc.red(`\n❌ Secret check failed! Plaintext credentials found in non-production configurations.\n`));
      process.exit(2);
    }

    if (options.failOnDrift && hasDriftOrMissing) {
      console.log(pc.red(`\n❌ Parity drift check failed! Environments are not in sync.\n`));
      process.exit(1);
    }

    console.log(pc.green(`\n✅ Parity check passed! (Score: ${report.summary.parityScore}%)\n`));
  });

// Command: audit
program
  .command('audit')
  .description('Generate comprehensive diagnostic report of configurations, secrets, and AST references')
  .option('-p, --path <path>', 'Workspace directory path', '.')
  .option('--json', 'Output full report in JSON format')
  .option('--markdown', 'Output report in Markdown format')
  .action(async (options) => {
    const cwd = path.resolve(options.path);
    const sources = await discoverEnvironmentSources(cwd);
    const codeRefs = await scanCodebase(cwd);
    const report = buildParityMatrix(sources, codeRefs, cwd);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    if (options.markdown) {
      console.log(generateMarkdownReport(report));
      return;
    }

    printTerminalAuditReport(report);
  });

// Command: scan
program
  .command('scan')
  .description('AST scan codebase for process.env and os.environ references')
  .option('-p, --path <path>', 'Workspace directory path', '.')
  .action(async (options) => {
    const cwd = path.resolve(options.path);
    console.log(pc.cyan(`\n🔍 Scanning source code AST in ${cwd}...\n`));

    const codeRefs = await scanCodebase(cwd);
    console.log(`Found ${pc.bold(codeRefs.size.toString())} distinct environment variables referenced in code:\n`);

    for (const [varName, refs] of Array.from(codeRefs.entries()).sort()) {
      console.log(pc.bold(pc.cyan(`  ${varName}`)) + ` (${refs.length} references)`);
      for (const ref of refs.slice(0, 3)) {
        console.log(`    ${pc.dim(`${ref.filePath}:${ref.line}:${ref.column}`)} -> ${pc.dim(ref.snippet)}`);
      }
      if (refs.length > 3) {
        console.log(`    ${pc.dim(`... and ${refs.length - 3} more occurrences`)}`);
      }
    }
    console.log('');
  });

// Command: generate
program
  .command('generate')
  .description('Synthesize type-safe schema or sanitized configuration templates')
  .option('-s, --schema <type>', 'Schema format: zod, typescript, json, example', 'zod')
  .option('-o, --out <file>', 'Output destination file path')
  .option('-p, --path <path>', 'Workspace directory path', '.')
  .action(async (options) => {
    const cwd = path.resolve(options.path);
    const sources = await discoverEnvironmentSources(cwd);
    const codeRefs = await scanCodebase(cwd);
    const report = buildParityMatrix(sources, codeRefs, cwd);

    let output = '';
    const format = options.schema.toLowerCase();

    switch (format) {
      case 'zod':
        output = generateZodSchema(report.rows);
        break;
      case 'typescript':
      case 'ts':
        output = generateTypeScriptDeclarations(report.rows);
        break;
      case 'json':
        output = generateJsonSchema(report.rows);
        break;
      case 'example':
      case 'env':
        output = generateEnvExample(report.rows);
        break;
      default:
        console.error(pc.red(`Error: Unknown schema format "${options.schema}". Choose from: zod, typescript, json, example`));
        process.exit(1);
    }

    if (options.out) {
      const outPath = path.resolve(cwd, options.out);
      const dir = path.dirname(outPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outPath, output, 'utf8');
      console.log(pc.green(`✓ Successfully synthesized ${format} schema to: ${outPath}`));
    } else {
      console.log(output);
    }
  });

// Command: sync
program
  .command('sync')
  .description('Synchronize missing keys to target environment files')
  .requiredOption('-t, --target <env>', 'Target environment name (e.g. example, staging, production, local)')
  .option('-f, --file <path>', 'Target file path override (e.g. .env.example)')
  .option('-p, --path <path>', 'Workspace directory path', '.')
  .option('--dry-run', 'Preview missing keys without writing to disk')
  .action(async (options) => {
    const cwd = path.resolve(options.path);
    const sources = await discoverEnvironmentSources(cwd);
    const codeRefs = await scanCodebase(cwd);
    const report = buildParityMatrix(sources, codeRefs, cwd);

    const missingKeys = getMissingKeysForEnv(report.rows, options.target);
    if (missingKeys.length === 0) {
      console.log(pc.green(`\n✓ Target environment "${options.target}" is already 100% in sync with all keys.\n`));
      return;
    }

    console.log(pc.cyan(`\nFound ${missingKeys.length} missing keys for environment "${options.target}":`));
    for (const item of missingKeys) {
      console.log(`  + ${item.key} (${item.comment || 'inferred'})`);
    }

    if (options.dryRun) {
      console.log(pc.dim(`\nDry run mode enabled. No files were modified.\n`));
      return;
    }

    let targetFile = options.file;
    if (!targetFile) {
      if (options.target === 'example') {
        targetFile = path.join(cwd, '.env.example');
      } else {
        targetFile = path.join(cwd, `.env.${options.target}`);
      }
    } else {
      targetFile = path.resolve(cwd, targetFile);
    }

    const res = appendMissingKeysToEnvFile(targetFile, missingKeys);
    console.log(pc.green(`\n✓ Appended ${res.added.length} keys to ${res.filePath}\n`));
  });

// Command: studio
program
  .command('studio')
  .description('Launch interactive EnvForge Web Studio')
  .option('-p, --port <port>', 'Server port', '4300')
  .option('-h, --host <host>', 'Server host', 'localhost')
  .option('-d, --dir <dir>', 'Workspace directory path', '.')
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const host = options.host;
    const workspacePath = path.resolve(options.dir);

    console.log(pc.cyan(`\n⚡ Starting EnvForge Web Studio...`));
    console.log(pc.dim(`Workspace: ${workspacePath}\n`));

    const server = await createServer({ workspacePath, port, host });
    await registerStaticFrontend(server);

    await server.listen({ port, host });
    const url = `http://${host}:${port}`;
    console.log(pc.green(`✓ Studio is live at: `) + pc.bold(pc.underline(url)));
    console.log(pc.dim(`Press Ctrl+C to terminate the studio.\n`));
  });

function printSummaryBanner(report: any) {
  const sum = report.summary;
  console.log(pc.bold(`Parity Score: `) + (sum.parityScore >= 90 ? pc.green(`${sum.parityScore}%`) : pc.yellow(`${sum.parityScore}%`)));
  console.log(`Environments Discovered: [${report.environments.join(', ')}]`);
  console.log(`Total Variables: ${sum.totalVariables} | Missing: ${sum.missingVariablesCount} | Drift: ${sum.driftCount} | Secrets: ${sum.secretCount} | Orphaned: ${sum.orphanedCount} | Undeclared: ${sum.undeclaredCount}`);
}

function printTerminalAuditReport(report: any) {
  printSummaryBanner(report);
  console.log(`\n${pc.bold('PARITY MATRIX GRID:')}`);
  const header = `  ${'KEY'.padEnd(25)} ${'TYPE'.padEnd(10)} ` + report.environments.map((e: string) => e.toUpperCase().padEnd(12)).join(' ');
  console.log(pc.dim(header));
  console.log(pc.dim('  ' + '-'.repeat(header.length)));

  for (const row of report.rows) {
    let line = `  ${row.key.padEnd(25)} ${row.inferredType.padEnd(10)} `;
    for (const env of report.environments) {
      const cell = row.environments[env];
      let statusStr = cell ? cell.status : '-';
      if (statusStr === 'OK') statusStr = pc.green('OK');
      else if (statusStr === 'MISSING') statusStr = pc.red('MISSING');
      else if (statusStr === 'SECRET_EXPOSED') statusStr = pc.bold(pc.red('LEAKED'));
      else if (statusStr === 'TYPE_MISMATCH') statusStr = pc.yellow('MISMATCH');
      line += statusStr.padEnd(12) + ' ';
    }
    console.log(line);
  }
  console.log('');
}

function generateMarkdownReport(report: any): string {
  const lines = [
    `# EnvForge Configuration Parity Audit Report`,
    ``,
    `> Generated at: ${report.timestamp}`,
    `> Workspace: \`${report.workspacePath}\``,
    ``,
    `## Summary`,
    `- **Parity Score**: ${report.summary.parityScore}%`,
    `- **Total Variables**: ${report.summary.totalVariables}`,
    `- **Missing Declarations**: ${report.summary.missingVariablesCount}`,
    `- **Type Drift**: ${report.summary.driftCount}`,
    `- **Exposed Secrets**: ${report.summary.secretCount}`,
    `- **Orphaned Variables**: ${report.summary.orphanedCount}`,
    `- **Ghost Variables in Code**: ${report.summary.undeclaredCount}`,
    ``,
    `## Parity Matrix`,
    `| Variable Key | Inferred Type | ${report.environments.map((e: string) => e.toUpperCase()).join(' | ')} | Code Traces |`,
    `| :--- | :--- | ${report.environments.map(() => ':---').join(' | ')} | :---: |`,
  ];

  for (const row of report.rows) {
    const envStatuses = report.environments.map((env: string) => {
      const cell = row.environments[env];
      return cell ? `\`${cell.status}\`` : '-';
    });
    lines.push(`| **\`${row.key}\`** | \`${row.inferredType}\` | ${envStatuses.join(' | ')} | ${row.codeReferences.length} |`);
  }

  return lines.join('\n');
}

program.parse(process.argv);

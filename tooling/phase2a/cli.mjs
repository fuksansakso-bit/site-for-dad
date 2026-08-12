#!/usr/bin/env node
import { auditLegacyData } from './audit.mjs';
import { exportLegacyData } from './legacy-export.mjs';
import { importToSupabase } from './supabase.mjs';
import { transformExport } from './transform.mjs';
import { verifyMigration } from './verify.mjs';

const command = process.argv[2];
const operations = {
  audit: auditLegacyData,
  export: exportLegacyData,
  import: importToSupabase,
  transform: transformExport,
  verify: verifyMigration,
};

try {
  const operation = operations[command];
  if (operation === undefined)
    throw new Error('Usage: node tooling/phase2a/cli.mjs <audit|export|transform|import|verify>');
  const result = await operation();
  const summary =
    command === 'audit'
      ? result.projection
      : command === 'export' || command === 'transform'
        ? result.manifest.counts
        : result;
  process.stdout.write(`${JSON.stringify({ command, result: summary, status: 'ok' })}\n`);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Phase 2A migration command failed'}\n`,
  );
  process.exitCode = 1;
}

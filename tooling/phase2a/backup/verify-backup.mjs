#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.local/phase-2a-backups');
const entries = await readdir(root, { withFileTypes: true });
const directories = entries
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(root, entry.name))
  .sort();
if (directories.length === 0) throw new Error(`No backup directories found under ${root}`);
let verifiedDatabase = 0;
let verifiedStorage = 0;
for (const directory of directories) {
  try {
    const manifest = JSON.parse(
      await readFile(path.join(directory, 'database-manifest.json'), 'utf8'),
    );
    const bytes = await readFile(path.join(directory, manifest.databaseFile));
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== manifest.sha256 || bytes.byteLength !== manifest.sizeBytes)
      throw new Error(`Database checksum mismatch: ${directory}`);
    verifiedDatabase += 1;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  try {
    const manifest = JSON.parse(
      await readFile(path.join(directory, 'storage-manifest.json'), 'utf8'),
    );
    if (!Array.isArray(manifest.objects) || manifest.objectCount !== manifest.objects.length)
      throw new Error(`Invalid storage manifest: ${directory}`);
    verifiedStorage += 1;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}
if (verifiedDatabase + verifiedStorage === 0)
  throw new Error('No verifiable backup manifests found');
process.stdout.write(
  `Backup manifests valid: database=${verifiedDatabase}, storage=${verifiedStorage}. Restore drill still requires a disposable project.\n`,
);

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const maximumScannedBytes = 2 * 1024 * 1024;
const textExtensions = new Set([
  '',
  '.cjs',
  '.css',
  '.env',
  '.example',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.ps1',
  '.sql',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

const signatures = [
  { name: 'private-key', pattern: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/g },
  { name: 'aws-access-key', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { name: 'github-token', pattern: /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{36,}\b/g },
  { name: 'google-api-key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: 'slack-token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { name: 'stripe-secret', pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  {
    name: 'credentialed-database-url',
    pattern: /\b(?:postgres(?:ql)?|mysql|redis):\/\/[^\s/:"']+:[^\s@"']+@/gi,
  },
];

const listed = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  {
    cwd: repositoryRoot,
    encoding: 'buffer',
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  },
);
const files = listed.toString('utf8').split('\0').filter(Boolean).sort();

const findings = [];
for (const repositoryPath of files) {
  const extension = extname(repositoryPath).toLowerCase();
  if (!textExtensions.has(extension) && !repositoryPath.endsWith('.env.example')) {
    continue;
  }
  const absolutePath = resolve(repositoryRoot, repositoryPath);
  const content = await readFile(absolutePath);
  if (content.byteLength > maximumScannedBytes || content.includes(0)) {
    continue;
  }
  const text = content.toString('utf8');
  for (const signature of signatures) {
    signature.pattern.lastIndex = 0;
    for (const match of text.matchAll(signature.pattern)) {
      const offset = match.index ?? 0;
      const line = text.slice(0, offset).split('\n').length;
      findings.push({ line, path: relative(repositoryRoot, absolutePath), type: signature.name });
    }
  }
}

if (findings.length > 0) {
  process.stderr.write('Potential committed secrets detected (values suppressed):\n');
  for (const finding of findings) {
    process.stderr.write(`- ${finding.path}:${finding.line} [${finding.type}]\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write(`Secret scan passed for ${files.length} repository files.\n`);
}

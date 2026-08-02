import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));

async function collectMarkdown(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      ['.git', '.local', '.next', '.turbo', 'coverage', 'dist', 'node_modules'].includes(entry.name)
    ) {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectMarkdown(path)));
    else if (entry.isFile() && extname(path).toLowerCase() === '.md') files.push(path);
  }
  return files;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
}

const markdownFiles = await collectMarkdown(repositoryRoot);
const errors = [];
const definitions = new Map();
const linkPattern = /!?\[[^\]]*\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^)]*["'])?\)/g;
const requirementPattern = /\*\*([A-Z][A-Z0-9_-]*-[0-9]{3,})\s+—\s+(?:MUST|SHOULD|MAY):\*\*/g;

for (const file of markdownFiles) {
  const repositoryPath = relative(repositoryRoot, file).replaceAll('\\', '/');
  const content = await readFile(file, 'utf8');
  if (repositoryPath.startsWith('docs/specs/') && content.trim().length === 0) {
    errors.push(`${repositoryPath}: empty normative specification is forbidden`);
  }

  for (const match of content.matchAll(requirementPattern)) {
    const previous = definitions.get(match[1]);
    if (previous !== undefined)
      errors.push(`${repositoryPath}: ${match[1]} is also defined in ${previous}`);
    else definitions.set(match[1], repositoryPath);
  }

  for (const match of content.matchAll(linkPattern)) {
    let target = match[1];
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    if (/^(?:https?:|mailto:|app:|#)/i.test(target)) continue;
    target = target.split('#', 1)[0];
    if (target === '') continue;
    let decoded;
    try {
      decoded = decodeURIComponent(target);
    } catch {
      errors.push(`${repositoryPath}: malformed link target ${target}`);
      continue;
    }
    const resolvedTarget = decoded.startsWith('/')
      ? resolve(repositoryRoot, `.${decoded}`)
      : resolve(dirname(file), decoded);
    if (!(await exists(resolvedTarget))) {
      errors.push(`${repositoryPath}: missing local link target ${target}`);
    }
  }
}

if (errors.length > 0) {
  process.stderr.write(
    ['Documentation validation failed:', ...errors.map((error) => `- ${error}`)].join('\n'),
  );
  process.stderr.write('\n');
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Documentation validation passed for ${markdownFiles.length} files and ${definitions.size} normative IDs.\n`,
  );
}

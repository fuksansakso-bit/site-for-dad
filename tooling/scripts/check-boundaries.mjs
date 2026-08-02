import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourceExtensions = new Set(['.cjs', '.js', '.jsx', '.mjs', '.mts', '.cts', '.ts', '.tsx']);

const allowedLayerDependencies = new Map([
  ['domain', new Set()],
  ['application', new Set(['contracts', 'domain'])],
  ['contracts', new Set()],
  ['config', new Set(['contracts'])],
  ['observability', new Set(['config', 'contracts'])],
  ['db', new Set(['application', 'config', 'contracts', 'domain', 'observability'])],
  ['storage', new Set(['application', 'config', 'contracts', 'domain', 'observability'])],
  ['jobs', new Set(['application', 'config', 'contracts', 'db', 'domain', 'observability'])],
  ['auth', new Set(['application', 'config', 'contracts', 'db', 'domain', 'observability'])],
  ['ui', new Set(['contracts'])],
  [
    'testing',
    new Set([
      'application',
      'auth',
      'config',
      'contracts',
      'db',
      'domain',
      'jobs',
      'observability',
      'storage',
      'ui',
    ]),
  ],
  ['tooling', new Set()],
  [
    'app',
    new Set([
      'application',
      'auth',
      'config',
      'contracts',
      'db',
      'domain',
      'jobs',
      'observability',
      'storage',
      'testing',
      'tooling',
      'ui',
    ]),
  ],
]);

async function pathExists(path) {
  try {
    await readFile(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function loadWorkspaceManifests() {
  const manifests = [];
  for (const workspaceType of ['apps', 'packages']) {
    const workspaceRoot = join(repositoryRoot, workspaceType);
    let entries = [];
    try {
      entries = await readdir(workspaceRoot, { withFileTypes: true });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const directory = join(workspaceRoot, entry.name);
      const manifestPath = join(directory, 'package.json');
      if (!(await pathExists(manifestPath))) {
        throw new Error(`${relative(repositoryRoot, directory)} has no package.json`);
      }
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      manifests.push({ directory, manifest, workspaceType });
    }
  }
  return manifests;
}

function validateMetadata(workspaces, errors) {
  for (const { directory, manifest, workspaceType } of workspaces) {
    const location = relative(repositoryRoot, directory);
    const metadata = manifest.projectName;
    if (typeof manifest.name !== 'string' || !manifest.name.startsWith('@project-name/')) {
      errors.push(`${location}: workspace name must use the @project-name scope`);
    }
    if (manifest.private !== true) {
      errors.push(`${location}: Phase 1A workspaces must be private`);
    }
    if (!metadata || typeof metadata.responsibility !== 'string' || !metadata.responsibility) {
      errors.push(`${location}: projectName.responsibility is required`);
    }
    const expectedLayer = workspaceType === 'apps' ? 'app' : metadata?.layer;
    if (!allowedLayerDependencies.has(expectedLayer)) {
      errors.push(`${location}: unknown boundary layer ${String(expectedLayer)}`);
    }
    for (const script of ['lint', 'test', 'typecheck']) {
      if (typeof manifest.scripts?.[script] !== 'string') {
        errors.push(`${location}: scripts.${script} is required`);
      }
    }
    if (workspaceType === 'packages') {
      if (!manifest.exports || Object.keys(manifest.exports).length === 0) {
        errors.push(`${location}: packages require an explicit public exports map`);
      }
      if (!Array.isArray(metadata?.publicInterface) || metadata.publicInterface.length === 0) {
        errors.push(`${location}: projectName.publicInterface is required`);
      }
    }
  }
}

function validateDependencyGraph(workspaces, errors) {
  const byName = new Map(workspaces.map((workspace) => [workspace.manifest.name, workspace]));
  const graph = new Map();

  for (const workspace of workspaces) {
    const runtimeDependencies = {
      ...workspace.manifest.dependencies,
      ...workspace.manifest.optionalDependencies,
      ...workspace.manifest.peerDependencies,
    };
    const devDependencies = workspace.manifest.devDependencies ?? {};
    const dependencies = {
      ...runtimeDependencies,
      ...devDependencies,
    };
    const workspaceDependencies = Object.keys(dependencies).filter((name) => byName.has(name));
    graph.set(workspace.manifest.name, workspaceDependencies);

    const sourceLayer =
      workspace.workspaceType === 'apps' ? 'app' : workspace.manifest.projectName.layer;
    const allowedTargets = allowedLayerDependencies.get(sourceLayer) ?? new Set();
    for (const dependencyName of workspaceDependencies) {
      const dependency = byName.get(dependencyName);
      const targetLayer =
        dependency.workspaceType === 'apps' ? 'app' : dependency.manifest.projectName.layer;
      const isDevelopmentSupport =
        Object.hasOwn(devDependencies, dependencyName) &&
        !Object.hasOwn(runtimeDependencies, dependencyName) &&
        ['testing', 'tooling'].includes(targetLayer);
      if (!allowedTargets.has(targetLayer) && !isDevelopmentSupport) {
        errors.push(
          `${workspace.manifest.name}: ${sourceLayer} must not depend on ${dependencyName} (${targetLayer})`,
        );
      }
      if (dependency.workspaceType === 'apps') {
        errors.push(`${workspace.manifest.name}: workspaces must not depend on an application`);
      }
      if (
        Object.hasOwn(runtimeDependencies, dependencyName) &&
        ['testing', 'tooling'].includes(targetLayer)
      ) {
        errors.push(
          `${workspace.manifest.name}: ${dependencyName} may be a development dependency only`,
        );
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(name, trail) {
    if (visiting.has(name)) {
      errors.push(`workspace dependency cycle: ${[...trail, name].join(' -> ')}`);
      return;
    }
    if (visited.has(name)) {
      return;
    }
    visiting.add(name);
    for (const dependency of graph.get(name) ?? []) {
      visit(dependency, [...trail, name]);
    }
    visiting.delete(name);
    visited.add(name);
  }
  for (const name of graph.keys()) {
    visit(name, []);
  }

  return byName;
}

async function collectSourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.next', '.turbo', 'coverage', 'dist', 'node_modules'].includes(entry.name)) {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path)));
    } else if (sourceExtensions.has(extname(entry.name))) {
      files.push(path);
    }
  }
  return files;
}

async function validateWorkspaceImports(workspaces, byName, errors) {
  const importPattern = /(?:from\s+|import\s*\(|require\s*\()\s*['"](@project-name\/[^'"/]+)[/'"]/g;
  for (const workspace of workspaces) {
    const declared = new Set([
      ...Object.keys(workspace.manifest.dependencies ?? {}),
      ...Object.keys(workspace.manifest.devDependencies ?? {}),
      ...Object.keys(workspace.manifest.optionalDependencies ?? {}),
      ...Object.keys(workspace.manifest.peerDependencies ?? {}),
    ]);
    for (const file of await collectSourceFiles(workspace.directory)) {
      const source = await readFile(file, 'utf8');
      for (const match of source.matchAll(importPattern)) {
        const importedWorkspace = match[1];
        if (byName.has(importedWorkspace) && !declared.has(importedWorkspace)) {
          errors.push(
            `${relative(repositoryRoot, file)} imports undeclared workspace ${importedWorkspace}`,
          );
        }
      }
    }
  }
}

const errors = [];
const workspaces = await loadWorkspaceManifests();
validateMetadata(workspaces, errors);
const byName = validateDependencyGraph(workspaces, errors);
await validateWorkspaceImports(workspaces, byName, errors);

if (errors.length > 0) {
  console.error(
    ['Package boundary validation failed:', ...errors.map((error) => `- ${error}`)].join('\n'),
  );
  process.exitCode = 1;
} else {
  console.log(`Package boundary validation passed for ${workspaces.length} workspace(s).`);
}

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  parseDatabaseEnvironment,
  parseIdentityEnvironment,
} from '../../packages/config/dist/server.js';
import { createSyntheticIdentityAdapter } from '../../packages/identity/dist/synthetic.js';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const sessionPath = resolve(
  process.env.CATALOG_OPERATOR_SESSION_PATH ??
    resolve(repositoryRoot, '.local/catalog-pilot/operator-sessions.json'),
);

async function readExistingSessions() {
  try {
    const value = JSON.parse(await readFile(sessionPath, 'utf8'));
    if (
      value?.schemaVersion !== 1 ||
      typeof value?.owner?.token !== 'string' ||
      typeof value?.admin?.token !== 'string'
    ) {
      return null;
    }
    return value;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    return null;
  }
}

async function sessionsRemainValid(identity, sessions) {
  if (sessions === null) return false;
  try {
    const [owner, admin] = await Promise.all([
      identity.authenticate({ kind: 'synthetic-session', token: sessions.owner.token }),
      identity.authenticate({ kind: 'synthetic-session', token: sessions.admin.token }),
    ]);
    return owner.roles.includes('OWNER') && admin.roles.includes('ADMIN');
  } catch {
    return false;
  }
}

async function createSessions(identity) {
  const tag = randomUUID();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1_000);
  const context = { correlationId: `catalog-operator-bootstrap-${tag}` };
  const owner = await identity.createActor({
    ...context,
    kind: 'HUMAN',
    roles: ['OWNER'],
    subject: `catalog-pilot-owner-${tag}`,
  });
  const admin = await identity.createActor({
    ...context,
    kind: 'HUMAN',
    roles: ['ADMIN'],
    subject: `catalog-pilot-admin-${tag}`,
  });
  const [ownerCredential, adminCredential] = await Promise.all([
    identity.issueCredential(owner.actorId, 'synthetic-session', expiresAt, context),
    identity.issueCredential(admin.actorId, 'synthetic-session', expiresAt, context),
  ]);
  return {
    admin: { actorId: admin.actorId, token: adminCredential.token },
    expiresAt: expiresAt.toISOString(),
    owner: { actorId: owner.actorId, token: ownerCredential.token },
    schemaVersion: 1,
  };
}

const identity = createSyntheticIdentityAdapter(
  parseDatabaseEnvironment(process.env),
  parseIdentityEnvironment(process.env),
);

try {
  let sessions = await readExistingSessions();
  let reused = await sessionsRemainValid(identity, sessions);
  if (!reused) {
    sessions = await createSessions(identity);
    await mkdir(dirname(sessionPath), { recursive: true });
    await writeFile(sessionPath, `${JSON.stringify(sessions, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'w',
    });
  }
  process.stdout.write(
    `${JSON.stringify({
      adminActorId: sessions.admin.actorId,
      expiresAt: sessions.expiresAt,
      ownerActorId: sessions.owner.actorId,
      reused,
      sessionFile: relative(repositoryRoot, sessionPath).replaceAll('\\', '/'),
    })}\n`,
  );
} catch (error) {
  const errorCode =
    error instanceof Error && 'code' in error && typeof error.code === 'string'
      ? error.code
      : 'CATALOG_OPERATOR_BOOTSTRAP_FAILED';
  process.stderr.write(`${JSON.stringify({ errorCode })}\n`);
  process.exitCode = 1;
} finally {
  await identity.close().catch(() => undefined);
}

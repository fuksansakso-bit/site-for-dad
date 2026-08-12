function decodeComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeConnectionString(rawConnection, explicitPassword) {
  const scheme = rawConnection.match(/^postgres(?:ql)?:\/\//u)?.[0];
  if (!scheme) throw new Error('Supabase database URL must use postgres:// or postgresql://');

  const authorityStart = scheme.length;
  const authorityEnd = rawConnection.lastIndexOf('@');
  if (authorityEnd <= authorityStart) throw new Error('Supabase database URL has no user info');

  const userInfo = rawConnection.slice(authorityStart, authorityEnd);
  const separator = userInfo.indexOf(':');
  const rawUsername = separator === -1 ? userInfo : userInfo.slice(0, separator);
  const embeddedPassword = separator === -1 ? '' : userInfo.slice(separator + 1);
  const password = explicitPassword || decodeComponent(embeddedPassword);
  if (!rawUsername || !password) {
    throw new Error('Supabase database URL and SUPABASE_DB_PASSWORD must provide credentials');
  }

  return `${scheme}${encodeURIComponent(decodeComponent(rawUsername))}:${encodeURIComponent(password)}@${rawConnection.slice(authorityEnd + 1)}`;
}

export function resolveSupabaseDatabaseUrl(environment = process.env) {
  const migrationUrl = environment.MIGRATION_DATABASE_URL?.trim();
  const directUrl = environment.SUPABASE_DB_URL?.trim();
  const explicitPassword = environment.SUPABASE_DB_PASSWORD;
  const rawConnection = migrationUrl || directUrl;
  if (!rawConnection) {
    throw new Error('SUPABASE_DB_URL (or MIGRATION_DATABASE_URL) is required');
  }

  return {
    connectionString: normalizeConnectionString(
      rawConnection,
      explicitPassword?.length ? explicitPassword : undefined,
    ),
    source: migrationUrl ? 'MIGRATION_DATABASE_URL' : 'SUPABASE_DB_URL',
  };
}

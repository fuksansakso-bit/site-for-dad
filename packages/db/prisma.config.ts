import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: process.env['MIGRATION_DATABASE_URL'] ?? '',
  },
  migrations: {
    path: process.env['PRISMA_MIGRATIONS_PATH'] ?? 'prisma/migrations',
  },
  schema: 'prisma/schema.prisma',
});

import { parseMigrationEnvironment } from '@project-name/config/server';

import { migrateFoundationJobs } from './adapter.js';

const environment = parseMigrationEnvironment(process.env);

await migrateFoundationJobs(
  environment.MIGRATION_DATABASE_URL,
  environment.WORKER_RUNTIME_DATABASE_ROLE,
  (event) => {
    const stream = event.level === 'error' ? process.stderr : process.stdout;
    stream.write(`${JSON.stringify(event)}\n`);
  },
);
process.stdout.write(
  `${JSON.stringify({ event: 'queue.migration.completed', level: 'info', service: 'jobs' })}\n`,
);

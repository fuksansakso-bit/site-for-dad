import {
  parseDatabaseEnvironment,
  parseObservabilityEnvironment,
  parseStorageEnvironment,
  parseWebServerEnvironment,
} from '@project-name/config/server';

import { initializeWebObservability } from './lib/observability';

export function registerNodeInstrumentation(): void {
  parseWebServerEnvironment(process.env);
  parseDatabaseEnvironment(process.env);
  parseStorageEnvironment(process.env);
  parseObservabilityEnvironment(process.env);
  initializeWebObservability();
}

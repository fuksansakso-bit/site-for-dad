import { parseWebServerEnvironment } from '@project-name/config/server';

export function register(): void {
  parseWebServerEnvironment(process.env);
}

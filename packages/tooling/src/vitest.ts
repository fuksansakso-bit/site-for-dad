import { defineConfig, mergeConfig, type ViteUserConfig } from 'vitest/config';

export const foundationTestDefaults = defineConfig({
  test: {
    clearMocks: true,
    environment: 'node',
    passWithNoTests: false,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});

export function defineFoundationTestConfig(overrides: ViteUserConfig = {}): ViteUserConfig {
  return mergeConfig(foundationTestDefaults, defineConfig(overrides));
}

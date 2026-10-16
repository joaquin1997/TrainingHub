import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // `modules/` holds plain-JS checks on native sources (not type-checked).
    include: ['src/**/*.test.ts', 'modules/**/*.test.mjs'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});

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
      // Runtime values from the domain come only through this path (spec 0032):
      // Metro cannot bundle the package index. Types still use `@workout/domain`.
      '@workout/domain/records': fileURLToPath(
        new URL('../../packages/domain/src/records.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});

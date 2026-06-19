import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs', 'tests/**/*.test.js', 'tests/**/*.test.ts'],
    testTimeout: 120_000,
  },
});

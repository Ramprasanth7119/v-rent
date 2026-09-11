/**
 * Tests run over the logic that decides things.
 *
 * Deliberately node-environment and unit-scoped: the value here is in the
 * functions that quietly get a decision wrong — a postal sector mapped to the
 * wrong district, a filter that excludes a sale by accident, a webhook
 * signature accepted when it should not be. Screens are checked by looking at
 * them; these cannot be.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The dev server and the test run share a machine that has already been
    // killed twice for memory; one fork is plenty for pure functions.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});

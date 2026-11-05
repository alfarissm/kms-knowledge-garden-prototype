import { defineConfig } from 'vitest/config';

// The standalone simulator has its own Node test runner and deployment.
export default defineConfig({
  test: { include: ['tests/**/*.test.js'] },
});

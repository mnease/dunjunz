import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { version: appVersion } = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8'),
) as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
  },
});

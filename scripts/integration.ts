import { spawn, spawnSync } from 'node:child_process';
import { testDatabaseUrl } from './test-env';
const env = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl(),
  AI_PROVIDER: 'mock',
  DEMO_CUSTOMER_REPLIES: 'true',
  APP_ORIGIN: 'http://localhost:3100',
  LOG_LEVEL: 'silent',
  NEXT_TELEMETRY_DISABLED: '1',
};
const migration = spawnSync('npm', ['run', 'db:migrate'], {
  env,
  stdio: 'inherit',
});
if (migration.status !== 0) process.exit(migration.status ?? 1);
const servers = [3100, 3102].map((port) =>
  spawn('npm', ['run', 'start', '--', '--port', String(port)], {
    env: {
      ...env,
      DEMO_CUSTOMER_REPLIES: port === 3100 ? 'true' : 'false',
      APP_ORIGIN: `http://localhost:${port}`,
    },
    stdio: 'inherit',
    detached: true,
  }),
);
try {
  for (const [index, port] of [3100, 3102].entries()) {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (servers[index]!.exitCode !== null)
        throw new Error('Test server exited.');
      try {
        if ((await fetch(`http://localhost:${port}/api/health`)).ok) {
          ready = true;
          break;
        }
      } catch {
        /* Waiting for server */
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error('Integration server did not become ready.');
  }
  const result = spawnSync(
    'npx',
    ['vitest', 'run', '--config', 'vitest.integration.config.ts'],
    {
      env: {
        ...env,
        TEST_BASE_URL: 'http://localhost:3100',
        TEST_DISABLED_BASE_URL: 'http://localhost:3102',
      },
      stdio: 'inherit',
    },
  );
  process.exitCode = result.status ?? 1;
} finally {
  for (const server of servers)
    if (server.pid) {
      try {
        process.kill(-server.pid, 'SIGTERM');
      } catch {
        /* Already exited */
      }
    }
}

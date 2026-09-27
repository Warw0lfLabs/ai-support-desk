import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
it.each(['100', '20000'])(
  'accepts bounded provider timeout %s',
  async (value) => {
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://support:placeholder@localhost/demo',
    );
    vi.stubEnv('AI_PROVIDER', 'mock');
    vi.stubEnv('AI_TIMEOUT_MS', value);
    const { getEnv } = await import('../../src/server/config/env');
    expect(getEnv().AI_TIMEOUT_MS).toBe(Number(value));
  },
);
it.each(['99', '20001', '30000'])(
  'rejects provider timeout without headroom %s',
  async (value) => {
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://support:placeholder@localhost/demo',
    );
    vi.stubEnv('AI_PROVIDER', 'mock');
    vi.stubEnv('AI_TIMEOUT_MS', value);
    const { getEnv } = await import('../../src/server/config/env');
    expect(() => getEnv()).toThrow('Invalid server configuration');
  },
);

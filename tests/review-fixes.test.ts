import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import databaseConfig from '../config/database.ts';
import middlewaresConfig from '../config/middlewares.ts';

type EnvValues = Record<string, string | undefined>;

const createEnv = (values: EnvValues) => {
  const env = ((key: string, defaultValue?: string) => values[key] ?? defaultValue) as {
    (key: string, defaultValue?: string): string | undefined;
    bool(key: string, defaultValue?: boolean): boolean;
    int(key: string, defaultValue?: number): number;
  };

  env.bool = (key: string, defaultValue = false) => {
    const value = values[key];

    if (value === undefined) {
      return defaultValue;
    }

    return value.toLowerCase() === 'true';
  };

  env.int = (key: string, defaultValue = 0) => {
    const value = values[key];

    if (value === undefined) {
      return defaultValue;
    }

    return Number.parseInt(value, 10);
  };

  return env;
};

test('registers the root health middleware globally', () => {
  assert.ok(middlewaresConfig.includes('global::health'));
});

test('health middleware responds on GET /health', async () => {
  const { default: healthMiddleware } = await import('../src/middlewares/health.ts');
  const middleware = healthMiddleware({}, { strapi: {} });
  const ctx = {
    method: 'GET',
    path: '/health',
    status: 404,
    body: undefined,
  };

  let nextCalls = 0;

  await middleware(ctx, async () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 0);
  assert.equal(ctx.status, 200);
  assert.deepEqual(ctx.body, { ok: true, service: 'strapi' });
});

test('health middleware passes through non-health requests', async () => {
  const { default: healthMiddleware } = await import('../src/middlewares/health.ts');
  const middleware = healthMiddleware({}, { strapi: {} });
  const ctx = {
    method: 'GET',
    path: '/articles',
  };

  let nextCalls = 0;

  await middleware(ctx, async () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 1);
});

test('database config defaults to verified TLS when SSL is enabled', () => {
  const config = databaseConfig({
    env: createEnv({
      DATABASE_URL: 'postgres://example',
    }),
  });

  assert.equal(config.connection.connection.connectionString, 'postgres://example');
  assert.deepEqual(config.connection.connection.ssl, {
    rejectUnauthorized: true,
  });
});

test('database config only disables certificate verification when explicitly configured', () => {
  const config = databaseConfig({
    env: createEnv({
      DATABASE_URL: 'postgres://example',
      DATABASE_SSL_REJECT_UNAUTHORIZED: 'false',
    }),
  });

  assert.equal(config.connection.connection.connectionString, 'postgres://example');
  assert.deepEqual(config.connection.connection.ssl, {
    rejectUnauthorized: false,
  });
});

test('database config can disable SSL entirely', () => {
  const config = databaseConfig({
    env: createEnv({
      DATABASE_URL: 'postgres://example',
      DATABASE_SSL: 'false',
    }),
  });

  assert.equal(config.connection.connection.connectionString, 'postgres://example');
  assert.equal(config.connection.connection.ssl, false);
});

test('dockerignore excludes env files without excluding the example file', async () => {
  const dockerignore = await readFile(new URL('../.dockerignore', import.meta.url), 'utf8');

  assert.match(dockerignore, /^\.env$/m);
  assert.match(dockerignore, /^\.env\.\*$/m);
  assert.match(dockerignore, /^!\.env\.example$/m);
});

test('env example documents ecs runtime variables', async () => {
  const envExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8');

  for (const variable of [
    'DATABASE_URL=',
    'DATABASE_SSL=true',
    'DATABASE_SSL_REJECT_UNAUTHORIZED=true',
    'AWS_REGION=',
    'AWS_BUCKET=',
  ]) {
    assert.match(envExample, new RegExp(`^${variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm'));
  }
});

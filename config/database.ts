import path from 'path';

import type { Core } from '@strapi/strapi';

const getSslConfig = (env: Core.Config.Shared.ConfigParams['env']) =>
  env.bool('DATABASE_SSL', false)
    ? {
        rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
      }
    : false;

const config = (
  { env }: Core.Config.Shared.ConfigParams,
):
  | Core.Config.Database<'mysql'>
  | Core.Config.Database<'postgres'>
  | Core.Config.Database<'sqlite'> => {
  const client = env('DATABASE_CLIENT', 'mysql');
  const ssl = getSslConfig(env);

  if (client === 'postgres') {
    return {
      connection: {
        client,
        connection: {
          host: env('DATABASE_HOST', 'localhost'),
          port: env.int('DATABASE_PORT', 5432),
          database: env('DATABASE_NAME', 'strapi'),
          user: env('DATABASE_USERNAME', 'strapi'),
          password: env('DATABASE_PASSWORD', 'strapi'),
          connectionString: env('DATABASE_URL'),
          ssl,
          schema: env('DATABASE_SCHEMA', 'public'),
        },
      },
    };
  }

  if (client === 'sqlite') {
    return {
      connection: {
        client,
        connection: {
          filename: path.join(__dirname, '..', env('DATABASE_FILENAME', '.tmp/data.db')),
        },
        useNullAsDefault: true,
      },
    };
  }

  return {
    connection: {
      client: 'mysql',
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl,
      },
    },
  };
};

export default config;

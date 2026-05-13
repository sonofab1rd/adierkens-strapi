import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database => {
  const connection = {
    connectionString: env('DATABASE_URL'),
    ssl: env.bool('DATABASE_SSL', true) && {
      rejectUnauthorized: false,
    },
  } as unknown as Core.Config.Database['connection']['connection'];

  return {
    connection: {
      client: 'postgres',
      connection,
    },
  };
};

export default config;

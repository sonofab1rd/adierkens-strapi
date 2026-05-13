export default () => {
  return async (ctx, next) => {
    if (ctx.method === 'GET' && ctx.path === '/health') {
      ctx.status = 200;
      ctx.body = { ok: true, service: 'strapi' };
      return;
    }

    await next();
  };
};

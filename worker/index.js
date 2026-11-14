import { onRequest } from '../functions/api/arabic-sources.js';
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/arabic-sources') return onRequest({request, env});
    if (path.startsWith('/api/')) return Response.json({error:'Not found'}, {status:404});
    return env.ASSETS.fetch(request);
  }
};

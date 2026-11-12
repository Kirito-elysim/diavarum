// Régression du client HTTP : requêtes simulées, aucune connexion réelle.
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from '../front/node_modules/vite/dist/node/index.js';

const vite = await createServer({ root: new URL('../front', import.meta.url).pathname, server: { middlewareMode: true, hmr: { server: createHttpServer() } }, appType: 'custom' });
const originalFetch = globalThis.fetch;
try {
  const { api, authApi, downloadFile, setSessionExpiredHandler, ApiError } = await vite.ssrLoadModule('/src/lib/api.ts');
  let expired = 0;
  setSessionExpiredHandler(() => expired++);

  for (const request of [() => api('/me'), () => downloadFile('/exports/patients.xlsx')]) {
    for (const refreshSucceeds of [false, true]) {
      globalThis.fetch = async () => Response.json({ token: 'initial' });
      await authApi.login('test@example.test', 'test');
      const calls = [];
      globalThis.fetch = async (url, options) => {
        calls.push({ url, authorization: options.headers?.Authorization });
        return url === '/api/auth/refresh' && refreshSucceeds
          ? Response.json({ token: 'renewed' })
          : Response.json({ message: 'Unauthorized' }, { status: 401 });
      };
      const previous = expired;
      await assert.rejects(request, error => error instanceof ApiError && error.status === 401);
      assert.equal(expired, previous + 1, 'Une session refusée doit être fermée, même après renouvellement');
      assert.equal(calls.length, refreshSucceeds ? 3 : 2, 'Au plus un renouvellement par requête');
      assert.equal(calls[0].authorization, 'Bearer initial');
      if (refreshSucceeds) assert.equal(calls[2].authorization, 'Bearer renewed');

      let authorization;
      globalThis.fetch = async (_url, options) => {
        authorization = options.headers.Authorization;
        return Response.json({ ok: true });
      };
      await api('/me');
      assert.equal(authorization, undefined, 'Le jeton refusé doit être supprimé');
    }
  }
  console.log('Session expirée : API et exports, refresh refusé ou nouveau JWT refusé — OK');
} finally {
  globalThis.fetch = originalFetch;
  await vite.close();
}

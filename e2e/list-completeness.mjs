// Vérifie les hooks avec plusieurs pages API, sans données réelles.
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from '../front/node_modules/vite/dist/node/index.js';

const vite = await createServer({ root: new URL('../front', import.meta.url).pathname, server: { middlewareMode: true, hmr: { server: createHttpServer() } }, appType: 'custom' });
const originalFetch = globalThis.fetch;
try {
  const React = await import('../front/node_modules/react/index.js');
  const { renderToString } = await import('../front/node_modules/react-dom/server.node.js');
  const { QueryClient, QueryClientProvider } = await import('../front/node_modules/@tanstack/react-query/build/modern/index.js');
  const { usePatients, useSessions } = await vite.ssrLoadModule('/src/api/hooks.ts');
  for (const [hook, params, path, filter] of [
    [usePatients, { eligibilityStatus: 'eligible' }, '/api/patients', 'eligibilityStatus'],
    [useSessions, { patient: '/api/patients/test' }, '/api/sessions', 'patient'],
  ]) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const requests = [];
    globalThis.fetch = async url => {
      const parsed = new URL(url, 'http://localhost');
      requests.push(parsed);
      const start = (Number(parsed.searchParams.get('page')) - 1) * 100;
      return Response.json({ member: Array.from({ length: Math.min(100, 205 - start) }, (_, index) => ({ id: start + index })), totalItems: 205 });
    };
    function Probe() { hook(params); return null; }
    renderToString(React.createElement(QueryClientProvider, { client }, React.createElement(Probe)));
    const [query] = client.getQueryCache().getAll();
    const result = await client.fetchQuery(query.options);
    assert.equal(result.member.length, 205);
    assert.equal(result.member.at(-1).id, 204);
    assert.equal(requests.length, 3);
    for (const url of requests) {
      assert.equal(url.pathname, path);
      assert.equal(url.searchParams.get(filter), params[filter]);
    }
    client.clear();
  }
  console.log('Patients et historique : 205 entrées récupérées, filtres conservés sur les 3 pages — OK');
} finally {
  globalThis.fetch = originalFetch;
  await vite.close();
}

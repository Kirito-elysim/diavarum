// Pure model checks: no API, user content or patient results are changed.
import { createServer as createHttpServer } from 'node:http';
import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
import { createServer } from '../front/node_modules/vite/dist/node/index.js';
const vite = await createServer({ root: new URL('../front', import.meta.url).pathname, server: { middlewareMode: true, hmr: { server: createHttpServer() } }, appType: 'custom' });
try {
 const { courseTemplates, pageFromTemplate } = await vite.ssrLoadModule('/src/components/course-editor/templates.ts');
 const { validateCourse } = await vite.ssrLoadModule('/src/components/course-editor/model.ts');
 assert.equal(courseTemplates.length, 35);
 const ids = new Set();
 const pages = courseTemplates.map(t => {
  assert.ok(existsSync(new URL(`../front/public${t.thumbnail}`, import.meta.url)));
  const page = pageFromTemplate(t);
  for (const node of [page, ...page.blocks]) { assert.ok(!ids.has(node.id)); ids.add(node.id); }
  for (const b of page.blocks) {
   if ('content' in b) b.content = 'Un texte avec **un passage en gras**';
   if ('question' in b) b.question = 'Consigne de démonstration';
   if ('imageUrl' in b) b.imageUrl = '/pictos/objective.png';
   if (b.type === 'picto-grid') { assert.equal(b.items.length, t.count); b.items.forEach(i => { i.imageUrl = '/pictos/important.png'; i.text = 'Texte du picto'; }); }
   if (b.type === 'flip-cards') { assert.equal(b.cards.length,t.count); b.cards.forEach(c => { c.front = 'Recto'; c.back = 'Verso'; }); }
   if (b.type === 'quiz') { assert.equal(b.options.length,t.count); b.options.forEach((o,i) => { o.label = `Choix ${i+1}`; o.isCorrect = i === 0; }); }
   if (b.type === 'carousel') b.slides.forEach(s => { s.imageUrl = '/pictos/objective.png'; s.text = 'Légende'; });
   if (b.type === 'hotspot') b.hotspots = [{ id: crypto.randomUUID(), x: 50, y: 50, label: 'Repère', description: 'Description' }];
   if (b.type === 'categorize' || b.type === 'reorder') b.items.forEach((i,n) => { i.label = `Élément ${n+1}`; });
  }
  if (t.composition === 'both') assert.deepEqual([page.blocks[0].type, page.blocks.at(-1).type], ['info-card','info-card']);
  if (t.composition === 'text-below') assert.equal(page.blocks[0].type,'text');
  return page;
 });
 const course = { code:'S2',title:'Charte graphique',description:'Démonstration locale',estimatedDuration:30,published:false,competencies:[],content:pages };
 assert.deepEqual(validateCourse(course), []);
 const roundTrip = JSON.parse(JSON.stringify(course));
 assert.deepEqual(roundTrip, course);
 const grid = roundTrip.content.flatMap(p=>p.blocks).find(b=>b.type==='picto-grid');
 grid.items[0].imageUrl='';
 assert.ok(validateCourse(roundTrip).some(e=>e.includes('chaque picto')));
 writeFileSync('/tmp/diaverum-charter-fixture.json', JSON.stringify(course));
 console.log('35 modèles : création, identifiants uniques, compositions, images, validation et sérialisation OK');
} finally { await vite.close(); }

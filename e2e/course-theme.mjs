// Recette visuelle du thème : cours et résultats simulés, aucune écriture métier.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.E2E_BASE_URL ?? 'http://localhost:8091';
const reference = JSON.parse(readFileSync(new URL('../api/content/S99.json', import.meta.url)));
const sessionOne = JSON.parse(readFileSync(new URL('../api/content/S1.json', import.meta.url)));
const sessionTwo = JSON.parse(readFileSync(new URL('../api/content/S2.json', import.meta.url)));
const image = '/pictos/objective.png';
const legacy = [
  { type: 'image', url: image, alt: 'Objectif', caption: 'Illustration du cours' },
  { type: 'timeline', items: [{ id: 'a', step: 1, title: 'Avant la séance', content: 'Préparer le matériel', tag: 'Préparation' }] },
  { type: 'iframe', url: 'about:blank', title: 'Contenu externe', caption: 'Le contenu externe conserve son propre thème.' },
  { type: 'fill-blank', text: 'Je prépare ___', answers: ['le matériel'] },
  { type: 'true-false', statements: [{ id: 'a', statement: 'Je peux poser des questions à l’équipe.', isTrue: true }] },
  { type: 'memory', cards: [{ id: 'a', pairId: 'p', content: 'Préparer' }, { id: 'b', pairId: 'p', content: 'Préparer' }] },
  { type: 'slider', min: 0, max: 10, correctValue: 5, tolerance: 1, unit: 'minutes' },
  { type: 'tap-sequence', steps: [{ id: 'a', label: 'Préparer', order: 1 }, { id: 'b', label: 'Vérifier', order: 2 }] },
  { type: 'drawing', prompt: 'Tracez un cercle.', brushColor: '#004138' },
  { type: 'scenario', steps: [{ id: 'a', situation: 'Vous préparez la séance.', question: 'Que faire ?', choices: [{ id: 'a', label: 'Poser une question', isCorrect: true, feedback: 'L’équipe vous accompagne.' }] }] },
  { type: 'reveal-legends', imageUrl: image, alt: 'Objectif', points: [{ id: 'a', x: 50, y: 50, label: 'Préparer', description: 'Préparer le matériel.' }] },
  { type: 'pull-timeline', events: [{ id: 'a', date: 'Avant', title: 'Préparation', content: 'Préparer le matériel.', position: 0 }] },
  { type: 'sort-bin', keepLabel: 'Conserver', discardLabel: 'Écarter', items: [{ id: 'a', label: 'Matériel prêt', keep: true }] },
  { type: 'connect-dots', imageUrl: image, alt: 'Objectif', dots: [{ id: 'a', x: 30, y: 30, order: 1, label: 'Préparer', info: 'Préparer le matériel.' }] },
  { type: 'word-search', gridSize: 3, letters: 'CLEABCDEF', words: [{ id: 'a', word: 'CLE', clue: 'Un objet' }] },
  { type: 'yes-no-path', startStepId: 'a', steps: [{ id: 'a', question: 'Le matériel est prêt ?', yesStepId: 'b', noStepId: 'b' }, { id: 'b', result: 'Demandez à l’équipe.', isCorrectEnd: true }] },
].map((block, i) => ({ id: `legacy-page-${i}`, title: `Activité ${block.type}`, blocks: [{ id: `legacy-${i}`, question: 'Essayez cette activité', ...block }] }));
const videoPage = sessionTwo.content.find(page => page.blocks.some(block => block.type === 'video'));
const course = { ...reference, code: 'S2', content: [...sessionOne.content, ...reference.content, ...legacy, { ...videoPage, id: 's2-video' }] };
const declaredTypes = [...readFileSync(new URL('../front/src/types/index.ts', import.meta.url), 'utf8').split('export interface')[0].matchAll(/'([a-z-]+)'/g)].map(m => m[1]);
const coveredTypes = new Set(course.content.flatMap(p => p.blocks.map(b => b.type)));
assert.deepEqual(declaredTypes.filter(type => !coveredTypes.has(type)), []);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  // Recette de rendu autonome : aucun serveur API ni dossier patient nécessaire.
  if (process.env.E2E_OFFLINE === '1') {
    let loggedIn = false;
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.continue();
      if (path === '/api/auth/login') loggedIn = true;
      if (path.startsWith('/api/auth/')) return route.fulfill({ status: loggedIn ? 200 : 401, json: { token: 'visual-test' } });
      if (path === '/api/me') return route.fulfill({ json: { id: 'visual-test', firstName: 'Test', lastName: 'Visuel', role: 'admin_national', centers: [], securityCodeConfigured: true } });
      return route.fulfill({ json: { member: [], totalItems: 0 } });
    });
  }
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/login`);
  await page.fill('#email', 'admin@diaverum.test');
  await page.fill('#password', 'Diaverum2026!');
  await page.click('button[type=submit]');
  await page.waitForURL(url => !url.pathname.includes('login'));
  await page.route('**/api/modules/theme-fixture', route => route.fulfill({ json: { ...course, id: 'theme-fixture', competencies: [] } }));
  await page.route('**/api/content/modules/S2', route => route.fulfill({ json: course }));

  async function checkTheme(root) {
    await root.locator('.course-header').waitFor();
    assert.deepEqual(await root.evaluate(el => {
      const css = getComputedStyle(el);
      const header = getComputedStyle(el.querySelector('.course-header'));
      const next = getComputedStyle(el.querySelector('.course-navigation-next'));
      return [css.backgroundColor, css.color, header.backgroundColor, next.backgroundColor, next.fontSize];
    }), ['rgb(236, 245, 233)', 'rgb(0, 65, 56)', 'rgb(28, 83, 53)', 'rgb(232, 104, 37)', '20px']);
    assert.ok(await root.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Le thème ne doit pas déborder');
  }

  for (const viewport of [{ width: 1280, height: 800 }, { width: 800, height: 1280 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${base}/sessions/run?preview=1&moduleId=theme-fixture`);
    const root = page.locator('.course-theme');
    for (const [index, screen] of course.content.entries()) {
      await root.getByRole('heading', { name: screen.title, exact: true }).waitFor();
      await root.locator('main').evaluate(async el => {
        await Promise.all(el.getAnimations({ subtree: true }).filter(a => a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
      });
      await checkTheme(root);
      assert.ok(await root.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${screen.title} : débordement horizontal`);
      if (index === 3) await page.screenshot({ path: `/tmp/diaverum-theme-${viewport.width}.png` });
      if (index < course.content.length - 1) {
        const next = root.getByRole('button', { name: 'Page suivante', exact: true });
        await next.click();
        // Le lecteur anime la transition et bloque les clics pendant celle-ci.
        await page.waitForFunction(() => !document.querySelector('.course-navigation-next')?.disabled);
      }
    }
    console.log(`${viewport.width}×${viewport.height} : ${course.content.length} écrans, ${coveredTypes.size} types de blocs, thème et débordements OK`);
  }

  await page.goto(`${base}/modules/S2/edit`);
  await page.getByRole('button', { name: 'Aperçu apprenant', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Aperçu apprenant', exact: true });
  await checkTheme(dialog.locator('.course-theme'));
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: 'Aperçu sur tablette', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Aperçu sur tablette', exact: true });
  const tablet = dialog.frameLocator('iframe[title="Écran de la tablette"]');
  await checkTheme(tablet.locator('.course-theme'));
  await dialog.getByRole('button', { name: 'Portrait', exact: true }).click();
  await checkTheme(tablet.locator('.course-theme'));
  await page.screenshot({ path: '/tmp/diaverum-theme-tablet-preview.png' });
  assert.deepEqual(errors, []);
  console.log('Aperçu apprenant et aperçu tablette paysage/portrait : thème commun OK');
} finally {
  await browser.close();
}

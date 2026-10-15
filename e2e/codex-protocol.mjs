// Vérification ciblée sans création de résultats : POST CODEX interceptés.
// Nécessite la stack locale et son compte IDE de démonstration.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.E2E_BASE_URL ?? 'http://localhost:8091';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, hasTouch: true });
  await page.goto(`${base}/login`);
  await page.fill('#email', 'ide@diaverum.test');
  await page.fill('#password', 'Diaverum2026!');
  await page.click('button[type=submit]');
  await page.waitForURL(url => !url.pathname.includes('login'));
  await page.goto(`${base}/patients`);
  await page.getByText('DUPONT Jean').click();
  await page.waitForURL(/\/patients\/[0-9a-f-]{36}$/);
  const patientUrl = page.url();
  let submitted;
  let failOnce = false;
  await page.route('**/api/codex_tests', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    if (failOnce) { failOnce = false; return route.fulfill({ status: 500, json: { detail: 'Erreur de test temporaire' } }); }
    submitted = route.request().postDataJSON();
    const score = submitted.orientationAnswers?.reduce((a, b) => a + b, 0) ?? null;
    const passed = submitted.clockTestPassed && submitted.wordRecallPassed || score >= 4;
    await route.fulfill({ status: 201, json: { ...submitted, id: 'test', '@id': '/api/codex_tests/test', passed, orientationScore: score, nephrologistReviewRequired: !passed } });
  });
  async function start(second = false) {
    await page.goto(`${patientUrl}/codex`);
    await page.getByText('ballon', { exact: true }).waitFor();
    if (second) await page.getByRole('combobox').selectOption('1');
    await page.getByRole('button', { name: /Mots lus et répétés/ }).click();
    await page.getByText(/indiquez 5h10/).waitFor();
    await page.getByRole('button', { name: 'Donner la tablette au patient' }).click();
    const face = page.getByRole('img', { name: 'Cadran vierge à dessiner au doigt ou au stylet' });
    assert.equal(await face.locator('text, line, polyline').count(), 0);
    assert.equal(await page.getByText('ballon', { exact: true }).count(), 0);
    const box = await face.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.4, { steps: 10 });
    await page.mouse.up();
    assert.equal(await face.locator('polyline').count(), 1);
    await page.getByRole('button', { name: /J’ai terminé/ }).click();
    assert.equal(await page.getByRole('img', { name: 'Horloge dessinée par le patient' }).locator('polyline').count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Continuer vers le rappel des mots' }).isDisabled(), true);
  }
  async function clock(passed) {
    for (const [index, field] of (await page.locator('fieldset').all()).entries()) {
      await field.getByRole('radio', { name: !passed && index === 0 ? 'Non' : 'Oui', exact: true }).check();
    }
    await page.getByRole('button', { name: 'Continuer vers le rappel des mots' }).click();
  }
  async function orientation(score) {
    assert.equal(await page.getByRole('button', { name: 'Enregistrer le résultat' }).isDisabled(), true);
    for (const [index, field] of (await page.locator('fieldset').all()).entries()) {
      await field.getByRole('radio', { name: index < score ? '1 — Correct' : '0 — Incorrect', exact: true }).check();
    }
    await page.getByRole('button', { name: 'Enregistrer le résultat' }).click();
  }
  await start();
  await clock(true);
  await page.getByRole('button', { name: '3 mots rappelés' }).click();
  await page.getByRole('heading', { name: 'CODEX normal' }).waitFor();
  assert.deepEqual(submitted.words, ['Clé', 'ballon', 'citron']);
  assert.equal(submitted.orientationAnswers, null);
  assert.equal(submitted.clockTime, '05:10');
  await start(true);
  await clock(false);
  await page.getByRole('button', { name: 'Rappel incomplet' }).click();
  await orientation(4);
  await page.getByRole('heading', { name: 'CODEX normal' }).waitFor();
  assert.deepEqual(submitted.words, ['Cigare', 'fleur', 'porte']);
  assert.equal(submitted.clockTestPassed, false);
  await start();
  await clock(true);
  await page.getByRole('button', { name: 'Rappel incomplet' }).click();
  failOnce = true;
  await orientation(3);
  await page.getByRole('alert').waitFor();
  await page.getByRole('button', { name: 'Enregistrer le résultat' }).click();
  await page.getByRole('heading', { name: 'CODEX anormal' }).waitFor();
  await page.getByText(/L’IDE doit transmettre le résultat/).waitFor();
  await page.screenshot({ path: '/tmp/codex-result.png' });
  console.log('CODEX UI : cadran vierge, dessin conservé, validations obligatoires, listes, seuils 3/4, reprise après erreur — OK.');
} finally { await browser.close(); }

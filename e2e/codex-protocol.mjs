// Vérification ciblée sans création de résultats : POST CODEX et PATCH patient interceptés.
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
  let submitted, decision, patient;
  let failOnce = false;
  await page.route('**/api/codex_tests', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    if (failOnce) { failOnce = false; return route.fulfill({ status: 500, json: { detail: 'Erreur de test temporaire' } }); }
    submitted = route.request().postDataJSON();
    const score = submitted.orientationAnswers?.reduce((a, b) => a + b, 0) ?? null;
    const passed = submitted.clockTestPassed && submitted.wordRecallPassed || score >= 4;
    await route.fulfill({ status: 201, json: { ...submitted, id: 'test', '@id': '/api/codex_tests/test', passed, orientationScore: score, nephrologistReviewRequired: !passed } });
  });
  await page.route('**/api/patients/*', async route => {
    if (route.request().method() === 'PATCH') { decision = route.request().postDataJSON(); return route.fulfill({ json: patient }); }
    const response = await route.fetch();
    if (route.request().method() === 'GET') patient = await response.json();
    return route.fulfill({ response });
  });
  const next = () => page.getByRole('button', { name: 'Suite du test' }).click();
  async function run({ changeWords = false, clock, recall }) {
    submitted = decision = undefined;
    await page.goto(`${patientUrl}/codex`);
    await page.getByText(/Vous allez réaliser un test CODEX auprès du patient/).waitFor();
    await page.getByText('Jean DUPONT').first().waitFor();
    await page.getByRole('button', { name: 'Démarrer le test' }).click();
    await page.getByText(/Je vais vous dire 3 mots/).waitFor();
    await next();
    await page.getByText('Ballon', { exact: true }).waitFor();
    if (changeWords) {
      await page.getByRole('button', { name: 'Changer de mots' }).click();
      await page.getByText('Cigare', { exact: true }).waitFor();
    }
    await next();
    await page.getByText(/demander au patient de répéter/).waitFor();
    await next();
    await page.getByText(/donner la tablette au patient/).waitFor();
    await next();
    const face = page.getByRole('img', { name: 'Cadran vierge à dessiner au doigt ou au stylet' });
    assert.equal(await face.locator('text, line, polyline').count(), 0);
    assert.equal(await face.locator('circle').count(), 13, 'cadran + 12 repères');
    assert.equal(await page.getByText('5h10').count(), 1, '5h10 uniquement dans la consigne');
    const box = await face.boundingBox();
    const draw = async () => {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.4, { steps: 10 });
      await page.mouse.up();
    };
    await draw();
    await draw();
    await draw();
    assert.equal(await face.locator('polyline').count(), 3);
    await page.getByRole('button', { name: 'Effacer le dernier trait' }).click();
    assert.equal(await face.locator('polyline').count(), 2);
    await page.getByRole('button', { name: 'Effacer tout' }).click();
    assert.equal(await face.locator('polyline').count(), 0);
    await draw();
    await next();
    await page.getByText('Vous pouvez désormais redonner la tablette à l’infirmier/infirmière.').waitFor();
    assert.equal(await page.getByRole('img', { name: 'Horloge dessinée par le patient' }).locator('polyline').count(), 1);
    await next();
    assert.equal(await page.getByRole('img', { name: 'Horloge dessinée par le patient' }).locator('polyline').count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Suite du test' }).isDisabled(), true);
    for (const [index, field] of (await page.locator('fieldset').all()).entries()) {
      await field.getByRole('radio', { name: !clock && index === 0 ? 'Non' : 'Oui', exact: true }).check();
    }
    await page.getByRole('status').filter({ hasText: clock ? 'RÉUSSI' : 'ÉCHOUÉ' }).waitFor();
    await next();
    await page.getByText(/quels étaient les 3 mots/).waitFor();
    await page.getByText(changeWords ? 'Mots attendus : cigare, fleur, porte' : 'Mots attendus : clé, ballon, citron').waitFor();
    await page.getByRole('radio', { name: recall ? 'Oui' : 'Non', exact: true }).check();
    await page.getByRole('status').filter({ hasText: recall ? 'RÉUSSI' : 'ÉCHOUÉ' }).waitFor();
    await next();
  }
  async function orientation(score) {
    await page.getByText(/Puisque le patient a échoué/).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Validation' }).isDisabled(), true);
    for (const [index, field] of (await page.locator('fieldset').all()).entries()) {
      await field.getByRole('radio', { name: index < score ? 'Juste' : 'Faux', exact: true }).check();
    }
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.getByRole('status').filter({ hasText: `${score} / 5` }).filter({ hasText: 'orientation' }).waitFor();
  }
  const validate = async () => {
    await page.getByRole('button', { name: 'Valider' }).click();
    await page.waitForURL(patientUrl);
  };

  // Les 2 épreuves réussies : CODEX normal, décision libre de l'IDE
  await run({ clock: true, recall: true });
  await page.getByText('Test CODEX normal').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Valider' }).isDisabled(), true);
  await page.getByRole('button', { name: 'Éligible', exact: true }).click();
  await validate();
  assert.deepEqual(submitted.words, ['Clé', 'ballon', 'citron']);
  assert.equal(submitted.orientationAnswers, null);
  assert.equal(submitted.clockTime, '05:10');
  assert.deepEqual(decision, { eligibilityStatus: 'eligible', eligibilityReasons: [], eligibilityNotes: null });

  // Horloge échouée, mots changés : orientation 4/5 → normal
  await run({ changeWords: true, clock: false, recall: true });
  await orientation(4);
  await page.getByText('Résultat du test CODEX : Normal').waitFor();
  await page.getByRole('button', { name: 'Éligible', exact: true }).click();
  await validate();
  assert.deepEqual(submitted.words, ['Cigare', 'fleur', 'porte']);
  assert.equal(submitted.clockTestPassed, false);
  assert.deepEqual(submitted.orientationAnswers, [1, 1, 1, 1, 0]);

  // Rappel échoué, orientation 3/5 → anormal : « non éligible » et « Test CODEX anormal » présélectionnés, reprise après erreur
  await run({ clock: true, recall: false });
  await orientation(3);
  await page.getByText('Résultat du test CODEX : Anormal').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Non éligible' }).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.getByRole('checkbox', { name: 'Test CODEX anormal' }).isChecked(), true);
  const labels = await page.locator('label:has(input[type=checkbox])').allTextContents();
  assert.deepEqual([labels[0], labels[1], labels.at(-1)], ['Test CODEX anormal', 'Troubles cognitifs autres', 'Autre (à préciser)']);
  await page.getByRole('checkbox', { name: 'Test CODEX anormal' }).uncheck();
  assert.equal(await page.getByRole('button', { name: 'Valider' }).isDisabled(), true);
  await page.getByText('Cochez au moins un motif de non-éligibilité pour valider.').waitFor();
  await page.getByRole('checkbox', { name: 'Test CODEX anormal' }).check();
  failOnce = true;
  await page.getByRole('button', { name: 'Valider' }).click();
  await page.getByRole('alert').waitFor();
  await validate();
  assert.equal(decision.eligibilityStatus, 'non_eligible');
  assert.equal(decision.eligibilityReasons.length, 1);

  // Les 2 épreuves échouées : pas d'orientation, CODEX anormal, l'IDE peut passer outre
  await run({ clock: false, recall: false });
  await page.locator('p', { hasText: /^Test CODEX anormal$/ }).waitFor();
  assert.equal(await page.getByText(/Puisque le patient a échoué/).count(), 0);
  await page.getByRole('button', { name: 'Éligible', exact: true }).click();
  await page.screenshot({ path: '/tmp/codex-result.png' });
  await validate();
  assert.equal(submitted.orientationAnswers, null);
  assert.equal(decision.eligibilityStatus, 'eligible');
  console.log('CODEX UI : écrans du protocole, cadran à 12 repères, effacement, restitutions, orientation 3/4, double échec, décision IDE, reprise après erreur — OK.');
} finally { await browser.close(); }

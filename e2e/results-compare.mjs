// Résultats : comparaison de deux périodes sur tous les onglets. API des statistiques simulée (deux jeux de valeurs
// distincts selon la période demandée), connexion réelle ; aucune écriture.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { presetPeriod, previousPeriod } from '../front/src/lib/period.ts';
const browser = await chromium.launch();
const base = process.env.E2E_BASE_URL ?? 'http://localhost:8091';
let page;
const share = (count, total) => ({ count, percent: total ? Math.round(1000 * count / total) / 10 : null });
const area = (center, v) => ({
  center,
  patients: { registered: 10, archived: 1, eligible: share(6, 10), notEligible: share(2, 10), pending: share(2, 10) },
  programs: { total: 6, notStarted: share(1, 6), inactive: share(1, 6), active: share(2, 6), interrupted: share(1, 6), completed: share(1, 6) },
  averageProgramScore: v.programScore,
  averageCompletedProgramDurationSeconds: v.duration,
  activity: { validatedSessions: v.sessions, averageSessionScore: v.score, completedPrograms: v.completed, interruptedPrograms: v.interrupted },
});
const stats = v => ({
  scope: 'National', national: true, generatedAt: new Date().toISOString(), period: { from: null, to: null },
  centers: [area('Centre test', v)], total: area('National', v),
  courses: [{ code: 'S1', title: 'Cours de test', mandatory: true, postTest: false, validations: v.sessions / 2, averageScore: v.score, averageDurationSeconds: v.duration / 3 }],
  nurses: [{ name: 'DUBOIS Claire', centers: 'Centre test', validatedSessions: v.sessions, totalDurationSeconds: v.duration, patients: 4, averageScore: v.score }],
  monthly: [{ month: '2026-10', validatedSessions: v.sessions, averageScore: v.score }],
  interruptionReasons: [{ label: 'Transfert vers un autre centre', count: v.interrupted }],
});
const A = stats({ programScore: 75, duration: 3600, sessions: 40, score: 80, completed: 5, interrupted: 2 });
const B = stats({ programScore: 60, duration: 5400, sessions: 30, score: 70, completed: 8, interrupted: 1 });
try {
 const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
 page = await context.newPage();
 page.setDefaultTimeout(10000);
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.goto(`${base}/login`);
 await page.fill('#email', 'admin@diaverum.test');
 await page.fill('#password', 'Diaverum2026!');
 await page.click('button[type=submit]');
 await page.waitForURL(url => !url.pathname.includes('login'));

 const requests = [];
 let mainFrom;
 await page.route(/\/api\/statistics(\?.*)?$/, route => {
  const url = new URL(route.request().url());
  const period = { from: url.searchParams.get('from'), to: url.searchParams.get('to') };
  requests.push(period);
  mainFrom ??= period.from;
  return route.fulfill({ json: period.from === mainFrom ? A : B });
 });

 await page.goto(`${base}/results`);
 await page.getByText('Séances validées', { exact: true }).first().waitFor();
 const compareLines = () => page.getByTestId('delta-pill').count();
 assert.equal(await compareLines(), 0, 'Sans comparaison : aucun écart affiché');
 assert.equal(requests.length, 1, 'Une seule période demandée');

 // Activation : période B proposée = les 12 mois précédents, une seconde requête est faite
 await page.getByRole('button', { name: 'Comparer', exact: true }).click();
 await page.getByTestId('compare-bar').waitFor();
 await page.getByTestId('delta-pill').first().waitFor();
 const defaultB = previousPeriod(presetPeriod('12m'));
 assert.deepEqual(requests.at(-1), defaultB, 'Période B par défaut : même durée, juste avant la période A');
 const bar = page.getByTestId('compare-bar');
 assert.ok(await bar.innerText().then(t => t.includes('A') && t.includes('B') && t.includes('comparée à')));

 // Indicateurs du haut : A et B côte à côte, écart en pastille ; séances 40 contre 30, score 80 contre 70, achevés 5 contre 8
 const main = page.locator('main');
 const pills = () => page.getByTestId('delta-pill').allInnerTexts().then(list => list.map(t => t.replace(/\s+/g, ' ').trim()));
 const bValues = scope => scope.getByTestId('compare-b').allInnerTexts().then(list => list.map(t => t.trim()));
 await main.getByText('Période B', { exact: true }).first().waitFor();
 assert.ok((await main.innerText()).toUpperCase().includes('PÉRIODE A'), 'Étiquettes A et B visibles');
 assert.deepEqual(await bValues(main.locator('.grid').first()), ['30', '70 %', '8'], 'Valeurs B visibles dans les indicateurs du haut');
 let list = await pills();
 assert.ok(list.some(t => t.includes('+10') && t.includes('+33 %')), `Séances validées : +10 (+33 %) — ${list}`);
 assert.ok(list.some(t => t.includes('+10 pts')), 'Score moyen : +10 pts');
 assert.ok(list.some(t => t.includes('−3') && (t.includes('−38 %') || t.includes('−37 %'))), 'Parcours achevés : −3');
 await page.screenshot({ path: '/tmp/results-compare-haut.png' });

 // Vue d'ensemble : score moyen des parcours 75 contre 60, durée 1 h contre 1 h 30 (écart neutre)
 await main.getByText('B : 1', { exact: false }).first().waitFor().catch(() => {});
 assert.deepEqual(await bValues(main.getByRole('tabpanel')), ['60 %', '1 h 30', 'B : 1'], 'Valeurs B de la vue d\'ensemble (dont motif de clôture)');
 list = await pills();
 assert.ok(list.some(t => t.includes('+15 pts')), 'Score des parcours : +15 pts');
 assert.ok(list.some(t => t.includes('−30 min')), 'Durée : −30 min');
 assert.ok((await main.innerText()).includes('à date : identique pour A et B'));
 assert.ok((await main.innerText()).includes('7 patients non archivés') || (await main.innerText()).includes('patients non archivés'));

 // Chaque onglet : colonnes A, B et Écart
 for (const [tab, head, b, pill] of [['Séances', 'Validations (A)', '15', '+5'], ['Centres', 'Séances (A)', '30', '+10'], ['IDE', 'Séances validées (A)', '30', '+10']]) {
  await page.getByRole('tab', { name: tab, exact: true }).click();
  const content = page.getByRole('tabpanel');
  await content.getByRole('columnheader', { name: head, exact: true }).waitFor();
  assert.ok((await content.getByRole('columnheader').allInnerTexts()).some(t => t.includes('(A)')), `Onglet ${tab} : colonne A`);
  assert.ok((await bValues(content)).includes(b), `Onglet ${tab} : valeur B ${b}`);
  assert.ok((await content.getByTestId('delta-pill').allInnerTexts()).some(t => t.includes(pill)), `Onglet ${tab} : écart ${pill}`);
  if (tab === 'Séances') await page.screenshot({ path: '/tmp/results-compare-seances.png' });
 }
 await page.getByRole('tab', { name: 'Parcours', exact: true }).click();
 await page.getByText('la comparaison A / B ne s\'y applique pas', { exact: false }).waitFor();

 // Choix de la période B comme on choisit la période A : « Mois précédent » (un mois contre un mois)
 await page.getByRole('tab', { name: 'Vue d\'ensemble', exact: true }).click();
 await page.getByRole('button', { name: 'Période', exact: true }).nth(1).click();
 await page.getByRole('button', { name: 'Mois précédent', exact: true }).click();
 await page.getByTestId('delta-pill').first().waitFor();
 assert.deepEqual(requests.at(-1), presetPeriod('lastMonth'), 'Période B = mois précédent complet');
 await page.getByRole('list', { name: 'Périodes prédéfinies' }).waitFor({ state: 'hidden' });
 // Période A : mois en cours → la période B se choisit librement et la précédente se propose en un clic
 await page.getByRole('button', { name: 'Période', exact: true }).first().click();
 await page.getByRole('list', { name: 'Périodes prédéfinies' }).waitFor();
 await page.getByRole('button', { name: 'Mois en cours', exact: true }).click();
 mainFrom = presetPeriod('month').from;
 await page.getByRole('button', { name: 'Période précédente', exact: true }).click();
 await page.getByTestId('delta-pill').first().waitFor();
 assert.deepEqual(requests.at(-1), previousPeriod(presetPeriod('month')), 'Période précédente de même durée');

 // Désactivation : les écarts disparaissent
 await page.getByRole('button', { name: 'Comparer', exact: true }).click();
 await page.getByTestId('compare-bar').waitFor({ state: 'hidden' });
 assert.equal(await compareLines(), 0);
 assert.deepEqual(errors, []);
 console.log('Comparaison de périodes : activation, période B, écarts A − B sur tous les onglets, mois contre mois, période précédente, désactivation — OK');
} catch (error) { if (page) await page.screenshot({ path: '/tmp/results-compare-failure.png' }).catch(() => {}); throw error; }
finally { if (page) await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {}); await browser.close(); }

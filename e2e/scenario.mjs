// Parcours utilisateur de bout en bout dans un vrai navigateur (Chromium piloté par Playwright).
// Prérequis : stack de dev démarrée et données de démo chargées — `make e2e` s'occupe de tout.
// Captures d'écran dans e2e/shots/ (ECHEC-n.png en cas d'échec d'une étape).
import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const SHOTS = new URL('./shots/', import.meta.url).pathname;
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(`✅ ${name}`); }
  catch (e) {
    results.push(`❌ ${name} — ${e.message.split('\n').slice(0, 2).join(' | ')}`);
    await page.screenshot({ path: `${SHOTS}ECHEC-${results.length}.png` }).catch(() => {});
  }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1340, height: 900 }, locale: 'fr-FR' });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
const shot = (name) => page.screenshot({ path: `${SHOTS}${name}.png`, fullPage: false });

async function login(email, password = 'Diaverum2026!') {
  await page.goto(`${BASE}/login`);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
}

const stamp = Date.now().toString().slice(-5);
let patientUrl = '';
const lastName = `Testeur${stamp}`;

await step('Accès protégé : /patients redirige vers /login', async () => {
  await page.goto(`${BASE}/patients`);
  await page.waitForURL('**/login');
});

await step('Mauvais mot de passe : message en français', async () => {
  await login('ide@diaverum.test', 'faux-mot-de-passe');
  await page.getByText('Email ou mot de passe incorrect.').waitFor();
});

await step('Connexion IDE Paris → retour vers la page demandée', async () => {
  await page.goto(`${BASE}/patients`);
  await page.waitForURL('**/login');
  await login('ide@diaverum.test');
  await page.waitForURL('**/patients');
  await page.getByText('DUPONT Jean').waitFor();
  await shot('01-patients-ide');
});

await step('Cloisonnement : l\'IDE de Paris ne voit pas les patients de Lyon', async () => {
  if (await page.getByText('FONTAINE').count()) throw new Error('patient de Lyon visible');
});

await step('Rechargement de page : la session est restaurée (cookie de refresh)', async () => {
  await page.reload();
  await page.getByText('DUPONT Jean').waitFor();
  if (page.url().includes('/login')) throw new Error('déconnecté après rechargement');
});

await step('Création d\'un patient → ouverture de sa fiche', async () => {
  await page.getByRole('button', { name: 'Nouveau patient' }).click();
  await page.fill('#p-last', lastName);
  await page.fill('#p-first', 'Paul');
  await page.fill('#p-dob', '1950-05-01');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page.waitForURL(/\/patients\/[0-9a-f-]{36}$/);
  patientUrl = page.url();
  await page.getByText(`${lastName.toUpperCase()} Paul`).waitFor();
  await page.getByText('01/05/1950').waitFor();
});

await step('Test CODEX : 3 mots, aiguilles déplacées au doigt, rappel des mots', async () => {
  await page.getByRole('tab', { name: 'Éligibilité' }).click();
  await page.getByRole('button', { name: 'Faire passer le test' }).click();
  await page.getByText('Ne montrez pas la tablette').waitFor();
  await page.getByRole('button', { name: /Mots lus au patient/ }).click();
  await page.getByRole('button', { name: 'Donner la tablette au patient' }).click();
  if (await page.getByText('heure demandée', { exact: false }).count()) throw new Error("l'heure demandée est visible par le patient");
  // Grande aiguille : de midi vers 3 h (= 15 min)
  const handle = await page.locator('[data-hand="minute"]').boundingBox();
  const clock = await page.getByRole('img', { name: 'Horloge à régler' }).boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(clock.x + clock.width * 0.9, clock.y + clock.height / 2, { steps: 8 });
  await page.mouse.up();
  await shot('02a-codex-horloge');
  await page.getByRole('button', { name: "J'ai terminé" }).click();
  await page.getByText('12 h 15').waitFor();
  await page.getByRole('button', { name: 'Validé', exact: true }).click();
  await page.getByText('Demandez au patient de répéter les 3 mots').waitFor();
  await page.getByRole('button', { name: 'Test mots réussi' }).click();
  await page.getByText('Test CODEX enregistré').waitFor();
  await page.getByRole('button', { name: 'Retour à la fiche patient' }).click();
  await page.getByRole('tab', { name: 'Éligibilité' }).click();
  await page.getByText('Réussi', { exact: true }).first().waitFor();
});

await step('Parcours verrouillé tant que le patient n\'est pas éligible', async () => {
  await page.getByRole('tab', { name: 'Parcours' }).click();
  await page.getByText('Parcours verrouillé').waitFor();
});

await step('Non éligible sans motif → refus ; avec motif → enregistré', async () => {
  await page.getByRole('tab', { name: 'Éligibilité' }).click();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Non éligible' }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page.getByText('Un patient non éligible doit avoir au moins un motif.').waitFor();
  await page.getByText('Patient non consentant').click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page.getByText('Éligibilité enregistrée').waitFor();
  await shot('02-eligibilite');
});

await step('Déclaré éligible → parcours : 26 séances pré-cochées sur 33, groupées par thématique', async () => {
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Éligible', exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page.getByText('Éligibilité enregistrée').last().waitFor();
  await page.getByRole('tab', { name: 'Parcours' }).click();
  await page.getByRole('button', { name: 'Créer le parcours' }).click();
  await page.getByText('26 séances sélectionnées sur 33').waitFor();
  await page.getByText('0/26 séances validées').waitFor();
  await page.getByText('Voies d\'abord pour hémodialyse et complications éventuelles').waitFor();
  await page.getByText('Aucune séance optionnelle sélectionnée.').waitFor();
  await shot('03-parcours');
});

await step('Sélection d\'une séance optionnelle enregistrée côté serveur', async () => {
  await page.getByText('Les AVK').click();
  await page.getByText('27 séances sélectionnées sur 33').waitFor();
  await page.getByText('Aucune séance optionnelle sélectionnée.').waitFor({ state: 'hidden' });
  await page.reload();
  await page.getByRole('tab', { name: 'Parcours' }).click();
  await page.getByText('27 séances sélectionnées sur 33').waitFor();
});

await step('Séance sans contenu (démarrage S0) : message clair', async () => {
  await page.getByRole('button', { name: 'Lancer' }).first().click();
  await page.getByText("Ce cours n'a pas encore de contenu.").waitFor();
  await page.getByRole('button', { name: 'Retour' }).click();
  await page.getByRole('tab', { name: 'Parcours' }).click();
});

await step('Lancement de la séance S4 : écran d\'accueil sans code affiché', async () => {
  await page.locator('div.p-3.rounded-xl', { hasText: 'IRCT et hémodialyse' }).getByRole('button', { name: 'Lancer' }).click();
  await page.getByText('Prêt à commencer ?').waitFor();
  await page.getByText('votre code de sécurité personnel vous sera demandé').waitFor();
  if (await page.getByText('1234').count()) throw new Error('le code est affiché à l\'écran');
  await shot('04-avant-seance');
});

await step('Lecteur : contenu réel du cours chargé depuis l\'API', async () => {
  await page.getByRole('button', { name: /Commencer la séance/ }).click();
  await page.getByText("Qu'est-ce que la dialyse ?").first().waitFor();
  await shot('05-lecteur');
});

await step('Sortie : mauvais code refusé, bon code accepté (vérifié par l\'API)', async () => {
  await page.locator('header button').first().click(); // pause
  await page.getByRole('heading', { name: 'Séance en pause' }).waitFor();
  await page.getByRole('button', { name: /Quitter \(code IDE\)/ }).click();
  for (const d of '9876') await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: 'Valider' }).click();
  await page.getByText('Code incorrect').waitFor();
  await shot('06-code-incorrect');
  await page.waitForTimeout(700);
  for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: 'Valider' }).click();
  await page.waitForURL(/\/patients\/[0-9a-f-]{36}$/);
});

await step('Sortie anticipée : cours « non terminé » et rappel de reprise', async () => {
  await page.getByText('Reprendre le cours interrompu ?').waitFor();
  await page.getByText('Non terminée').first().waitFor();
  await shot('07a-rappel-reprise');
  await page.getByRole('button', { name: 'Oui, reprendre' }).click();
  await page.getByText('Prêt à commencer ?').waitFor();
});

await step('Séance complète S4 : 3 bonnes réponses sur 4 → score serveur 75 %', async () => {
  await page.getByRole('button', { name: /Commencer la séance/ }).click();
  await page.getByRole('button', { name: /Page suivante/ }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /Page suivante/ }).click();
  await page.waitForTimeout(700);
  for (const answer of ['Faux', 'Vrai', 'Vrai']) {
    await page.getByRole('button', { name: answer, exact: true }).click();
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByText('1 heure', { exact: true }).click(); // mauvaise réponse volontaire
  await page.getByRole('button', { name: 'Valider ma réponse' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Terminer/ }).click();
});

await step('Remise de la tablette à l\'IDE (code) puis validation des compétences', async () => {
  await page.getByText('Fin du cours').waitFor();
  for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: 'Valider' }).click();
  await page.getByText("Compétences d'entraînement").waitFor();
  const finish = page.getByRole('button', { name: 'Terminer le cours' });
  if (await finish.isEnabled()) throw new Error('« Terminer le cours » actif avant l\'évaluation des compétences');
  const validated = page.getByRole('button', { name: 'Validée', exact: true });
  for (let i = 0; i < await validated.count(); i++) await validated.nth(i).click();
  await shot('08a-competences');
  await finish.click();
  await page.getByText('Cours validé').waitFor();
  await page.getByText('75%').waitFor();
  await shot('08b-cours-valide');
});

await step('Retour fiche : séance « Validée · 75 % » et 1/27 séances validées', async () => {
  await page.getByRole('button', { name: /Retour à la fiche patient/ }).click();
  await page.waitForURL(patientUrl);
  await page.getByText('Validée · 75%').waitFor();
  await page.getByText('1/27 séances validées').waitFor(); // 26 cochées d'office + AVK cochée plus haut
  await shot('08c-fiche-progression');
});

await step('Bilan PDF du patient téléchargé depuis sa fiche', async () => {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PDF' }).click()]);
  if (!/^bilan-testeur\d+-paul\.pdf$/.test(download.suggestedFilename())) throw new Error(`nom inattendu : ${download.suggestedFilename()}`);
  const head = fs.readFileSync(await download.path()).subarray(0, 4).toString();
  if (head !== '%PDF') throw new Error('le fichier n\'est pas un PDF');
});

await step('Prévisualisation depuis la bibliothèque (sans patient ni code)', async () => {
  await page.goto(`${BASE}/courses`);
  await page.getByText('IRCT et hémodialyse').waitFor();
  await page.locator('tr', { hasText: 'IRCT et hémodialyse' }).getByRole('button', { name: 'Prévisualiser' }).click();
  await page.getByText('Mode prévisualisation').waitFor();
  await page.getByRole('button', { name: 'Quitter' }).click();
  await page.waitForURL('**/courses');
});

await step('IDE : pas d\'accès à l\'administration', async () => {
  if (await page.getByRole('link', { name: /Équipe IDE|Centres et comptes/ }).count()) throw new Error('menu admin visible');
  await page.goto(`${BASE}/admin`);
  await page.waitForURL('**/dashboard');
  await page.getByText('Bonjour Claire').or(page.getByText('Bonsoir Claire')).waitFor();
  await shot('07-dashboard-ide');
});

await step('Déconnexion', async () => {
  await page.getByText('Claire Dubois').click();
  await page.getByText('Se déconnecter').click();
  await page.waitForURL('**/login');
  await page.goto(`${BASE}/dashboard`);
  await page.waitForURL('**/login');
});

const newIde = `ide.${stamp}@diaverum.test`;
await step('Cadre : crée une IDE dans son centre', async () => {
  await login('cadre@diaverum.test');
  await page.waitForURL('**/dashboard');
  await page.getByRole('link', { name: 'Équipe IDE' }).click();
  await page.getByRole('button', { name: 'Nouvelle IDE' }).click();
  await page.fill('#u-last', 'Nouvelle');
  await page.fill('#u-first', 'Recrue');
  await page.fill('#u-email', newIde);
  await page.getByText('Diaverum Paris Nord').last().click();
  await page.fill('#u-pass', 'Provisoire-Solide-2026');
  await page.getByRole('button', { name: 'Créer le compte' }).click();
  await page.getByText('Compte créé pour Recrue Nouvelle').waitFor();
  await shot('08-equipe-cadre');
  await page.getByText('Claire Dubois').or(page.getByText('Isabelle Blanc')).first().waitFor();
  await page.getByText('Isabelle Blanc').first().click();
  await page.getByText('Se déconnecter').click();
  await page.waitForURL('**/login');
});

await step('Nouvelle IDE : code de sécurité exigé à la première connexion', async () => {
  await login(newIde, 'Provisoire-Solide-2026');
  await page.getByText('Choisissez votre code de sécurité').waitFor();
  await shot('09-premiere-connexion');
  await page.fill('#sc-code', '2468');
  await page.fill('#sc-confirm', '2468');
  await page.fill('#sc-password', 'Provisoire-Solide-2026');
  await page.getByRole('button', { name: 'Enregistrer mon code' }).click();
  await page.getByText('Code de sécurité enregistré').waitFor();
  await page.getByText('Choisissez votre code de sécurité').waitFor({ state: 'hidden' });
  await page.getByText('Recrue Nouvelle').click();
  await page.getByText('Se déconnecter').click();
});

await step('Administrateur national : centres, comptes et code national', async () => {
  await login('admin@diaverum.test');
  await page.waitForURL('**/dashboard');
  await page.getByRole('link', { name: 'Centres et comptes' }).click();
  await page.getByText('ide.lyon@diaverum.test').waitFor();
  await page.getByRole('tab', { name: 'Centres' }).click();
  await page.getByText('Diaverum Lyon Sud').waitFor();
  await page.getByRole('tab', { name: 'Code national' }).click();
  await page.getByText('Code de sécurité national').waitFor();
  await shot('10-admin');
});

await step('Administrateur national : journal des accès (consultation du patient tracée)', async () => {
  await page.getByRole('tab', { name: 'Journal des accès' }).click();
  await page.getByPlaceholder('Identifiant de ressource (ex. patient)').fill(patientUrl.split('/').pop());
  await page.getByRole('cell', { name: 'ide@diaverum.test' }).first().waitFor();
  await page.getByRole('cell', { name: 'Consultation' }).first().waitFor();
  await shot('10a-journal');
});

await step('Administrateur national : contenus des séances (33, dont S4 intégrée)', async () => {
  await page.getByRole('link', { name: 'Contenus des séances' }).click();
  await page.getByText('3/33 séances ont un contenu intégré').waitFor();
  await page.getByRole('row', { name: /S4 IRCT et hémodialyse/ }).getByText('Publiée').waitFor();
  await shot('10b-contenus');
});

await step('Cadre : valide le programme, qui devient non modifiable', async () => {
  await page.getByText('Sophie Martin').click();
  await page.getByText('Se déconnecter').click();
  await login('cadre@diaverum.test');
  await page.waitForURL('**/dashboard');
  await page.goto(patientUrl);
  await page.getByRole('tab', { name: 'Parcours' }).click();
  await page.getByRole('button', { name: 'Valider le programme' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Valider' }).click();
  await page.getByText('Programme achevé', { exact: true }).last().waitFor();
  if (await page.getByRole('button', { name: /Lancer|Reprendre|Refaire/ }).count()) throw new Error('séance encore lançable');
  if (await page.getByRole('checkbox').first().isEnabled()) throw new Error('sélection encore modifiable');
  await shot('11-programme-acheve');
});

await step('Cadre : statistiques de son centre et export Excel', async () => {
  await page.getByRole('link', { name: 'Résultats' }).click();
  await page.getByText('Résultats et statistiques').waitFor();
  await page.getByText('Périmètre : Diaverum Paris Nord').waitFor();
  await page.getByText('Activité des IDE').waitFor();
  if (await page.getByRole('cell', { name: 'Diaverum Lyon Sud', exact: true }).count()) throw new Error('centre hors périmètre dans la synthèse');
  await shot('12-statistiques-cadre');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Excel', exact: true }).click()]);
  if (!download.suggestedFilename().startsWith('statistiques-diaverum-paris-nord')) throw new Error(`nom inattendu : ${download.suggestedFilename()}`);
});

await browser.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('❌')).length;
const relevantErrors = consoleErrors.filter((e) => !/401|403|422|Failed to load resource/.test(e));
console.log(`\nErreurs console inattendues : ${relevantErrors.length}`);
relevantErrors.slice(0, 5).forEach((e) => console.log('  ' + e.slice(0, 200)));
process.exit(failed || relevantErrors.length ? 1 : 0);

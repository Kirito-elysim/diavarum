// Lecture seule ; identifiants fournis à l’exécution, jamais stockés dans le script.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const email=process.env.E2E_EMAIL, password=process.env.E2E_PASSWORD;
assert.ok(email && password, 'Fournir E2E_EMAIL et E2E_PASSWORD');
const browser = await chromium.launch();
try {
 const page = await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const failures=[];page.on('response',r=>{if(new URL(r.url()).pathname.startsWith('/api/')&&r.status()>=500) failures.push(r.status());});
 const base=process.env.E2E_BASE_URL??'http://localhost:8091';
 await page.goto(base+'/login');await page.fill('#email',email);await page.fill('#password',password);await page.click('button[type=submit]');await page.waitForURL(u=>!u.pathname.includes('/login'));
 await page.goto(base+'/results');
 await page.getByText('Patients non archivés',{exact:true}).first().waitFor();
 await page.getByText('Inactifs (15 jours)',{exact:true}).waitFor();
 await page.getByText('En attente de décision',{exact:true}).waitFor();
 await page.goto(base+'/parcours');
 await page.getByRole('tab',{name:/Non démarré/}).click();
 await page.getByRole('tab',{name:/Inactif/}).click();
 await page.getByRole('tab',{name:/Tous/}).click();
 await page.getByRole('button',{name:/Statut/}).click();
 await page.waitForTimeout(500);
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 console.log('Lot 1 : résultats et listes, catégories d’activité, filtres et tri — OK (lecture seule)');
} finally {await browser.close();}

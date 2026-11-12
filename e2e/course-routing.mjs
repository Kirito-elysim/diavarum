// Régressions de navigation : API simulée, aucune écriture métier.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.E2E_BASE_URL ?? 'http://localhost:8091';
const browser = await chromium.launch();
try {
 const page = await browser.newPage();
 const errors=[];
 page.on('pageerror', error=>errors.push(error.message));
 let loggedIn=false;
 await page.route('**/api/**', route=>{
  const path=new URL(route.request().url()).pathname;
  if(!path.startsWith('/api/')) return route.continue();
  if(path==='/api/auth/login') loggedIn=true;
  if(path.startsWith('/api/auth/')) return route.fulfill({status:loggedIn?200:401,json:{token:'routing-test'}});
  if(path==='/api/me')return route.fulfill({json:{id:'routing-test',role:'admin_national',centers:[],firstName:'Test',lastName:'Navigation',securityCodeConfigured:true}});
  if(path.startsWith('/api/modules/'))return route.fulfill({json:{id:'course',code:'S2',title:'Cours test',estimatedDuration:30,competencies:[],content:[{id:'page',title:'Écran de test',blocks:[{id:'text',type:'text',content:'Texte'}]}]}});
  if(path.startsWith('/api/patients/'))return route.fulfill({json:{id:'patient',firstName:'Patient',lastName:'TEST'}});
  if(path.startsWith('/api/training_programs/'))return route.fulfill({status:404,json:{detail:'Parcours introuvable'}});
  return route.fulfill({json:{member:[],totalItems:0}});
 });
 const destination='/sessions/run?preview=1&moduleId=course';
 await page.goto(base+destination);
 await page.waitForURL('**/login');
 await page.fill('#email','test@example.test');
 await page.fill('#password','test');
 await page.click('button[type=submit]');
 await page.waitForURL(base+destination);
 await page.getByRole('heading',{name:'Écran de test',exact:true}).waitFor();
 for(const suffix of ['?moduleId=course&patientId=patient','?moduleId=course&patientId=patient&programId=missing']){
  await page.goto(base+'/sessions/run'+suffix);
  await page.getByText("Impossible d'ouvrir ce cours pour ce patient.",{exact:true}).waitFor();
  assert.equal(await page.getByRole('status',{name:'Chargement du cours'}).count(),0);
 }
 assert.deepEqual(errors,[]);
 console.log('Connexion : paramètres du cours conservés ; parcours absent/introuvable : erreur explicite sans blocage — OK');
} finally {await browser.close();}

// Rappel de reprise à l'ouverture de la fiche : plusieurs cours non terminés → liste, puis proposition du plus récent,
// reprise depuis le début. API simulée (statuts des cours forcés), connexion réelle ; aucune écriture réelle.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
const base = process.env.E2E_BASE_URL ?? 'http://localhost:8091';
let page;
try {
 const context = await browser.newContext({viewport:{width:800,height:600},hasTouch:true,isMobile:true});
 page = await context.newPage();
 page.setDefaultTimeout(10000);
 await page.goto(`${base}/login`);
 await page.fill('#email','ide@diaverum.test');
 await page.fill('#password','Diaverum2026!');
 await page.click('button[type=submit]');
 await page.waitForURL(url=>!url.pathname.includes('login'));
 let unfinished=[];
 await page.route(/\/api\/training_programs\/[0-9a-f-]{36}$/, async route => {
  const response = await route.fetch();
  const program = await response.json();
  program.status = 'actif'; program.activityStatus = 'actif';
  const mandatory = (program.modules ?? []).filter(item => item.module.mandatory);
  mandatory.forEach(item => { item.startedAt = null; item.validatedAt = null; item.status = 'non_demarre'; item.selected = true; });
  unfinished = mandatory.slice(0,3);
  unfinished.forEach((item,index) => { item.startedAt = `2026-11-1${index}T10:00:00+00:00`; item.status = 'non_termine'; });
  await route.fulfill({response, json:program});
 });
 await page.goto(`${base}/patients`);
 await page.getByText('DUPONT Jean',{exact:true}).tap();
 await page.waitForURL(/\/patients\/[0-9a-f-]{36}$/);
 const dialog=page.getByRole('alertdialog');
 await dialog.getByRole('heading',{name:'3 cours n\'ont pas été achevés',exact:true}).waitFor();
 assert.equal(await dialog.getByRole('listitem').count(),3,'Les trois cours inachevés sont listés');
 await dialog.getByRole('button',{name:'Continuer',exact:true}).tap();
 await dialog.getByRole('heading',{name:'Reprendre le cours interrompu ?',exact:true}).waitFor();
 const latest=unfinished[2];
 await dialog.getByText(new RegExp(latest.module.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))).waitFor();
 await dialog.getByText('Il reprendra depuis le début.',{exact:false}).waitFor();
 // « Non » ferme le rappel, qui ne revient pas pendant la session du navigateur
 await dialog.getByRole('button',{name:'Non',exact:true}).tap();
 await dialog.waitFor({state:'hidden'});
 await page.reload();
 await page.getByRole('tab',{name:'Parcours',exact:true}).waitFor();
 assert.equal(await page.getByRole('alertdialog').count(),0,'Rappel non répété après fermeture');
 // Nouvelle session du navigateur : « Oui, reprendre » ouvre le cours le plus récent, depuis le début
 await page.evaluate(()=>sessionStorage.clear());
 await page.reload();
 await dialog.getByRole('button',{name:'Continuer',exact:true}).tap();
 await dialog.getByRole('button',{name:'Oui, reprendre',exact:true}).tap();
 await page.waitForURL(url=>url.pathname==='/sessions/run');
 const target=new URL(page.url());
 assert.equal(target.searchParams.get('moduleId'),latest.module.id,'Reprise du cours le plus récent');
 assert.equal(target.searchParams.has('skipPre'),false,'Reprise depuis l\'écran d\'accueil, donc depuis le début');
 console.log('Rappel de reprise : liste des cours inachevés, proposition du plus récent, fermeture non répétée, reprise depuis le début — OK');
} catch(error) { if(page) await page.screenshot({path:'/tmp/resume-failure.png'}).catch(()=>{});throw error; }
finally {if(page) await page.unrouteAll({behavior:'ignoreErrors'}).catch(()=>{});await browser.close();}

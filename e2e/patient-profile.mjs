// Authentification réelle ; lectures et écritures du profil simulées, aucun dossier modifié.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
try {
 const page = await browser.newPage({viewport:{width:800,height:600},hasTouch:true,isMobile:true});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const base=process.env.E2E_BASE_URL ?? 'http://localhost:8091';
 await page.goto(`${base}/login`);
 await page.fill('#email','ide@diaverum.test');
 await page.fill('#password','Diaverum2026!');
 await page.click('button[type=submit]');
 await page.waitForURL(url=>!url.pathname.includes('login'));
 let saved, writes=0;
 await page.route(/\/api\/patients\/[0-9a-f-]{36}$/,async route=>{
  if(route.request().method()==='PATCH') {
   writes++;
   const payload=route.request().postDataJSON();
   assert.equal(payload.medicalData.existingField,'preserved');
   if(writes===1) return route.fulfill({status:500,json:{detail:'Test erreur'}});
   saved={...saved,...payload};
  } else if(!saved) {
   saved=await (await route.fetch()).json();
   saved.medicalData={existingField:'preserved'};
   saved.administrativeData=[];
  }
  return route.fulfill({json:saved});
 });
 await page.goto(`${base}/patients`);
 await page.getByText('DUPONT Jean',{exact:true}).tap();
 await page.waitForURL(/\/patients\/[0-9a-f-]{36}$/);
 const prompt=page.getByRole('alertdialog');
 try {await prompt.waitFor({timeout:2000});} catch {}
 if(await prompt.isVisible()) await prompt.getByRole('button',{name:/^(Fermer|Non)$/}).tap();
 await page.getByRole('tab',{name:'Profil patient',exact:true}).tap();
 await page.getByRole('button',{name:'Compléter le profil'}).tap();
 await page.getByLabel('Notes — informations médicales',{exact:true}).fill('Note de test');
 await page.getByRole('button',{name:'Ajouter une question — informations administratives'}).tap();
 await page.getByLabel('Question 1 — informations administratives',{exact:true}).fill('Question validée de test');
 await page.getByLabel('Réponse 1 — informations administratives',{exact:true}).fill('Réponse de test');
 await page.getByRole('button',{name:'Enregistrer le profil'}).tap();
 await page.getByText('Enregistrement impossible.',{exact:false}).waitFor();
 assert.equal(await page.getByLabel('Notes — informations médicales',{exact:true}).inputValue(),'Note de test');
 await page.getByRole('button',{name:'Enregistrer le profil'}).tap();
 await page.getByRole('button',{name:'Compléter le profil'}).waitFor();
 await page.getByRole('tab',{name:'Parcours',exact:true}).tap();
 await page.getByText('Réponse de test',{exact:true}).waitFor();
 await page.reload();
 await page.getByText('Réponse de test',{exact:true}).waitFor();
 assert.equal(saved.medicalData.profile.notes,'Note de test');
 assert.equal(writes,2);
 await page.getByRole('tab',{name:'Profil patient',exact:true}).tap();
 await page.getByRole('button',{name:'Compléter le profil'}).tap();
 await page.getByLabel('Notes — informations médicales',{exact:true}).fill('À annuler');
 await page.getByRole('button',{name:'Annuler les modifications'}).tap();
 await page.getByText('Note de test',{exact:true}).waitFor();
 assert.equal(writes,2);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);
 console.log('Profil patient tablette : saisie, erreur/reprise, conservation des données, résumé, rechargement et annulation OK');
} finally {await browser.close();}

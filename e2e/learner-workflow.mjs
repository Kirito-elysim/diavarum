// Parcours apprenant : API métier simulée, authentification et vérification du PIN réelles.
// Aucun dossier patient ni aucune séance réelle ne sont modifiés.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
const base = process.env.E2E_BASE_URL ?? 'http://localhost:8091';
let page;
try {
 const context = await browser.newContext({viewport:{width:800,height:600},hasTouch:true,isMobile:true});
 page = await context.newPage();
 page.setDefaultTimeout(10000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${base}/login`);
 await page.fill('#email','ide@diaverum.test');
 await page.fill('#password','Diaverum2026!');
 await page.click('button[type=submit]');
 await page.waitForURL(url=>!url.pathname.includes('login'));
 const picture='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="250"><rect width="500" height="250" fill="lightblue"/></svg>');
 const module={id:'learner-test',title:'Vérification du parcours apprenant',estimatedDuration:30,competencies:[{id:'competency',label:'Compétence de test'}],content:[
  {id:'learning',title:'Découvrir',blocks:[
   {id:'legend',type:'hotspot',imageUrl:picture,alt:'Illustration test',hotspots:[{id:'point',x:50,y:50,label:'Repère test',description:'Description de la légende'}]},
   {id:'carousel',type:'carousel',slides:[{id:'a',imageUrl:picture,alt:'Première illustration',text:'Texte première image'},{id:'b',imageUrl:picture,alt:'Deuxième illustration',text:'Texte deuxième image'}]},
   {id:'cards',type:'flip-cards',question:'Cartes test',cards:[{id:'card',front:'Recto test',back:'Verso test'}]}
  ]},
  {id:'reflection',title:'Réflexion',blocks:[{id:'ungraded',type:'quiz',questionType:'qcm',graded:false,question:'Question non notée',options:[{id:'u',label:'Mon choix',isCorrect:false}]}]},
  {id:'qcu-page',title:'Choix unique',blocks:[{id:'qcu',type:'quiz',questionType:'qcu',question:'Une réponse',options:[{id:'a',label:'Réponse correcte',isCorrect:true},{id:'b',label:'Autre réponse',isCorrect:false}]}]},
  {id:'qcm-page',title:'Choix multiples',blocks:[{id:'qcm',type:'quiz',questionType:'qcm',question:'Plusieurs réponses',options:[{id:'a',label:'Bonne réponse A',isCorrect:true},{id:'b',label:'Bonne réponse B',isCorrect:true},{id:'c',label:'Mauvaise réponse',isCorrect:false}]}]}
 ]};
 await page.route('**/api/modules/*',r=>r.fulfill({json:module}));
 await page.route('**/api/patients/learner-test',r=>r.fulfill({json:{id:'learner-test',firstName:'Patient',lastName:'TEST'}}));
 await page.route('**/api/training_programs/learner-test',r=>r.fulfill({json:{id:'learner-test',modules:[]}}));
 await page.route('**/api/training_programs?*', async route => {
  const response=await route.fetch();
  const data=await response.json();
  for(const program of data.member ?? []) for(const item of program.modules) if(!item.module.mandatory) item.selected=false;
  await route.fulfill({response,json:data});
 });
 let starts=0,interrupted=0,validation;
 await page.route('**/api/sessions',r=>{assert.equal(r.request().method(),'POST');starts++;return r.fulfill({status:201,json:{id:'learner-test'}});});
 await page.route('**/api/sessions/learner-test/interrupt',r=>{interrupted++;return r.fulfill({json:{status:'interrompue'}});});
 await page.route('**/api/sessions/learner-test/validate',r=>{validation=r.request().postDataJSON();return r.fulfill({json:{status:'validee',score:67,durationSeconds:validation.durationSeconds}});});
 await page.goto(`${base}/patients`);
 await page.getByText('DUPONT Jean',{exact:true}).tap();
 await page.waitForURL(/\/patients\/[0-9a-f-]{36}$/);
 const patientUrl=page.url();
 const prompt=page.getByRole('alertdialog');
 try { await prompt.waitFor({timeout:3000}); } catch {}
 if(await prompt.isVisible()) await prompt.getByRole('button',{name:/^(Fermer|Non)$/}).tap();
 await page.getByRole('tab',{name:'Parcours',exact:true}).tap();
 await page.locator('div.p-3.rounded-xl',{hasText:'Droits et devoirs du patient'}).getByRole('button',{name:/Lancer|Reprendre|Refaire/}).tap();
 await page.getByRole('alertdialog').getByRole('heading',{name:'Aucun cours optionnel sélectionné'}).waitFor();
 await page.getByRole('button',{name:'Revoir le parcours',exact:true}).tap();
 assert.equal(starts,0);
 await page.locator('div.p-3.rounded-xl',{hasText:'Droits et devoirs du patient'}).getByRole('button',{name:/Lancer|Reprendre|Refaire/}).tap();
 await page.getByRole('alertdialog').getByRole('button',{name:'Lancer le cours',exact:true}).tap();
 await page.getByRole('button',{name:/Commencer la séance/}).tap();
 await page.getByRole('heading',{name:'Découvrir',exact:true}).waitFor();
 assert.equal(starts,1,'Une seule création de séance');
 // Retour Android/navigateur : le lecteur ne doit pas quitter la séance.
 await page.goBack();
 await page.getByRole('heading',{name:'Code IDE',exact:true}).waitFor();
 assert.ok(page.url().includes('/sessions/run'));
 for(const digit of '0000') await page.getByRole('button',{name:digit,exact:true}).tap();
 await page.getByRole('button',{name:'Valider',exact:true}).tap();
 await page.getByText('Code incorrect',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Annuler',exact:true}).tap();
 await page.getByRole('heading',{name:'Découvrir',exact:true}).waitFor();
 assert.equal(starts,1,'Le retour annulé conserve la séance');
 await page.getByRole('button',{name:'Afficher la légende 1 : Repère test',exact:true}).tap();
 await page.getByText('Description de la légende',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Image suivante',exact:true}).tap();
 await page.getByText('Texte deuxième image',{exact:true}).waitFor();
 await page.getByRole('button',{name:/Recto test/}).tap();
 await page.getByText('Verso test',{exact:true}).waitFor();
 async function next(title){await page.getByRole('button',{name:/Page suivante|Terminer/}).tap();if(title) await page.getByRole('heading',{name:title,exact:true}).waitFor();}
 await next('Réflexion');
 await page.getByText('Question non notée.',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:/Page suivante/}).isDisabled(),true);
 await page.getByRole('button',{name:'Mon choix',exact:true}).tap();
 await page.getByRole('button',{name:'Valider mes réponses',exact:true}).tap();
 await next('Choix unique');
 await page.getByRole('button',{name:/Réponse correcte/}).tap();
 await page.getByRole('button',{name:'Valider ma réponse',exact:true}).tap();
 await next('Choix multiples');
 await page.getByRole('button',{name:/Page précédente/}).tap();
 await page.getByRole('heading',{name:'Choix unique',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:/Réponse correcte/}).isDisabled(),true);
 assert.equal(await page.getByRole('button',{name:'Valider ma réponse',exact:true}).count(),0);
 await next('Choix multiples');
 await page.getByRole('button',{name:'Bonne réponse A',exact:true}).tap();
 await page.getByRole('button',{name:'Mauvaise réponse',exact:true}).tap();
 await page.getByRole('button',{name:'Valider mes réponses',exact:true}).tap();
 await next();
 await page.getByText('67 %',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Fin du cours',exact:true}).tap();
 for(const digit of '1234') await page.getByRole('button',{name:digit,exact:true}).tap();
 await page.getByRole('button',{name:'Valider',exact:true}).tap();
 await page.getByText("Compétences d'entraînement",{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Terminer le cours',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Validée',exact:true}).tap();
 await page.getByRole('button',{name:'Terminer le cours',exact:true}).tap();
 await page.getByRole('button',{name:'Confirmer',exact:true}).tap();
 await page.getByText('Cours validé',{exact:true}).waitFor();
 await page.goBack();
 await page.getByRole('heading',{name:'Code IDE',exact:true}).waitFor();
 await page.getByRole('button',{name:'Annuler',exact:true}).tap();
 await page.getByText('Cours validé',{exact:true}).waitFor();
 assert.deepEqual(validation.answers,[{blockId:'qcu',correct:1,total:1},{blockId:'qcm',correct:1,total:2}]);
 assert.deepEqual(validation.competencies,[{id:'competency',validated:true}]);
 console.log('Interactions, QCU/QCM, score 67 %, retour arrière avec PIN, validation IDE — OK');
 // Adresse saisie/rechargement : aucun accès au back-office sans le code.
 await page.goto(`${base}/patients`);
 await page.getByRole('heading',{name:'Code IDE',exact:true}).waitFor();
 assert.ok(page.url().includes('/sessions/run'));
 for(const digit of '1234') await page.getByRole('button',{name:digit,exact:true}).tap();
 await page.getByRole('button',{name:'Valider',exact:true}).tap();
 await page.waitForURL(patientUrl);
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('diaverum:learner-session')),null);
 assert.equal(interrupted,0,'Aucune nouvelle séance démarrée pour quitter après rechargement');
 assert.deepEqual(errors,[]);
 console.log('Retour au back-office après saisie du code uniquement — OK');
} catch(error) { if(page) await page.screenshot({path:'/tmp/learner-failure.png'}).catch(()=>{});throw error; }
finally {await browser.close();}

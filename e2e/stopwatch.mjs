// Chronomètre de séance : pause/reprise, tentative de sortie, veille, sortie validée par le code, durée envoyée à la validation.
// Horloge du navigateur simulée (aucune attente réelle) ; API métier simulée ; authentification et code IDE réels.
// Aucun dossier patient ni aucune séance réelle ne sont modifiés. Comme learner-workflow.mjs, suppose le jeu de démonstration
// (patient DUPONT Jean éligible) : le statut du parcours et des séances est forcé par interception.
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

 const module={id:'learner-test',title:'Chronomètre',estimatedDuration:30,competencies:[{id:'competency',label:'Compétence de test'}],content:[{id:'p1',title:'Page unique',blocks:[{id:'t',type:'text',content:'Texte'}]}]};
 await page.route('**/api/modules/*',r=>r.fulfill({json:module}));
 await page.route('**/api/patients/learner-test',r=>r.fulfill({json:{id:'learner-test',firstName:'Patient',lastName:'TEST'}}));
 await page.route('**/api/training_programs/learner-test',r=>r.fulfill({json:{id:'learner-test',modules:[]}}));
 await page.route(/\/api\/training_programs\/[0-9a-f-]{36}$/, async route => {
  const response = await route.fetch();
  const program = await response.json();
  program.status = 'actif'; program.activityStatus = 'actif';
  for (const item of program.modules ?? []) {
   if (!item.module.mandatory) item.selected = false;
   item.startedAt = null; item.validatedAt = null; item.status = 'non_demarre';
  }
  await route.fulfill({response, json:program});
 });
 let starts=0,interrupted=0,validation;
 await page.route('**/api/sessions',r=>{if(r.request().method()!=='POST') return r.fallback();starts++;return r.fulfill({status:201,json:{id:'learner-test'}});});
 await page.route('**/api/sessions/learner-test/interrupt',r=>{interrupted++;return r.fulfill({json:{status:'interrompue'}});});
 await page.route('**/api/sessions/learner-test/validate',r=>{validation=r.request().postDataJSON();return r.fulfill({json:{status:'validee',score:null,durationSeconds:validation.durationSeconds}});});

 const clock=page.clock;
 const timer=page.locator('[title^="Durée indicative"]');
 const read=async()=>(await timer.innerText()).trim();
 const enterPin=async code=>{for(const digit of code) await page.getByRole('button',{name:digit,exact:true}).tap();await page.getByRole('button',{name:'Valider',exact:true}).tap();};
 const dismissPrompt=async()=>{
  const prompt=page.getByRole('alertdialog');
  try { await prompt.waitFor({timeout:3000}); } catch {}
  if(await prompt.isVisible()) await prompt.getByRole('button',{name:/^(Fermer|Non)$/}).tap();
 };
 const course=()=>page.locator('div.p-3.rounded-xl',{hasText:'Droits et devoirs du patient'});
 // Fiche patient → onglet Parcours → lancement du cours → début de la séance
 const launch=async()=>{
  await clock.runFor(500); // laisse les requêtes de la fiche mettre l'écran à jour (horloge simulée en pause)
  await page.getByRole('tab',{name:'Parcours',exact:true}).tap();
  await clock.runFor(500);
  await course().getByRole('button',{name:/Lancer|Reprendre/}).tap();
  await clock.runFor(500);
  await page.getByRole('button',{name:/Commencer la séance/}).tap();
  await clock.runFor(500);
  await page.getByRole('heading',{name:'Page unique',exact:true}).waitFor();
  await timer.waitFor();
 };

 await clock.install({time:new Date('2026-11-12T10:00:00')});
 await page.goto(`${base}/patients`);
 await page.getByText('DUPONT Jean',{exact:true}).tap();
 await page.waitForURL(/\/patients\/[0-9a-f-]{36}$/);
 await dismissPrompt();
 await launch();
 await clock.pauseAt(new Date('2026-11-12T10:30:00'));
 assert.equal(starts,1,'Séance créée au lancement');
 await clock.runFor(60000-await 0); // laisse le démarrage se stabiliser
 const origin=await read();
 const [om,os]=origin.split(':').map(Number);
 const base0=om*60+os;
 const at=async seconds=>assert.equal(await read(),`${String(Math.floor((base0+seconds)/60)).padStart(2,'0')}:${String((base0+seconds)%60).padStart(2,'0')}`);

 // Le chronomètre avance seconde par seconde
 await clock.runFor(5000);
 await at(5);

 // Pause : le temps s'arrête, la reprise repart de la valeur atteinte
 await page.getByRole('button',{name:'Pause',exact:true}).tap();
 await page.getByRole('heading',{name:'Séance en pause',exact:true}).waitFor();
 await clock.runFor(10000);
 assert.equal((await page.locator('.text-5xl').innerText()).trim(),await (async()=>{const s=base0+5;return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;})(),'Pause : 10 s écoulées, temps inchangé');
 await page.getByRole('button',{name:'Reprendre'}).last().tap();
 await clock.runFor(3000);
 await at(8);

 // Tentative de sortie (retour) : le code est demandé, le temps est suspendu, l'annulation reprend
 await page.goBack();
 await page.getByRole('heading',{name:'Code IDE',exact:true}).waitFor();
 await clock.runFor(10000);
 await page.getByRole('button',{name:'Annuler',exact:true}).tap();
 await page.getByRole('heading',{name:'Page unique',exact:true}).waitFor();
 await at(8);
 await clock.runFor(2000);
 await at(10);
 assert.equal(starts,1,'La séance n\'est pas recréée');
 assert.equal(interrupted,0);

 // Appareil mis en veille (le navigateur saute dans le temps) : seul le temps de présence compte
 await clock.fastForward(60000);
 const afterSleep=await read();
 const [sm,ss0]=afterSleep.split(':').map(Number);
 assert.ok(sm*60+ss0<=base0+11,`Veille d'une minute non comptée comme temps de séance (lu : ${afterSleep})`);

 // Fin du cours : la durée envoyée au serveur est celle affichée
 await page.getByRole('button',{name:/Terminer/}).tap();
 await page.getByRole('button',{name:'Fin du cours',exact:true}).tap();
 await enterPin('1234');
 await page.getByText("Compétences d'entraînement",{exact:true}).waitFor();
 await page.getByRole('button',{name:'Validée',exact:true}).tap();
 await page.getByRole('button',{name:'Terminer le cours',exact:true}).tap();
 await page.getByRole('button',{name:'Confirmer',exact:true}).tap();
 await page.getByText('Cours validé',{exact:true}).waitFor();
 assert.equal(validation.durationSeconds,sm*60+ss0,`La durée envoyée (${validation.durationSeconds} s) est celle affichée (${afterSleep})`);
 assert.equal(interrupted,0);

 // Sortie validée par le code : séance interrompue, aucune durée envoyée ; un nouveau lancement repart de zéro
 // Retour au back-office après la validation (code IDE), puis nouveau lancement de la même séance
 validation=undefined;
 await page.goBack();
 await page.getByRole('heading',{name:'Code IDE',exact:true}).waitFor();
 await enterPin('1234');
 await page.waitForURL(/\/patients\/[0-9a-f-]{36}$/);
 await clock.runFor(1500);
 await dismissPrompt();
 await launch();
 const before=starts;
 await clock.runFor(4000);
 await page.getByRole('button',{name:'Pause',exact:true}).tap();
 await page.getByRole('button',{name:'Reprendre'}).last().tap();
 await page.goBack();
 await page.getByRole('heading',{name:'Code IDE',exact:true}).waitFor();
 await enterPin('1234');
 await page.waitForURL(/\/patients\/[0-9a-f-]{36}$/);
 assert.equal(interrupted,1,'Sortie : séance interrompue côté serveur');
 assert.equal(validation,undefined,'Aucune durée enregistrée pour une séance quittée');
 await dismissPrompt();
 await launch();
 assert.equal(starts,before+1,'Nouveau lancement = nouvelle séance');
 const [nm,ns]=(await read()).split(':').map(Number);
 assert.ok(nm*60+ns<=2,`Nouvelle séance : le temps repart de zéro (lu : ${await read()})`);
 assert.deepEqual(errors,[]);
 console.log('Chronomètre : avance, pause/reprise, sortie annulée, veille, durée envoyée = durée affichée, sortie validée puis relance à zéro — OK');
} catch(error) { if(page) await page.screenshot({path:'/tmp/stopwatch-failure.png'}).catch(()=>{});throw error; }
finally {if(page) await page.unrouteAll({behavior:'ignoreErrors'}).catch(()=>{});await browser.close();}

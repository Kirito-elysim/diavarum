// Lecture/écriture du cours et médias simulées ; aucun cours réel modifié.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
const base = process.env.E2E_BASE_URL ?? 'http://localhost:8091';
try {
 const page = await browser.newPage({ viewport: { width: 800, height: 1000 }, hasTouch: true, isMobile: true });
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/login`);await page.fill('#email','admin@diaverum.test');await page.fill('#password','Diaverum2026!');await page.click('button[type=submit]');await page.waitForURL(url=>!url.pathname.includes('login'));
 let course={code:'S2',title:'Cours de test',description:'',estimatedDuration:30,published:false,competencies:[],content:[]},writes=0;
 await page.route('**/api/content/modules/S2',async route=>{
  if(route.request().method()==='PUT') { writes++; if(writes===1)return route.fulfill({status:422,json:{detail:'Erreur de test : brouillon conservé'}});course=route.request().postDataJSON(); }
  await route.fulfill({json:course});
 });
 const picture='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVZkAAAAASUVORK5CYII=';
 await page.route('**/api/content/media',route=>route.fulfill({status:201,json:{url:picture}}));
 await page.goto(`${base}/modules/S2/edit`);
 await page.getByRole('button',{name:'Ajouter une compétence',exact:true}).click();await page.getByLabel('Compétence 1',{exact:true}).fill('Compétence test');
 await page.getByRole('button',{name:'Créer le premier écran'}).click();
 await page.getByLabel('Titre de l’écran',{exact:true}).fill('Découvrir');
 await page.getByLabel('Consigne à l’apprenant').fill('Touchez les activités.');
 await page.getByRole('button',{name:'Texte',exact:true}).click();await page.getByLabel('Texte',{exact:true}).fill('Texte pédagogique de test');
 await page.getByRole('button',{name:'Cartes à retourner',exact:true}).click();await page.getByLabel('Recto',{exact:true}).fill('Recto test');await page.getByLabel('Verso',{exact:true}).fill('Verso test');
 await page.getByRole('button',{name:'Carrousel',exact:true}).click();
 await page.getByLabel('Importer une image',{exact:true}).setInputFiles({name:'image.png',mimeType:'image/png',buffer:Buffer.from(picture.split(',')[1],'base64')});
 await page.getByLabel('Texte associé à l’image',{exact:true}).fill('Texte de la diapositive');
 await page.getByRole('button',{name:'Image à légendes',exact:true}).click();
 await page.getByLabel('Importer une image',{exact:true}).last().setInputFiles({name:'image.png',mimeType:'image/png',buffer:Buffer.from(picture.split(',')[1],'base64')});
 await page.getByRole('button',{name:'Ajouter une légende',exact:true}).click();await page.getByLabel('Titre de la légende 1').fill('Repère');await page.getByLabel('Texte de la légende 1').fill('Description du repère');
 await page.getByRole('button',{name:'Ajouter un écran',exact:true}).click();await page.getByLabel('Titre de l’écran',{exact:true}).fill('Question formative');
 await page.getByRole('button',{name:'QCM — plusieurs réponses',exact:true}).click();
 await page.getByLabel('Question',{exact:true}).fill('Quels choix ?');await page.getByLabel('Proposition 1',{exact:true}).fill('Choix A');await page.getByLabel('Proposition 2',{exact:true}).fill('Choix B');
 await page.getByLabel('Compter cette question dans le score').uncheck();
 await page.getByLabel('Bonne réponse — proposition 1',{exact:true}).check();await page.getByLabel('Explication de la correction').fill('Explication formative');
 // Contrôle du brouillon après rechargement.
 await page.waitForFunction(()=>Object.keys(localStorage).some(k=>k.includes('course-draft')&&localStorage.getItem(k).includes('Explication formative')));
 page.once('dialog',d=>d.accept());await page.reload();await page.getByRole('button',{name:'Reprendre le brouillon'}).click();
 await page.getByRole('button',{name:/02 Question formative/}).click();
 await page.getByRole('button',{name:'Aperçu apprenant',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Aperçu apprenant'});
 await dialog.getByRole('button',{name:'Choix A',exact:true}).click();await dialog.getByRole('button',{name:'Valider mes réponses'}).click();await dialog.getByText('Explication formative',{exact:true}).waitFor();
 await dialog.getByRole('button',{name:'Recommencer l’aperçu'}).click();await dialog.getByRole('button',{name:'Valider mes réponses'}).waitFor();
 await dialog.getByRole('button',{name:'Fermer',exact:true}).click();
 // Erreur serveur puis nouvel enregistrement.
 await page.getByRole('button',{name:'Enregistrer le cours',exact:true}).click();await page.getByRole('button',{name:'Confirmer l’enregistrement'}).click();await page.getByText('Erreur de test : brouillon conservé',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Enregistrer le cours',exact:true}).click();await page.getByRole('button',{name:'Confirmer l’enregistrement'}).click();await page.getByText('Version enregistrée',{exact:false}).waitFor();
 assert.equal(writes,2);assert.equal(course.content.length,2);assert.equal(course.content[0].blocks.length,4);assert.equal(course.content[1].blocks[0].graded,false);assert.equal(course.content[1].blocks[0].showCorrection,true);assert.equal(course.competencies.length,1);
 await page.getByRole('button',{name:'Dupliquer l’écran'}).click();await page.getByLabel('Titre de l’écran',{exact:true}).waitFor();assert.equal(await page.getByLabel('Titre de l’écran',{exact:true}).inputValue(),'Question formative (copie)');
 await page.getByRole('button',{name:'Annuler la dernière modification'}).click();assert.equal(await page.getByLabel('Titre de l’écran',{exact:true}).inputValue(),'Découvrir');
 await page.setViewportSize({width:768,height:1024});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.setViewportSize({width:1024,height:768});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'/tmp/course-editor-tablet.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('Éditeur : création, médias, activités, quiz formatif, récupération, aperçu, sauvegarde, duplication/annulation et tablette OK');
} finally {await browser.close();}

// Recette de la maquette, API entièrement simulée, aucune écriture réelle.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
try {
 const page = await browser.newPage({viewport:{width:1536,height:1024}});
 const errors=[]; page.on('pageerror', e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('resume-prompt:test','1'));
 const author={id:'nurse',firstName:'Camille',lastName:'TEST'};
 const patient={'@id':'/api/patients/test',id:'test',firstName:'Patient',lastName:'DEMO',dateOfBirth:'1980-01-01',center:{name:'Centre test'},createdAt:'2026-01-01',createdBy:author,eligibilityStatus:'eligible'};
 const program={'@id':'/api/training_programs/test',id:'test',patient,status:'actif',interruptionReasons:[],selectedCount:3,validatedCount:1,totalDurationSeconds:1800,modules:['valide','non_termine','non_demarre'].map((status,i)=>({'@id':`/api/program_modules/${i}`,id:String(i),selected:true,position:i,status,validatedAt:i===0?'2026-11-12T12:30:00Z':null,durationSeconds:i===0?1800:null,module:{id:`m${i}`,code:`S${i+1}`,title:['Droits et devoirs du patient','Hygiène au centre de dialyse','Confort et sécurité en séance'][i],mandatory:true,estimatedDuration:30,chapter:{id:'chapter',title:'Informations et sécurité du patient'}}}))};
 await page.route('**/api/**',r=>{
  const path=new URL(r.request().url()).pathname;
  if (!path.startsWith('/api/')) return r.continue();
  let json={member:[],totalItems:0};
  if(path.startsWith('/api/auth/'))json={token:'test'};
  if(path==='/api/me')json={...author,role:'admin_national',centers:[],securityCodeConfigured:true};
  if(path==='/api/patients/test')json=patient;
  if(path==='/api/training_programs')json={member:[program],totalItems:1};
  if(path==='/api/training_programs/test')json=program;
  if(path==='/api/sessions')json={member:[{id:'s',program:program['@id'],module:program.modules[0].module,nurse:author,status:'validee',completedAt:'2026-11-12T12:30:00Z',competencyValidations:[{id:'v',competency:'/api/module_competencies/c',validated:true}]}],totalItems:1};
  if(path==='/api/module_competencies/c')json={label:'Connaître ses droits et devoirs'};
  return r.fulfill({json});
 });
 await page.goto((process.env.E2E_BASE_URL??'http://127.0.0.1:5173')+'/patients/test');
 await page.getByRole('tab',{name:'Parcours',exact:true}).click();
 await page.getByText('Connaître ses droits et devoirs',{exact:true}).waitFor();
 assert.equal(await page.getByText('33%',{exact:true}).count(),1);
 assert.equal(await page.getByRole('button',{name:'Valider le parcours',exact:true}).count(),1);
 assert.equal(await page.getByRole('button',{name:'Clôturer le parcours',exact:true}).count(),1);
 assert.equal(await page.getByRole('button',{name:'Voir les compétences globales'}).count(),0);
 const validated=page.locator('article').filter({hasText:'Droits et devoirs du patient'});
 assert.equal(await validated.getByRole('button').count(),0);
 const active=page.getByRole('tab',{name:'Parcours',exact:true});
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('[role=tab][data-state=active]')).color==='rgb(245, 102, 0)');
 assert.equal(await active.evaluate(e=>getComputedStyle(e).color),'rgb(245, 102, 0)');
 assert.equal(await active.locator('svg').evaluate(e=>getComputedStyle(e).color),'rgb(245, 102, 0)');
 await page.waitForFunction(()=>['rgb(245, 102, 0)', 'rgba(245, 102, 0, 1)'].includes(getComputedStyle(document.querySelector('[role=tab][data-state=active]')).borderBottomColor));
 await page.getByRole('button',{name:'Validés (1)',exact:true}).click();
 assert.equal(await page.locator('article').count(),1);
 await page.getByRole('button',{name:'À réaliser (1)',exact:true}).click();
 assert.equal(await page.locator('article').count(),1);
 await page.getByRole('button',{name:'Tous (3)',exact:true}).click();
 await page.getByLabel('Trier les modules').selectOption('title');
 assert.match(await page.locator('article h3').first().innerText(),/Confort/);
 const summary=page.locator('summary');await summary.click();assert.equal(await page.locator('details').getAttribute('open'),null);await summary.click();
 await page.screenshot({path:'/tmp/parcours-bis-desktop.png',fullPage:true});
 for(const width of [768,1024,390]){await page.setViewportSize({width,height:1024});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Débordement à ${width}`);}
 await page.setViewportSize({width:768,height:1024});await page.screenshot({path:'/tmp/parcours-bis-tablet.png',fullPage:true});
 await page.getByRole('tab',{name:'Compétences',exact:true}).click();await page.getByText('Connaître ses droits et devoirs',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('Parcours : KPI, filtres, tri, accordéon, compétences, verrouillage, actions, onglets orange et responsive 1536/1024/768/390 — OK');
}finally{await browser.close();}

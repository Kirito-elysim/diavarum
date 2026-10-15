import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
const base = process.env.E2E_BASE_URL ?? 'http://localhost:8091';
try {
 for (const viewport of [{width:768,height:1024},{width:1024,height:768},{width:800,height:600}]) {
  const context = await browser.newContext({viewport, hasTouch:true, isMobile:true});
  const page = await context.newPage();
  await page.goto(`${base}/login`);
  await page.fill('#email','admin@diaverum.test');
  await page.fill('#password','Diaverum2026!');
  await page.click('button[type=submit]');
  await page.waitForURL(url => !url.pathname.includes('login'));
  for (const path of ['dashboard','patients','parcours','sessions','courses','results','settings','admin','modules']) {
   await page.goto(`${base}/${path}`);
   await page.locator('main').waitFor();
   await page.getByRole('button',{name:'Ouvrir le menu de navigation'}).tap();
   const drawer=page.getByRole('dialog',{name:'Navigation Diaverum'});
   await drawer.getByRole('link',{name:'Patients',exact:true}).waitFor();
   await drawer.getByRole('button',{name:'Fermer',exact:true}).tap();
   await drawer.waitFor({state:'hidden'});
   const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   console.log(`${viewport.width}: ${path}`);
   assert.ok(overflow.scroll <= viewport.width+1,`${path} ${viewport.width}: ${JSON.stringify(overflow)}`);
  }
  await page.goto(`${base}/patients`);
  await page.getByText('DUPONT Jean').tap();
  await page.waitForURL(/\/patients\/[0-9a-f-]{36}$/);
  console.log('Patient ouvert',page.url());
  const resume = page.getByRole('alertdialog');
  try { await resume.waitFor({timeout:3000}); await resume.getByRole('button',{name:/^(Fermer|Non)$/}).tap(); } catch {}
  await page.screenshot({path:'/tmp/tablet-patient.png',fullPage:true});
  await page.getByRole('tab',{name:'Éligibilité',exact:true}).tap();
  await page.getByRole('button',{name:'Faire passer le test'}).tap();
  await page.getByRole('button',{name:/Mots lus et répétés/}).tap();
  await page.getByRole('button',{name:'Donner la tablette au patient'}).tap();
  const face = page.getByRole('img',{name:'Cadran vierge à dessiner au doigt ou au stylet'});
  await face.scrollIntoViewIfNeeded();
  const box=await face.boundingBox();
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
  for(let i=1;i<=6;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2+i*8,y:box.y+box.height/2+i*4}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await face.locator('polyline').count(),1);
  await page.getByRole('button',{name:/J’ai terminé/}).tap();
  for(const radio of await page.getByRole('radio',{name:'Oui',exact:true}).all()) await radio.tap();
  await page.screenshot({path:`/tmp/diaverum-tablet-${viewport.width}.png`,fullPage:true});
  assert.equal(await page.getByRole('button',{name:'Continuer vers le rappel des mots'}).isEnabled(),true);
  console.log(`${viewport.width}x${viewport.height}: navigation, 9 pages, CODEX tactile — OK`);
  await page.route('**/api/modules/tablet-fixture', route => route.fulfill({json:{ id:'tablet-fixture', title:'Exercice tactile', estimatedDuration:5, competencies:[], content:[{id:'page',title:'Mots cachés',blocks:[{type:'word-search',id:'words',question:'Retrouvez CLE',gridSize:3,letters:'CLEABCDEF',words:[{id:'cle',word:'CLE',clue:'Une clé'}]}]}] }}));
  await page.goto(`${base}/sessions/run?preview=1&moduleId=tablet-fixture`);
  const first=page.locator('[data-word-row="0"][data-word-column="0"]');
  await first.scrollIntoViewIfNeeded();
  const start=await first.boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x+start.width/2,y:start.y+start.height/2}]});
  for (const column of [1,2]) {
   const cell=await page.locator(`[data-word-row="0"][data-word-column="${column}"]`).boundingBox();
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cell.x+cell.width/2,y:cell.y+cell.height/2}]});
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.getByText('1/1',{exact:true}).waitFor();
  console.log('Mots cachés au doigt — OK');
  await context.close();
 }
} finally {await browser.close();}

/* Startup-only camera checks against the isolated, backend-free sample origin. */
const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
const origin='http://127.0.0.1:4174',out='/workspace/shared/downloads';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const who of ['bruce','elena']){
  const context=await browser.newContext({viewport:{width:430,height:932},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await context.addInitScript(who=>{localStorage.setItem('ow.preview.sample.v1','1');localStorage.setItem('ow.who',who);window.startupGPSCalls=0;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){window.startupGPSCalls++;},watchPosition(){window.startupGPSCalls++;}}});},who);
  await context.route(origin+'/',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('startBehindGate();','window.__START_TEST={state:S,homes:HOMES,fly:flyTo,hits:function(){return hitboxes;}};startBehindGate();')});});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function ready(){await page.waitForFunction(()=>window.__START_TEST&&window.__START_TEST.state.who);await page.waitForTimeout(800);if(await page.locator('#quote').isVisible())await page.locator('#quote').click();await page.addStyleTag({content:'#toasts{display:none!important}'});}
  await page.goto(origin);await ready();
  const records=await page.evaluate(()=>JSON.stringify([window.__START_TEST.state.memories,window.__START_TEST.state.regions]));
  for(const viewport of [{width:390,height:844},{width:430,height:932},{width:1440,height:900}]){
   await page.setViewportSize(viewport);await page.waitForTimeout(150);
   const camera=await page.evaluate(()=>{const a=window.__START_TEST;return{who:a.state.who,zoom:a.state.zoom,center:{...a.state.center},home:a.homes[a.state.who],gps:window.startupGPSCalls};});
   assert.equal(camera.who,who);assert.equal(camera.zoom,10);assert.equal(camera.center.lat,camera.home.lat);assert.equal(camera.center.lng,camera.home.lng);assert.equal(camera.gps,0);
   await page.screenshot({path:path.join(out,'startup-'+who+'-'+viewport.width+'.png')});
  }
  await page.evaluate(()=>window.__START_TEST.fly(42,-78,7.8));await page.reload();await ready();assert.equal(await page.evaluate(()=>window.__START_TEST.state.zoom),10,'reload uses relaxed startup camera');
  await page.locator('#views [data-view="local"]').click();assert.equal(await page.evaluate(()=>window.__START_TEST.state.zoom),11.2,'explicit Local keeps existing closer view');
  assert.equal(await page.evaluate(()=>JSON.stringify([window.__START_TEST.state.memories,window.__START_TEST.state.regions])),records);
  if(who==='bruce'){
   await page.setViewportSize({width:430,height:932});await page.evaluate(()=>window.__START_TEST.fly(40.758,-73.9855,7.8));await page.waitForTimeout(250);
   assert(await page.evaluate(()=>window.__START_TEST.hits().some(h=>h.item.kind==='landmark'&&h.item.id==='nyc')),'existing NYC icon stays interactive');
   await page.screenshot({path:path.join(out,'nyc-world-current.png')});
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 await browser.close();console.log('ok: both startup identities and reloads at zoom 10; phone/desktop; unchanged Local zoom and records; no GPS on startup; current NYC icon interactive');
})().catch(e=>{console.error(e);process.exit(1);});

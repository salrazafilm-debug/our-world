/* Isolated normal-map NYC preview. No production hooks/backend connection. */
const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
const origin='http://127.0.0.1:4174',out='/workspace/shared/downloads';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:430,height:932},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('ow.tod','day'));
 await context.route(origin+'/',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('startBehindGate();','window.__NYC_TEST={state:S,fly:flyTo,draw:draw,project:proj,unproject:unproj,world:function(){return NYC_WORLD;},hits:function(){return hitboxes;},special:SPECIAL,night:function(on){AMB.tod=on?"night":"day";draw();},bench:function(dirty){var values=[];for(var i=0;i<8;i++){if(dirty)baseDirty=true;var t=performance.now();draw();values.push(performance.now()-t);}return values.sort(function(a,b){return a-b;})[4];},pan:function(dx,dy){S.center=unproj(W/2+dx,H/2+dy);baseDirty=true;draw();}};startBehindGate();')});});
 const page=await context.newPage(),errors=[],sceneRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/art/world/painted/'))sceneRequests.push(r.url());});
 await page.goto(origin);await page.waitForFunction(()=>window.__NYC_TEST&&window.__NYC_TEST.state.who);if(await page.locator('#quote').isVisible())await page.locator('#quote').click();await page.addStyleTag({content:'#toasts{display:none!important}'});
 const records=await page.evaluate(()=>JSON.stringify([window.__NYC_TEST.state.memories,window.__NYC_TEST.state.regions]));
 async function view(name,z){await page.evaluate(z=>window.__NYC_TEST.fly(40.758,-73.9855,z),z);await page.waitForFunction(()=>window.__NYC_TEST.world().ready);await page.waitForTimeout(300);if(name)await page.screenshot({path:path.join(out,'nyc-waterfront-'+name+'.png')});}
 await view('430-dmv',7.8);
 const start=await page.evaluate(()=>{const w=window.__NYC_TEST.world();return{parts:w.parts,liberty:w.liberty};});assert.equal(start.parts.length,4);assert(new Set(start.parts.map(p=>p.name)).size===4);
 const spread=Math.max(...start.parts.map(p=>p.x+p.w/2))-Math.min(...start.parts.map(p=>p.x-p.w/2));assert(spread>260,'wide multi-part skyline already visible at DMV zoom');
 await page.evaluate(()=>window.__NYC_TEST.pan(35,20));
 const moved=await page.evaluate(()=>window.__NYC_TEST.world().parts);start.parts.forEach((p,i)=>{assert(Math.abs(moved[i].x-p.x+35)<.01);assert(Math.abs(moved[i].y-p.y+20)<.01);});
 await view(null,7.8);assert.deepEqual(await page.evaluate(()=>window.__NYC_TEST.world().parts),start.parts,'architecture never reshuffles');
 for(const z of [5.8,6.1,6.8,7.79,7.81,8.5,9.6,11.2]){await view(null,z);assert.equal(await page.evaluate(()=>window.__NYC_TEST.special.active),null,'ordinary zoom never enters close-up');assert(await page.evaluate(()=>window.__NYC_TEST.hits().some(h=>h.item.kind==='landmark'&&h.item.id==='nyc')),'NYC remains clickable at '+z);}
 await page.setViewportSize({width:390,height:844});await view('390-dmv',7.8);
 await page.setViewportSize({width:430,height:932});await view('430-area',8.5);
 for(const index of [0,3,4]){
  const hit=await page.evaluate(index=>window.__NYC_TEST.hits().filter(h=>h.item.kind==='landmark'&&h.item.id==='nyc')[index],index);assert(hit,'independent architecture tap target');
  const canvas=await page.locator('#map').boundingBox();await page.touchscreen.tap(canvas.x+hit.b.x+hit.b.w/2,canvas.y+hit.b.y+hit.b.h/2);
  assert(await page.locator('[data-act="region-open"]').isVisible(),'architecture opens the existing NYC card');await page.keyboard.press('Escape');
 }
 const memory=await page.evaluate(()=>window.__NYC_TEST.hits().find(h=>h.item.kind==='memory'&&h.item.id==='preview-liberty'));assert(memory);
 const canvas=await page.locator('#map').boundingBox();await page.touchscreen.tap(canvas.x+memory.b.x+memory.b.w/2,canvas.y+memory.b.y+memory.b.h/2);
 assert((await page.locator('#sheet').innerText()).includes('Preview · Liberty Island'),'memory tap remains above the decorative city');await page.keyboard.press('Escape');
 await page.evaluate(()=>window.__NYC_TEST.night(true));await page.screenshot({path:path.join(out,'nyc-waterfront-night.png')});await page.evaluate(()=>window.__NYC_TEST.night(false));
 await page.setViewportSize({width:768,height:1024});await view('tablet',7.8);
 await page.setViewportSize({width:1440,height:900});await view('desktop',7.8);
 console.log('NYC Chromium desktop median ms:',await page.evaluate(()=>({cached:window.__NYC_TEST.bench(false).toFixed(1),full:window.__NYC_TEST.bench(true).toFixed(1)})));
 assert.equal(await page.evaluate(()=>JSON.stringify([window.__NYC_TEST.state.memories,window.__NYC_TEST.state.regions])),records);
 assert.deepEqual(sceneRequests,[]);assert.deepEqual(errors,[]);await browser.close();console.log('ok: wide modular NYC at DMV zoom; stable pan/zoom; both phones/tablet/desktop; no scene overlay; unchanged records; close-up only by deliberate selection');
})().catch(e=>{console.error(e);process.exit(1);});

const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),context=await b.newContext({viewport:{width:430,height:932},recordVideo:{dir:'/workspace/shared/downloads/equipped-video',size:{width:430,height:932}}}),p=await context.newPage(),errors=[];
p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4174/?petfit=1');await p.waitForFunction(()=>window.__PET_FITTER);
await p.evaluate(async()=>{let a=window.__PET_FITTER;await a.ready;a.state.woke=Date.now();a.state.equipped={hat:'hat-cap-red',collar:'collar-blue-bone',boots:'boots-tan'};a.state.owned=Object.values(a.state.equipped);a.open();a.body.act='sit';a.body.until=performance.now()+5000;});await p.waitForTimeout(1800);await p.screenshot({path:'/workspace/shared/downloads/puppy-outfit-phone.png'});
await p.locator('[data-pet="play"]').click();await p.waitForTimeout(700);await p.screenshot({path:'/workspace/shared/downloads/puppy-outfit-walking.png'});await p.waitForTimeout(4800);
await p.locator('[data-pet="shop"]').click();assert(await p.locator('.shop').isVisible());await p.waitForTimeout(400);await p.screenshot({path:'/workspace/shared/downloads/puppy-shop-fitted.png'});
await p.locator('[data-shop="tab"][data-id="hat"]').click().catch(async()=>{await p.locator('[data-shop="tab"]').first().click();});
await p.locator('[data-shop="back"]').click();await p.waitForTimeout(500);assert(await p.locator('.puppy-motion .pf-l').count()>0);
await p.evaluate(()=>{let a=window.__PET_FITTER;a.body.act='sleep';a.body.until=performance.now()+20000;a.pose();});await p.waitForTimeout(800);assert(await p.locator('#psDog').evaluate(el=>{let r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}),'sleeping puppy stays inside screen');await p.screenshot({path:'/workspace/shared/downloads/puppy-outfit-sleep.png'});
await p.setViewportSize({width:1440,height:900});await p.evaluate(()=>{let a=window.__PET_FITTER;a.body.act='sit';a.body.until=performance.now()+20000;a.pose();});await p.waitForTimeout(400);await p.screenshot({path:'/workspace/shared/downloads/puppy-outfit-desktop.png'});
assert.deepEqual(errors,[]);await p.close();await p.video().saveAs('/workspace/shared/downloads/puppy-accessory-animation.webm');await b.close();console.log('ok: dressed idle/play/walk/sleep; room-shop-return; mobile and desktop; no browser errors');
})().catch(e=>{console.error(e);process.exit(1);});

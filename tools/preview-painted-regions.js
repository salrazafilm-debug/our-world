const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
const origin='http://127.0.0.1:4174',out='/workspace/shared/downloads';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const c=await b.newContext({viewport:{width:430,height:932},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await c.route(origin+'/',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace('startBehindGate();','window.__PAINT_TEST={state:S,paint:PAINTED,fly:flyTo,draw:draw,project:proj,unproject:unproj,box:paintedBox,hits:function(){return hitboxes;},flight:FLIGHT,phase:function(v){cloudPhase=v;},scene:SPECIAL};startBehindGate();')});});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin);await p.waitForFunction(()=>window.__PAINT_TEST&&window.__PAINT_TEST.state.who);await p.waitForTimeout(800);if(await p.locator('#quote').isVisible())await p.locator('#quote').click();await p.addStyleTag({content:'#toasts{display:none!important}'});
 const original=await p.evaluate(()=>JSON.stringify(window.__PAINT_TEST.state.memories));
 async function shot(n,lat,lng,z){await p.evaluate(v=>window.__PAINT_TEST.fly(...v),[lat,lng,z]);await p.waitForTimeout(500);await p.screenshot({path:path.join(out,'painted-'+n+'.png')});}
 await shot('maryland-dmv',38.86335,-76.51815,7.8);
 assert(await p.evaluate(()=>{const a=window.__PAINT_TEST;return a.box('elena').baseY<a.box('mail').baseY&&a.box('mail').baseY<a.box('bruce').baseY;}));
 await shot('chesapeake-local',38.6935,-76.5333,11.2);
 await shot('arnold-local',39.0332,-76.503,11.2);
 await shot('nyc-dmv',40.758,-73.9855,7.8);
 const city=await p.evaluate(()=>window.__PAINT_TEST.hits().find(h=>h.item.kind==='landmark'&&h.item.id==='nyc'));assert(city);
 await p.touchscreen.tap(city.b.x+city.b.w/2,city.b.y+city.b.h/2+64); // canvas is below the header
 await p.locator('[data-act="region-open"]').click();await p.waitForFunction(()=>window.__PAINT_TEST.scene.active&&!window.__PAINT_TEST.scene.busy);await p.locator('#specialBack').click();await p.waitForFunction(()=>!window.__PAINT_TEST.scene.active&&!window.__PAINT_TEST.scene.busy);
 await p.evaluate(()=>window.__PAINT_TEST.phase(0));await shot('flight-home',38.86335,-76.51815,7.8);
 const first=await p.evaluate(()=>({...window.__PAINT_TEST.paint.plane}));
 await p.evaluate(()=>{window.__PAINT_TEST.phase(800);window.__PAINT_TEST.draw();});
 await shot('flight-chicago',41.8781,-87.6298,5.6);
 const next=await p.evaluate(()=>window.__PAINT_TEST.paint.plane);assert(next&&JSON.stringify(first)!==JSON.stringify(next));
 assert.deepEqual(await p.evaluate(()=>window.__PAINT_TEST.flight.slice(1)),[[41.8781,-87.6298],[43.0389,-87.9065]]);
 await p.evaluate(()=>window.__PAINT_TEST.phase(1550));await shot('flight-wisconsin',43.0389,-87.9065,7);
 await p.setViewportSize({width:390,height:844});await shot('maryland-390',38.86335,-76.51815,7.8);
 await p.setViewportSize({width:1440,height:900});await shot('maryland-desktop',38.86335,-76.51815,7.8);await shot('nyc-desktop',40.758,-73.9855,7.8);
 assert.equal(await p.evaluate(()=>JSON.stringify(window.__PAINT_TEST.state.memories)),original);assert.deepEqual(errors,[]);await b.close();console.log('ok: authored Maryland/NYC, home ordering, unchanged memories, NYC entry/return, moving three-stop flight, mobile/desktop');
})().catch(e=>{console.error(e);process.exit(1);});

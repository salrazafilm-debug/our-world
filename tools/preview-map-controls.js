const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
const origin='http://127.0.0.1:4174',out='/workspace/shared/downloads';
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await c.addInitScript(()=>{window.gpsCalls=0;window.watchCalls=0;window.gpsDenied=false;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(ok,err){window.gpsCalls++;setTimeout(()=>window.gpsDenied?err({code:1,message:'Denied'}):ok({coords:{latitude:39.5,longitude:-76.9,accuracy:10}}),20);},watchPosition(){window.watchCalls++;}}});});
 await c.route(origin+'/',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace('startBehindGate();','window.__CONTROL_TEST={state:S,fly:flyTo,draw:draw,plane:function(){return PAINTED.plane;},phase:function(v){cloudPhase=v;}};startBehindGate();')});});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin);await p.waitForFunction(()=>window.__CONTROL_TEST&&window.__CONTROL_TEST.state.who);await p.waitForTimeout(700);if(await p.locator('#quote').isVisible())await p.locator('#quote').click();await p.addStyleTag({content:'#toasts{display:none!important}'});
 assert.equal(await p.evaluate(()=>window.gpsCalls),0,'GPS never requested on load');
 const records=await p.evaluate(()=>JSON.stringify([window.__CONTROL_TEST.state.memories,window.__CONTROL_TEST.state.regions]));
 async function layout(){
  assert.equal(await p.locator('#views button:visible').count(),1);assert(await p.locator('#views [data-view="local"]').isVisible());
  const boxes=[];for(const id of ['btnMemory','btnLocate','btnPlaces']){const x=await p.locator('#'+id).boundingBox();assert(x&&x.width>=44&&x.height>=44);boxes.push(x);}
  assert(boxes[0].y<boxes[1].y&&boxes[1].y<boxes[2].y);assert(boxes.every(x=>Math.abs(x.x-boxes[0].x)<1&&x.x+x.width<=p.viewportSize().width));
  const bottom=boxes[2].y+boxes[2].height;assert(bottom<=p.viewportSize().height-10&&bottom>=p.viewportSize().height-50,'dock is anchored to bottom-right, extending upward');
  const av=await p.locator('#avatarDock').boundingBox(),local=await p.locator('#views').boundingBox();assert(local.y>=av.y+av.height&&Math.abs(local.x-av.x)<5);
 }
 await layout();await p.evaluate(()=>window.__CONTROL_TEST.fly(38.86335,-76.51815,7.8));await p.screenshot({path:path.join(out,'controls-mobile-390.png')});
 await p.locator('#btnMemory').click();assert.equal(await p.evaluate(()=>window.__CONTROL_TEST.state.placing.kind),'memory');await p.locator('#placeCancel').click();
 await p.locator('#btnLocate').click();await p.waitForFunction(()=>window.__CONTROL_TEST.state.center.lat===39.5);assert.equal(await p.evaluate(()=>window.gpsCalls),1);assert.equal(await p.evaluate(()=>window.watchCalls),0);
 assert.equal(await p.evaluate(()=>JSON.stringify([window.__CONTROL_TEST.state.memories,window.__CONTROL_TEST.state.regions])),records,'GPS centering never marks a visit or changes memories');
 await p.evaluate(()=>window.gpsDenied=true);const center=await p.evaluate(()=>({...window.__CONTROL_TEST.state.center}));await p.locator('#btnLocate').click();await p.waitForTimeout(100);assert.deepEqual(await p.evaluate(()=>window.__CONTROL_TEST.state.center),center);assert(await p.locator('#sheet').evaluate(el=>el.classList.contains('open')));await p.keyboard.press('Escape');
 await p.locator('#btnPlaces').click();for(const view of ['dmv','earth','space'])assert(await p.locator('[data-d="mapview"][data-view="'+view+'"]').isVisible());assert(await p.locator('[data-d="discover"]').isVisible());assert(await p.locator('[data-d="places"]').isVisible());
 await p.locator('[data-d="mapview"][data-view="earth"]').click();assert.equal(await p.evaluate(()=>window.__CONTROL_TEST.state.mode),'globe');await p.locator('#views [data-view="local"]').click();assert.equal(await p.evaluate(()=>window.__CONTROL_TEST.state.mode),'map');
 await p.setViewportSize({width:430,height:932});await layout();await p.evaluate(()=>window.__CONTROL_TEST.fly(38.86335,-76.51815,7.8));await p.screenshot({path:path.join(out,'controls-mobile-430.png')});
 await p.evaluate(()=>{window.__CONTROL_TEST.phase(1550);window.__CONTROL_TEST.fly(43.0389,-87.9065,7);});assert(Number.isFinite(await p.evaluate(()=>window.__CONTROL_TEST.plane().heading)));await p.screenshot({path:path.join(out,'controls-plane.png')});
 await p.setViewportSize({width:1440,height:900});await layout();await p.screenshot({path:path.join(out,'controls-desktop.png')});assert.deepEqual(errors,[]);await b.close();console.log('ok: compact UI at 390/430/1440; direct memory placement; GPS on tap only; no tracking/data writes; denied GPS; menu views; Local return; tangent-oriented plane');
})().catch(e=>{console.error(e);process.exit(1);});

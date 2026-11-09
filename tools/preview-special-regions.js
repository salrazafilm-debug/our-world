/* Development browser checks. Uses the environment's Playwright installation,
   never adds it to the app. Start node tools/serve-preview.js first.
   The temporary test API is injected into this test's HTTP response only. */
const {chromium}=require('playwright');
const assert=require('assert'),fs=require('fs'),path=require('path');
const origin=process.env.OW_PREVIEW_URL||'http://127.0.0.1:4174';
const out=process.env.OW_PREVIEW_OUTPUT||'/workspace/shared/downloads';
fs.mkdirSync(out,{recursive:true});
const apiInjection='window.__OW_TEST_API={state:S,presence:PR,visitors:specialVisitorList,meta:presMeta,special:SPECIAL,pose:specialPose,project:proj,unproject:unproj,draw:draw,fly:flyTo,zoom:zoomBy,hits:function(){return hitboxes;},geometry:specialGeometry};startBehindGate();';
async function createContext(browser,reduce,record){
  const context=await browser.newContext({viewport:{width:430,height:932},isMobile:true,hasTouch:true,reducedMotion:reduce?'reduce':'no-preference',...(record?{recordVideo:{dir:path.join(out,'special-region-recording'),size:{width:430,height:932}}}:{})});
  await context.route(origin+'/',async route=>{const response=await route.fetch(),body=await response.text();await route.fulfill({response,body:body.replace('startBehindGate();',apiInjection)});});
  return context;
}
async function ready(page){await page.goto(origin);await page.waitForFunction(()=>window.__OW_TEST_API&&window.__OW_TEST_API.state.who);await page.waitForTimeout(700);if(await page.locator('#quote').isVisible())await page.locator('#quote').click();await page.addStyleTag({content:'#toasts{display:none!important}'});}
async function settled(page,id){await page.waitForFunction(id=>{const s=window.__OW_TEST_API.special;return(s.active?s.active.id:null)===id&&!s.busy&&!s.animation;},id,{timeout:25000});}
async function choose(page,id){await page.locator('#hopName').click();await page.locator('[data-act="region-card"][data-region="'+id+'"]').click();await page.locator('[data-act="region-open"]').click();await settled(page,id);}
async function snapshot(page,name){await page.screenshot({path:path.join(out,'special-preview-'+name+'.png')});}
async function memoryHit(page,id){return page.evaluate(id=>window.__OW_TEST_API.hits().find(h=>h.item.kind==='memory'&&h.item.id===id),id);}
async function canvasTap(page,x,y){const box=await page.locator('#map').boundingBox();await page.touchscreen.tap(box.x+x,box.y+y);}
async function run(){
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await createContext(browser,false,true),page=await context.newPage(),errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('supabase.co'))remote.push(r.url());});
  await ready(page);await snapshot(page,'world');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);await snapshot(page,'world-390');
  await page.setViewportSize({width:430,height:932});
  const originalMemories=await page.evaluate(()=>JSON.parse(JSON.stringify(window.__OW_TEST_API.state.memories)));
  const originalDiscoveries=await page.evaluate(()=>JSON.stringify(window.__OW_TEST_API.state.regions));
  await page.evaluate(()=>{const a=window.__OW_TEST_API;a.fly(40.758,-73.9855,9.9);a.zoom(.7,{x:215,y:400});});
  assert.equal(await page.evaluate(()=>window.__OW_TEST_API.special.active),null,'normal zoom must not enter a scene');
  await page.evaluate(()=>window.__OW_TEST_API.fly(40.758,-73.9855,8.5));
  await page.waitForTimeout(400);await snapshot(page,'nyc-regional');
  const worldPose=await page.evaluate(()=>window.__OW_TEST_API.pose());
  const landmark=await page.evaluate(()=>window.__OW_TEST_API.hits().find(h=>h.item.kind==='landmark'&&h.item.id==='nyc'));
  assert(landmark);await canvasTap(page,landmark.b.x+landmark.b.w/2,landmark.b.y+landmark.b.h/2);
  assert(await page.locator('[data-act="region-open"]').isVisible());
  await page.locator('[data-act="region-open"]').click();await settled(page,'nyc-area');await snapshot(page,'nyc-area');
  assert.equal(await page.evaluate(()=>window.__OW_TEST_API.special.stack.length),1);
  const areaCamera=await page.evaluate(()=>({...window.__OW_TEST_API.special.camera}));
  assert.equal(await page.evaluate(()=>window.__OW_TEST_API.hits().length),0,'final scene has no pins or deeper hotspots');
  await canvasTap(page,215,400);assert(await page.locator('#sheet').evaluate(el=>!el.classList.contains('open')),'tapping scenery opens nothing');
  assert.equal(await page.evaluate(()=>window.__OW_TEST_API.special.active.portals.length),0);
  assert.deepEqual(await page.evaluate(()=>{const a=window.__OW_TEST_API;return a.visitors(a.special.active);}),['bruce']);
  await page.evaluate(()=>{const a=window.__OW_TEST_API;a.presence.partner={who:'elena',scene:'nyc'};a.draw();});
  assert.deepEqual(await page.evaluate(()=>{const a=window.__OW_TEST_API;return a.visitors(a.special.active);}),['bruce','elena']);
  assert.equal(await page.evaluate(()=>window.__OW_TEST_API.meta().scene),'nyc');
  await snapshot(page,'nyc-together');
  await page.evaluate(()=>{const a=window.__OW_TEST_API;a.presence.partner.scene='dc';a.draw();});
  assert.deepEqual(await page.evaluate(()=>{const a=window.__OW_TEST_API;return a.visitors(a.special.active);}),['bruce']);
  await snapshot(page,'nyc-solo');
  await page.evaluate(()=>{window.__OW_TEST_API.presence.partner=null;});
  // Native mobile pinch and drag, rather than synthetic DOM pointer events.
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:160,y:410,id:1},{x:270,y:410,id:2}]});
  for(let i=0;i<5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:160-i*9,y:410,id:1},{x:270+i*9,y:410,id:2}]});await page.waitForTimeout(25);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert(await page.evaluate(()=>window.__OW_TEST_API.special.camera.scale>1.1),'touch pinch zooms the illustration');
  const beforePan=await page.evaluate(()=>({...window.__OW_TEST_API.special.camera}));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:215,y:510,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:250,y:550,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const afterPan=await page.evaluate(()=>({...window.__OW_TEST_API.special.camera}));assert.notDeepEqual(beforePan,afterPan,'touch drag pans inside the artwork');
  const roundTrip=await page.evaluate(()=>{const a=window.__OW_TEST_API,p=a.project(40.7484,-73.9857);return a.unproject(p.x,p.y);});
  assert(Math.abs(roundTrip.lat-40.7484)<1e-8&&Math.abs(roundTrip.lng+73.9857)<1e-8);
  await page.locator('#specialBack').click();await settled(page,null);
  assert.equal(await page.evaluate(()=>window.__OW_TEST_API.meta().scene),null);
  const returned=await page.evaluate(()=>window.__OW_TEST_API.pose());assert.deepEqual(returned,worldPose,'Back restores the exact original geographic camera');
  await snapshot(page,'returned-map');
  await page.evaluate(()=>window.__OW_TEST_API.fly(38.8895,-77.0353,8.5));await page.waitForTimeout(250);
  const dcWorldPose=await page.evaluate(()=>window.__OW_TEST_API.pose());
  const dcLandmark=await page.evaluate(()=>window.__OW_TEST_API.hits().find(h=>h.item.kind==='landmark'&&h.item.id==='dc'));
  assert(dcLandmark,'DC has its own tappable landmark on the ordinary map');
  await canvasTap(page,dcLandmark.b.x+dcLandmark.b.w/2,dcLandmark.b.y+dcLandmark.b.h/2);
  await page.locator('[data-act="region-open"]').click();await settled(page,'dc-area');await snapshot(page,'dc-area');assert.equal(await page.evaluate(()=>window.__OW_TEST_API.hits().length),0);
  // Resizing an active scene must preserve coverage; no blank margins.
  for(const size of [{width:390,height:844,name:'dc-390'},{width:768,height:1024,name:'dc-tablet'},{width:1440,height:900,name:'dc-desktop'}]){
    await page.setViewportSize(size);await page.waitForTimeout(200);
    assert(await page.evaluate(()=>{const a=window.__OW_TEST_API,g=a.geometry(a.special.active,a.special.camera),map=document.querySelector('#map'),back=document.querySelector('#specialBack').getBoundingClientRect(),name=document.querySelector('#specialName').getBoundingClientRect();return g.x<=.01&&g.y<=.01&&g.x+g.w>=map.clientWidth-.1&&g.y+g.h>=map.clientHeight-.1&&back.right<name.left;}),'scene coverage and HUD separation at '+size.width);
    await snapshot(page,size.name);
  }
  await page.setViewportSize({width:430,height:932});
  await page.locator('#specialBack').click();await settled(page,null);
  assert.deepEqual(await page.evaluate(()=>window.__OW_TEST_API.pose()),dcWorldPose,'DC Back restores its original world camera');
  const memories=await page.evaluate(()=>window.__OW_TEST_API.state.memories);
  for(const m of originalMemories)assert.deepEqual(memories.find(x=>x.id===m.id),m,'existing records are unchanged');
  assert.equal(memories.length,originalMemories.length,'scenes do not modify memory records');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__OW_TEST_API.state.regions)),originalDiscoveries,'scene navigation never creates discoveries');
  assert.equal(remote.length,0,'sample preview never contacts the real backend');
  const video=page.video();await context.close();if(video)await video.saveAs(path.join(out,'our-world-special-regions.webm'));
  // Failed preloads retain the old view and allow retry; reduced motion is instant.
  const failure=await createContext(browser,true,false),p=await failure.newPage();await ready(p);
  const before=await p.evaluate(()=>window.__OW_TEST_API.pose());await failure.route('**/art/world/regions/dc-area.webp',r=>r.abort());
  await p.locator('#hopName').click();await p.locator('[data-act="region-card"][data-region="dc-area"]').click();await p.locator('[data-act="region-open"]').click();
  await p.waitForFunction(()=>!window.__OW_TEST_API.special.busy);assert.equal(await p.evaluate(()=>window.__OW_TEST_API.special.active),null);assert.deepEqual(await p.evaluate(()=>window.__OW_TEST_API.pose()),before);
  await failure.unroute('**/art/world/regions/dc-area.webp');await p.locator('[data-act="region-open"]').click();await settled(p,'dc-area');
  await p.evaluate(()=>window.__OW_TEST_API.zoom(-.3,{x:215,y:400}));await settled(p,null);assert.deepEqual(await p.evaluate(()=>window.__OW_TEST_API.pose()),before,'zooming out of a special scene returns to the saved map');
  await failure.close();await browser.close();assert.deepEqual(errors,[]);
  console.log('ok: final NYC/DC scenes without pins or hotspots; solo/shared visitors; unchanged memory records; exact return; touch pan/pinch; resize; failure recovery; reduced motion.');
}
run().catch(e=>{console.error(e);process.exit(1);});

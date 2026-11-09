/* Isolated sample-origin tests. No production test hooks or backend writes. */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const origin='http://127.0.0.1:4174',out='/workspace/shared/downloads';
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const c=await b.newContext({viewport:{width:430,height:932},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await c.route(origin+'/',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace('startBehindGate();','window.__REPAIR_TEST={state:S,fly:flyTo,draw:draw,project:proj,unproject:unproj,points:repairPoint,boxes:repairBox,homes:function(){return HOMEBOXES;},clouds:function(){return CLOUD_DEBUG;},fog:FOG_RENDER,fogPixels:function(){return{w:fogCv.width,h:fogCv.height,data:Array.from(fogCtx.getImageData(0,0,fogCv.width,fogCv.height).data)};},frame:FLIGHT_FRAME,phase:function(v){cloudPhase=v;},pan:function(dx,dy){S.center=unproj(W/2+dx,H/2+dy);baseDirty=true;draw();},dirty:function(){baseDirty=true;},profile:function(){var o={},t=performance.now();drawBase();runHooks("afterBase");o.base=performance.now()-t;t=performance.now();drawScenic();o.scenic=performance.now()-t;t=performance.now();FOG_RENDER.key="";drawFog();o.clouds=performance.now()-t;t=performance.now();drawMapOverlays();o.overlays=performance.now()-t;return o;},painted:typeof PAINTED};startBehindGate();')});});
 const p=await c.newPage(),errors=[],painted=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/art/world/painted/'))painted.push(r.url());});
 await p.goto(origin);await p.waitForFunction(()=>window.__REPAIR_TEST&&window.__REPAIR_TEST.state.who);await p.waitForTimeout(800);if(await p.locator('#quote').isVisible())await p.locator('#quote').click();await p.addStyleTag({content:'#toasts{display:none!important}'});
 const records=await p.evaluate(()=>JSON.stringify([window.__REPAIR_TEST.state.memories,window.__REPAIR_TEST.state.regions]));
 async function view(name,lat,lng,z){await p.evaluate(v=>window.__REPAIR_TEST.fly(...v),[lat,lng,z]);await p.waitForTimeout(250);if(name)await p.screenshot({path:path.join(out,'repair-'+name+'.png')});}
 await view('maryland-430',38.93,-76.95,7.8);
 for(const z of [6,6.8,7.8,8.6,9.2]){
  await view(null,38.93,-76.95,z);
  assert(await p.evaluate(()=>{const a=window.__REPAIR_TEST,bs=['elena','bruce','mail','dc','hb-nova'].map(a.boxes);return bs.every((x,i)=>bs.every((y,j)=>i===j||x.x+x.w<=y.x||y.x+y.w<=x.x||x.y+x.h<=y.y||y.y+y.h<=x.y));}),'reserved Maryland footprints at '+z);
 }
 await view('chesapeake-local',38.6935,-76.5333,11.2);await view('arnold-local',39.0332,-76.503,11.2);
 await view('cloud-field',42,-78,7.8);
 assert(await p.locator('#map').evaluate(()=>{const g=window.__REPAIR_TEST.fogPixels();for(let y=10;y<g.h-10;y+=30)for(let x=10;x<g.w-10;x+=30)if(g.data[(y*g.w+x)*4+3]<250)return false;return true;}),'unknown ground is fully cloud-covered');
 const start=await p.evaluate(()=>({center:{...window.__REPAIR_TEST.state.center},clouds:window.__REPAIR_TEST.clouds()}));assert(start.clouds.length>0);
 assert(start.clouds.length<40,'sparse silhouettes, not a crowded cloud wallpaper');
 const sizes=start.clouds.map(x=>x.h);assert(Math.max(...sizes)/Math.min(...sizes)>1.25,'cloud banks have varied sizes, not uniform stamps');
 assert(start.clouds.some(x=>x.flip)&&start.clouds.some(x=>!x.flip),'cloud silhouettes vary');
 await p.evaluate(()=>window.__REPAIR_TEST.pan(24,12));
 const moved=await p.evaluate(()=>window.__REPAIR_TEST.clouds()),common=start.clouds.filter(x=>moved.some(y=>y.id===x.id));assert(common.length>0);
 for(const x of common){const y=moved.find(y=>y.id===x.id);assert(Math.abs(y.x-x.x+24)<.01&&Math.abs(y.y-x.y+12)<.01,'clouds move with geography, never viewport corners');}
 await view(null,start.center.lat,start.center.lng,7.8);
 assert.deepEqual(await p.evaluate(()=>window.__REPAIR_TEST.clouds()),start.clouds,'returning restores identical cloud field');
 const cache=await p.evaluate(()=>{const a=window.__REPAIR_TEST,n=a.fog.builds;for(let i=0;i<20;i++){a.phase(i*20);a.draw();}return a.fog.builds-n;});assert.equal(cache,0,'stationary frames do not rebuild clouds');
 for(const z of [5.49,5.5,5.51,6.99,7,7.01,9.09,9.1,9.11])await view(null,42,-78,z);
 await view('cloud-pan-return',42,-78,7.8);
 const round=await p.evaluate(()=>{const a=window.__REPAIR_TEST,q=a.project(39.0332,-76.503);return a.unproject(q.x,q.y);});assert(Math.abs(round.lat-39.0332)<1e-8&&Math.abs(round.lng+76.503)<1e-8);
 await p.setViewportSize({width:390,height:844});await view('maryland-390',38.93,-76.95,7.8);
 await p.setViewportSize({width:768,height:1024});await view('maryland-tablet',38.93,-76.95,7.8);
 await p.setViewportSize({width:1440,height:900});await view('maryland-desktop',38.93,-76.95,7.8);
 const perf=await p.evaluate(()=>{const a=window.__REPAIR_TEST,sample=dirty=>{let ts=[];for(let i=0;i<8;i++){if(dirty)a.dirty();let t=performance.now();a.draw();ts.push(performance.now()-t);}return ts.sort((a,b)=>a-b)[4].toFixed(1);};return{cachedMs:sample(false),redrawMs:sample(true),phases:a.profile()};});console.log('Chromium desktop samples:',perf);
 assert.equal(await p.evaluate(()=>window.__REPAIR_TEST.painted),'undefined');assert.deepEqual(painted,[],'no full-scene painted map requests');
 assert.equal(await p.evaluate(()=>JSON.stringify([window.__REPAIR_TEST.state.memories,window.__REPAIR_TEST.state.regions])),records);assert.deepEqual(errors,[]);
 assert(!fs.readFileSync('index.html','utf8').includes('drawPaintedRegion'));
 await b.close();console.log('ok: one map; no scene-image requests; landmark footprints; geographic cloud pan/return; cached stable clouds; coordinate roundtrip; unchanged data; mobile/tablet/desktop');
})().catch(e=>{console.error(e);process.exit(1);});

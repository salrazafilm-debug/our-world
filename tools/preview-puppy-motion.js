const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const p=await b.newPage({viewport:{width:430,height:932},recordVideo:{dir:'/workspace/shared/downloads/puppy-video',size:{width:430,height:932}}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('http://127.0.0.1:4174/',async r=>{const res=await r.fetch();await r.fulfill({response:res,body:(await res.text()).replace('startBehindGate();','window.__pup={open:petOpen,act:petAct,state:PET,body:PB,pose:petPose,fly:flyTo};startBehindGate();')});});
 await p.goto('http://127.0.0.1:4174/');await p.waitForFunction(()=>window.__pup);
 await p.evaluate(()=>window.__pup.fly(38.993,-76.40,11));await p.waitForTimeout(1200);await p.screenshot({path:'/workspace/shared/downloads/bay-bridge-phone.png'});
 await p.evaluate(()=>{window.__pup.state.woke=Date.now();window.__pup.open();});await p.waitForTimeout(1200);
 assert(await p.locator('.puppy-motion').count(),'motion artwork loaded');
 assert.equal(await p.locator('#psSay').innerText(),'');
 await p.screenshot({path:'/workspace/shared/downloads/puppy-idle-phone.png'});
 await p.evaluate(()=>window.__pup.act('play'));await p.waitForTimeout(4500);await p.screenshot({path:'/workspace/shared/downloads/puppy-play-phone.png'});
 await p.evaluate(()=>{const v=window.__pup.body;v.act='scoot';v.t0=performance.now();v.x0=v.x;v.tx=v.x+.07;v.until=v.t0+10000;});await p.waitForTimeout(250);
 assert((await p.locator('.puppy-motion').getAttribute('style')).includes('33.333'),'walking row selected');
 await p.screenshot({path:'/workspace/shared/downloads/puppy-walk-phone.png'});
 await p.setViewportSize({width:1440,height:900});await p.waitForTimeout(500);await p.screenshot({path:'/workspace/shared/downloads/puppy-desktop.png'});
 assert.deepEqual(errors,[]);await p.close();await p.video().saveAs('/workspace/shared/downloads/puppy-animation-preview.webm');await b.close();console.log('ok: puppy artwork, walking, play, no chatter, responsive layout');
})().catch(e=>{console.error(e);process.exit(1);});

/* Actual touch gestures against the isolated sample-data preview, no backend. */
const {chromium}=require('playwright'),path=require('path');
const origin='http://127.0.0.1:4174',out='/workspace/shared/downloads';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:430,height:932},isMobile:true,hasTouch:true,recordVideo:{dir:path.join(out,'repair-motion'),size:{width:430,height:932}}});
 await context.route(origin+'/',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace('startBehindGate();','window.__REPAIR_MOVIE={fly:flyTo};startBehindGate();')});});
 const page=await context.newPage();await page.goto(origin);await page.waitForFunction(()=>window.__REPAIR_MOVIE);await page.waitForTimeout(800);if(await page.locator('#quote').isVisible())await page.locator('#quote').click();await page.addStyleTag({content:'#toasts{display:none!important}'});
 await page.evaluate(()=>window.__REPAIR_MOVIE.fly(38.93,-76.95,7.8));await page.waitForTimeout(1000);
 const cdp=await context.newCDPSession(page);
 async function drag(dx,dy){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:210,y:460,id:1}]});for(let i=1;i<=20;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:210+dx*i/20,y:460+dy*i/20,id:1}]});await page.waitForTimeout(30);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 await drag(70,45);await page.waitForTimeout(900);await drag(-70,-45);await page.waitForTimeout(900);
 async function pinch(start,end){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:215-start,y:450,id:1},{x:215+start,y:450,id:2}]});for(let i=1;i<=20;i++){let d=start+(end-start)*i/20;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:215-d,y:450,id:1},{x:215+d,y:450,id:2}]});await page.waitForTimeout(35);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 await pinch(95,65);await page.waitForTimeout(1000);await pinch(65,95);await page.waitForTimeout(1000);
 const video=page.video();await context.close();await video.saveAs(path.join(out,'repair-pan-zoom.webm'));await browser.close();console.log('Recorded real touch pan/return and pinch zoom; no viewport cloud frame.');
})().catch(e=>{console.error(e);process.exit(1);});

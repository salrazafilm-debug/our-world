const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[],failed=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
await page.goto('http://127.0.0.1:4174/tools/pet-fit.html');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Ready'));
const frame=page.frames().find(f=>f.url().includes('?petfit=1'));
const before=await frame.evaluate(()=>JSON.stringify([window.__PET_FITTER.state.owned,window.__PET_FITTER.state.equipped,window.__PET_FITTER.state.spent]));
await page.selectOption('#item','hat-crown');await page.fill('#dx','7');await page.locator('#save').click();await page.reload();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Ready'));await page.selectOption('#item','hat-crown');assert.equal(await page.inputValue('#dx'),'7');
await page.locator('#reset').click();await page.locator('#save').click();
await page.screenshot({path:'/workspace/shared/downloads/puppy-fitting-tool.png'});
const app=page.frames().find(f=>f.url().includes('?petfit=1'));
assert.equal(await app.evaluate(()=>JSON.stringify([window.__PET_FITTER.state.owned,window.__PET_FITTER.state.equipped,window.__PET_FITTER.state.spent])),before,'fitter does not change equipment or purchases');
// Render all catalogue entries with the real production renderer, then inspect sheets.
for(const pose of ['front','sleep',...Array.from({length:16},(_,i)=>'motion-'+i)]){
 const markup=await app.evaluate(p=>{let a=window.__PET_FITTER;return a.catalog.map(it=>'<article><div>'+ (p==='front'||p==='sleep'?a.figure(190,{[it.slot]:it.id},p==='sleep'):a.motion(210,Number(p.split('-')[1]),{[it.slot]:it.id},false))+'</div><small>'+it.id+'</small></article>').join('');},pose);
 await page.evaluate(html=>{document.querySelector('main').innerHTML='<div id="grid">'+html+'</div>';},markup);
 await page.addStyleTag({content:'main{display:block;max-width:none}#grid{display:grid;grid-template-columns:repeat(7,170px);gap:10px}article{height:245px;background:#ead0c2;display:flex;flex-direction:column;justify-content:end;align-items:center;overflow:visible}article>div{position:relative}article small{font-size:11px;margin:8px 0}'});
 await page.evaluate(async()=>{await Promise.all(Array.from(document.querySelectorAll('#grid img')).map(im=>im.decode()));});if(['front','motion-5','motion-10'].includes(pose))await page.screenshot({path:'/workspace/shared/downloads/accessories-'+pose+'.png',fullPage:true});
}
await app.evaluate(()=>{const a=window.__PET_FITTER;a.state.woke=Date.now();a.state.equipped={hat:'hat-crown',collar:'collar-blue-bone',boots:'boots-tan'};a.open();a.body.act='scoot';a.body.t0=performance.now();a.body.x0=a.body.x;a.body.tx=a.body.x+.07;a.body.until=performance.now()+10000;});
await app.waitForTimeout(300);assert(await app.locator('.puppy-motion .pf-l').count()>=6,'outfit stays attached during walk, including separate boots');
await app.evaluate(()=>{let a=window.__PET_FITTER;a.body.act='sniff';a.body.until=performance.now()+10000;a.pose();});assert(await app.locator('.puppy-motion .pf-l').count()>=4);
assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);await browser.close();console.log('ok: 49 items × 18 poses, fitted boots, dressed animations, editor persistence, no pet data mutation or failed assets');
})().catch(e=>{console.error(e);process.exit(1);});

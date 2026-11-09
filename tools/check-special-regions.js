/* Pure math/asset regressions. Node built-ins only. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..'),context=vm.createContext({});
for(const file of ['region-math.js','region-configs.js'])vm.runInContext(fs.readFileSync(path.join(root,'src/world',file),'utf8'),context);
const math=context.RegionMath,regions=context.SPECIAL_REGIONS;
assert.deepEqual([...new Set(Object.values(regions).map(r=>r.city))].sort(),['dc','nyc']);
for(const r of Object.values(regions)){
  const m=math.calibrate(r.points);
  for(const p of r.points){
    const uv=math.project(m,p.lat,p.lng);
    assert(Math.abs(uv.u-p.u)<1e-8&&Math.abs(uv.v-p.v)<1e-8,r.id+' landmark alignment');
  }
  for(let u=0;u<=1;u+=.125)for(let v=0;v<=1;v+=.125){
    const ll=math.unproject(m,u,v),uv=math.project(m,ll.lat,ll.lng);
    assert(Math.abs(uv.u-u)<1e-8&&Math.abs(uv.v-v)<1e-8,r.id+' reversible marker projection');
  }
  assert(r.zoomRange[0]===1&&r.zoomRange[1]>1);
  assert(r.transition.cameraMs+r.transition.blendMs>=800&&r.transition.cameraMs+r.transition.blendMs<=1200);
  for(const portal of r.portals){assert(regions[portal.target]);assert(r.points.some(p=>p.id===portal.point));}
}
assert.throws(()=>math.calibrate([{lat:0,lng:0,u:0,v:0},{lat:1,lng:1,u:.5,v:.5},{lat:2,lng:2,u:1,v:1}]),/Artwork control points/);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/world/data/asset-manifest.json')));
assert.equal(manifest.rendering,'nearest-neighbor');
for(const a of Object.values(manifest.assets)){
  assert(a.width>0&&a.height>0&&a.anchor.length===2&&a.category&&a.use);
  assert(fs.existsSync(path.join(root,a.source)));
  const bytes=fs.readFileSync(path.join(root,a.path));assert(bytes.length>100);
  if(a.path.endsWith('.png')){
    assert.equal(bytes.readUInt32BE(16),a.width);assert.equal(bytes.readUInt32BE(20),a.height);
    assert.equal(bytes[25],6,'cutouts must retain an alpha channel');
  }
}
for(const r of Object.values(regions))assert(manifest.assets[r.asset]);
const scenery=vm.createContext({window:{},HOOKS:{afterOverlays:[]},terHash:()=>.99});
vm.runInContext(fs.readFileSync(path.join(root,'src/features/scenic.js'),'utf8'),scenery);
const threshold=Math.log2(22*360/(.012*256));
const weights=[threshold-.1,threshold-.001,threshold,threshold+.001].map(z=>scenery.scenicCellWeight(3,4,.012,z,22));
assert(weights.every((v,i)=>i===0||v>=weights[i-1]),'density fading must be monotonic');
assert(Math.abs(weights[1]-weights[2])<.02,'no all-or-nothing density cutoff');
assert.equal(scenery.scenicCellWeight(3,4,.012,threshold,22),1);
console.log('ok: 26 assets, NYC/DC calibration and inverse mapping, portals, transition timing, continuous deterministic scenery density');

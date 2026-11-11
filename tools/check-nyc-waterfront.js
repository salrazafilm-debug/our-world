/* Verify modular sprites, source provenance and clean pixel alpha. */
const fs=require('fs'),assert=require('assert'),sharp=require('sharp');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync('src/world/data/nyc-waterfront-assets.json'));
 assert(fs.existsSync(manifest.source));assert.equal(Object.keys(manifest.assets).length,4);
 for(const a of Object.values(manifest.assets)){
  const {data,info}=await sharp(a.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,a.width);assert.equal(info.height,a.height);assert.deepEqual(a.anchor,[.5,1]);
  let opaque=0;for(let i=0;i<data.length;i+=4){assert(data[i+3]===0||data[i+3]===255,'binary clean alpha');if(data[i+3]){opaque++;assert(!(data[i]>240&&data[i+1]<50&&data[i+2]>230),'no magenta halo');}}
  const coverage=opaque/(info.width*info.height);assert(coverage>.1&&coverage<.9,'transparent architecture, not a rectangular scene');
 }
 console.log('ok: four modular NYC sprites; original source and manifest; clean transparency; no magenta matte');
})().catch(e=>{console.error(e);process.exit(1);});

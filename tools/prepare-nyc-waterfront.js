/* Mechanical extraction of original modular architecture, never a map image. */
const sharp=require('sharp'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),source='art-src/world/nyc-waterfront-parts.png';
const crops=[['nyc-brownstones',0,0,755,515,288],['nyc-empire',785,0,751,515,320],['nyc-east-skyline',0,530,735,494,288],['nyc-brooklyn-bridge',738,550,798,450,384]];
(async()=>{
 const manifest={source,rendering:'nearest-neighbor',assets:{}};
 for(const [id,left,top,width,height,size] of crops){
  const {data,info}=await sharp(path.join(root,source)).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let k=0;k<data.length;k+=4){const matte=data[k]>240&&data[k+1]<50&&data[k+2]>230;data[k+3]=!matte&&data[k+3]>200?255:0;}
  const file='art/'+id+'.png';
  await sharp(data,{raw:info}).trim({background:'#00000000'}).resize({width:size,kernel:'nearest'}).png({compressionLevel:9}).toFile(path.join(root,file));
  const m=await sharp(path.join(root,file)).metadata();manifest.assets[id]={path:file,width:m.width,height:m.height,anchor:[.5,1],category:'nyc-architecture',use:'independent normal-map waterfront composition',crop:[left,top,width,height]};
 }
 fs.writeFileSync(path.join(root,'src/world/data/nyc-waterfront-assets.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('Prepared four transparent NYC architecture components.');
})().catch(e=>{console.error(e);process.exit(1);});

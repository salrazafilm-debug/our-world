/* Mechanical transparent sprite extraction; retain original sheet. */
const sharp=require('sharp'),fs=require('fs');
(async()=>{
 const source='art-src/painted/simple-city-buildings.png',m=await sharp(source).metadata(),half=Math.floor(m.width/2),manifest={source,rendering:'nearest-neighbor',assets:{}};
 for(const [id,left,width] of [['chicago',0,half],['milwaukee',half,m.width-half]]){
  const {data,info}=await sharp(source).extract({left,top:0,width,height:m.height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let k=3;k<data.length;k+=4)data[k]=data[k]>220?255:0;
  const file='art/city-'+id+'-simple.png';
  await sharp(data,{raw:info}).trim({background:'#00000000'}).resize({width:192,height:192,fit:'inside',kernel:'nearest'}).png({compressionLevel:9}).toFile(file);
  const a=await sharp(file).metadata();manifest.assets[id]={path:file,width:a.width,height:a.height,anchor:[.5,1],category:'building-only',use:'compact city landmark; no terrain or water',crop:[left,0,width,m.height]};
 }
 fs.writeFileSync('src/world/data/simple-city-assets.json',JSON.stringify(manifest,null,2)+'\n');
 console.log('Prepared two building-only icons.');
})().catch(e=>{console.error(e);process.exit(1);});

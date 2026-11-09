/* Mechanical crops and keyed-alpha cleanup. Source art is retained. */
const sharp=require('sharp'),fs=require('fs');
async function run(){
 const source='art-src/painted/lake-city-sheet.png',manifest={source,rendering:'nearest-neighbor',assets:{}};
 for(const [id,left,width] of [['chicago',0,790],['milwaukee',800,736]]){
  const {data,info}=await sharp(source).extract({left,top:0,width,height:1024}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let k=3;k<data.length;k+=4)data[k]=data[k]>220?255:0;
  const file='art/map-'+id+'.png';
  await sharp(data,{raw:info}).trim({background:'#00000000'}).resize({width:560,height:560,fit:'inside',kernel:'nearest'}).png({compressionLevel:9}).toFile(file);
  const m=await sharp(file).metadata();manifest.assets[id]={path:file,width:m.width,height:m.height,anchor:[.5,1],category:'city-composition',use:'Recognizable ordinary-map landmark; existing planned-city action',crop:[left,0,width,1024]};
 }
 fs.writeFileSync('src/world/data/lake-city-assets.json',JSON.stringify(manifest,null,2)+'\n');
 console.log('Prepared Chicago and Milwaukee landmark art.');
}run().catch(e=>{console.error(e);process.exit(1);});

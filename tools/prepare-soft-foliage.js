/* Mechanical export of original cartoon planting; retain antialiased alpha. */
const sharp=require('sharp'),fs=require('fs');
(async()=>{
 const source='art-src/world/soft-foliage-sheet.png',m=await sharp(source).metadata();
 const names=['pine','pine-tall','oak','cherry','crimson','bush','flowers','rocks','grass'];
 const output='art/world/soft';fs.mkdirSync(output,{recursive:true});const assets=[];
 const rows=[0,450,850,m.height];
 for(let i=0;i<names.length;i++){
  const col=i%3,row=Math.floor(i/3),left=Math.round(col*m.width/3),top=rows[row],width=Math.round((col+1)*m.width/3)-left,height=rows[row+1]-top;
  const file=output+'/'+names[i]+'.png';
  const {data,info}=await sharp(source).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  /* Remove nearly invisible generation residue without binarizing real edges. */
  for(let k=3;k<data.length;k+=4)if(data[k]<12)data[k]=0;
  const crop=await sharp(data,{raw:info}).png().toBuffer();
  await sharp(crop).trim({background:'#00000000',threshold:2}).resize({width:320,height:320,fit:'inside',withoutEnlargement:true}).png({compressionLevel:9}).toFile(file);
  const outputInfo=await sharp(file).metadata();assets.push({id:names[i],path:file,width:outputInfo.width,height:outputInfo.height,anchor:[.5,1],category:i<5?'tree':'garden',rendering:'smooth cartoon; preserve alpha',source,crop:[left,top,width,height]});
 }
 fs.writeFileSync('src/world/data/soft-foliage-assets.json',JSON.stringify(assets,null,2)+'\n');
 console.log('Exported '+assets.length+' soft foliage sprites.');
})().catch(e=>{console.error(e);process.exit(1);});

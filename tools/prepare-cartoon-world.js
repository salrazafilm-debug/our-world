/* Export the original six-cloud and six-building sheets. All sprites retain
   smooth alpha; existing art stays archived for reference. */
const sharp=require('sharp'),fs=require('fs');
async function exportSheet(kind,names){
 const source='art-src/world/cartoon-'+kind+'-sheet.png',raw=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),{data,info}=raw;
 /* Connected silhouettes avoid clipping wider buildings at nominal grid lines. */
 const seen=new Uint8Array(info.width*info.height),parts=[];
 for(let i=0;i<seen.length;i++){
  if(seen[i]||data[i*4+3]<64)continue;const queue=[i];seen[i]=1;let n=0,x0=info.width,x1=0,y0=info.height,y1=0;
  for(let k=0;k<queue.length;k++){const p=queue[k],x=p%info.width,y=Math.floor(p/info.width);n++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);for(const j of [x>0?p-1:-1,x<info.width-1?p+1:-1,p-info.width,p+info.width]){if(j<0||j>=seen.length||seen[j]||data[j*4+3]<64)continue;seen[j]=1;queue.push(j);}}
  if(n>1000)parts.push({x0,x1,y0,y1,n});
 }
 parts.sort((a,b)=>Math.floor((a.y0+a.y1)/info.height)-Math.floor((b.y0+b.y1)/info.height)||a.x0-b.x0);
 if(parts.length!==names.length)throw Error(kind+': expected six full silhouettes, got '+parts.length);
 const dir='art/world/soft-'+kind,assets=[];fs.mkdirSync(dir,{recursive:true});
 for(let i=0;i<names.length;i++){
  const part=parts[i],left=Math.max(0,part.x0-5),top=Math.max(0,part.y0-5),width=Math.min(info.width,part.x1+6)-left,height=Math.min(info.height,part.y1+6)-top,file=dir+'/'+names[i]+'.png';
  const crop=await sharp(source).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let k=3;k<crop.data.length;k+=4){const d=crop.data,matte=d[k]<200&&d[k-3]>160&&d[k-3]>d[k-2]*2.8&&d[k-3]>d[k-1]*2.8;if(d[k]<12||matte){d[k]=0;d[k-3]=d[k-2]=d[k-1]=0;}else if(d[k]>240)d[k]=255;}
  const png=await sharp(crop.data,{raw:crop.info}).png().toBuffer();await sharp(png).trim({background:'#00000000',threshold:2}).resize({width:512,height:512,fit:'inside',withoutEnlargement:true}).png({compressionLevel:9,palette:true,colours:256,dither:0}).toFile(file);
  const m=await sharp(file).metadata();assets.push({id:names[i],path:file,width:m.width,height:m.height,anchor:[.5,1],category:kind,rendering:'soft cartoon; antialiased alpha',source,crop:[left,top,width,height]});
 }
 fs.writeFileSync('src/world/data/cartoon-'+kind+'-assets.json',JSON.stringify(assets,null,2)+'\n');console.log(kind,assets.map(a=>a.id+':'+a.width+'x'+a.height).join(', '));
}
(async()=>{await exportSheet('clouds',[0,1,2,3,4,5].map(i=>'cloud-'+i));await exportSheet('buildings',['castle','blue-home','post-office','capitol','monument','lighthouse']);})().catch(e=>{console.error(e);process.exit(1);});

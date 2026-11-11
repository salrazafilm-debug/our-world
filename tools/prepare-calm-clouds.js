/* Extract the generated cloud sprite, retaining the untouched source.
   Remove disconnected alpha/matte debris; nearest-neighbor export only. */
const sharp=require('sharp'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),source='art-src/world/calm-cloud-rounded.png';
(async()=>{
 const manifest={};
 for(const name of ['cloud-calm']){
  const {data,info}=await sharp(path.join(root,source)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const w=info.width,h=info.height,mask=new Uint8Array(w*h),seen=new Uint8Array(w*h);let best=[];
  for(let i=0;i<mask.length;i++){let p=i*4,r=data[p],g=data[p+1],b=data[p+2];mask[i]=data[p+3]>235&&r>165&&g>150&&b>155&&r-g<75&&b-g<65?1:0;}
  for(let i=0;i<mask.length;i++)if(mask[i]&&!seen[i]){
   const q=[i];seen[i]=1;
   for(let j=0;j<q.length;j++){const p=q[j],x=p%w;for(const n of [x?p-1:-1,x<w-1?p+1:-1,p-w,p+w])if(n>=0&&n<mask.length&&mask[n]&&!seen[n]){seen[n]=1;q.push(n);}}
   if(q.length>best.length)best=q;
  }
  mask.fill(0);let l=w,t=h,r=0,b=0;
  for(const i of best){mask[i]=1;const x=i%w,y=Math.floor(i/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  for(let i=0;i<mask.length;i++)data[i*4+3]=mask[i]?255:0;
  const dest='art/'+name+'.png';
  await sharp(data,{raw:{width:w,height:h,channels:4}}).extract({left:l,top:t,width:r-l+1,height:b-t+1}).resize({width:360,kernel:'nearest'}).png({palette:true,colours:24,dither:0}).toFile(path.join(root,dest));
  const m=await sharp(path.join(root,dest)).metadata();manifest[name]={path:dest,width:m.width,height:m.height,anchor:[.5,1],category:'clouds',use:'quiet, world-anchored cloud bank',source,crop:[l,t,r-l+1,b-t+1]};
 }
 fs.writeFileSync(path.join(root,'art-src/world/calm-cloud-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(manifest);
})().catch(e=>{console.error(e);process.exit(1);});

/* Mechanical sprite extraction. Keep original source and smooth edge alpha. */
const sharp=require('sharp'),fs=require('fs');
(async()=>{
 const source='art-src/world/soft-scenery-sheet.png',image=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {data,info}=image,names=['ridge','hills','waterfall','bridge','dock','bench','lamp','boat','cottage'];
 function boundary(axis,target){
  const length=axis==='y'?info.height:info.width,other=axis==='y'?info.width:info.height;
  let runs=[],start=null;
  for(let n=Math.floor(target-length*.10);n<=Math.ceil(target+length*.10);n++){
   let occupied=false;for(let k=0;k<other;k++){const x=axis==='y'?k:n,y=axis==='y'?n:k;if(data[(y*info.width+x)*4+3]>32){occupied=true;break;}}
   if(!occupied&&start===null)start=n;if((occupied||n===Math.ceil(target+length*.10))&&start!==null){runs.push([start,n]);start=null;}
  }
  runs=runs.filter(r=>r[1]-r[0]>3).sort((a,b)=>Math.abs((a[0]+a[1])/2-target)-Math.abs((b[0]+b[1])/2-target));
  return runs.length?Math.round((runs[0][0]+runs[0][1])/2):Math.round(target);
 }
 const rows=[0,boundary('y',info.height/3),boundary('y',info.height*2/3),info.height],cols=[0,boundary('x',info.width/3),boundary('x',info.width*2/3),info.width];
 const dir='art/world/soft-scenery';fs.mkdirSync(dir,{recursive:true});const assets=[];
 for(let i=0;i<names.length;i++){
  const col=i%3,row=Math.floor(i/3),left=cols[col],top=rows[row],width=cols[col+1]-left,height=rows[row+1]-top,file=dir+'/'+names[i]+'.png';
  const crop=await sharp(source).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let k=3;k<crop.data.length;k+=4){const d=crop.data,redMatte=d[k]<200&&d[k-3]>160&&d[k-3]>d[k-2]*2.8&&d[k-3]>d[k-1]*2.8;if(d[k]<12||redMatte)d[k]=0;}
  const png=await sharp(crop.data,{raw:crop.info}).png().toBuffer();
  await sharp(png).trim({background:'#00000000',threshold:2}).resize({width:384,height:384,fit:'inside',withoutEnlargement:true}).png({compressionLevel:9}).toFile(file);
  const m=await sharp(file).metadata();assets.push({id:names[i],path:file,width:m.width,height:m.height,anchor:[.5,1],category:i<3?'terrain':'prop',rendering:'smooth cartoon; preserve alpha',source,crop:[left,top,width,height]});
 }
 fs.writeFileSync('src/world/data/soft-scenery-assets.json',JSON.stringify(assets,null,2)+'\n');console.log('Exported soft scenery:',names.join(', '),'rows',rows,'columns',cols);
})().catch(e=>{console.error(e);process.exit(1);});

/* Conservative alpha-only cleanup: preserve all colors and intentional whites.
   Originals remain untouched. Retain the largest connected silhouette; halos
   connected to it are deliberately left for visual review rather than guessed. */
const fs=require('fs'),sharp=require('sharp');
(async()=>{
 const dir='art/pets/acc',out='art/pets/fitted';fs.mkdirSync(out,{recursive:true});let manifest={};
 for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.png'))){
  const {data,info}=await sharp(dir+'/'+file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),{width:w,height:h}=info;
  let seen=new Uint8Array(w*h),groups=[];
  for(let p=0;p<w*h;p++)if(!seen[p]&&data[p*4+3]>24){let q=[p];seen[p]=1;for(let k=0;k<q.length;k++){let i=q[k],x=i%w,y=Math.floor(i/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){let xx=x+dx,yy=y+dy,j=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&!seen[j]&&data[j*4+3]>24){seen[j]=1;q.push(j);}}}groups.push(q);}
  groups.sort((a,b)=>b.length-a.length);let kept=/extra-(halo|goggles)/.test(file)?groups.slice(0,1):groups.filter(g=>g.length>=Math.max(12,groups[0].length*.018)),mask=new Uint8Array(w*h);kept.forEach(g=>g.forEach(p=>mask[p]=1));
  // Include a one-pixel fringe around retained components, preserving edge alpha.
  let removed=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){let near=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h&&mask[(y+dy)*w+x+dx])near=true;let i=(y*w+x)*4;if(!near&&data[i+3]){data[i]=data[i+1]=data[i+2]=data[i+3]=0;removed++;}}
  let minX=w,minY=h,maxX=0,maxY=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]){minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);}
  const box={left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1};
  await sharp(data,{raw:info}).extract(box).png().toFile(out+'/'+file);
  let id=file.replace('.png','');manifest[id]={width:box.width,height:box.height,removedPixels:removed,source:'art/pets/acc/'+file};
 }
 const source='art-src/pets/single-boots-sheet.png',meta=await sharp(source).metadata(),names=['tan','black','red-sneaker','white','purple-paw','yellow-rain','black-buckle','fur-brown','blue-snow','red-fur'];
 for(let i=0;i<10;i++){
  let left=Math.round((i%5)*meta.width/5),top=Math.round(Math.floor(i/5)*meta.height/2),right=Math.round((i%5+1)*meta.width/5),bottom=Math.round((Math.floor(i/5)+1)*meta.height/2);
  let {data,info}=await sharp(source).extract({left,top,width:right-left,height:bottom-top}).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let j=0;j<data.length;j+=4)if(data[j+3]<24)data[j]=data[j+1]=data[j+2]=data[j+3]=0;
  let b=await sharp(data,{raw:info}).trim().resize({width:96,kernel:'nearest'}).png().toBuffer();await sharp(b).toFile(out+'/boots-'+names[i]+'-left.png');await sharp(b).flop().toFile(out+'/boots-'+names[i]+'-right.png');
 }
 fs.writeFileSync(out+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 console.log('Prepared '+Object.keys(manifest).length+' original accessories; colors and white details preserved.');
})();

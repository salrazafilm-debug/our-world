/* Mechanical sprite export; the roof logo belongs to the building artwork. */
const sharp=require('sharp'),fs=require('fs');
(async()=>{const source='art-src/world/civic-post-office.png';const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4){const matte=data[i]>240&&data[i+1]<40&&data[i+2]>230;data[i+3]=!matte&&data[i+3]>220?255:0;}
 const file='art/civic-post-office.png';await sharp(data,{raw:info}).trim({background:'#00000000'}).resize({width:256,kernel:'nearest'}).png({compressionLevel:9}).toFile(file);
 const m=await sharp(file).metadata();fs.writeFileSync('src/world/data/post-office-asset.json',JSON.stringify({source,path:file,width:m.width,height:m.height,anchor:[.5,1],use:'white civic post office with attached roof envelope logo'},null,2)+'\n');
})().catch(e=>{console.error(e);process.exit(1);});

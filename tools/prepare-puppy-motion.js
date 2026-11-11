const sharp=require('sharp');
(async()=>{
 const {data,info}=await sharp('art-src/pets/puppy-motion-sheet.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4)if(data[i+3]<20){data[i]=data[i+1]=data[i+2]=data[i+3]=0;}
 await sharp(data,{raw:info}).resize(1024,1024).png().toFile('art/pets/puppy-motion.png');
})();

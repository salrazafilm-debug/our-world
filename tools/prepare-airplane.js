/* Mechanical alpha trim and nearest-neighbor export. */
const sharp=require('sharp');
(async()=>{
 const {data,info}=await sharp('art-src/painted/airplane.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let k=3;k<data.length;k+=4)data[k]=data[k]>220?255:0;
 await sharp(data,{raw:info}).trim({background:'#00000000'}).resize({width:96,height:96,fit:'inside',kernel:'nearest'}).png({compressionLevel:9}).toFile('art/map-airplane.png');
})().catch(e=>{console.error(e);process.exit(1);});

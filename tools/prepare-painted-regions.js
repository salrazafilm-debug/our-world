/* Mechanical lossless export only. Reference-derived originals are retained. */
const sharp=require('sharp');
Promise.all(['maryland-atlas','maryland-local','nyc-regional'].map(name=>
 sharp('art-src/painted/'+name+'.png').webp({lossless:true}).toFile('art/world/painted/'+name+'.webp')
)).then(()=>console.log('Prepared native-resolution lossless painted regions.')).catch(e=>{console.error(e);process.exit(1);});

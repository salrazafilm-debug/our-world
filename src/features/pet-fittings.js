/* Coordinates are in the actual puppy's 195 × 236 front view or 256px
   animation cell. Individual item/pose overrides use the same attachment rig. */
var PET_FIT_OVERRIDES={};
var PET_FITS_READY=fetch('art/pets/fittings.json').then(function(r){if(!r.ok)throw Error('fits');return r.json();}).then(function(data){PET_FIT_OVERRIDES=data;if(typeof PB!=='undefined')PB.shown='';}).catch(function(){/* Built-in fits remain usable offline. */});
var PET_RIG={front:{head:[98,34],eyes:[98,72],neck:[98,112],chest:[99,157],back:[98,145],pawL:[79,231],pawR:[133,231]}};
PET_RIG.sleep={head:[118,15],eyes:[119,40],neck:[85,45],chest:[90,52],back:[55,32],pawL:[99,67],pawR:[136,67]};
var PET_MOTION_RIG=[
 [[128,29],[128,73],[128,120],[128,163],[128,160],[107,235],[163,235]],
 [[128,29],[128,73],[128,120],[128,163],[128,160],[107,235],[163,235]],
 [[124,27],[128,73],[132,121],[130,163],[128,160],[107,235],[163,235]],
 [[130,29],[130,73],[130,120],[128,163],[128,160],[107,235],[163,235]],
 [[192,68],[211,106],[177,128],[174,166],[102,143],[175,230],[215,229]],
 [[192,68],[211,106],[177,128],[174,166],[102,143],[158,231],[218,201]],
 [[192,68],[211,106],[177,128],[174,166],[102,143],[188,231],[216,223]],
 [[192,68],[211,106],[177,128],[174,166],[102,143],[176,230],[217,209]],
 [[151,95],[151,133],[136,155],[130,188],[100,130],[123,234],[178,234]],
 [[156,113],[156,150],[137,171],[130,195],[100,130],[122,234],[178,234]],
 [[153,135],[153,169],[136,185],[130,201],[100,130],[123,234],[178,234]],
 [[153,105],[153,143],[136,163],[130,191],[100,130],[123,234],[178,234]],
 [[153,102],[153,140],[136,163],[130,190],[100,130],[123,234],[178,234]],
 [[153,107],[153,145],[136,168],[130,193],[100,130],[123,234],[178,234]],
 [[153,107],[153,145],[136,168],[130,193],[100,130],[123,234],[178,234]],
 [[153,96],[153,134],[136,157],[130,187],[100,130],[123,234],[178,234]]
];
PET_MOTION_RIG.forEach(function(row,i){var rig={};['head','eyes','neck','chest','back','pawL','pawR'].forEach(function(k,j){rig[k]=row[j];});PET_RIG['motion-'+i]=rig;});
[[[166,217],[185,217],[39,217],[85,217]],[[140,216],[178,191],[39,217],[85,217]],[[178,217],[151,217],[57,217],[98,211]],[[160,217],[181,196],[40,217],[83,211]]].forEach(function(p,i){['pawL','pawR','rearL','rearR'].forEach(function(k,j){PET_RIG['motion-'+(i+4)][k]=p[j];});});
var PET_ITEM_FITS={};
function petInitFits(){
PET_CATALOG.forEach(function(it){var f={anchor:'neck',width:78,dx:0,dy:0,rotation:0,z:4,align:'top'};
 if(it.slot==='hat')f={anchor:'head',width:119,dx:0,dy:5,rotation:0,z:4,align:'bottom'};
 if(it.slot==='collar')f={anchor:'neck',width:70,dx:0,dy:1,rotation:0,z:3,align:'top'};
 if(it.slot==='boots')f={anchor:'pawL',width:32,dx:0,dy:0,rotation:0,z:5,align:'bottom'};
 if(it.slot==='extra'){
  var back=/backpack|cape|wings/.test(it.file);
  f={anchor:back?'back':/camera/.test(it.file)?'chest':/halo/.test(it.file)?'head':'eyes',width:back?128:/headphones/.test(it.file)?130:/camera/.test(it.file)?49:92,dx:0,dy:0,rotation:0,z:back?0:6,align:'center'};
 }
 PET_ITEM_FITS[it.id]=f;
});
// Fit brim heights to the curls; tall crowns/wizard hats need their own width.
['hat-crown','hat-wizard'].forEach(function(id){PET_ITEM_FITS[id].width=99;PET_ITEM_FITS[id].dy=1;});
PET_ITEM_FITS['extra-halo'].dy=-24;PET_ITEM_FITS['extra-halo'].width=86;
PET_ITEM_FITS['extra-goggles'].width=88;
PET_ITEM_FITS['extra-camera'].dy=-9;
PET_ITEM_FITS['extra-backpack'].dx=43;PET_ITEM_FITS['extra-backpack'].width=80;PET_ITEM_FITS['extra-backpack'].dy=10;
PET_ITEM_FITS['extra-wings'].width=190;PET_ITEM_FITS['extra-bat-wings'].width=190;
PET_ITEM_FITS['extra-headphones'].width=173;PET_ITEM_FITS['extra-headphones'].dy=-14;
['hat-beanie-cream','hat-beanie-grey'].forEach(function(id){PET_ITEM_FITS[id].dy=15;});
}
function petFit(item,pose,part){var f=Object.assign({},PET_ITEM_FITS[item.id]),n=Number(pose.split('-')[1]),row=Math.floor(n/4);
 if(pose!=='front'&&row===1){f.width*=item.slot==='hat'?.62:item.slot==='boots'?1:.68;if(item.slot==='hat')f.dy+=8;if(item.slot==='collar'||item.slot==='scarf'){f.dx=-15;f.dy=-10;f.rotation=-20;}if(item.slot==='extra'&&/glasses|goggles/.test(item.file)){f.dx=-18;f.dy=-16;f.width*=.75;}if(item.file==='extra-backpack'){f.dx=-15;f.dy=-7;f.z=2;f.width=61;}}
 if(pose!=='front'&&row>=2){if(item.slot==='hat'){f.dy-=22;f.width*=.78;}if(item.slot==='collar'||item.slot==='scarf'||item.slot==='boots')f.z=0;if(item.file==='extra-camera')f.z=0;}
 if(pose==='sleep'){f.width*=.65;if(item.slot==='scarf'||item.slot==='collar'||item.slot==='boots'||f.anchor==='back'||f.anchor==='chest')f.z=0;}
 Object.assign(f,PET_FIT_OVERRIDES[item.id+'|'+pose]||{});if(part){f.anchor=part;Object.assign(f,PET_FIT_OVERRIDES[item.id+'|'+pose+'|'+part]||{});}return f;}
function petFittedLayer(item,s,pose){
 pose=pose||'front';var rig=PET_RIG[pose]||PET_RIG.front,f=petFit(item,pose),motion=pose.indexOf('motion-')===0,ratio=motion&&Math.floor(Number(pose.split('-')[1])/4)===1?256/195:1;
 var parts=item.slot==='boots'?[{anchor:'pawL',suffix:'-left'},{anchor:'pawR',suffix:'-right'}]:[{anchor:f.anchor,suffix:''}];
 if(item.slot==='boots'&&rig.rearL)parts=[{anchor:'rearL',suffix:'-left',z:0},{anchor:'rearR',suffix:'-right',z:0}].concat(parts);
 return parts.map(function(part){var f=item.slot==='boots'?petFit(item,pose,part.anchor):petFit(item,pose),point=rig[f.anchor]||rig.neck,w=f.width*ratio*s,x=(point[0]+f.dx*ratio)*s,y=(point[1]+f.dy*ratio)*s;
  var transform='translate(-50%,'+(f.align==='bottom'?'-100%':f.align==='center'?'-50%':'0')+') rotate('+f.rotation+'deg)';
  var base='left:'+x+'px;top:'+y+'px;width:'+w+'px;transform-origin:50% '+(f.align==='bottom'?'100%':'0')+';transform:'+transform+';image-rendering:pixelated;',url='art/pets/fitted/'+item.file+part.suffix+'.png';
  function image(z,clip){return '<img class="pf-l" alt="" draggable="false" data-file="'+item.file+'" src="'+url+'" style="'+base+'z-index:'+z+';'+(clip?'clip-path:'+clip+';':'')+'">';}
  if(item.file==='extra-headphones')return image(0,'inset(0 0 55% 0)')+image(f.z,'inset(35% 70% 0 0)')+image(f.z,'inset(35% 0 0 70%)');
  if((item.slot==='scarf'||item.slot==='collar')&&f.z>1)return image(0,'inset(0 0 73% 0)')+image(f.z,'inset(27% 0 0 0)');
  return image(part.z===undefined?f.z:part.z);
 }).join('');
}
function petMotionFigure(size,frame,eq,flip){
 var row=Math.floor(frame/4),col=frame%4,layers='';PET_SLOTS.forEach(function(slot){var it=petItem(eq[slot]);if(it)layers+=petFittedLayer(it,size/256,'motion-'+frame);});
 return '<div class="puppy-motion" role="img" aria-label="Puppy" style="position:relative;width:'+size+'px;height:'+size+'px;transform:scaleX('+(flip?-1:1)+')">'+layers+'<div style="position:absolute;inset:0;z-index:1;background-image:url(art/pets/puppy-motion.png);background-size:400% 400%;background-position:'+(col*100/3)+'% '+(row*100/3)+'%"></div></div>';
}

/* Authored Chesapeake scenery. Coordinates and memory projection stay geographic;
   the bay's eastern rim is stylized in the base itself, never a scene overlay. */
function marylandWeight(lat,lng){
 return cloudEase(37.4,38,lat)*(1-cloudEase(39.6,40.2,lat))*cloudEase(-78.3,-77.7,lng)*(1-cloudEase(-75.4,-74.9,lng));
}
function marylandBay(g,s){
 if(S.zoom<5.5)return;
 var coast=[[39.48,-76.12],[39.28,-76.20],[39.08,-76.29],[38.89,-76.30],[38.69,-76.34],[38.48,-76.27],[38.28,-76.16],[38.05,-76.0],[37.75,-75.84]];
 var width=.30*cloudEase(5.5,7.2,S.zoom),ring=coast.map(function(a,i){return[a[0],a[1]-.08*Math.sin(Math.PI*i/(coast.length-1))];}).concat(coast.slice().reverse().map(function(a,i){var t=(coast.length-1-i)/(coast.length-1);return[a[0],a[1]+width*Math.sin(Math.PI*t)];}));
 var a=proj(39.5,-76.6),b=proj(37.7,-75.5);if(b.x<0||a.x>W||b.y<0||a.y>H)return;
 g.save();g.beginPath();ring.forEach(function(a,i){var p=proj(a[0],a[1]);if(i)g.lineTo(p.x/s,p.y/s);else g.moveTo(p.x/s,p.y/s);});g.closePath();g.clip();
 /* Preserve the same water color family used by terrainAt's land/water mask. */
 var water=g.createLinearGradient(0,0,0,H/s);water.addColorStop(0,'#2995C7');water.addColorStop(.55,'#36ACD2');water.addColorStop(1,'#237FB5');g.fillStyle=water;g.fillRect(0,0,W/s,H/s);
 var step=18,ox=lngToWX(S.center.lng,S.zoom)-W/2,oy=latToWY(S.center.lat,S.zoom)-H/2;
 g.fillStyle='#67b9cd';for(var y=-((oy/s)%step);y<H/s;y+=step)for(var x=-((ox/s)%step);x<W/s;x+=step)g.fillRect(x+(Math.floor((y+oy/s)/step)%2)*7,y,3,1);
 g.restore();
}
function marylandPoints(){return{e:homeDisplayPos('elena',S.zoom),b:homeDisplayPos('bruce',S.zoom),m:repairPoint('mail'),d:repairPoint('dc'),n:repairPoint('hb-nova')};}
function marylandPathPoints(){var p=marylandPoints();return[['e','m'],['m','b'],['m','d'],['d','n']].map(function(l,i){var a=p[l[0]],b=p[l[1]],bow=i%2?.14:-.12;return[a,{x:(a.x+b.x)/2-(b.y-a.y)*bow,y:(a.y+b.y)/2+(b.x-a.x)*bow},b];});}
var MD_PATHS=[];
function marylandPathNear(x,y,margin){return MD_PATHS.some(function(p){for(var i=0;i<=20;i++){var t=i/20,u=1-t,px=u*u*p[0].x+2*u*t*p[1].x+t*t*p[2].x,py=u*u*p[0].y+2*u*t*p[1].y+t*t*p[2].y;if(Math.hypot(x-px,y-py)<margin)return true;}return false;});}
function marylandLandClip(g,box){g.beginPath();for(var y=box.y;y<box.y+box.h;y+=5)for(var x=box.x;x<box.x+box.w;x+=5)if(scenicLand(x,y))g.rect(x,y,5,5);g.clip();}
function marylandGrounds(g){
 var p=marylandPoints(),u=homeArtH(S.zoom);
 /* Broad woodland floors tie the trees into coherent terrain regions. */
 MD_GROVES.forEach(function(a,i){var q=proj(a[0],a[1]),r=Math.abs(proj(a[0],a[1]+a[2]*1.4).x-q.x);if(r<4||q.x+r<0||q.x-r>W||q.y+r<0||q.y-r>H)return;
  g.save();marylandLandClip(g,{x:Math.max(0,q.x-r*1.2),y:Math.max(0,q.y-r*1.2),w:Math.min(W,r*2.4),h:Math.min(H,r*2.4)});
  [.95,.72,.45].forEach(function(scale,j){g.fillStyle=['rgba(113,151,75,.12)','rgba(86,129,65,.12)','rgba(63,111,61,.10)'][j];g.beginPath();for(var k=0;k<=16;k++){var angle=k/16*Math.PI*2,rr=r*scale*(.82+terHash(i,k%16,237)*.3),x=q.x+Math.cos(angle)*rr,y=q.y+Math.sin(angle)*rr*.85;if(k)g.lineTo(x,y);else g.moveTo(x,y);}g.closePath();g.fill();});g.restore();
 });
 /* Physical tan paths live below trees and all interactive artwork. */
 g.save();g.lineCap='round';g.lineJoin='round';
 MD_PATHS=marylandPathPoints();MD_PATHS.forEach(function(a){g.beginPath();g.moveTo(a[0].x,a[0].y);g.quadraticCurveTo(a[1].x,a[1].y,a[2].x,a[2].y);g.strokeStyle='#b6a175';g.lineWidth=Math.max(6,u*.12);g.stroke();g.strokeStyle='#e4ca95';g.lineWidth=Math.max(4,u*.075);g.stroke();});g.restore();
 ['e','b','m'].forEach(function(id){var a=p[id],rx=u*(id==='m'?.86:1.02),ry=u*.29;if(a.x<-rx||a.x>W+rx||a.y<-u||a.y>H+u)return;
  g.save();marylandLandClip(g,{x:a.x-rx-8,y:a.y-u*.35,w:rx*2+16,h:u*.85});
  g.fillStyle='#b7c57d';g.beginPath();g.ellipse(a.x,a.y+3,rx+6,ry+8,0,0,7);g.fill();
  g.fillStyle='#e0d0a3';g.beginPath();g.ellipse(a.x,a.y+4,rx,ry,0,0,7);g.fill();
  g.strokeStyle='#f1dfb3';g.lineWidth=2;g.stroke();
  /* Flower beds edge the curved forecourt, leaving an open entrance. */
  for(var j=0;j<12;j++){var angle=j/12*Math.PI*2;if(Math.sin(angle)>.5&&Math.abs(Math.cos(angle))<.5)continue;var x=a.x+Math.cos(angle)*rx*.91,y=a.y+4+Math.sin(angle)*ry*.94;drawArt(g,'pack-bush',x,y,u*.13,1);drawArt(g,'pack-flowers',x,y-2,u*.12,1);}
  for(var stair=0;stair<3;stair++){scenicMark(g,a.x-u*.15,a.y+ry-3+stair*3,'#b3ab91',u*.3,3);scenicMark(g,a.x-u*.15,a.y+ry-3+stair*3,'#f3e2bd',u*.3,1);}
  g.restore();
 });
}
var MD_GROVES=[[39.35,-77.25,.22],[39.22,-76.83,.18],[39.48,-76.45,.18],[39.16,-76.42,.12],[38.99,-77.32,.15],[38.87,-76.83,.12],[38.68,-77.02,.19],[38.49,-76.75,.17],[38.32,-76.57,.16],[38.85,-75.93,.18],[39.12,-75.8,.16],[38.30,-75.65,.18]];
var MD_TOWNS=[[39.29,-76.61,'Baltimore'],[39.74,-75.55,'Wilmington'],[38.97,-76.49,'Annapolis'],[38.75,-76.55,'Calvert']],MD_TOWNBOXES=[];
function marylandForest(lat,lng){var v=0;MD_GROVES.forEach(function(a){var dx=(lng-a[1])*.78,dy=lat-a[0],d=Math.hypot(dx,dy)/(a[2]*1.65);v=Math.max(v,1-cloudEase(.35,1,d));});return v;}
function marylandVegetation(g){
 var z=S.zoom;if(z<5.8)return;var tl=unproj(-70,-70),br=unproj(W+70,H+70),u=homeArtH(z),items=[];
 var layers=[{cell:.032,a:1},{cell:.008,a:cloudEase(8.5,10.8,z)}];
 layers.forEach(function(l,lv){if(l.a<.01)return;var cell=l.cell,loY=Math.floor(Math.max(37.4,br.lat)/cell),hiY=Math.ceil(Math.min(40.2,tl.lat)/cell),loX=Math.floor(Math.max(-78.3,tl.lng)/cell),hiX=Math.ceil(Math.min(-74.9,br.lng)/cell);
  for(var iy=loY;iy<=hiY;iy++)for(var ix=loX;ix<=hiX;ix++){
   var lat=(iy+.12+terHash(ix,iy,141)*.76)*cell,lng=(ix+.12+terHash(ix,iy,142)*.76)*cell,weight=marylandWeight(lat,lng),rate=scenicCellWeight(ix,iy,cell,z,lv?19:12);if(weight<.2||rate<.01)continue;
   var p=proj(lat,lng),r=terHash(ix,iy,143),forest=marylandForest(lat,lng),grain=terNoise(lng*32,lat*32),h=u*(.28+terHash(ix,iy,144)*.24);
   if(p.x<-45||p.x>W+45||p.y<-20||p.y>H+60||!scenicLand(p.x,p.y)||scenicAvoid(p.x,p.y,u*.34)||marylandPathNear(p.x,p.y,h*.32+5)||MD_TOWNS.some(function(a){var q=proj(a[0],a[1]);return Math.hypot(p.x-q.x,p.y-q.y)<u*.85;}))continue;
   var a=l.a*rate*weight;
   if(r<forest*.78+(grain>.55?.1:.02))items.push({x:p.x,y:p.y,h:h,a:a,art:terHash(ix,iy,145)<(.18+(1-forest)*.22)?'pack-cherry':r<.3?'pack-pine-tall':'pack-pine'});
   else if(r>.58&&r<.79)items.push({x:p.x,y:p.y,h:u*(.10+terHash(ix,iy,146)*.08),a:a,art:r>.75?'pack-rocks':r>.63?'pack-flowers':'pack-bush'});
  }
 });
 items.sort(function(a,b){return a.y-b.y;}).forEach(function(it){g.save();g.globalAlpha=it.a;drawArt(g,it.art,it.x,it.y,it.h,1);g.restore();});
}
function marylandLamp(g,x,y,h){drawArt(g,'lamp',x,y,h,1);}
function marylandDetails(g){
 /* Overlapping distant ridges establish a back-to-front relief hierarchy. */
 [[39.40,-77.35,.78],[39.48,-77.53,.62]].forEach(function(a,i){var q=proj(a[0],a[1]),u=homeArtH(S.zoom);if(q.x>-u&&q.x<W+u&&q.y>-u&&q.y<H+u&&scenicLand(q.x,q.y)&&!repairClear(q.x,q.y))drawArt(g,i?'soft-hills':'soft-ridge',q.x,q.y,u*a[2],1);});
 marylandVegetation(g);
 var u=homeArtH(S.zoom),p=marylandPoints();
 /* Garden framing is authored per landmark, never a random building scatter. */
 ['e','m','b'].forEach(function(id){var a=p[id];if(a.x<-u*2||a.x>W+u*2||a.y<-u||a.y>H+u)return;
  [-1,1].forEach(function(side){var x=a.x+side*u*(id==='m'?.77:.94),y=a.y+u*.15;if(scenicLand(x,y)){marylandLamp(g,x,y,u*.31);drawArt(g,'pack-flowers',x+side*5,y+3,u*.16,1);}});
  var trees=id==='e'?[[-1.02,-.75],[.95,-.65],[-1.12,.2]]:id==='b'?[[-1.12,-.4],[-1.05,.32]]:[[-.97,-.5],[-.98,.22]];
  trees.forEach(function(v,i){var x=a.x+v[0]*u,y=a.y+v[1]*u;if(scenicLand(x,y))drawArt(g,i%2?'pack-pine':'pack-cherry',x,y,u*.43,1);});
  if(scenicLand(a.x-u*.50,a.y+u*.23))drawArt(g,'bench',a.x-u*.50,a.y+u*.23,u*.15,1);
 });
 marylandHarbor(g,39.015,-76.47,'annapolis');
 marylandRelief(g,p.n,u);
 /* Supporting towns use existing geographic names and never create new taps. */
 MD_TOWNBOXES=[];MD_TOWNS.forEach(function(a,i){
  var q=proj(a[0],a[1]);if(q.x<-u||q.x>W+u||q.y<-u||q.y>H+u||repairClear(q.x,q.y)||!scenicLand(q.x,q.y))return;
  var scale=u*.52;
  [[-.35,-.13],[.32,-.21],[0,.17]].forEach(function(v,j){var x=q.x+v[0]*u,y=q.y+v[1]*u;if(scenicLand(x,y)&&!repairClear(x,y)){var box=drawArt(g,j===1&&i<2?'city':'story-cottage',x,y,scale*(j===1?1.15:.9),1);if(box)MD_TOWNBOXES.push(box);}});
 });
}
function marylandRelief(g,p,u){
 if(p.x<-u*2||p.x>W+u*2||p.y<-u||p.y>H+u)return;
 /* Foothill grove and a spring-fed cascade beside the existing mountain. */
 var x=p.x-u*.88,y=p.y+u*.15;if(!scenicLand(x,y)||repairClear(x,y))return;
 g.save();marylandLandClip(g,{x:x-u*.38,y:y-u*.4,w:u*.76,h:u*.85});
 g.fillStyle='#8daa71';g.beginPath();g.ellipse(x,y,u*.35,u*.3,0,0,7);g.fill();
 drawArt(g,'soft-waterfall',x+u*.04,y+u*.16,u*.48,1);
 drawArt(g,'pack-rocks',x-u*.13,y+u*.19,u*.18,1);drawArt(g,'pack-bridge',x+u*.03,y+u*.25,u*.21,1);
 drawArt(g,'pack-pine',x-u*.26,y-u*.08,u*.48,1);drawArt(g,'pack-cherry',x+u*.28,y+u*.06,u*.4,1);g.restore();
}
function marylandHarbor(g,lat,lng,id){
 var p=proj(lat,lng),u=homeArtH(S.zoom);if(p.x<-u||p.x>W+u||p.y<-u||p.y>H+u)return;
 var site=null;for(var dx=0;dx<u;dx+=4){if(terrainAt(p.x+dx,p.y)==='water'&&terrainAt(p.x+dx+12,p.y)==='water'){site={x:p.x+dx,y:p.y};break;}}
 if(!site)return;drawArt(g,'pack-dock',site.x,site.y+u*.16,u*.25,1);
 [[.45,.1],[.76,.42]].forEach(function(a){var x=site.x+a[0]*u,y=site.y+a[1]*u;if(terrainAt(x,y)==='water')drawArt(g,'pack-boat',x,y,u*.3,1);});
}

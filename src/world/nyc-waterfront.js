/* Ordinary-map NYC: modular architecture over the REAL geographic base.
   Decorative footprints are exaggerated for readability; proj/unproj, saved
   coordinates and the existing deliberate-entry close-up are never replaced. */
var NYC_WORLD={key:'',visible:false,ready:false,parts:[],boxes:[]};
var NYC_PARTS=['nyc-brownstones','nyc-empire','nyc-east-skyline','nyc-brooklyn-bridge','pack-liberty'];
var NYC_TRAIL=[[-65,-290],[-145,-230],[-95,-155],[-155,-80],[-135,10],[-185,95],[-140,165],[-190,260]];
function nycPrepare(){
 var p=proj(40.7580,-73.9855),s=Math.max(.12,Math.min(2.1,Math.pow(2,(S.zoom-7.8)*.55)));
 var b={x:p.x-260*s,y:p.y-330*s,w:530*s,h:650*s};
 var visible=S.mode==='map'&&b.x<W&&b.y<H&&b.x+b.w>0&&b.y+b.h>0;
 if(!visible){NYC_WORLD.visible=false;return;}
 var ready=NYC_PARTS.every(function(id){return artLoad(id).ok;});
 /* Start all imminent assets together, not one request per frame. */
 NYC_PARTS.forEach(artLoad);
 var key=[p.x,p.y,S.zoom,W,H,ready].join('/');
 if(NYC_WORLD.key===key){NYC_WORLD.visible=true;return;}
 function part(name,x,y,h,id){var a=artLoad(name),aspect=a.ok?a.img.width/a.img.height:1.6;return{name:name,x:p.x+x*s,y:p.y+y*s,h:h*s,w:h*s*aspect,id:id};}
 var parts=[part('nyc-brownstones',-94,12,62,'brownstones'),part('nyc-empire',0,-6,112,'empire'),part('nyc-east-skyline',94,-27,83,'east'),part('nyc-brooklyn-bridge',112,48,64,'bridge')];
 var liberty=proj(40.6892,-74.0445);
 NYC_WORLD={key:key,visible:true,ready:ready,anchor:p,scale:s,bounds:b,parts:parts,boxes:[],liberty:{x:liberty.x+40*s,y:liberty.y+78*s},boats:[]};
 nycUpdateBoxes();
}
function nycUpdateBoxes(){
 var n=NYC_WORLD,s=n.scale;if(!n.visible)return;
 n.boxes=n.parts.map(function(p){return{x:p.x-p.w/2,y:p.y-p.h,w:p.w,h:p.h,id:p.id};});
 n.boxes.push({x:n.liberty.x-34*s,y:n.liberty.y-75*s,w:68*s,h:93*s,id:'liberty'});
}
function nycFootprints(){return NYC_WORLD.visible&&NYC_WORLD.ready?NYC_WORLD.boxes:[];}
function nycAvoid(x,y,pad){return nycFootprints().some(function(b){return x>b.x-pad&&x<b.x+b.w+pad&&y>b.y-pad&&y<b.y+b.h+pad;});}
function nycOnScreen(x,y,r){return x>-r&&y>-r&&x<W+r&&y<H+r;}
function nycPoint(x,y){var n=NYC_WORLD;return{x:n.anchor.x+x*n.scale,y:n.anchor.y+y*n.scale};}
function nycTrailDistance(x,y){
 var best=1e9;
 for(var i=1;i<NYC_TRAIL.length;i++){
  var a=NYC_TRAIL[i-1],b=NYC_TRAIL[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
  best=Math.min(best,Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t));
 }
 return best;
}
function nycWaterSite(target,radius,s){
 var best=null,score=1e9;
 for(var dy=-radius;dy<=radius;dy+=8*s)for(var dx=-radius;dx<=radius;dx+=8*s){
  var x=target.x+dx,y=target.y+dy;
  if(terrainAt(x,y)!=='water'||terrainAt(x-22*s,y)!=='water'||terrainAt(x+22*s,y)!=='water')continue;
  var d=dx*dx+dy*dy;if(d<score){score=d;best={x:x,y:y};}
 }
 return best;
}
function nycGround(g){
 var n=NYC_WORLD,s=n.scale,step=10*s,land=[];
 /* Low-contrast meadow and coastal shallows. Only tint existing geography;
    nothing paints a new coastline, rectangular terrain image or water plate. */
 for(var ly=-320;ly<320;ly+=10)for(var lx=-250;lx<270;lx+=10){
  var p=nycPoint(lx,ly);if(!nycOnScreen(p.x,p.y,step))continue;
  var edge=Math.min(1,Math.max(0,(1-Math.max(Math.abs(lx)/260,Math.abs(ly)/330))*5));
  var landHere=terrainAt(p.x,p.y)==='land',r=terHash(lx,ly,831),patch=terNoise(lx/95,ly/110);
  if(landHere){
   land.push({x:p.x,y:p.y});g.fillStyle='rgba('+Math.round(133+patch*24)+','+Math.round(165+patch*25)+','+Math.round(77+patch*20)+','+edge*.6+')';g.fillRect(p.x,p.y,step+1,step+1);
  }else if(terrainAt(p.x,p.y)==='water'){
   var shore=terrainAt(p.x-18*s,p.y)==='land'||terrainAt(p.x,p.y-18*s)==='land';
   g.fillStyle=shore?'rgba(72,180,195,'+edge*.40+')':'rgba(24,107,168,'+edge*.28+')';g.fillRect(p.x,p.y,step+1,step+1);
   if(r<.12){g.fillStyle='rgba(208,239,227,.45)';g.fillRect(p.x,p.y,6*s,1.5*s);}
  }
 }
 g.save();g.beginPath();land.forEach(function(p){g.rect(p.x,p.y,step+1,step+1);});g.clip();
 /* The winding trail and city promenade are physical tan dirt/stone paths. */
 function path(points){g.beginPath();var a=nycPoint(points[0][0],points[0][1]);g.moveTo(a.x,a.y);for(var i=1;i<points.length;i++){var p=nycPoint(points[i][0],points[i][1]),prev=nycPoint(points[i-1][0],points[i-1][1]);g.quadraticCurveTo(prev.x,prev.y,(prev.x+p.x)/2,(prev.y+p.y)/2);}var last=nycPoint(points[points.length-1][0],points[points.length-1][1]);g.lineTo(last.x,last.y);}
 g.lineCap='round';g.lineJoin='round';
 [NYC_TRAIL,[[-175,65],[-110,45],[-40,22],[30,6],[112,-15],[175,-32]]].forEach(function(points){path(points);g.strokeStyle='#9c8e62';g.lineWidth=8*s;g.stroke();path(points);g.strokeStyle='#e0c592';g.lineWidth=5*s;g.stroke();});
 g.restore();
 /* Cliffs and foam follow actual shore pixels, not the buildings' silhouette. */
 land.forEach(function(p){
  var east=terrainAt(p.x+step,p.y)==='water',south=terrainAt(p.x,p.y+step)==='water';if(!east&&!south)return;
  var x=p.x+(east?step:0),y=p.y+(south?step:0);
  var depth=(10+Math.max(0,Math.min(1,(p.y-n.anchor.y)/(240*s)))*6)*s;
  scenicMark(g,x,y,'#736078',7*s,depth);scenicMark(g,x,y,'#b18a8c',3*s,depth-2*s);scenicMark(g,x,y-2*s,'#ead29a',7*s,3*s);
  if(terrainAt(x+8*s,y+depth)==='water')scenicMark(g,x+8*s,y+depth,'#c0ece6',6*s,2*s);
 });
}
function nycGardens(g){
 var n=NYC_WORLD,s=n.scale,items=[];
 var groves=[[-145,-240,18],[-25,-200,15],[155,-160,16],[-205,-65,16],[-165,145,20],[-95,250,16],[165,95,8],[-25,-115,17],[-75,115,13],[-195,240,14]];
 groves.forEach(function(a,k){for(var i=0;i<a[2];i++){
  var angle=terHash(k,i,821)*6.283,dist=Math.sqrt(terHash(k,i,822))*57;
  var x=a[0]+Math.cos(angle)*dist,y=a[1]+Math.sin(angle)*dist,p=nycPoint(x,y);
  if(!nycOnScreen(p.x,p.y,65*s)||terrainAt(p.x,p.y)!=='land'||nycAvoid(p.x,p.y,8*s)||nycTrailDistance(x,y)<13)continue;
  var perspective=.9+Math.max(0,Math.min(1,(y+300)/600))*.2;
  var h=(30+terHash(k,i,823)*21)*s*perspective,cherry=terHash(k,i,824)<.3;
  items.push({x:p.x,y:p.y,h:h,name:cherry?'pack-cherry':i%3?'pack-pine':'pack-oak'});
  if(i%2===0)items.push({x:p.x+13*s,y:p.y+8*s,h:12*s,name:i%4?'pack-flowers':'pack-bush'});
 }});
 /* Small flower drifts beside the trail, not identical buildings everywhere. */
 for(var i=0;i<85;i++){
  var a=NYC_TRAIL[i%NYC_TRAIL.length],x=a[0]+(terHash(i,0,825)-.5)*55,y=a[1]+(terHash(i,1,825)-.5)*45,p=nycPoint(x,y);
  if(terrainAt(p.x,p.y)==='land'&&!nycAvoid(p.x,p.y,8*s)&&nycTrailDistance(x,y)>9)items.push({x:p.x,y:p.y,h:(8+terHash(i,2,825)*6)*s,name:i%5?'pack-flowers':'pack-bush'});
 }
 items.sort(function(a,b){return a.y-b.y;});items.forEach(function(it){drawArt(g,it.name,it.x,it.y,it.h,1);});
 /* A handful of warm lanterns along the promenade, not a glowing road. */
 [[-125,48],[-52,30],[22,8],[108,-12]].forEach(function(a){var p=nycPoint(a[0],a[1]);if(terrainAt(p.x,p.y)!=='land')return;
  scenicMark(g,p.x-1*s,p.y-14*s,'#705253',2*s,14*s);scenicMark(g,p.x-3*s,p.y-15*s,'#97664c',6*s,6*s);scenicMark(g,p.x-2*s,p.y-14*s,'#ffe2a1',4*s,4*s);scenicMark(g,p.x-3*s,p.y,'#705253',6*s,2*s);
 });
}
function nycIsland(g){
 var n=NYC_WORLD,s=n.scale,p=n.liberty;
 if(!nycOnScreen(p.x,p.y,100*s)||terrainAt(p.x,p.y)!=='water')return;
 /* Liberty's own compact island is a decorative landmark footprint. */
 for(var y=9;y>=0;y-=3){g.fillStyle=y>5?'#806b85':y>2?'#b8958a':'#efdbad';g.beginPath();g.ellipse(p.x,p.y+y*s,30*s,13*s,0,0,7);g.fill();}
 g.fillStyle='#91b561';g.beginPath();g.ellipse(p.x,p.y-2*s,24*s,9*s,0,0,7);g.fill();
 for(var i=0;i<7;i++){var a=i/7*6.283;drawArt(g,'pack-flowers',p.x+Math.cos(a)*23*s,p.y+Math.sin(a)*7*s,8*s,1);}
 drawArt(g,'pack-liberty',p.x,p.y-4*s,70*s,1);
 g.strokeStyle='#c4e6e7';g.lineWidth=1.5*s;g.beginPath();g.ellipse(p.x,p.y+5*s,38*s,19*s,0,.1,2.9);g.stroke();
}
function drawNYCScenery(g){
 var n=NYC_WORLD;if(!n.visible||!n.ready)return;
 var island=nycWaterSite(n.liberty,80*n.scale,n.scale);if(island)n.liberty=island;nycUpdateBoxes();
 /* Below the DMV scale, smoothly simplify supporting terrain, not the city.
    Avoid oversized garden trails spreading into neighboring regions afar. */
 g.save();g.globalAlpha=cloudEase(5.8,7.2,S.zoom);nycGround(g);nycGardens(g);g.restore();
 n.parts.slice().sort(function(a,b){return a.y-b.y;}).forEach(function(p){
  g.save();g.globalAlpha=.18;g.fillStyle='#4c4257';g.beginPath();g.ellipse(p.x,p.y,p.w*.45,6*n.scale,0,0,7);g.fill();g.restore();
  /* The prepared components already have clean alpha: draw their shared PNGs
     directly, avoiding a separate resized canvas for every pinch-zoom frame. */
  var sprite=artLoad(p.name);g.save();g.imageSmoothingEnabled=false;g.drawImage(sprite.img,Math.round(p.x-p.w/2),Math.round(p.y-p.h),p.w,p.h);g.restore();
 });
 var bridge=n.parts[3];g.save();g.globalAlpha=.35;
 [-.24,.30].forEach(function(offset){for(var i=0;i<7;i++){var x=bridge.x+bridge.w*offset+(i%2?1:-1)*n.scale,y=bridge.y+(i*7+8)*n.scale;if(terrainAt(x,y)==='water')scenicMark(g,x,y,i%2?'#f0ce9d':'#afcede',(4+i%3)*n.scale,2*n.scale);}});g.restore();
 nycIsland(g);
 n.boats=[];[[-30,185],[165,155],[190,-5]].forEach(function(a,i){var p=nycWaterSite(nycPoint(a[0],a[1]),55*n.scale,n.scale);if(p&&!nycAvoid(p.x,p.y,10*n.scale)){n.boats.push(p);drawArt(g,'pack-boat',p.x,p.y,(i?21:26)*n.scale,1);}});
}
function nycReserveLabels(){nycFootprints().forEach(function(b){labelBoxes.push({x:b.x-5,y:b.y-7,w:b.w+10,h:b.h+14});});}
function nycWorldLandmark(lm){
 var n=NYC_WORLD;if(!n.visible||!n.ready)return false;
 /* All pieces lead to the SAME existing city card; memories retain priority. */
 n.boxes.forEach(function(b){addHit({x:b.x-4,y:b.y-4,w:b.w+8,h:b.h+8},{kind:'landmark',id:lm[0]});});
 if(S.zoom>6.6){
  var x=n.anchor.x,y=n.anchor.y-132*n.scale;
  if(nycOnScreen(x,y,20)){ctx.save();ctx.font='600 15px "Pixelify Sans",monospace';var width=ctx.measureText('New York City').width,box={x:x-width/2-3,y:y-20,w:width+6,h:22};
   if(labelFree(box)){labelBoxes.push(box);ctx.textAlign='center';ctx.textBaseline='bottom';ctx.lineWidth=3;ctx.strokeStyle='#574452';ctx.strokeText('New York City',x,y);ctx.fillStyle='#fff2df';ctx.fillText('New York City',x,y);}ctx.restore();}
 }
 return true;
}

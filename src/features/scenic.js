/* Storybook scenery is anchored to geography, cached with the base map, and
   painted behind labels and interactive places. All ornament is decorative. */
window.OW_SCENIC = true;
var SCENIC_AVOID=[];
function scenicRand(a, b, seed) { return terHash(a, b, seed); }
function scenicLand(x, y) { return terrainAt(x, y) === 'land'; }
function scenicAvoid(x, y, radius) {
  if(repairClear(x,y))return true;
  var places = SCENIC_AVOID;
  for (var i = 0; i < places.length; i++) {
    var p = places[i], dx = x - p.x, dy = (y - p.y) * 1.2;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}
function scenicClearing(g, place, radius, kind) {
  var p = place.who?homeDisplayPos(place.who,S.zoom):proj(place.lat, place.lng);
  if (p.x < -radius || p.y < -radius || p.x > W+radius || p.y > H+radius) return;
  if(kind==='castle'||kind==='cottage'){
    var terraceDepth=kind==='castle'?27:12;
    for(var ledge=terraceDepth;ledge>=3;ledge-=3){
      g.fillStyle=ledge>12?'#716077':ledge>6?'#a08487':'#c4a88b';
      g.beginPath();g.ellipse(p.x,p.y+ledge,radius,radius*.30,0,0,7);g.fill();
    }
    for(var stone=0;stone<8;stone++){
      scenicMark(g,p.x-radius+stone*radius/4,p.y+9+(stone%2)*3,'#d0b7a1',3,9);
    }
    if(kind==='castle')for(var stair=0;stair<6;stair++){
      scenicMark(g,p.x+radius*.5-stair*3,p.y+10+stair*4,'#7c645a',18,5);
      scenicMark(g,p.x+radius*.5-stair*3,p.y+9+stair*4,'#f0d9a6',18,3);
    }
  }
  g.fillStyle = kind === 'castle' ? '#e8d5a3' : '#e6d599';
  g.beginPath(); g.ellipse(p.x, p.y-3, radius, radius*.30, 0, 0, 7); g.fill();
  g.strokeStyle = '#bba773'; g.lineWidth = 3;
  g.beginPath(); g.ellipse(p.x, p.y-3, radius, radius*.30, 0, .08, 3.07); g.stroke();
  for (var i=0;i<7;i++) {
    var a=(i/7)*6.283, x=p.x+Math.cos(a)*radius*.85, y=p.y+Math.sin(a)*radius*.25;
    scenicBloom(g,x,y,4,i%2===0);
  }
  if(kind==='cottage'){
    for(var post=0;post<5;post++){
      var xx=p.x-radius+post*8, yy=p.y+8;
      scenicMark(g,xx,yy,'#634a3e',3,11);
      scenicMark(g,xx,yy,'#e0bd84',2,8);
      scenicMark(g,xx,yy+5,'#af8055',8,2);
    }
  }
}
function scenicWaterfall(g, place) {
  if (!isRevealed(place.lat,place.lng,1.1)) return;
  var p=proj(place.lat,place.lng);
  if (p.x<-60||p.x>W+60||p.y<-60||p.y>H+60) return;
  drawArt(g,'pack-bridge',p.x,p.y+16,Math.max(34,Math.min(70,24+S.zoom*4)),1);
}
function scenicPier(g, place) {
  var p=proj(place.lat,place.lng);
  if (p.x<-80||p.x>W+80||p.y<-80||p.y>H+80) return;
  var shore=null;
  for(var i=24;i<78;i+=6) if(terrainAt(p.x+i,p.y+i*.36)==='water'){shore={x:p.x+i,y:p.y+i*.36};break;}
  if(!shore)return;
  drawArt(g,'story-pier',shore.x+20,shore.y+25,S.zoom>9.3?76:48,1);
}
function scenicMark(g, x, y, color, w, h) {
  g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), w, h);
}
function scenicTree(g, x, y, h, blossom) {
  var w = h * (blossom ? .95 : .66);
  scenicMark(g, x - 2, y - h * .28, '#60452f', 4, h * .28);
  g.fillStyle = '#384b3d'; g.beginPath(); g.ellipse(x + 2, y, w * .44, h * .075, 0, 0, 7); g.fill();
  var cols = blossom ? ['#703e5a','#bd5c87','#ec8bb3','#ffd0df'] : ['#274f4c','#30735b','#4c9363','#8cba71'];
  for (var i = 0; i < 4; i++) {
    var yy = y - h * (.20 + i * .17), ww = w * (1 - i * .19);
    scenicMark(g, x - ww / 2 - 2, yy - h * .12 + 3, cols[0], ww + 4, h * .17);
    scenicMark(g, x - ww / 2, yy - h * .13, cols[1], ww, h * .16);
    scenicMark(g, x - ww * .31, yy - h * .15, cols[2], ww * .48, h * .07);
    scenicMark(g, x + ww * .14, yy - h * .08, cols[3], ww * .13, h * .035);
  }
}
function scenicBloom(g, x, y, s, pink) {
  scenicMark(g, x, y, '#37765b', 2, s + 2);
  scenicMark(g, x - s / 2, y - 2, pink ? '#c85889' : '#f4cc78', s, 3);
  scenicMark(g, x - 2, y - s / 2, pink ? '#f4a9c8' : '#ffe5a1', 3, s);
  scenicMark(g, x, y, '#fff3d4', 2, 2);
}
function scenicCoast(g) {
  /* A stepped, two-tone lip follows the actual geographic coast pixels. */
  for (var y = 4; y < H - 4; y += 5) for (var x = 4; x < W - 4; x += 5) {
    if (!scenicLand(x, y)) continue;
    if (terrainAt(x + 7, y) !== 'water' && terrainAt(x, y + 7) !== 'water') continue;
    var depth=S.zoom>9?18:7;
    scenicMark(g, x+2, y+2, '#736477', 5, depth);
    scenicMark(g, x+2, y+2, '#a98272', 3, depth-2);
    scenicMark(g, x+2, y+depth, '#d4b398', 4, 2);
    scenicMark(g, x, y + 2, '#a36b4d', 5, 3);
    scenicMark(g, x, y, '#e6ad71', 5, 2);
    if (terrainAt(x + 10, y + 4) === 'water') scenicMark(g, x + 8, y + 4, '#d8f5e7', 4, 2);
  }
}
/* Geographic relief is sampled in world coordinates, so its ridges and
   meadows stay attached to the same ground through every camera movement. */
var SCENIC_PATTERNS={};
function scenicTexture(g,name){var a=artLoad(name);if(!a.ok)return null;if(!SCENIC_PATTERNS[name])SCENIC_PATTERNS[name]=g.createPattern(a.img,'repeat');return SCENIC_PATTERNS[name];}
var SCENIC_GROUND=null,SCENIC_TEXTURE_PIXELS={};
function scenicTexturePixels(name){
 if(SCENIC_TEXTURE_PIXELS[name])return SCENIC_TEXTURE_PIXELS[name];
 var a=artLoad(name);if(!a.ok)return null;
 var c=document.createElement('canvas');c.width=a.img.width;c.height=a.img.height;
 var g=c.getContext('2d');g.drawImage(a.img,0,0);
 return SCENIC_TEXTURE_PIXELS[name]={data:g.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height};
}
function scenicGround(g) {
 var z=S.zoom,step=8,cols=Math.ceil(W/step),rows=Math.ceil(H/step),lats=[],lngs=[];
 if(!SCENIC_GROUND){var cv=document.createElement('canvas');SCENIC_GROUND={cv:cv,g:cv.getContext('2d')};}
 var raster=SCENIC_GROUND;if(!raster.image||raster.cv.width!==cols||raster.cv.height!==rows){raster.cv.width=cols;raster.cv.height=rows;raster.image=raster.g.createImageData(cols,rows);}
 var pixels=raster.image.data;pixels.fill(0);
 for(var yy=0;yy<H;yy+=step)lats.push(unproj(0,yy).lat);
 for(var xx=0;xx<W;xx+=step)lngs.push(unproj(xx,0).lng);
 var grass=scenicTexturePixels('pack-grass-medium'),moss=scenicTexturePixels('pack-forest-floor');
 var left=lngToWX(S.center.lng,z)-W/2,top=latToWY(S.center.lat,z)-H/2,details=[];
 var detail=Math.max(0,Math.min(1,(z-5)/3));
 for(var y=0;y<H;y+=step)for(var x=0;x<W;x+=step){
  if(!scenicLand(x,y))continue;
  var lat=lats[y/step],lng=lngs[x/step],continental=terNoise(lng/3,lat/3);
  var n=terNoise(lng/.12,lat/.12)*detail+continental*(1-detail),broad=terNoise(lng/.65,lat/.65)*detail+continental*(1-detail);
  var shade=n*.4+broad*.6,dark=shade>.5,alpha=dark?Math.min(.26,(shade-.5)*.8):Math.min(.22,(.5-shade)*.7);
  var r=dark?31:243,gr=dark?85:220,b=dark?58:133,texture=broad>.5?moss:grass;
  if(texture){
   var tx=((Math.floor(left+x)%texture.w)+texture.w)%texture.w,ty=((Math.floor(top+y)%texture.h)+texture.h)%texture.h,k=(ty*texture.w+tx)*4;
   var ta=.14*texture.data[k+3]/255,a=ta+alpha*(1-ta);
   r=(texture.data[k]*ta+r*alpha*(1-ta))/a;gr=(texture.data[k+1]*ta+gr*alpha*(1-ta))/a;b=(texture.data[k+2]*ta+b*alpha*(1-ta))/a;alpha=a;
  }
  var i=((y/step)*cols+x/step)*4;pixels[i]=r;pixels[i+1]=gr;pixels[i+2]=b;pixels[i+3]=alpha*255;
  var band=(shade*12)%1;if(z>9.5&&band<.025&&broad>.58)details.push({x:x,y:y});
 }
 raster.g.putImageData(raster.image,0,0);
 g.save();g.imageSmoothingEnabled=false;g.drawImage(raster.cv,0,0,cols,rows,0,0,cols*step,rows*step);g.restore();
 details.forEach(function(p){g.fillStyle='#706c68';g.fillRect(p.x,p.y+2,step,5);g.fillStyle='#ac9470';g.fillRect(p.x,p.y,step,3);g.fillStyle='#d2ce8b';g.fillRect(p.x,p.y-2,step,2);});
}
function drawScenic() {
  SCENIC_AVOID=[HOMES.bruce,HOMES.elena].concat(HOMEBASE,LANDMARKS.map(function(l){return{lat:l[2],lng:l[3]};}),S.memories,S.plans||[]).map(function(p){return proj(p.lat,p.lng);});
  var g = scenicCtx, z = S.zoom;
  g.setTransform(.5, 0, 0, .5, 0, 0); g.clearRect(0, 0, W, H);
  if (!TER.on) return;
  scenicGround(g);
  scenicCoast(g);
  var tl = unproj(-60, -60), br = unproj(W + 60, H + 60);
  var local = Math.max(0, Math.min(1, (z - 8.9) / 1.15));
  /* Two persistent grids fade across the regional/local transition. */
  var regional=Math.max(0,Math.min(1,(z-6.8)/1.2));
  scenicVegetation(g,tl,br,1.68,Math.max(0,Math.min(1,(6-z)/1.5)),32,false);
  scenicVegetation(g,tl,br,.42,(1-regional)*Math.max(0,Math.min(1,(z-4.5)/1.3)),28,false);
  scenicVegetation(g,tl,br,.105,(1-local)*regional,24,false);
  scenicVegetation(g,tl,br,.012,local,22,true);
  if(z<9.3){
    [[35.6,-83.5],[37.1,-80.3],[38.5,-79.4],[40.0,-77.7],[41.8,-75.3],
      [36.5,-106.1],[39.3,-106.3],[42.8,-109.2],[46.7,-112.1],[51.2,-116.4]].forEach(function(a){
      var p=proj(a[0],a[1]);
      if(p.x>-70&&p.x<W+70&&p.y>-60&&p.y<H+70&&scenicLand(p.x,p.y))
        drawArt(g,'story-mountain',p.x,p.y,Math.round(Math.min(65,28+(z-3)*6)/4)*4,1);
    });
  }
  if (z > 9) {
    scenicClearing(g,HOMES.bruce,Math.min(56,homeArtH(z)*.52),'cottage');
    scenicClearing(g,HOMES.elena,Math.min(62,homeArtH(z)*.55),'castle');
    scenicPier(g,HOMES.bruce);
  }
  if (z > 8) {
    scenicWaterfall(g,{lat:41.1165,lng:-75.0121});
    scenicWaterfall(g,{lat:38.9976,lng:-77.2530});
  }
}
function scenicCellWeight(gx,gy,cell,z,spacing) {
  /* Screen-density budget depends only on zoom, never the visible item count.
     A persistent cell fades in rather than vanishing when the viewport moves
     or when a large screen crosses the old all-or-nothing 7,500-cell cutoff. */
  var pixels=cell*256*Math.pow(2,z)/360;
  var rate=Math.min(1,Math.pow(pixels/spacing,2));
  if(rate>=1)return 1;
  return Math.max(0,Math.min(1,(rate*1.18-scenicRand(gx,gy,76))/Math.max(.00001,rate*.18)));
}
function scenicVegetation(g,tl,br,cell,alpha,spacing,fine) {
  if(alpha<.01)return;
  g.save(); g.globalAlpha=alpha;
  var y0 = Math.floor(Math.min(tl.lat, br.lat) / cell), y1 = Math.ceil(Math.max(tl.lat, br.lat) / cell);
  var x0 = Math.floor(Math.min(tl.lng, br.lng) / cell), x1 = Math.ceil(Math.max(tl.lng, br.lng) / cell);
  var items = [], z=S.zoom, local=Math.max(0,Math.min(1,(z-8.9)/1.15));
  for (var gy = y0; gy <= y1; gy++) for (var gx = x0; gx <= x1; gx++) {
    var weight=scenicCellWeight(gx,gy,cell,z,spacing);
    if(weight<.005)continue;
    g.globalAlpha=alpha*weight;
    var lat = (gy + .25 + scenicRand(gx,gy,71)*.5)*cell;
    var lng = (gx + .25 + scenicRand(gx,gy,72)*.5)*cell;
    var p = proj(lat,lng), r = scenicRand(gx,gy,73);
    if (p.x < -45 || p.x > W+45 || p.y < -45 || p.y > H+45) continue;
    var land = scenicLand(p.x,p.y), meadow = grove(lat,lng);
    if (!land) {
      if (r < .23) { scenicMark(g,p.x,p.y,'#d7f3f2',8,2); scenicMark(g,p.x+4,p.y+4,'#8ad7ee',5,2); }
      if(fine&&r>.995&&terrainAt(p.x+16,p.y)==='water'&&terrainAt(p.x-16,p.y)==='water')
        drawArt(g,'pack-boat',p.x,p.y,30,1);
      continue;
    }
    if (scenicAvoid(p.x,p.y,Math.max(35,homeArtH(z)*.62))) continue;
    if (r < .33) {
      scenicMark(g,p.x-8,p.y-3,'#8ab967',13,3);
      scenicMark(g,p.x+3,p.y+2,'#bbd47b',8,2);
    }
    if (r > .68 && r < .9) {
      if(fine)drawArt(g,r>.82?'pack-bush':'pack-flowers',p.x,p.y,10+Math.round(local*5),1);
      else scenicBloom(g,p.x,p.y,4,r>.78);
    }
    var density = Math.max(fine?.18:.05, Math.min(fine?.85:.32, meadow*(fine?1.3:.34)));
    if (r < density) {
      var h = (fine ? 34 + 22*local : 17 + z*1.3) * (.8+scenicRand(gx,gy,74)*.4);
      items.push({x:p.x,y:p.y,h:h,blossom:scenicRand(gx,gy,75)<(fine?.24:.17),species:scenicRand(gx,gy,81),weight:weight});
    }
  }
  items.sort(function (a,b) { return a.y-b.y; });
  items.forEach(function (it) {
    g.globalAlpha=alpha*it.weight;
    if (S.zoom>2.5) {
      var kind=it.blossom?'pack-cherry':it.species<.04?'pack-crimson':it.species<.5?'pack-pine':it.species<.7?'pack-pine-tall':'pack-oak';
      drawArt(g,kind,it.x,it.y,Math.round(it.h/4)*4,1);
    } else scenicTree(g,it.x,it.y,it.h,it.blossom);
  });
  g.restore();
}
/* Country labels only. Clouds never attach to viewport corners. */
HOOKS.afterOverlays.push(function () {
  if(S.mode!=='map')return;
  if(S.zoom<5.3){
    [['CANADA',53,-105],['UNITED STATES',39,-98],['MEXICO',24,-103]].forEach(function(a){
      var p=proj(a[1],a[2]);
      if(p.x>40&&p.x<W-40&&p.y>50&&p.y<H-80)
        tryLabel(p.x,p.y,a[0],{size:16,force:1,fg:'#fff5dc',bg:'#536f48',border:'#d7c18b'});
    });
  }
});

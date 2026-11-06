/* Storybook scenery is anchored to geography, cached with the base map, and
   painted behind labels and interactive places. All ornament is decorative. */
window.OW_SCENIC = true;
function scenicRand(a, b, seed) { return terHash(a, b, seed); }
function scenicLand(x, y) { return terrainAt(x, y) === 'land'; }
function scenicAvoid(x, y, radius) {
  var places = [HOMES.bruce, HOMES.elena].concat(HOMEBASE).concat(
    LANDMARKS.map(function (l) { return { lat: l[2], lng: l[3] }; }), S.memories, S.plans || []);
  for (var i = 0; i < places.length; i++) {
    var p = proj(places[i].lat, places[i].lng), dx = x - p.x, dy = (y - p.y) * 1.2;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}
function scenicClearing(g, place, radius, kind) {
  var p = proj(place.lat, place.lng);
  if (p.x < -radius || p.y < -radius || p.x > W+radius || p.y > H+radius) return;
  if(kind==='castle'){
    for(var ledge=18;ledge>=3;ledge-=3){
      g.fillStyle=ledge>12?'#716077':ledge>6?'#a08487':'#c4a88b';
      g.beginPath();g.ellipse(p.x,p.y+ledge,radius,radius*.30,0,0,7);g.fill();
    }
    for(var stone=0;stone<8;stone++){
      scenicMark(g,p.x-radius+stone*radius/4,p.y+9+(stone%2)*3,'#d0b7a1',3,9);
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
  drawArt(g,'story-bridge',p.x,p.y+30,Math.max(42,Math.min(95,30+S.zoom*6)),1);
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
    var depth=S.zoom>9?12:5;
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
function scenicGround(g) {
  var z=S.zoom, step=6;
  for(var y=0;y<H;y+=step)for(var x=0;x<W;x+=step){
    if(!scenicLand(x,y))continue;
    var p=unproj(x,y), detail=Math.max(0,Math.min(1,(z-5)/3));
    var continental=terNoise(p.lng/3,p.lat/3);
    var n=terNoise(p.lng/.12,p.lat/.12)*detail+continental*(1-detail);
    var broad=terNoise(p.lng/.65,p.lat/.65)*detail+continental*(1-detail);
    var ridge=Math.sin(p.lng*13+p.lat*9+ broad*5)*.5+.5;
    var shade=(n*.4+broad*.6);
    g.fillStyle=shade>.58?'rgba(31,85,58,.28)':shade<.43?'rgba(243,220,133,.32)':'rgba(102,143,66,.10)';
    g.fillRect(x,y,step,step);
    /* Narrow contour bands form shaded terraces with a lit grass rim. */
    var band=(shade*12)%1;
    if(S.zoom>9.5&&band<.025&&broad>.58){
      g.fillStyle='#706c68';g.fillRect(x,y+2,step,5);
      g.fillStyle='#ac9470';g.fillRect(x,y,step,3);
      g.fillStyle='#d2ce8b';g.fillRect(x,y-2,step,2);
    }
    if(ridge>.88&&broad>.5){g.fillStyle='rgba(49,86,66,.13)';g.fillRect(x,y+step-2,step,2);}
  }
}
function drawScenic() {
  var g = scenicCtx, z = S.zoom;
  g.setTransform(.5, 0, 0, .5, 0, 0); g.clearRect(0, 0, W, H);
  if (!TER.on) return;
  scenicGround(g);
  scenicCoast(g);
  var tl = unproj(-60, -60), br = unproj(W + 60, H + 60);
  var local = Math.max(0, Math.min(1, (z - 8.9) / 1.15));
  /* Two persistent grids fade across the regional/local transition. */
  var regional=Math.max(0,Math.min(1,(z-6.8)/1.2));
  scenicVegetation(g,tl,br,1.68,Math.max(0,Math.min(1,(6-z)/1.5)),100,false);
  scenicVegetation(g,tl,br,.42,(1-regional)*Math.max(0,Math.min(1,(z-4.5)/1.3)),120,false);
  scenicVegetation(g,tl,br,.105,(1-local)*regional,145,false);
  scenicVegetation(g,tl,br,.012,local,500,true);
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
function scenicVegetation(g,tl,br,cell,alpha,cap,fine) {
  if(alpha<.01)return;
  g.save(); g.globalAlpha=alpha;
  var y0 = Math.floor(Math.min(tl.lat, br.lat) / cell), y1 = Math.ceil(Math.max(tl.lat, br.lat) / cell);
  var x0 = Math.floor(Math.min(tl.lng, br.lng) / cell), x1 = Math.ceil(Math.max(tl.lng, br.lng) / cell);
  if ((y1-y0+1)*(x1-x0+1) > 7500) {g.restore();return;}
  var items = [], z=S.zoom, local=Math.max(0,Math.min(1,(z-8.9)/1.15));
  for (var gy = y0; gy <= y1; gy++) for (var gx = x0; gx <= x1; gx++) {
    var lat = (gy + .25 + scenicRand(gx,gy,71)*.5)*cell;
    var lng = (gx + .25 + scenicRand(gx,gy,72)*.5)*cell;
    var p = proj(lat,lng), r = scenicRand(gx,gy,73);
    if (p.x < -45 || p.x > W+45 || p.y < -45 || p.y > H+45) continue;
    var land = scenicLand(p.x,p.y), meadow = grove(lat,lng);
    if (!land) {
      if (r < .23) { scenicMark(g,p.x,p.y,'#d7f3f2',8,2); scenicMark(g,p.x+4,p.y+4,'#8ad7ee',5,2); }
      if (r > .985) scenicBloom(g,p.x,p.y,5,false);
      if(fine&&r>.973&&terrainAt(p.x+16,p.y)==='water'&&terrainAt(p.x-16,p.y)==='water')
        drawArt(g,'boat',p.x,p.y,32,1);
      continue;
    }
    if (scenicAvoid(p.x,p.y,Math.max(35,homeArtH(z)*.62))) continue;
    if (r < .33) {
      scenicMark(g,p.x-8,p.y-3,'#8ab967',13,3);
      scenicMark(g,p.x+3,p.y+2,'#bbd47b',8,2);
    }
    if (r > .68 && r < .9) {
      for(var fl=0;fl<(fine?4:1);fl++)scenicBloom(g,p.x+fl*5-8,p.y+(fl%2)*4,4+local*2,r>.78);
    }
    var density = Math.max(fine?.18:.05, Math.min(fine?.85:.32, meadow*(fine?1.3:.34)));
    if (r < density) {
      var h = (fine ? 34 + 22*local : 17 + z*1.3) * (.8+scenicRand(gx,gy,74)*.4);
      items.push({x:p.x,y:p.y,h:h,blossom:scenicRand(gx,gy,75)<(local>.3?.24:.17),key:scenicRand(gx,gy,76)});
    }
  }
  if (items.length > cap) items = items.filter(function (it) { return it.key < cap / items.length; });
  items.sort(function (a,b) { return a.y-b.y; });
  items.forEach(function (it) {
    if (S.zoom>2.5) {
      var kind=it.blossom?'story-cherry':(it.key<.48?'story-pine':'story-oak');
      drawArt(g,kind,it.x,it.y,Math.round(it.h/4)*4,1);
    } else scenicTree(g,it.x,it.y,it.h,it.blossom);
  });
  g.restore();
}
/* Clouds sit in the foreground corners without covering the central places. */
HOOKS.afterOverlays.push(function () {
  if(S.mode!=='map')return;
  var h=Math.min(100,W*.22);
  ctx.save();ctx.globalAlpha=.94;
  drawArt(ctx,'story-cloud',12,H+h*.43,h,1);
  drawArt(ctx,'story-cloud',W+20,H+h*.53,h*1.08,1);
  ctx.restore();
  if(S.zoom<5.3){
    [['CANADA',53,-105],['UNITED STATES',39,-98],['MEXICO',24,-103]].forEach(function(a){
      var p=proj(a[1],a[2]);
      if(p.x>40&&p.x<W-40&&p.y>50&&p.y<H-80)
        tryLabel(p.x,p.y,a[0],{size:16,force:1,fg:'#fff5dc',bg:'#536f48',border:'#d7c18b'});
    });
  }
});

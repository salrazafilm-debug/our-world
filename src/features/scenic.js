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
  g.fillStyle = kind === 'castle' ? '#e8d5a3' : '#e6d599';
  g.beginPath(); g.ellipse(p.x, p.y-3, radius, radius*.30, 0, 0, 7); g.fill();
  g.strokeStyle = '#bba773'; g.lineWidth = 3;
  g.beginPath(); g.ellipse(p.x, p.y-3, radius, radius*.30, 0, .08, 3.07); g.stroke();
  for (var i=0;i<7;i++) {
    var a=(i/7)*6.283, x=p.x+Math.cos(a)*radius*.85, y=p.y+Math.sin(a)*radius*.25;
    scenicBloom(g,x,y,4,i%2===0);
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
    scenicMark(g, x, y + 2, '#a36b4d', 5, 3);
    scenicMark(g, x, y, '#e6ad71', 5, 2);
    if (terrainAt(x + 10, y + 4) === 'water') scenicMark(g, x + 8, y + 4, '#d8f5e7', 4, 2);
  }
}
function drawScenic() {
  var g = scenicCtx, z = S.zoom;
  g.setTransform(.5, 0, 0, .5, 0, 0); g.clearRect(0, 0, W, H);
  if (z < 6.1 || !TER.on) return;
  scenicCoast(g);
  var tl = unproj(-60, -60), br = unproj(W + 60, H + 60);
  var local = Math.max(0, Math.min(1, (z - 8.9) / 1.15));
  /* Two persistent grids fade across the regional/local transition. */
  scenicVegetation(g,tl,br,.105,1-local,145,false);
  scenicVegetation(g,tl,br,.026,local,420,true);
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
      continue;
    }
    if (scenicAvoid(p.x,p.y,Math.max(56,homeArtH(z)*1.05))) continue;
    if (r < .33) {
      scenicMark(g,p.x-8,p.y-3,'#8ab967',13,3);
      scenicMark(g,p.x+3,p.y+2,'#bbd47b',8,2);
    }
    if (r > .71 && r < .87) scenicBloom(g,p.x,p.y,4+local*2,r>.78);
    var density = Math.max(.05, Math.min(fine?.78:.32, meadow*(fine?.77:.34)));
    if (r < density) {
      var h = (fine ? 27 + 15*local : 17 + z*1.3) * (.8+scenicRand(gx,gy,74)*.4);
      items.push({x:p.x,y:p.y,h:h,blossom:scenicRand(gx,gy,75)<(local>.3?.24:.17),key:scenicRand(gx,gy,76)});
    }
  }
  if (items.length > cap) items = items.filter(function (it) { return it.key < cap / items.length; });
  items.sort(function (a,b) { return a.y-b.y; });
  items.forEach(function (it) {
    if (fine) {
      var kind=it.blossom?'story-cherry':(it.key<.48?'story-pine':'story-oak');
      drawArt(g,kind,it.x,it.y,Math.round(it.h/4)*4,1);
    } else scenicTree(g,it.x,it.y,it.h,it.blossom);
  });
  g.restore();
}

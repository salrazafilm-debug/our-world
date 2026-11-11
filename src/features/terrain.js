/* Living terrain: cherry trees, pines, oaks and blossom bushes grow over the
   ground we have cleared, and little sailboats sit on the water. Positions come
   from a fixed grid on the world (not the screen), so nothing moves when you
   pan or zoom - more simply appear as you zoom in. */

var TER = { px: null, w: 0, h: 0, on: true };
try { TER.on = localStorage.getItem('ow.terrain') !== 'off'; } catch (e) {}

/* look at the map underneath to know what is land and what is water */
HOOKS.afterBase.push(function () {
  try { TER.w = baseCv.width; TER.h = baseCv.height; TER.px = baseCtx.getImageData(0, 0, TER.w, TER.h).data; }
  catch (e) { TER.px = null; }
});
function terrainAt(x, y) {
  if (!TER.px) return null;
  var k = W / TER.w, ix = Math.floor(x / k), iy = Math.floor(y / k);
  if (ix < 0 || iy < 0 || ix >= TER.w || iy >= TER.h) return null;
  var i = (iy * TER.w + ix) * 4, r = TER.px[i], g = TER.px[i + 1], b = TER.px[i + 2];
  if (TER.px[i + 3] < 200) return null;
  if (b < g - 8) return 'land';
  if (b > g + 8 && b > 150) return 'water';
  return null;
}
function terHash(a, b, s) {
  var h = (a * 374761393 + b * 668265263 + s * 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0; h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
var TER_TYPES = ['tree-cherry', 'tree-pine', 'tree-oak', 'bush-pink'];

/* Groves and clearings: a slow, smooth noise over the world decides where the
   forests are thick and where the land opens up, like a real landscape. */
function terNoise(x, y) {
  var x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  var a = terHash(x0, y0, 21), b = terHash(x0 + 1, y0, 21), c = terHash(x0, y0 + 1, 21), d = terHash(x0 + 1, y0 + 1, 21);
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
}
function grove(lat, lng) {
  var n = terNoise(lat / 0.3, lng / 0.3) * 0.7 + terNoise(lat / 0.07, lng / 0.07) * 0.3;
  var t = Math.max(0, Math.min(1, (n - 0.4) / 0.28));
  var g = 0.02 + t * t * (3 - 2 * t) * 0.85;          /* open fields ~2%, deep forest ~87% */
  /* the home base itself stays open countryside, the woods gather around it */
  return g;
}

/* Cinematic depth: the middle of the screen is in focus; toward the top and
   bottom, trees go soft, fade a little and (at the top) get smaller, as if seen
   farther away - a tilt-shift look. */
function focusAt(y) {
  var d = Math.abs(y - H * 0.55) / (H * 0.55);
  return Math.max(0, Math.min(1, (d - 0.42) / 0.5));
}

HOOKS.terrain.push(function () {
  if (window.OW_SCENIC) return;
  if (S.mode !== 'map' || !TER.on || !TER.px) return;
  var z = S.zoom;
  if (z < 5.8) return;
  var tl = unproj(0, 0), br = unproj(W, H);
  var latHi = Math.max(tl.lat, br.lat), latLo = Math.min(tl.lat, br.lat), lngLo = Math.min(tl.lng, br.lng), lngHi = Math.max(tl.lng, br.lng);
  var items = [], i;
  /* Use current projected places below, never sprite boxes from the previous zoom. */
  var avoid = [];

  /* every place that matters gets an open clearing around it */
  var pois = [];
  ['bruce', 'elena'].forEach(function (k) { pois.push(proj(HOMES[k].lat, HOMES[k].lng)); });
  HOMEBASE.forEach(function (h) { pois.push(proj(h.lat, h.lng)); });
  if (typeof MAIL_POS !== 'undefined') { var mp = proj(MAIL_POS.lat, MAIL_POS.lng); pois.push(mp, { x: mp.x - 60, y: mp.y }, { x: mp.x + 60, y: mp.y }); }
  LANDMARKS.forEach(function (l) { pois.push(proj(l[2], l[3])); });
  S.memories.forEach(function (m) { pois.push(proj(m.lat, m.lng)); });
  (S.plans || []).forEach(function (m) { pois.push(proj(m.lat, m.lng)); });
  var clear = Math.max(34, homeArtH(z) * 0.95);

  /* Three permanent world grids. Zoom only fades finer grids in; it never
     replaces one grid with another, so forests do not pop or reshuffle. */
  var layers = [
    { cell: 0.048, density: 0.86, alpha: 1, seed: 100 },
    { cell: 0.024, density: 0.52, alpha: Math.max(0, Math.min(1, (z - 6.8) / 1.1)), seed: 200 },
    { cell: 0.012, density: 0.26, alpha: Math.max(0, Math.min(1, (z - 8.7) / 1.2)), seed: 300 }
  ];
  for (var lv = 0; lv < layers.length; lv++) {
    var layer = layers[lv];
    if (layer.alpha <= 0.01) continue;
    var cell = layer.cell;
    var gy0 = Math.floor(latLo / cell), gy1 = Math.ceil(latHi / cell), gx0 = Math.floor(lngLo / cell), gx1 = Math.ceil(lngHi / cell);
    if ((gy1 - gy0 + 1) * (gx1 - gx0 + 1) >= 9000) continue;
    for (var gy = gy0; gy <= gy1; gy++) for (var gx = gx0; gx <= gx1; gx++) {
      var cy = (gy + 0.5) * cell, cx = (gx + 0.5) * cell;
      if (terHash(gx, gy, layer.seed + 1) > grove(cy, cx) * layer.density) continue;
      var lat = (gy + 0.5 + (terHash(gx, gy, layer.seed + 2) - 0.5) * 0.9) * cell;
      var lng = (gx + 0.5 + (terHash(gx, gy, layer.seed + 3) - 0.5) * 0.9) * cell;
      var p = proj(lat, lng);
      if (p.x < -30 || p.y < -10 || p.x > W + 30 || p.y > H + 60) continue;
      if (terrainAt(p.x, p.y) !== 'land') continue;
      var near = false;
      for (i = 0; i < avoid.length; i++) { var hb = avoid[i]; if (hb && p.x > hb.x - 18 && p.x < hb.x + hb.w + 18 && p.y > hb.y - 6 && p.y < hb.y + hb.h + 34) near = true; }
      if (near || !labelFree({ x: p.x - 12, y: p.y - 26, w: 24, h: 28 })) continue;
      for (i = 0; i < pois.length; i++) { var dx = p.x - pois[i].x, dy = (p.y - pois[i].y) * 1.3; if (dx * dx + dy * dy < clear * clear) { near = true; break; } }
      if (near) continue;
      /* deep in a grove: more pines and oaks; at its edges: blossoms and bushes */
      var g = grove(lat, lng), t = terHash(gx, gy, layer.seed + 4), type;
      if (g > 0.45) type = t < 0.18 ? 0 : (t < 0.7 ? 1 : (t < 0.95 ? 2 : 3));
      else type = t < 0.42 ? 0 : (t < 0.6 ? 1 : (t < 0.78 ? 2 : 3));
      var vary = 0.8 + Math.pow(terHash(gx, gy, layer.seed + 5), 1.6) * 0.5;
      var kind = type === 3 ? 0.6 : (type === 1 ? 1.12 : 1);
      var depth = 0.86 + 0.14 * Math.max(0, Math.min(1, p.y / H));          /* a little smaller toward the top */
      var base = Math.max(18, Math.min(34, 18 + (z - 6.3) * 3)) * kind * vary * depth;
      items.push({ x: p.x, y: p.y, n: TER_TYPES[type], h: base, a: layer.alpha,
        ghost: !isRevealed(lat, lng, 0.94), f: focusAt(p.y), k: terHash(gx, gy, layer.seed + 9) });
    }
  }
  /* sailboats on open water, one every so often */
  var bc = 0.07;
  var by0 = Math.floor(latLo / bc), by1 = Math.ceil(latHi / bc), bx0 = Math.floor(lngLo / bc), bx1 = Math.ceil(lngHi / bc);
  if ((by1 - by0 + 1) * (bx1 - bx0 + 1) < 900) {
    for (var gy2 = by0; gy2 <= by1; gy2++) for (var gx2 = bx0; gx2 <= bx1; gx2++) {
      if (terHash(gx2, gy2, 11) > 0.16) continue;
      var blat = (gy2 + 0.5 + (terHash(gx2, gy2, 12) - 0.5) * 0.8) * bc, blng = (gx2 + 0.5 + (terHash(gx2, gy2, 13) - 0.5) * 0.8) * bc;
      var bp = proj(blat, blng);
      if (bp.x < -30 || bp.y < -10 || bp.x > W + 30 || bp.y > H + 50) continue;
      if (terrainAt(bp.x, bp.y) !== 'water') continue;
      items.push({ x: bp.x, y: bp.y, n: 'boat', h: Math.min(36, 13 + (z - 6.3) * 4), f: focusAt(bp.y), k: 0 });
    }
  }
  /* too many for one frame? thin them evenly over the whole view (not just the bottom rows) */
  var CAP = 520;
  if (items.length > CAP) { var keep = CAP / items.length; items = items.filter(function (it) { return it.k < keep; }); }
  items.sort(function (a, b) { return a.y - b.y; });
  for (i = 0; i < items.length; i++) {
    var it = items[i], soft = false;
    var alpha = it.a == null ? 1 : it.a;
    /* a soft shadow grounds each tree */
    ctx.save(); ctx.globalAlpha = alpha * 0.22; ctx.fillStyle = '#3D4A2E';
    ctx.beginPath(); ctx.ellipse(it.x, it.y, it.h * 0.28, it.h * 0.07, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = alpha;
    drawArt(ctx, it.n, it.x, it.y, it.h, DPR, soft);
    ctx.restore();
  }

});

/* a fine grain over land and water, like the texture pack */
var TER_GRAIN = null;
function terGrain() {
  if (TER_GRAIN) return TER_GRAIN;
  var c = document.createElement('canvas'); c.width = 8; c.height = 8; var g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(1, 1, 1, 1); g.fillRect(5, 4, 1, 1); g.fillRect(3, 6, 1, 1);
  g.fillStyle = 'rgba(40,70,50,.05)'; g.fillRect(6, 1, 1, 1); g.fillRect(2, 3, 1, 1); g.fillRect(7, 7, 1, 1);
  TER_GRAIN = baseCtx.createPattern(c, 'repeat');
  return TER_GRAIN;
}
HOOKS.afterBase.unshift(function () { baseCtx.fillStyle = terGrain(); baseCtx.fillRect(0, 0, baseCv.width, baseCv.height); });

/* A single world-anchored cloud field. Permanent seeded bands crossfade with
   zoom. Neither positions nor opacity depend on screen edges or animation time. */
var CLOUD_DEBUG=[];
function cloudEase(a,b,z){var t=Math.max(0,Math.min(1,(z-a)/(b-a)));return t*t*(3-2*t);}
/* overlapping cloud sizes: each size fades in before the one above it fades out,
   so there is never a gap in the sky while you zoom */
function cloudBands(z){return[
 {cell:5.12,alpha:1-cloudEase(3.6,6.2,z),seed:501},
 {cell:1.28,alpha:cloudEase(3.9,5.8,z)*(1-cloudEase(6.6,8.6,z)),seed:502},
 {cell:.32,alpha:cloudEase(6.2,8.2,z)*(1-cloudEase(9.2,11.2,z)),seed:503},
 {cell:.08,alpha:cloudEase(8.6,10.8,z),seed:504}
];}
function cloudImportantAreas(){
 var areas=REPAIR.boxes.slice();
 LANDMARKS.forEach(function(l){
  if(l[0]==='nyc'&&nycFootprints().length)return;
  if(!specialForCity(l[0])&&!l[8]&&!isRevealed(l[2],l[3],1.06))return;
  var p=l[0]==='dc'?repairPoint('dc'):proj(l[2],l[3]),h=LAKE_CITY_ART[l[0]]?90:homeArtH(S.zoom);
  areas.push({x:p.x-h*.75,y:p.y-h,w:h*1.5,h:h});
 });
 areas=areas.concat(nycFootprints(),MD_TOWNBOXES);
 S.memories.concat(S.plans||[]).forEach(function(m){var p=proj(m.lat,m.lng);areas.push({x:p.x-24,y:p.y-60,w:48,h:76});});
 if(S.me){var p=proj(S.me.lat,S.me.lng);areas.push({x:p.x-25,y:p.y-35,w:50,h:60});}
 return areas;
}
/* Reduce WHOLE cloud banks near important places. Never punch landmark-shaped
   holes into cloud artwork or replace the visible map with a fog backdrop. */
function cloudRoom(c,areas){
 var room=1;
 areas.forEach(function(a){
  var dx=(c.x-a.x-a.w/2)/(c.w*.45+a.w*.7+20),dy=(c.y-a.y-a.h/2)/(c.h*.45+a.h*.7+20);
  room=Math.min(room,cloudEase(.8,1.6,Math.sqrt(dx*dx+dy*dy)));
 });
 return room;
}
function drawSkyClouds(z,target){
 var sky=target||ctx,list=[],areas=cloudImportantAreas(),ready=cartoonCloudReady();
 cloudBands(z).forEach(function(band){
  if(band.alpha<.001)return;
  /* Broad, irregular banks, not a small cloud stamped into every grid square.
     The hidden lattice only bounds work; full-cell jitter, independent sizes
     and sparse companions break its rows. Two depth passes keep larger,
     quieter banks behind the occasional smaller foreground silhouette. */
  var cell=band.cell,cellPx=cell*256*Math.pow(2,z)/360;
  [0,1].forEach(function(depth){
   var sx=cell*(depth?5.2:3.7),sy=cell*(depth?4.2:2.5),seed=band.seed+depth*31;
   var margin=Math.max(700,cellPx*24),tl=unproj(-margin,-margin),br=unproj(W+margin,H+margin);
   var y0=Math.floor(Math.min(tl.lat,br.lat)/sy)-1,y1=Math.ceil(Math.max(tl.lat,br.lat)/sy)+1;
   var x0=Math.floor(Math.min(tl.lng,br.lng)/sx)-1,x1=Math.ceil(Math.max(tl.lng,br.lng)/sx)+1;
   for(var gy=y0;gy<=y1;gy++)for(var gx=x0;gx<=x1;gx++){
    if(depth&&terHash(gx,gy,seed+8)<.68)continue;
    var name=ready?CARTOON_CLOUDS[Math.min(5,Math.floor(terHash(gx,gy,seed+15)*6))]:'story-cloud',sprite=artLoad(name),aspect=sprite.ok?sprite.img.width/sprite.img.height:3;
    var lat=(gy+.5+(terHash(gx,gy,seed+1)-.5)*1.6)*sy;
    var lng=(gx+.5+(terHash(gx,gy,seed+2)-.5)*1.6)*sx;
    var p=proj(lat,lng),h=cellPx*(depth?1.2+terHash(gx,gy,seed+3)*1.1:.9+terHash(gx,gy,seed+3)*1.4);
    var w=h*aspect;
    if(p.x-w/2>W||p.x+w/2<0||p.y-h/2>H||p.y+h/2<0)continue;
    var cloud={id:band.seed+':'+depth+':'+gx+':'+gy,lat:lat,lng:lng,x:p.x,y:p.y,w:w,h:h,alpha:band.alpha*.94,depth:depth,name:name,aspect:aspect,flip:terHash(gx,gy,seed+6)>.5};
    cloud.room=cloudRoom(cloud,areas);
    /* Seeded thinning keeps most remaining banks substantial, rather than
       turning every nearby bank into transparent haze. Blend the boundary so
       zooming changes density gently instead of popping clouds on/off. */
    var threshold=.25+terHash(gx,gy,seed+10)*.5;
    cloud.alpha*=cloudEase(threshold-.15,threshold+.15,cloud.room*(isRevealed(lat,lng,.95)?.8:1));
    list.push(cloud);
   }
  });
 });
 list.sort(function(a,b){return a.depth-b.depth||a.y-b.y;});CLOUD_DEBUG=list;
 list.forEach(function(c){if(c.alpha<.001)return;sky.save();sky.globalAlpha=c.alpha;sky.translate(c.x,c.y);sky.scale((c.flip?-1:1)*c.w/(c.h*c.aspect),1);drawArt(sky,c.name,0,c.h/2,c.h,1);sky.restore();});
}



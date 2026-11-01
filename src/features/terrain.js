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
  var g = 0.02 + t * t * (3 - 2 * t) * 0.85;          /* open fields � 2%, deep forest � 87% */
  /* the home base itself stays open countryside, the woods gather around it */
  var dh = haversine(lat, lng, 38.86, -76.68);
  if (dh < 45 && S.zoom < 9.2) g *= 0.25 + 0.75 * Math.max(0, (dh - 18) / 27);
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
  if (S.mode !== 'map' || !TER.on || !TER.px) return;
  var z = S.zoom;
  if (z < 6.3) return;
  var tl = unproj(0, 0), br = unproj(W, H);
  var latHi = Math.max(tl.lat, br.lat), latLo = Math.min(tl.lat, br.lat), lngLo = Math.min(tl.lng, br.lng), lngHi = Math.max(tl.lng, br.lng);
  var items = [], i;
  /* Use current projected places below, never sprite boxes from the previous zoom. */
  var avoid = [];

  /* every place that matters gets an open clearing around it */
  var pois = [];
  ['bruce', 'elena'].forEach(function (k) { pois.push(proj(HOMES[k].lat, HOMES[k].lng)); });
  HOMEBASE.forEach(function (h) { pois.push(proj(h.lat, h.lng)); });
  LANDMARKS.forEach(function (l) { pois.push(proj(l[2], l[3])); });
  S.memories.forEach(function (m) { pois.push(proj(m.lat, m.lng)); });
  (S.plans || []).forEach(function (m) { pois.push(proj(m.lat, m.lng)); });
  var clear = Math.max(34, homeArtH(z) * 0.95);

  /* Three permanent world grids. Zoom only fades finer grids in; it never
     replaces one grid with another, so forests do not pop or reshuffle. */
  var layers = [
    { cell: 0.048, density: 0.68, alpha: 1, seed: 100 },
    { cell: 0.024, density: 0.38, alpha: Math.max(0, Math.min(1, (z - 7.2) / 1.1)), seed: 200 },
    { cell: 0.012, density: 0.20, alpha: Math.max(0, Math.min(1, (z - 9.0) / 1.2)), seed: 300 }
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

/* Soft clouds over the ground we have not explored yet. They sit on the world
   (drifting very slowly), gather thickest at the edges of the screen and thin
   out toward the middle, so the view is framed like the reference art. */
function drawSkyClouds(z, target) {
  var sky = target || ctx;
  var list = [];
  var cloudLayers = [
    { cell: 0.32, a: 1, seed: 500 },
    { cell: 0.08, a: Math.max(0, Math.min(1, (z - 9.1) / 1.2)), seed: 600 }
  ];
  for (var li = 0; li < cloudLayers.length; li++) {
    var cl = cloudLayers[li];
    if (cl.a <= 0.01) continue;
    var cell = cl.cell, px = cell * 111 / kmPerPx(S.center.lat, z);
    var tl = unproj(-px, -px), br = unproj(W + px, H + px);
    var gy0 = Math.floor(Math.min(tl.lat, br.lat) / cell), gy1 = Math.ceil(Math.max(tl.lat, br.lat) / cell);
    var gx0 = Math.floor(Math.min(tl.lng, br.lng) / cell) - 1, gx1 = Math.ceil(Math.max(tl.lng, br.lng) / cell);
    if ((gy1 - gy0 + 1) * (gx1 - gx0 + 1) > 700) continue;
    var drift = reduceMotion ? 0 : cloudPhase * 0.00002;
    for (var gy = gy0; gy <= gy1; gy++) for (var gx = gx0; gx <= gx1; gx++) {
    var h0 = terHash(gx, gy, cl.seed + 31);
    if (h0 > 0.42) continue;
    var lat = (gy + 0.5 + (terHash(gx, gy, cl.seed + 32) - 0.5) * 0.7) * cell;
    var lng0 = (gx + 0.5 + (terHash(gx, gy, cl.seed + 33) - 0.5) * 0.7) * cell;
    var half = cell * 0.55;          /* never let a cloud spill over ground we have been to */
    if (isRevealed(lat, lng0, 1.25) || isRevealed(lat, lng0 - half, 1.25) || isRevealed(lat, lng0 + half, 1.25) ||
        isRevealed(lat + half * 0.5, lng0, 1.25) || isRevealed(lat - half * 0.5, lng0, 1.25)) continue;
    var lng = lng0 + drift * (0.6 + terHash(gx, gy, cl.seed + 34) * 0.6);
    var p = proj(lat, lng);
    var edge = Math.min(p.x, W - p.x, p.y - 40, H - p.y) / (Math.min(W, H) * 0.42);
    edge = Math.max(0, Math.min(1, edge));
    if (edge > 0.52) continue;
    var w = Math.max(130, Math.min(280, px * (0.85 + terHash(gx, gy, cl.seed + 35) * 0.35)));
    list.push({ x: p.x, y: p.y, h: w * 0.43, n: h0 < 0.22 ? 'cloud1' : 'cloud2', a: cl.a * (0.98 - 0.42 * edge) });
    }
  }
  list.sort(function (a, b) { return a.y - b.y; });
  list.forEach(function (c) {
    sky.save(); sky.globalAlpha = c.a;
    drawArt(sky, c.n, c.x, c.y + c.h * 0.5, c.h, 1, false);
    sky.restore();
  });
}



/* Living terrain: cherry trees, pines, oaks and blossom bushes grow over the
   ground we have cleared, and little sailboats sit on the water. Positions come
   from a fixed grid on the world (not the screen), so nothing moves when you
   pan or zoom — more simply appear as you zoom in. */

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
  var g = 0.02 + t * t * (3 - 2 * t) * 0.85;          /* open fields ≈ 2%, deep forest ≈ 87% */
  /* the home base itself stays open countryside, the woods gather around it */
  var dh = haversine(lat, lng, 38.86, -76.68);
  if (dh < 45 && S.zoom < 9.2) g *= 0.25 + 0.75 * Math.max(0, (dh - 18) / 27);
  return g;
}

/* Cinematic depth: the middle of the screen is in focus; toward the top and
   bottom, trees go soft, fade a little and (at the top) get smaller, as if seen
   farther away — a tilt-shift look. */
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
  var avoid = [HOMEBOXES.bruce, HOMEBOXES.elena].concat(Object.keys(HBBOX).map(function (k) { return HBBOX[k]; }));

  /* every place that matters gets an open clearing around it */
  var pois = [];
  ['bruce', 'elena'].forEach(function (k) { pois.push(proj(HOMES[k].lat, HOMES[k].lng)); });
  HOMEBASE.forEach(function (h) { pois.push(proj(h.lat, h.lng)); });
  LANDMARKS.forEach(function (l) { pois.push(proj(l[2], l[3])); });
  S.memories.forEach(function (m) { pois.push(proj(m.lat, m.lng)); });
  (S.plans || []).forEach(function (m) { pois.push(proj(m.lat, m.lng)); });
  var clear = Math.max(34, homeArtH(z) * 0.95);

  /* trees and bushes on land: groves and clearings, mixed heights */
  var cell = 0.009 * Math.pow(2, Math.max(0, Math.floor((11.6 - z) / 1.0)));
  var gy0 = Math.floor(latLo / cell), gy1 = Math.ceil(latHi / cell), gx0 = Math.floor(lngLo / cell), gx1 = Math.ceil(lngHi / cell);
  /* lighter close in so homes and pins breathe; lusher far out so the home base reads as countryside */
  var thin = z > 9.5 ? 0.5 : (z < 8.6 ? 0.9 : 0.6), floor = 0;
  if ((gy1 - gy0 + 1) * (gx1 - gx0 + 1) < 2600) {
    for (var gy = gy0; gy <= gy1; gy++) for (var gx = gx0; gx <= gx1; gx++) {
      var cy = (gy + 0.5) * cell, cx = (gx + 0.5) * cell;
      if (terHash(gx, gy, 1) > grove(cy, cx) * thin + floor) continue;
      var lat = (gy + 0.5 + (terHash(gx, gy, 2) - 0.5) * 0.9) * cell, lng = (gx + 0.5 + (terHash(gx, gy, 3) - 0.5) * 0.9) * cell;
      var p = proj(lat, lng);
      if (p.x < -30 || p.y < -10 || p.x > W + 30 || p.y > H + 60) continue;
      if (terrainAt(p.x, p.y) !== 'land') continue;
      var near = false;
      for (i = 0; i < avoid.length; i++) { var hb = avoid[i]; if (hb && p.x > hb.x - 18 && p.x < hb.x + hb.w + 18 && p.y > hb.y - 6 && p.y < hb.y + hb.h + 34) near = true; }
      if (near || !labelFree({ x: p.x - 12, y: p.y - 26, w: 24, h: 28 })) continue;
      for (i = 0; i < pois.length; i++) { var dx = p.x - pois[i].x, dy = (p.y - pois[i].y) * 1.3; if (dx * dx + dy * dy < clear * clear) { near = true; break; } }
      if (near) continue;
      /* deep in a grove: more pines and oaks; at its edges: blossoms and bushes */
      var g = grove(lat, lng), t = terHash(gx, gy, 4), type;
      if (g > 0.45) type = t < 0.18 ? 0 : (t < 0.7 ? 1 : (t < 0.95 ? 2 : 3));
      else type = t < 0.42 ? 0 : (t < 0.6 ? 1 : (t < 0.78 ? 2 : 3));
      var vary = 0.8 + Math.pow(terHash(gx, gy, 5), 1.6) * 0.5;            /* most average, a few taller */
      var kind = type === 3 ? 0.6 : (type === 1 ? 1.12 : 1);
      var depth = 0.86 + 0.14 * Math.max(0, Math.min(1, p.y / H));          /* a little smaller toward the top */
      var base = Math.max(12, Math.min(24, 12 + (z - 6.3) * 2.6)) * kind * vary * depth;   /* always well under a home's height */
      items.push({ x: p.x, y: p.y, n: TER_TYPES[type], h: base, ghost: !isRevealed(lat, lng, 0.94), f: focusAt(p.y), k: terHash(gx, gy, 9) });
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
  var CAP = 420;
  if (items.length > CAP) { var keep = CAP / items.length; items = items.filter(function (it) { return it.k < keep; }); }
  items.sort(function (a, b) { return a.y - b.y; });
  for (i = 0; i < items.length; i++) {
    var it = items[i], soft = it.f > 0.35 || it.ghost;
    var alpha = (it.ghost ? 0.72 : 1) * (1 - it.f * 0.4);
    /* a soft shadow grounds each tree */
    ctx.save(); ctx.globalAlpha = alpha * 0.22; ctx.fillStyle = '#3D4A2E';
    ctx.beginPath(); ctx.ellipse(it.x, it.y, it.h * 0.28, it.h * 0.07, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = alpha;
    drawArt(ctx, it.n, it.x, it.y, it.h, DPR, soft);
    ctx.restore();
  }

  drawSkyClouds(z);

  /* pink haze at the top and bottom of the view, like distance in a film shot */
  var hz = ctx.createLinearGradient(0, 0, 0, H);
  hz.addColorStop(0, 'rgba(250,226,238,.62)'); hz.addColorStop(0.2, 'rgba(250,226,238,0)');
  hz.addColorStop(0.8, 'rgba(250,226,238,0)'); hz.addColorStop(1, 'rgba(250,226,238,.5)');
  ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H);
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
var SKY_LADDER = [0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28, 2.56];
function drawSkyClouds(z) {
  var want = 120 * kmPerPx(S.center.lat, z) / 111, cell = SKY_LADDER[SKY_LADDER.length - 1];
  for (var li = 0; li < SKY_LADDER.length; li++) if (SKY_LADDER[li] >= want) { cell = SKY_LADDER[li]; break; }
  var px = cell * 111 / kmPerPx(S.center.lat, z);                 /* the cell's size on screen */
  var tl = unproj(-px, -px), br = unproj(W + px, H + px);
  var gy0 = Math.floor(Math.min(tl.lat, br.lat) / cell), gy1 = Math.ceil(Math.max(tl.lat, br.lat) / cell);
  var gx0 = Math.floor(Math.min(tl.lng, br.lng) / cell) - 1, gx1 = Math.ceil(Math.max(tl.lng, br.lng) / cell);
  if ((gy1 - gy0 + 1) * (gx1 - gx0 + 1) > 400) return;
  var drift = reduceMotion ? 0 : cloudPhase * 0.00035 * cell / 0.16;
  var list = [];
  for (var gy = gy0; gy <= gy1; gy++) for (var gx = gx0; gx <= gx1; gx++) {
    var h0 = terHash(gx, gy, 31);
    if (h0 > 0.38) continue;
    var lat = (gy + 0.5 + (terHash(gx, gy, 32) - 0.5) * 0.8) * cell, lng0 = (gx + 0.5 + (terHash(gx, gy, 33) - 0.5) * 0.8) * cell;
    var half = cell * 0.55;          /* never let a cloud spill over ground we have been to */
    if (isRevealed(lat, lng0, 1.25) || isRevealed(lat, lng0 - half, 1.25) || isRevealed(lat, lng0 + half, 1.25) ||
        isRevealed(lat + half * 0.5, lng0, 1.25) || isRevealed(lat - half * 0.5, lng0, 1.25)) continue;
    var lng = lng0 + drift * (0.6 + terHash(gx, gy, 34) * 0.6);
    var p = proj(lat, lng);
    var edge = Math.min(p.x, W - p.x, p.y - 40, H - p.y) / (Math.min(W, H) * 0.42);
    edge = Math.max(0, Math.min(1, edge));
    if (edge > 0.7) continue;        /* keep the middle of the view clear, like a framed shot */
    var w = Math.max(110, Math.min(230, px * (0.75 + terHash(gx, gy, 35) * 0.5)));   /* clouds, not slabs */
    list.push({ x: p.x, y: p.y, h: w * 0.4, n: h0 < 0.3 ? 'cloud1' : 'cloud2', a: 0.8 - 0.65 * edge });
  }
  list.sort(function (a, b) { return a.y - b.y; });
  list.forEach(function (c) {
    ctx.save(); ctx.globalAlpha = c.a;
    drawArt(ctx, c.n, c.x, c.y + c.h * 0.5, c.h, DPR, true);
    ctx.restore();
  });
}

/* Bunnies: rare, scattered, sitting quietly in open meadows we have explored.
   Fixed to the world like the trees, so they never move about. */
SP.bunny = [
  '.ww.ww..',
  '.wp.wp..',
  '.ww.ww..',
  '.wwwww..',
  'wwkwwwo.',
  'wwwwwww.',
  '.wwwwwwW',
  '.wwwwww.',
  '..ss.ss.'
];
PAL.bunny = { w: '#FFF8F6', p: '#F3A9C7', k: '#3D2838', o: '#F7C6D6', W: '#FFFFFF', s: '#E6D6D2' };
HOOKS.beforePins.push(function () {
  if (S.mode !== 'map' || !TER.on || !TER.px || S.zoom < 9.2) return;
  var z = S.zoom, cell = 0.03;
  var tl = unproj(0, 0), br = unproj(W, H);
  var gy0 = Math.floor(Math.min(tl.lat, br.lat) / cell), gy1 = Math.ceil(Math.max(tl.lat, br.lat) / cell);
  var gx0 = Math.floor(Math.min(tl.lng, br.lng) / cell), gx1 = Math.ceil(Math.max(tl.lng, br.lng) / cell);
  if ((gy1 - gy0 + 1) * (gx1 - gx0 + 1) > 1500) return;
  var sc = z > 11 ? 3 : 2;
  for (var gy = gy0; gy <= gy1; gy++) for (var gx = gx0; gx <= gx1; gx++) {
    if (terHash(gx, gy, 41) > 0.09) continue;                     /* rare */
    var lat = (gy + 0.5 + (terHash(gx, gy, 42) - 0.5) * 0.8) * cell, lng = (gx + 0.5 + (terHash(gx, gy, 43) - 0.5) * 0.8) * cell;
    if (!isRevealed(lat, lng, 0.9) || grove(lat, lng) > 0.35) continue;   /* meadows, not deep woods */
    var p = proj(lat, lng);
    if (p.x < 10 || p.y < 10 || p.x > W - 10 || p.y > H - 10 || terrainAt(p.x, p.y) !== 'land') continue;
    if (!labelFree({ x: p.x - 10, y: p.y - 22, w: 20, h: 24 })) continue;
    var flip = terHash(gx, gy, 44) < 0.5;
    ctx.save();
    if (flip) { ctx.translate(Math.round(p.x) * 2, 0); ctx.scale(-1, 1); }
    drawSprite(ctx, SP.bunny, PAL.bunny, p.x, p.y, sc, null);
    ctx.restore();
  }
});

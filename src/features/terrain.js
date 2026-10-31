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
  var n = terNoise(lat / 0.22, lng / 0.22) * 0.65 + terNoise(lat / 0.06, lng / 0.06) * 0.35;
  var t = Math.max(0, Math.min(1, (n - 0.36) / 0.34));
  return 0.04 + t * t * (3 - 2 * t) * 0.62;          /* clearings ≈ 4%, deep forest ≈ 66% */
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
  var thin = z > 9.5 ? 0.36 : (z < 8.6 ? 0.95 : 0.6), floor = z < 8.6 ? 0.04 : 0;
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
      var base = Math.max(9, Math.min(24, 9 + (z - 6.3) * 3)) * kind * vary * depth;   /* always well under a home's height */
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

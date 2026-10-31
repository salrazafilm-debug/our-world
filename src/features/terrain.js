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

HOOKS.terrain.push(function () {
  if (S.mode !== 'map' || !TER.on || !TER.px) return;
  var z = S.zoom;
  if (z < 6.3) return;
  var tl = unproj(0, 0), br = unproj(W, H);
  var latHi = Math.max(tl.lat, br.lat), latLo = Math.min(tl.lat, br.lat), lngLo = Math.min(tl.lng, br.lng), lngHi = Math.max(tl.lng, br.lng);
  var items = [], i;
  var homeBoxes = [HOMEBOXES.bruce, HOMEBOXES.elena];

  /* trees and bushes on every bit of land: full colour where we have been, faded where we have not */
  var avoid = [HOMEBOXES.bruce, HOMEBOXES.elena].concat(Object.keys(HBBOX).map(function (k) { return HBBOX[k]; }));
  if (z >= 6.3) {
    var dens = z > 9.5 ? 0.2 : 0.34;           /* lighter close in so the castle and pins breathe */
    var cell = 0.009 * Math.pow(2, Math.max(0, Math.floor((11.6 - z) / 1.0)));
    var gy0 = Math.floor(latLo / cell), gy1 = Math.ceil(latHi / cell), gx0 = Math.floor(lngLo / cell), gx1 = Math.ceil(lngHi / cell);
    if ((gy1 - gy0 + 1) * (gx1 - gx0 + 1) < 2600) {
      for (var gy = gy0; gy <= gy1; gy++) for (var gx = gx0; gx <= gx1; gx++) {
        if (terHash(gx, gy, 1) > dens) continue;
        var lat = (gy + 0.5 + (terHash(gx, gy, 2) - 0.5) * 0.85) * cell, lng = (gx + 0.5 + (terHash(gx, gy, 3) - 0.5) * 0.85) * cell;
        var p = proj(lat, lng);
        if (p.x < -30 || p.y < -10 || p.x > W + 30 || p.y > H + 60) continue;
        if (terrainAt(p.x, p.y) !== 'land') continue;
        var near = false;
        for (i = 0; i < avoid.length; i++) { var hb = avoid[i]; if (hb && p.x > hb.x - 18 && p.x < hb.x + hb.w + 18 && p.y > hb.y - 6 && p.y < hb.y + hb.h + 34) near = true; }
        if (near) continue;
        if (!labelFree({ x: p.x - 12, y: p.y - 26, w: 24, h: 28 })) continue;      /* never grow over a name */
        var t = terHash(gx, gy, 4), type = t < 0.22 ? 0 : (t < 0.68 ? 1 : (t < 0.92 ? 2 : 3));
        var base = Math.max(10, Math.min(30, 10 + (z - 6.3) * 4)) * (type === 3 ? 0.62 : (type === 1 ? 1.05 : 1)) * (0.88 + terHash(gx, gy, 5) * 0.24);
        items.push({ x: p.x, y: p.y, n: TER_TYPES[type], h: base, ghost: !isRevealed(lat, lng, 0.94) });
      }
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
      items.push({ x: bp.x, y: bp.y, n: 'boat', h: Math.min(36, 13 + (z - 6.3) * 4) });
    }
  }
  items.sort(function (a, b) { return a.y - b.y; });
  for (i = 0; i < items.length && i < 320; i++) {
    if (items[i].ghost) { ctx.save(); ctx.globalAlpha = 0.5; }
    drawArt(ctx, items[i].n, items[i].x, items[i].y, items[i].h, DPR);
    if (items[i].ghost) ctx.restore();
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

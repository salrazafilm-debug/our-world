/* Real streets from OpenStreetMap (c) OpenStreetMap contributors, ODbL.
   data/roads/index.json lists the areas we have; an area's file is fetched only when you look at it.
   Roads are drawn into the cached scenery layer (below trees and every place), as grey streets with a darker
   kerb. tools/simplify-roads.js keeps the set small so they stay clear. Bigger roads show first, small streets fade in as you zoom closer. Trees and flowers keep off them.
   Made by tools/osm-roads.js. Style rules: STYLE.md. */
var OSMR = { index: null, indexLoading: false, areas: {}, loading: {}, segs: [], grid: new Map(), ready: false, failed: false };
var OSM_CELL = 0.0025;
var OSM_HOUSES = [];                                    /* where the tiny neighbourhood houses were drawn (screen px) */                                   /* grid cell in degrees (about 280 m) for the "is a road near here" lookup */
/* class: 0 highway, 1 main road, 2 secondary, 3 street, 4 small street */
var OSM_STYLE = [                                       /* street greys: soft asphalt with a darker kerb, lighter for smaller streets;
                                                           side streets wait until you are close, so a zoomed-out city stays calm */
  { z0: 7.0, z1: 8.6, w: 7.6, edge: '#6f7882', fill: '#9aa3ab' },
  { z0: 9.6, z1: 10.6, w: 6.4, edge: '#848a92', fill: '#b3b8bd' },
  { z0: 10.6, z1: 11.6, w: 5.6, edge: '#8f959c', fill: '#bcc0c4' },
  { z0: 12.0, z1: 12.8, w: 4.6, edge: '#9ea3a9', fill: '#c6c9cc' },
  { z0: 12.8, z1: 13.5, w: 3.6, edge: '#a9adb2', fill: '#cfd1d3' }
];
function osmWidthScale(z) { return Math.max(0.6, Math.min(3.2, 1 + (z - 12) * 0.3)); }

function osmFetchJson(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
function osmDecode(id, d) {
  var roads = [], q = d.q || 1e5, segs = OSMR.segs;
  d.roads.forEach(function (r) {
    var f = r[3], pts = new Float64Array(f.length), la = 0, lg = 0, i;
    for (i = 0; i < f.length; i += 2) { la = i ? la + f[i] : f[i]; lg = i ? lg + f[i + 1] : f[i + 1]; pts[i] = la / q; pts[i + 1] = lg / q; }
    var bb = [90, 180, -90, -180];
    for (i = 0; i < pts.length; i += 2) { bb[0] = Math.min(bb[0], pts[i]); bb[1] = Math.min(bb[1], pts[i + 1]); bb[2] = Math.max(bb[2], pts[i]); bb[3] = Math.max(bb[3], pts[i + 1]); }
    roads.push({ c: r[0], n: r[1], b: r[2], pts: pts, bb: bb, fade: 1 });
    for (i = 2; i < pts.length; i += 2) {                /* every piece of road goes in a grid, for the keep-trees-off lookup */
      var s = { a: pts[i - 2], b: pts[i - 1], c2: pts[i], d: pts[i + 1], k: r[0] }, n = segs.length; segs.push(s);
      var x0 = Math.floor(Math.min(s.b, s.d) / OSM_CELL), x1 = Math.floor(Math.max(s.b, s.d) / OSM_CELL), y0 = Math.floor(Math.min(s.a, s.c2) / OSM_CELL), y1 = Math.floor(Math.max(s.a, s.c2) / OSM_CELL);
      for (var gy = y0; gy <= y1; gy++) for (var gx = x0; gx <= x1; gx++) { var key = gy * 400000 + gx, l = OSMR.grid.get(key); if (l) l.push(n); else OSMR.grid.set(key, [n]); }
    }
  });
  /* roads near the edge of the area fade out, so the streets blend into the map instead of stopping in a square */
  var B = d.crop || d.bbox, mLat = (B[2] - B[0]) * 0.16, mLng = (B[3] - B[1]) * 0.16;
  roads.forEach(function (r) {
    var la = (r.bb[0] + r.bb[2]) / 2, lg = (r.bb[1] + r.bb[3]) / 2;
    var e = Math.min((la - B[0]) / mLat, (B[2] - la) / mLat, (lg - B[1]) / mLng, (B[3] - lg) / mLng);
    r.fade = Math.max(0, Math.min(1, e));
  });
  OSMR.areas[id] = { roads: roads, bbox: d.bbox, crop: d.crop, houses: osmMakeHouses(roads) };
  OSMR.ready = true;
}
/* start loading whatever the screen is looking at (cheap to call every frame) */
function osmEnsure() {
  if (OSMR.failed || S.zoom < 7.0) return;
  if (!OSMR.index) {
    if (!OSMR.indexLoading) { OSMR.indexLoading = true; osmFetchJson('data/roads/index.json').then(function (i) { OSMR.index = i; if (typeof requestMapDraw === 'function') requestMapDraw(); }).catch(function () { OSMR.failed = true; }); }
    return;
  }
  var a = unproj(-60, -60), b = unproj(W + 60, H + 60), lo = Math.min(a.lat, b.lat), hi = Math.max(a.lat, b.lat), l = Math.min(a.lng, b.lng), r = Math.max(a.lng, b.lng);
  OSMR.index.areas.forEach(function (ar) {
    if (OSMR.areas[ar.id] || OSMR.loading[ar.id]) return;
    var bb = ar.bbox; if (bb[2] < lo || bb[0] > hi || bb[3] < l || bb[1] > r) return;
    OSMR.loading[ar.id] = true;
    osmFetchJson('data/roads/' + ar.id + '.json').then(function (d) { osmDecode(ar.id, d); baseDirty = true; if (typeof requestMapDraw === 'function') requestMapDraw(); }).catch(function () { OSMR.loading[ar.id] = false; OSMR.failed = true; });
    if (ar.water) osmFetchJson('data/roads/' + ar.water + '.json').then(function (d) { osmDecodeWater(d); baseDirty = true; if (typeof requestMapDraw === 'function') requestMapDraw(); }).catch(function () {});
  });
}
function osmCovered(lat, lng) {
  if (!OSMR.ready) return false;
  for (var id in OSMR.areas) { var bb = OSMR.areas[id].bbox; if (lat >= bb[0] && lat <= bb[2] && lng >= bb[1] && lng <= bb[3]) return true; }
  return false;
}
/* clip a drawing to everywhere EXCEPT the areas we have real streets for (the old simplified corridors use this) */
function osmClipOutside(g) {
  if (!OSMR.ready || S.zoom < 9.2) return false;
  g.beginPath(); g.rect(-50, -50, W + 100, H + 100);
  for (var id in OSMR.areas) {
    var bb = OSMR.areas[id].bbox, p0 = proj(bb[2], bb[1]), p1 = proj(bb[0], bb[3]);
    g.rect(Math.min(p0.x, p1.x), Math.min(p0.y, p1.y), Math.abs(p1.x - p0.x), Math.abs(p1.y - p0.y));
  }
  g.clip('evenodd'); return true;
}

/* ---------- keep trees, flowers and decor off the real streets ---------- */
function osmRoadNearXY(x, y, rpx) {
  if (!OSMR.ready || S.zoom < 9.3) return false;
  for (var hI = 0; hI < OSM_HOUSES.length; hI++) { var hh = OSM_HOUSES[hI]; if (Math.abs(x - hh.x) < hh.w * 0.6 + 2 && y > hh.y - hh.h - 2 && y < hh.y + 6) return true; }   /* nor on the little houses */
  var q = unproj(x, y), mpp = kmPerPx(q.lat, S.zoom) * 1000, sc = osmWidthScale(S.zoom), z = S.zoom;
  var cosL = Math.cos(q.lat * Math.PI / 180), gx = Math.floor(q.lng / OSM_CELL), gy = Math.floor(q.lat / OSM_CELL);
  for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
    var l = OSMR.grid.get((gy + dy) * 400000 + gx + dx); if (!l) continue;
    for (var i = 0; i < l.length; i++) {
      var s = OSMR.segs[l[i]], st = OSM_STYLE[s.k];
      if (z < st.z0 + 0.5) continue;                       /* a street that is not drawn yet does not push trees away */
      var reach = (st.w * sc * 0.5 + Math.min(rpx, 2) + 1) * mpp;     /* only the road itself: trees may stand beside it and lean over it */
      var ax = (s.b - q.lng) * cosL * 111320, ay = (s.a - q.lat) * 111320, bx = (s.d - q.lng) * cosL * 111320, by = (s.c2 - q.lat) * 111320;
      var ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey, t = L2 ? Math.max(0, Math.min(1, -(ax * ex + ay * ey) / L2)) : 0;
      if (Math.hypot(ax + t * ex, ay + t * ey) < reach) return true;
    }
  }
  return false;
}

/* ---------- drawing ---------- */
function drawOsmRoads(g) {
  osmEnsure();
  if (!OSMR.ready || S.zoom < OSM_STYLE[0].z0) return;
  var z = S.zoom, sc = osmWidthScale(z), a = unproj(-30, -30), b = unproj(W + 30, H + 30);
  var lo = Math.min(a.lat, b.lat), hi = Math.max(a.lat, b.lat), l = Math.min(a.lng, b.lng), r = Math.max(a.lng, b.lng);
  var by = [[], [], [], [], []];
  for (var id in OSMR.areas) OSMR.areas[id].roads.forEach(function (rd) {
    var bb = rd.bb; if (bb[2] < lo || bb[0] > hi || bb[3] < l || bb[1] > r) return;
    var st = OSM_STYLE[rd.c]; if (z < st.z0) return; by[rd.c].push(rd);
  });
  /* a point counts as dry if it, or a point a few pixels to either side, is land: the base coastline is simplified */
  function dry(x, y) { return terrainAt(x, y) === 'land' || terrainAt(x - 4, y) === 'land' || terrainAt(x + 4, y) === 'land'; }
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  for (var c = 4; c >= 0; c--) {                           /* small streets first, so bigger roads sit on top */
    var list = by[c]; if (!list.length) continue;
    var st = OSM_STYLE[c], alpha = cloudEase(st.z0, st.z1, z); if (alpha < 0.02) continue;
    var w = st.w * sc, LV = [[new Path2D(), new Path2D()], [new Path2D(), new Path2D()], [new Path2D(), new Path2D()], [new Path2D(), new Path2D()]];
    list.forEach(function (rd) {
      if (rd.fade <= 0.05) return;
      var lv = LV[Math.min(3, Math.floor(rd.fade * 4))], land = lv[0], span = lv[1];
      var pts = rd.pts, last = null;
      for (var i = 0; i < pts.length; i += 2) {
        var p = proj(pts[i], pts[i + 1]), ok = rd.b || dry(p.x, p.y);
        if (last && ok) {
          var dx = p.x - last.x, dy = p.y - last.y, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 14)), good = true;
          if (!rd.b) for (var k = 1; k < n; k++) if (!dry(last.x + dx * k / n, last.y + dy * k / n)) { good = false; break; }
          if (good) { (rd.b ? span : land).moveTo(last.x, last.y); (rd.b ? span : land).lineTo(p.x, p.y); }
        }
        last = ok ? p : null;
      }
    });
    LV.forEach(function (lv, li) {
      var land = lv[0], span = lv[1];
      g.globalAlpha = alpha * (li + 1) / 4;
      g.strokeStyle = st.edge; g.lineWidth = w + 2.2; g.stroke(land);
      g.strokeStyle = '#8c8f97'; g.lineWidth = w + 2.6; g.stroke(span);          /* a bridge keeps a cool grey edge over water */
      g.strokeStyle = st.fill; g.lineWidth = w; g.stroke(land);
      g.strokeStyle = '#b4bcc2'; g.lineWidth = w; g.stroke(span);
      if (c === 0 && w >= 4.2) { g.setLineDash([Math.max(4, w * 0.9), Math.max(7, w * 1.5)]); g.strokeStyle = '#fff0ce'; g.lineWidth = Math.max(0.8, w * 0.14); g.globalAlpha = alpha * 0.8 * (li + 1) / 4; g.stroke(land); g.stroke(span); g.setLineDash([]); }
    });
  }
  g.restore();
  osmHouses(g, by[4], sc);
}

/* ---------- a few tiny houses along residential streets: shows a neighbourhood, not every real house ---------- */
/* a small set of house designs, each a different shape, with varied roof and wall colours */
var OSM_HOUSES_SP = [
  ['.....rr.....', '....rrrr....', '...rrrrrr.c.', '..rrrrrrrrcc', '.rrrrrrrrrrr', 'rrrrrrrrrrrr', '.wwwwwwwwww.', '.wbbwwwwbbw.', '.wbbwwwwbbw.', '.wwwwddwwww.', '.wwwwddwwww.'],
  ['....rrrr....', '..rrrrrrrr..', 'rrrrrrrrrrrr', '.wwwwwwwwww.', '.wbbwwwwbbw.', '.wwwwwwwwww.', 'rrrrrrrrrrrr', '.wwwwwwwwww.', '.wbbwddwbbw.', '.wwwwddwwww.'],
  ['......rrr.......', '....rrrrrrr.....', '..rrrrrrrrrrr...', 'rrrrrrrrrrrrrrr.', '.wwwwwwwwwwwwww.', '.wbbwwwbbwwwbbw.', '.wwwwwwwwwwwwww.', 'ppppppppppppppp.', '.wwwwwddwwwwwww.', '.wwwwwddwwwwwww.'],
  ['rrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrr', '.wwwwwwo.wwwwww.', '.wbbwwwo.wbbwww.', '.wwwwwwo.wwwwww.', '.wbbwwwo.wbbwww.', '.wwddwwo.wwddww.', '.wwddwwo.wwddww.'],
  ['....rr....', '...rrrr...', '..rrrrrr..', '.rrrrrrrr.', 'rrrrrrrrrr', '.wwwwwwww.', '.wbwddwbw.', '.wwwddwww.']
];
var OSM_ROOFS = ['#C9606E', '#8E3A57', '#6B8FB5', '#B5553F', '#D9879F', '#7A6A9A', '#5F8B6A', '#A0704C'];
var OSM_WALLS = ['#FFF2DF', '#F6E2C8', '#FBE7EC', '#E9EEF2', '#F3E6D3'];
/* Every house site is decided ONCE, in real-world coordinates, when an area's streets load. Nothing about a house
   depends on the screen, so houses never shift or pop while you pan. Each house also gets the zoom at which it stops
   crowding a house that outranks it, so zooming in adds houses gradually and always the same ones. */
function osmMakeHouses(roads) {
  var cand = [], cosL = Math.cos(38.9 * Math.PI / 180);
  roads.forEach(function (rd) {
    if (rd.c !== 4 || rd.fade < 0.8 || rd.pts.length < 6) return;
    var pts = rd.pts, h = terHash(Math.round(pts[0] * 1e4), Math.round(pts[1] * 1e4), 771); if (h > 0.12) return;
    var n = pts.length / 2 - 1, k = Math.min(n - 1, Math.floor(n * (0.3 + h * 2))) * 2;
    var la1 = pts[k], lg1 = pts[k + 1], la2 = pts[k + 2], lg2 = pts[k + 3];
    var ny = (la2 - la1) * 111320, ex = (lg2 - lg1) * cosL * 111320, L = Math.hypot(ny, ex); if (L < 8) return;
    var side = (h * 1e3) % 2 < 1 ? 1 : -1, off = 11;                         /* metres to the side of the street */
    var mla = (la1 + la2) / 2, mlg = (lg1 + lg2) / 2;
    cand.push({ lat: mla - (ex / L) * off * side / 111320, lng: mlg + (ny / L) * off * side / (cosL * 111320), rank: h / 0.12, zmin: 0,
      roof: Math.floor(h * 997) % OSM_ROOFS.length, wall: Math.floor(h * 4271) % OSM_WALLS.length, design: Math.floor(h * 1873) % OSM_HOUSES_SP.length });
  });
  cand.sort(function (a, b) { return a.rank - b.rank; });
  var mpp0 = 156543 * cosL, NEED = 70;                                       /* a house wants about 70 px to itself */
  cand.forEach(function (c, i) {
    var near = 1e9;
    for (var j = 0; j < i; j++) { var d = Math.hypot((c.lat - cand[j].lat) * 111320, (c.lng - cand[j].lng) * cosL * 111320); if (d < near) near = d; }
    c.zmin = near > 1e8 ? 0 : Math.log(NEED * mpp0 / Math.max(near, 1)) / Math.LN2;
  });
  return cand;
}
function osmHouses(g, streets, sc) {
  OSM_HOUSES = [];
  var z = S.zoom; if (z < 11.4) return;
  var a = cloudEase(11.4, 12.0, z), px = z < 12.6 ? 2 : (z < 14 ? 3 : 4), hw = 13 * px, hh = 11 * px, frac = Math.min(1, 0.3 + (z - 11.4) * 0.18);
  for (var id in OSMR.areas) {
    (OSMR.areas[id].houses || []).forEach(function (hs) {
      if (hs.rank > frac || z < hs.zmin) return;
      var p = proj(hs.lat, hs.lng), x = p.x, y = p.y + hh * 0.4;
      if (x < -hw || x > W + hw || y < 0 || y > H + hh) return;
      if (terrainAt(x, y) !== 'land' || terrainAt(x - hw / 2, y) !== 'land' || terrainAt(x + hw / 2, y) !== 'land') return;
      if (nycAvoid(x, y, 8) || repairClear(x, y, hw)) return;
      g.save(); g.globalAlpha = a;
      g.fillStyle = 'rgba(60,40,50,.2)'; g.beginPath(); g.ellipse(x, y, hw * 0.55, px * 1.4, 0, 0, 7); g.fill();
      drawSprite(g, OSM_HOUSES_SP[hs.design], { r: OSM_ROOFS[hs.roof], w: OSM_WALLS[hs.wall], b: '#7FC3DF', d: '#8A5638', c: '#8C6A5A', p: '#D7C2A3', o: '#C9B49A' }, x, y, px, '#5E3A3A');
      g.restore();
      OSM_HOUSES.push({ x: x, y: y, w: hw, h: hh });
    });
  }
}

/* ---------- real rivers and basins (the Potomac at DC): painted into the base map itself, so every check
   for land or water (roads, trees, houses, avatars) treats them as water ---------- */
var OSM_WATER = [];
function osmDecodeWater(d) {
  d.polys.forEach(function (pl) {
    var rings = pl.map(function (f) { var out = new Float64Array(f.length), la = 0, lg = 0; for (var i = 0; i < f.length; i += 2) { la = i ? la + f[i] : f[i]; lg = i ? lg + f[i + 1] : f[i + 1]; out[i] = la / d.q; out[i + 1] = lg / d.q; } return out; });
    var bb = [90, 180, -90, -180], r0 = rings[0];
    for (var i = 0; i < r0.length; i += 2) { bb[0] = Math.min(bb[0], r0[i]); bb[1] = Math.min(bb[1], r0[i + 1]); bb[2] = Math.max(bb[2], r0[i]); bb[3] = Math.max(bb[3], r0[i + 1]); }
    OSM_WATER.push({ rings: rings, bb: bb });
  });
}
function osmPaintWater(g, k) {
  if (!OSM_WATER.length || S.mode !== 'map' || S.zoom < 8.4) return;
  var a = unproj(-20, -20), b = unproj(W + 20, H + 20), lo = Math.min(a.lat, b.lat), hi = Math.max(a.lat, b.lat), l = Math.min(a.lng, b.lng), r = Math.max(a.lng, b.lng);
  var path = new Path2D(), any = false;
  OSM_WATER.forEach(function (w) {
    var bb = w.bb; if (bb[2] < lo || bb[0] > hi || bb[3] < l || bb[1] > r) return;
    w.rings.forEach(function (ring) { for (var i = 0; i < ring.length; i += 2) { var p = proj(ring[i], ring[i + 1]); if (i) path.lineTo(p.x * k, p.y * k); else path.moveTo(p.x * k, p.y * k); } path.closePath(); });
    any = true;
  });
  if (!any) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  g.fillStyle = '#9fd9c0'; g.lineWidth = Math.max(1, 2.2 * k); g.strokeStyle = '#9fd9c0'; g.stroke(path);       /* a pale shore line */
  g.fillStyle = C.water; g.fill(path, 'evenodd');
  g.restore();
}
HOOKS.afterBase.unshift(function () { osmPaintWater(baseCtx, baseCv.width / W); });

/* ---------- soft clouds along the edges of each street area: the streets seem to carry on under them ---------- */
HOOKS.afterOverlays.push(function () {
  if (!OSMR.ready || S.mode !== 'map' || S.zoom < 11.0 || typeof CARTOON_CLOUDS === 'undefined') return;
  var z = S.zoom, alpha = cloudEase(11.0, 11.8, z), size = Math.min(190, 100 + (z - 11) * 28);
  if (alpha < 0.02) return;
  for (var id in OSMR.areas) {
    var A = OSMR.areas[id], B = A.crop || A.bbox; if (!B) continue;
    var p0 = proj(B[2], B[1]), p1 = proj(B[0], B[3]);
    if (p1.x < -size || p0.x > W + size || p1.y < -size || p0.y > H + size) continue;
    var step = size * 0.95, out = size * 0.42;           /* sit just outside the area, never over it */
    [[p0.x, p0.y - out, p1.x, p0.y - out], [p0.x, p1.y + out, p1.x, p1.y + out], [p0.x - out, p0.y, p0.x - out, p1.y], [p1.x + out, p0.y, p1.x + out, p1.y]].forEach(function (e, side) {
      var len = Math.hypot(e[2] - e[0], e[3] - e[1]), n = Math.ceil(len / step);
      for (var i = 0; i <= n; i++) {
        var t = i / n, x = e[0] + (e[2] - e[0]) * t, y = e[1] + (e[3] - e[1]) * t;
        if (x < -size || x > W + size || y < -size || y > H + size) continue;
        if (terrainAt(Math.max(1, Math.min(W - 1, x)), Math.max(1, Math.min(H - 1, y))) === 'water') continue;      /* the open bay needs no cover */
        var h = terHash(Math.round(x / step + i), side, 913), c = CARTOON_CLOUDS[Math.floor(h * CARTOON_CLOUDS.length) % CARTOON_CLOUDS.length];
        ctx.save(); ctx.globalAlpha = alpha * (0.82 + h * 0.18);
        var ch = size * (0.6 + h * 0.4); drawArt(ctx, c, x + (h - 0.5) * step * 0.3, y + ch * 0.5, ch, DPR, true);
        ctx.restore();
      }
    });
  }
});

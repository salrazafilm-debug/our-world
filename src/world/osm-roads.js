/* Real streets from OpenStreetMap (c) OpenStreetMap contributors, ODbL.
   data/roads/index.json lists the areas we have; an area's file is fetched only when you look at it.
   Roads are drawn into the cached scenery layer (below trees and every place), as sandy paths with a darker
   edge. Bigger roads show first, small streets fade in as you zoom closer. Trees and flowers keep off them.
   Made by tools/osm-roads.js. Style rules: STYLE.md. */
var OSMR = { index: null, indexLoading: false, areas: {}, loading: {}, segs: [], grid: new Map(), ready: false, failed: false };
var OSM_CELL = 0.0025;                                   /* grid cell in degrees (about 280 m) for the "is a road near here" lookup */
/* class: 0 highway, 1 main road, 2 secondary, 3 street, 4 small street */
var OSM_STYLE = [
  { z0: 7.0, z1: 8.6, w: 5.4, edge: '#bdc5b8', fill: '#8195a0' },
  { z0: 8.8, z1: 10.0, w: 4.4, edge: '#b6a175', fill: '#e4ca95' },
  { z0: 9.4, z1: 10.6, w: 3.8, edge: '#b6a175', fill: '#e8d3a0' },
  { z0: 10.0, z1: 11.2, w: 3.0, edge: '#bda980', fill: '#ecd9aa' },
  { z0: 10.7, z1: 11.9, w: 2.3, edge: '#c2b08a', fill: '#efdeb4' }
];
function osmWidthScale(z) { return Math.max(0.72, Math.min(1.9, 1 + (z - 12) * 0.2)); }

function osmFetchJson(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
function osmDecode(id, d) {
  var roads = [], q = d.q || 1e5, segs = OSMR.segs;
  d.roads.forEach(function (r) {
    var f = r[3], pts = new Float64Array(f.length), la = 0, lg = 0, i;
    for (i = 0; i < f.length; i += 2) { la = i ? la + f[i] : f[i]; lg = i ? lg + f[i + 1] : f[i + 1]; pts[i] = la / q; pts[i + 1] = lg / q; }
    var bb = [90, 180, -90, -180];
    for (i = 0; i < pts.length; i += 2) { bb[0] = Math.min(bb[0], pts[i]); bb[1] = Math.min(bb[1], pts[i + 1]); bb[2] = Math.max(bb[2], pts[i]); bb[3] = Math.max(bb[3], pts[i + 1]); }
    roads.push({ c: r[0], n: r[1], b: r[2], pts: pts, bb: bb });
    for (i = 2; i < pts.length; i += 2) {                /* every piece of road goes in a grid, for the keep-trees-off lookup */
      var s = { a: pts[i - 2], b: pts[i - 1], c2: pts[i], d: pts[i + 1], k: r[0] }, n = segs.length; segs.push(s);
      var x0 = Math.floor(Math.min(s.b, s.d) / OSM_CELL), x1 = Math.floor(Math.max(s.b, s.d) / OSM_CELL), y0 = Math.floor(Math.min(s.a, s.c2) / OSM_CELL), y1 = Math.floor(Math.max(s.a, s.c2) / OSM_CELL);
      for (var gy = y0; gy <= y1; gy++) for (var gx = x0; gx <= x1; gx++) { var key = gy * 400000 + gx, l = OSMR.grid.get(key); if (l) l.push(n); else OSMR.grid.set(key, [n]); }
    }
  });
  OSMR.areas[id] = { roads: roads, bbox: d.bbox };
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
    var w = st.w * sc, land = new Path2D(), span = new Path2D();
    list.forEach(function (rd) {
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
    g.globalAlpha = alpha;
    g.strokeStyle = st.edge; g.lineWidth = w + 2.2; g.stroke(land);
    g.strokeStyle = '#8c8f97'; g.lineWidth = w + 2.6; g.stroke(span);          /* a bridge keeps a cool grey edge over water */
    g.strokeStyle = st.fill; g.lineWidth = w; g.stroke(land);
    g.strokeStyle = '#b4bcc2'; g.lineWidth = w; g.stroke(span);
    if (c === 0 && w >= 4.2) { g.setLineDash([Math.max(4, w * 0.9), Math.max(7, w * 1.5)]); g.strokeStyle = '#fff0ce'; g.lineWidth = Math.max(0.8, w * 0.14); g.globalAlpha = alpha * 0.8; g.stroke(land); g.stroke(span); g.setLineDash([]); }
  }
  g.restore();
}

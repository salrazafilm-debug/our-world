#!/usr/bin/env node
/* Pulls rivers, lakes and basins (natural=water) out of an OpenStreetMap XML export, so the map can paint real
   water where its simplified coastline has none (the Potomac and Anacostia at DC, the Tidal Basin...).

   node tools/osm-water.js <file.osm> <area-name> [--bbox minLat,minLng,maxLat,maxLng] [--min 2000] [--tol 5]

   - Closed ways tagged natural=water, and multipolygon relations tagged natural=water (their outer ways are
     joined end to end into rings). Inner rings (islands) are kept too.
   - Drops pieces smaller than --min square metres (default 2000) and thins straight lines (--tol metres).
   - Writes data/roads/<area>-water.json and adds it to data/roads/index.json as that area's water.
   Map data (c) OpenStreetMap contributors, ODbL. */
'use strict';
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
if (args.length < 2) { console.error('usage: node tools/osm-water.js <file.osm> <area-name> [--bbox a,b,c,d] [--min m2] [--tol m]'); process.exit(1); }
const file = args[0], area = args[1].replace(/[^a-z0-9-]/gi, '-').toLowerCase();
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const bbox = opt('--bbox') ? opt('--bbox').split(',').map(Number) : null;
const minArea = parseFloat(opt('--min') || '2000'), tol = parseFloat(opt('--tol') || '5');

function stream(onPiece) {
  return new Promise((resolve, reject) => {
    const src = fs.createReadStream(file, { encoding: 'utf8', highWaterMark: 4 << 20 }); let rest = '';
    src.on('data', (c) => { rest = onPiece(rest + c) || ''; });
    src.on('end', () => { onPiece(rest); resolve(); }); src.on('error', reject);
  });
}
const isWater = (body) => /<tag k="natural" v="water"/.test(body) || /<tag k="waterway" v="riverbank"/.test(body);

(async () => {
  /* pass 1: relations (which ways belong to water areas) */
  const relWays = new Map(), rels = [];
  await stream((text) => {
    let pos = 0;
    for (;;) {
      const a = text.indexOf('<relation ', pos); if (a < 0) return '';
      const b = text.indexOf('</relation>', a); if (b < 0) return text.slice(a);
      const body = text.slice(a, b); pos = b + 11;
      if (!isWater(body) || !/<tag k="type" v="multipolygon"/.test(body)) continue;
      const r = { outer: [], inner: [] }; const re = /<member type="way" ref="(\d+)" role="(\w*)"/g; let m;
      while ((m = re.exec(body))) { (m[2] === 'inner' ? r.inner : r.outer).push(m[1]); relWays.set(m[1], 1); }
      rels.push(r);
    }
  });
  /* pass 2: ways (closed water ways, and every way a water relation needs) */
  const ways = new Map(), closed = [], need = new Set();
  await stream((text) => {
    let pos = 0;
    for (;;) {
      const a = text.indexOf('<way ', pos); if (a < 0) return '';
      const b = text.indexOf('</way>', a); if (b < 0) return text.slice(a);
      const body = text.slice(a, b); pos = b + 6;
      const id = /<way id="(\d+)"/.exec(body)[1], own = isWater(body);
      if (!own && !relWays.has(id)) continue;
      const refs = []; const re = /<nd ref="(\d+)"/g; let m; while ((m = re.exec(body))) { refs.push(m[1]); need.add(m[1]); }
      ways.set(id, refs);
      if (own && refs.length > 3 && refs[0] === refs[refs.length - 1]) closed.push(id);
    }
  });
  /* pass 3: point positions */
  const xy = new Map();
  await stream((text) => {
    const re = /<node id="(\d+)"[^>]*?lat="([-\d.]+)" lon="([-\d.]+)"/g; let m, end = 0;
    while ((m = re.exec(text))) { end = re.lastIndex; if (need.has(m[1])) xy.set(m[1], [+m[2], +m[3]]); }
    const last = text.lastIndexOf('<node '); return last >= end ? text.slice(last) : '';
  });
  /* join way pieces end to end into closed rings */
  function rings(ids) {
    const segs = ids.map((id) => (ways.get(id) || []).slice()).filter((s) => s.length > 1), out = [];
    while (segs.length) {
      let ring = segs.shift(), grew = true;
      while (ring[0] !== ring[ring.length - 1] && grew) {
        grew = false;
        for (let i = 0; i < segs.length; i++) {
          const s = segs[i], end = ring[ring.length - 1];
          if (s[0] === end) { ring = ring.concat(s.slice(1)); } else if (s[s.length - 1] === end) { ring = ring.concat(s.slice().reverse().slice(1)); }
          else if (s[s.length - 1] === ring[0]) { ring = s.concat(ring.slice(1)); } else if (s[0] === ring[0]) { ring = s.slice().reverse().concat(ring.slice(1)); }
          else continue;
          segs.splice(i, 1); grew = true; break;
        }
      }
      if (ring.length > 3) out.push(ring);
    }
    return out;
  }
  const k = 111320;
  function toPts(ring) { return ring.map((r) => xy.get(r)).filter(Boolean); }
  function areaM2(p) { const c = Math.cos(p[0][0] * Math.PI / 180); let s = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) s += (p[j][1] * c * k) * (p[i][0] * k) - (p[i][1] * c * k) * (p[j][0] * k); return Math.abs(s / 2); }
  function simplify(pts) {
    if (pts.length < 5) return pts;
    const c = Math.cos(pts[0][0] * Math.PI / 180), P = pts.map((p) => [p[1] * k * c, p[0] * k]), keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
    while (st.length) {
      const [i, j] = st.pop(); let md = 0, mi = -1; const ax = P[i][0], ay = P[i][1], dx = P[j][0] - ax, dy = P[j][1] - ay, L = dx * dx + dy * dy;
      for (let q = i + 1; q < j; q++) { const t = L ? Math.max(0, Math.min(1, ((P[q][0] - ax) * dx + (P[q][1] - ay) * dy) / L)) : 0, d = Math.hypot(P[q][0] - ax - t * dx, P[q][1] - ay - t * dy); if (d > md) { md = d; mi = q; } }
      if (md > tol && mi > 0) { keep[mi] = 1; st.push([i, mi], [mi, j]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  const touches = (p) => !bbox || p.some((q) => q[0] >= bbox[0] && q[0] <= bbox[2] && q[1] >= bbox[1] && q[1] <= bbox[3]);
  const polys = []; let dropped = 0;
  const add = (outerIds, innerIds) => {
    rings(outerIds).forEach((r) => {
      const p = toPts(r); if (p.length < 4 || !touches(p) || areaM2(p) < minArea) { dropped++; return; }
      const holes = rings(innerIds).map(toPts).filter((h) => h.length > 3 && areaM2(h) >= minArea).map(simplify);
      polys.push([simplify(p)].concat(holes));
    });
  };
  closed.forEach((id) => add([id], []));
  rels.forEach((r) => add(r.outer, r.inner));
  const Q = 1e5, enc = (ring) => { const f = []; let pl = 0, pg = 0; ring.forEach((p, i) => { const a = Math.round(p[0] * Q), b = Math.round(p[1] * Q); f.push(i ? a - pl : a, i ? b - pg : b); pl = a; pg = b; }); return f; };
  const dir = path.join(__dirname, '..', 'data', 'roads'); fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, area + '-water.json');
  fs.writeFileSync(dest, JSON.stringify({ q: Q, polys: polys.map((pl) => pl.map(enc)) }));
  const idxFile = path.join(dir, 'index.json'); let idx = { areas: [] };
  try { idx = JSON.parse(fs.readFileSync(idxFile, 'utf8')); } catch (e) {}
  idx.areas.forEach((a) => { if (a.id === area) a.water = area + '-water'; });
  fs.writeFileSync(idxFile, JSON.stringify(idx, null, 1));
  console.log('wrote ' + path.relative(process.cwd(), dest) + ': ' + polys.length + ' water areas (' + dropped + ' small or outside dropped), ' + (fs.statSync(dest).size / 1024).toFixed(0) + ' KB');
})().catch((e) => { console.error(e); process.exit(1); });

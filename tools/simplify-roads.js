#!/usr/bin/env node
/* Thins the street data in data/roads/<area>.json so the map stays clear and quick:

   node tools/simplify-roads.js [area ...]        (default: every area in data/roads/index.json)

   - first joins the block-by-block pieces of each street into one long road (same name and class)
   - drops short pieces (on-ramps, tiny side streets, stubs); the length each class needs is in KEEP below
   - drops a road that mostly runs on top of a road already kept (the two halves of a divided road,
     a service road beside a highway), so lines no longer stack up
   - smooths away points that barely change the shape (Douglas-Peucker, tolerance per class in TOL)

   It rewrites the files in place, in the same format the map already reads. Run it on fresh output of
   tools/osm-roads.js; running it twice only thins a little more. The originals stay in git history.
   Map data (c) OpenStreetMap contributors, ODbL. */
'use strict';
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'data', 'roads');

/* class: 0 highway, 1 main road, 2 secondary, 3 street, 4 small street */
const KEEP = [450, 220, 220, 380, 520];     /* metres a (joined-up) road must run to stay */
const TOL = [7, 6, 7, 8, 10];               /* metres of wobble that may be smoothed away */
const NEAR = [45, 30, 30, 70, 95];          /* a road this close to a kept road counts as running on top of it;
                                               for streets it is also the spacing, so a dense grid keeps every other street */

const areas = process.argv.slice(2).length ? process.argv.slice(2)
  : JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8')).areas.map((a) => a.id);

function decode(f, q) {
  const out = []; let la = 0, lg = 0;
  for (let i = 0; i < f.length; i += 2) { la = i ? la + f[i] : f[i]; lg = i ? lg + f[i + 1] : f[i + 1]; out.push([la / q, lg / q]); }
  return out;
}
function encode(pts, q) {
  const out = []; let pa = 0, pg = 0;
  pts.forEach((p, i) => {
    const a = Math.round(p[0] * q), g = Math.round(p[1] * q);
    if (i) { out.push(a - pa, g - pg); } else out.push(a, g);
    pa = a; pg = g;
  });
  return out;
}

areas.forEach((id) => {
  const file = path.join(DIR, id + '.json');
  if (!fs.existsSync(file)) { console.warn('skip', id, '(no file)'); return; }
  const d = JSON.parse(fs.readFileSync(file, 'utf8')), q = d.q || 1e5;
  const lat0 = (d.bbox[0] + d.bbox[2]) / 2, cosL = Math.cos(lat0 * Math.PI / 180);
  const M = (p) => [(p[1]) * cosL * 111320, p[0] * 111320];          /* metres east, north */

  function dp(pts, tol) {                                              /* Douglas-Peucker in metres */
    if (pts.length < 3) return pts;
    const m = pts.map(M), keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop(); let best = -1, bi = -1;
      const ax = m[a][0], ay = m[a][1], ex = m[b][0] - ax, ey = m[b][1] - ay, L2 = ex * ex + ey * ey;
      for (let i = a + 1; i < b; i++) {
        const px = m[i][0] - ax, py = m[i][1] - ay, t = L2 ? Math.max(0, Math.min(1, (px * ex + py * ey) / L2)) : 0;
        const dd = Math.hypot(px - t * ex, py - t * ey); if (dd > best) { best = dd; bi = i; }
      }
      if (best > tol) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  function length(pts) { let s = 0; for (let i = 1; i < pts.length; i++) { const a = M(pts[i - 1]), b = M(pts[i]); s += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s; }
  function samples(pts, every) {                                     /* points along the road, every few metres */
    const out = [];
    for (let i = 1; i < pts.length; i++) {
      const a = M(pts[i - 1]), b = M(pts[i]), L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / every));
      for (let k = i === 1 ? 0 : 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    }
    return out;
  }

  const raw = d.roads.map((r) => ({ c: r[0], n: r[1] || '', b: r[2] ? 1 : 0, pts: decode(r[3], q) }));
  const before = raw.length, beforePts = raw.reduce((s, r) => s + r.pts.length, 0);

  /* join pieces that meet end to end and belong to the same street, choosing the straightest way on */
  const ek = (p) => Math.round(p[0] * 1e5) + ',' + Math.round(p[1] * 1e5), grp = (r) => r.c + '|' + r.n + '|' + r.b;
  const ends = new Map();
  raw.forEach((r, i) => [r.pts[0], r.pts[r.pts.length - 1]].forEach((p) => { const k = ek(p), l = ends.get(k); if (l) l.push(i); else ends.set(k, [i]); }));
  const used = new Uint8Array(raw.length), roads = [];
  const heading = (a, b) => Math.atan2(M(b)[1] - M(a)[1], M(b)[0] - M(a)[0]);
  function grow(chain, g) {
    for (;;) {
      const tail = chain[chain.length - 1], prev = chain[chain.length - 2] || tail, h0 = heading(prev, tail);
      let best = null, bestTurn = 9;
      (ends.get(ek(tail)) || []).forEach((j) => {
        if (used[j] || grp(raw[j]) !== g) return;
        const pts = ek(raw[j].pts[0]) === ek(tail) ? raw[j].pts : raw[j].pts.slice().reverse();
        if (pts.length < 2) return;
        let turn = Math.abs(heading(pts[0], pts[1]) - h0); if (turn > Math.PI) turn = 2 * Math.PI - turn;
        if (turn < bestTurn) { bestTurn = turn; best = { j, pts }; }
      });
      if (!best || bestTurn > 1.2) return chain;
      used[best.j] = 1; for (let k = 1; k < best.pts.length; k++) chain.push(best.pts[k]);
    }
  }
  raw.map((r, i) => i).sort((a, b) => raw[b].pts.length - raw[a].pts.length).forEach((i) => {
    if (used[i]) return; used[i] = 1;
    const r = raw[i], g = grp(r);
    let chain = grow(r.pts.slice(), g);
    chain = grow(chain.reverse(), g).reverse();
    roads.push({ c: r.c, n: r.n, b: r.b, pts: chain, len: length(chain) });
  });

  /* bigger and longer roads claim their space first */
  roads.sort((a, b) => a.c - b.c || b.len - a.len);
  const CELL = 30, grid = new Map(), kept = [];
  const key = (x, y) => Math.floor(x / CELL) + ',' + Math.floor(y / CELL);
  roads.forEach((r) => {
    if (r.len < KEEP[r.c] && !r.b) return;                           /* short pieces go (a bridge stays) */
    const sm = samples(r.pts, 12), near = NEAR[r.c];
    let on = 0;
    sm.forEach((s) => {
      const gx = Math.floor(s[0] / CELL), gy = Math.floor(s[1] / CELL); let hit = false;
      const R = Math.ceil(near / CELL);
      for (let dy = -R; dy <= R && !hit; dy++) for (let dx = -R; dx <= R && !hit; dx++) {
        const l = grid.get((gx + dx) + ',' + (gy + dy)); if (!l) continue;
        for (const p of l) if (p[2] <= Math.max(r.c + 1, r.c >= 3 ? 4 : 0) && Math.hypot(p[0] - s[0], p[1] - s[1]) < near) { hit = true; break; }
      }
      if (hit) on++;
    });
    if (sm.length && on / sm.length > 0.55) return;                    /* runs on top of a road we already have */
    r.pts = dp(r.pts, TOL[r.c]);
    kept.push(r);
    sm.forEach((s) => { const k = key(s[0], s[1]), l = grid.get(k); const v = [s[0], s[1], r.c]; if (l) l.push(v); else grid.set(k, [v]); });
  });

  kept.sort((a, b) => a.c - b.c);
  d.roads = kept.map((r) => [r.c, r.n, r.b, encode(r.pts, q)]);   /* same layout as before: class, name, bridge, points */
  fs.writeFileSync(file, JSON.stringify(d));
  const afterPts = kept.reduce((s, r) => s + r.pts.length, 0);
  const by = [0, 0, 0, 0, 0]; kept.forEach((r) => by[r.c]++);
  console.log(id + ': roads ' + before + ' -> ' + kept.length + ' (by class ' + by.join('/') + '), points ' + beforePts + ' -> ' + afterPts);
});

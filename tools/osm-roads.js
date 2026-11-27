#!/usr/bin/env node
/* Turns an OpenStreetMap XML export (.osm, or .osm.gz) into small, compact road data for the map.

   node tools/osm-roads.js <file.osm|file.osm.gz> <area-name> [--bbox minLat,minLng,maxLat,maxLng] [--tol 2] [--minor]

   - Streams the file in pieces, so a 100 MB export is fine (it never loads it all at once).
   - Keeps only roads (ways tagged highway=...). Footpaths, driveways and service lanes are left out
     unless you pass --minor.
   - Thins out points that sit on a straight line (default tolerance 2 metres).
   - Writes src/world/data/roads-<area-name>.js. Coordinates are whole numbers (1e-5 degrees, about 1 metre),
     stored as differences between neighbouring points, so the file stays small.

   Road classes: 0 highway, 1 main road, 2 secondary, 3 street, 4 small street, 5 lane/path (only with --minor)
   Map data (c) OpenStreetMap contributors, ODbL: the map keeps a credit line for it. */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const args = process.argv.slice(2);
if (args.length < 2) { console.error('usage: node tools/osm-roads.js <file.osm|.osm.gz> <area-name> [--bbox a,b,c,d] [--tol m] [--minor]'); process.exit(1); }
const file = args[0], area = args[1].replace(/[^a-z0-9-]/gi, '-').toLowerCase();
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const bbox = opt('--bbox') ? opt('--bbox').split(',').map(Number) : null;      // [minLat, minLng, maxLat, maxLng]
const tol = parseFloat(opt('--tol') || '2');
const minor = args.includes('--minor');

const CLASS = {
  motorway: 0, motorway_link: 0, trunk: 0, trunk_link: 0,
  primary: 1, primary_link: 1,
  secondary: 2, secondary_link: 2,
  tertiary: 3, tertiary_link: 3,
  residential: 4, unclassified: 4, living_street: 4,
  service: 5, track: 5, pedestrian: 5, cycleway: 5, path: 5, footway: 5
};
const attr = (s, k) => { const m = new RegExp('\\b' + k + '="([^"]*)"').exec(s); return m ? m[1] : null; };
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/* read the file in pieces; calls onPiece(text) for each, keeping an overlap so no tag is cut in half */
function stream(onPiece, keep) {
  return new Promise((resolve, reject) => {
    let src = fs.createReadStream(file, { highWaterMark: 4 << 20 });
    if (/\.gz$/i.test(file)) src = src.pipe(zlib.createGunzip());
    let rest = '';
    src.setEncoding && src.setEncoding('utf8');
    src.on('data', (chunk) => { const text = rest + chunk; rest = onPiece(text, false) || ''; });
    src.on('end', () => { onPiece(rest, true); resolve(); });
    src.on('error', reject);
  });
}

(async () => {
  const t0 = Date.now();
  /* pass 1: the roads (ways) and which points they use */
  const ways = [], need = new Set(); let wayCount = 0;
  await stream((text, last) => {
    let pos = 0;
    for (;;) {
      const a = text.indexOf('<way ', pos); if (a < 0) { pos = text.length; break; }
      const b = text.indexOf('</way>', a); if (b < 0) { pos = a; break; }     // the rest arrives in the next piece
      const body = text.slice(a, b); pos = b + 6; wayCount++;
      const hw = /<tag k="highway" v="([^"]*)"/.exec(body); if (!hw) continue;
      const c = CLASS[hw[1]]; if (c === undefined || (c === 5 && !minor)) continue;
      if (/<tag k="(area)" v="yes"/.test(body)) continue;                       // a plaza or car park outline, not a road
      const nm = /<tag k="name" v="([^"]*)"/.exec(body), ref = /<tag k="ref" v="([^"]*)"/.exec(body);
      const refs = []; const re = /<nd ref="(\d+)"/g; let m; while ((m = re.exec(body))) { refs.push(m[1]); need.add(m[1]); }
      if (refs.length > 1) ways.push({ c, name: nm ? unesc(nm[1]) : (ref ? unesc(ref[1]) : ''), bridge: /<tag k="bridge" v="(yes|viaduct)"/.test(body) ? 1 : 0, refs });
    }
    return text.slice(pos);
  });
  console.log('pass 1: ' + wayCount + ' ways read, ' + ways.length + ' roads kept, ' + need.size + ' points needed (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');

  /* pass 2: the coordinates of just those points */
  const xy = new Map();
  await stream((text, last) => {
    const re = /<node [^>]*>/g; let m, end = 0;
    while ((m = re.exec(text))) {
      end = re.lastIndex;
      const id = attr(m[0], 'id'); if (!id || !need.has(id)) continue;
      const lat = parseFloat(attr(m[0], 'lat')), lng = parseFloat(attr(m[0], 'lon'));
      if (isFinite(lat) && isFinite(lng)) xy.set(id, [lat, lng]);
    }
    const lastOpen = text.lastIndexOf('<node ');
    return lastOpen >= end ? text.slice(lastOpen) : text.slice(Math.max(end, text.length - 400));
  });
  console.log('pass 2: ' + xy.size + ' point positions found (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');

  /* thin points on straight lines (Douglas-Peucker, tolerance in metres) */
  function simplify(pts, tolM) {
    if (pts.length < 3) return pts;
    const k = 111320, cos = Math.cos(pts[0][0] * Math.PI / 180);
    const P = pts.map((p) => [p[1] * k * cos, p[0] * k]);
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [i, j] = stack.pop(); let md = 0, mi = -1;
      const ax = P[i][0], ay = P[i][1], bx = P[j][0], by = P[j][1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      for (let q = i + 1; q < j; q++) {
        const t = L ? Math.max(0, Math.min(1, ((P[q][0] - ax) * dx + (P[q][1] - ay) * dy) / L)) : 0;
        const d = Math.hypot(P[q][0] - ax - t * dx, P[q][1] - ay - t * dy);
        if (d > md) { md = d; mi = q; }
      }
      if (md > tolM && mi > 0) { keep[mi] = 1; stack.push([i, mi], [mi, j]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  const inBox = (p) => !bbox || (p[0] >= bbox[0] && p[0] <= bbox[2] && p[1] >= bbox[1] && p[1] <= bbox[3]);

  const roads = []; let pointsIn = 0, pointsOut = 0; const box = [90, 180, -90, -180];
  ways.forEach((w) => {
    /* split a road wherever it leaves the chosen box, keeping the parts inside */
    let run = [];
    const flush = () => {
      if (run.length > 1) {
        pointsIn += run.length; const s = simplify(run, tol); pointsOut += s.length;
        roads.push({ c: w.c, n: w.name, b: w.bridge, p: s });
        s.forEach((p) => { box[0] = Math.min(box[0], p[0]); box[1] = Math.min(box[1], p[1]); box[2] = Math.max(box[2], p[0]); box[3] = Math.max(box[3], p[1]); });
      }
      run = [];
    };
    w.refs.forEach((r) => { const p = xy.get(r); if (p && inBox(p)) run.push(p); else flush(); });
    flush();
  });

  /* compact: integers in 1e-5 degrees, each point stored as the step from the one before */
  const Q = 1e5, out = roads.map((r) => {
    const flat = []; let pl = 0, pg = 0;
    r.p.forEach((p, i) => { const la = Math.round(p[0] * Q), lg = Math.round(p[1] * Q); flat.push(i ? la - pl : la, i ? lg - pg : lg); pl = la; pg = lg; });
    return [r.c, r.n, r.b, flat];
  });
  const names = {}; out.forEach((r) => { if (r[1]) names[r[1]] = 1; });
  const data = { area, q: Q, bbox: box.map((v) => +v.toFixed(5)), roads: out };
  const dest = path.join(__dirname, '..', 'src', 'world', 'data', 'roads-' + area + '.js');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, '/* Generated by tools/osm-roads.js from OpenStreetMap data (c) OpenStreetMap contributors, ODbL. Do not edit by hand. */\n' +
    'var OW_ROADS = window.OW_ROADS || {}; OW_ROADS[' + JSON.stringify(area) + '] = ' + JSON.stringify(data) + ';\n');
  const byClass = [0, 0, 0, 0, 0, 0]; out.forEach((r) => byClass[r[0]]++);
  console.log('wrote ' + path.relative(process.cwd(), dest) + ': ' + roads.length + ' roads (' + byClass.join('/') + ' by class), ' + Object.keys(names).length + ' named streets, ' +
    pointsIn + ' -> ' + pointsOut + ' points, ' + (fs.statSync(dest).size / 1024).toFixed(0) + ' KB, ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
})().catch((e) => { console.error(e); process.exit(1); });

/* The home base, drawn like the reference art: big homes with heart badges,
   Northern Virginia's mountains, name pills
   under them, glowing gold paths joining our places, and grey "ghost" cities
   out in the parts we have not explored yet. */

var HOMEBASE = [
  { id: 'hb-nova', name: 'Northern Virginia', lat: 38.79, lng: -77.40, r: 20, art: 'mountain', scale: 1.05 }
];
function homeBaseRegions() { return HOMEBASE.map(function (h) { return { id: h.id, name: h.name, lat: h.lat, lng: h.lng, r: h.r, home: 1 }; }); }

/* one size rule for every home sprite: big at the home-base view, bigger close in */
function homeArtH(z) { return Math.max(38, Math.min(78, 38 + (z - 6.9) * 9)); }   /* homes always stand well above the trees */

var HBBOX = {};
var HB_LABEL = { bruce: 'Calvert County' };
var HB_PILLS = { 'Northern Virginia': 1, 'Calvert County': 1 };
var GHOST_CITIES = [['Baltimore', 39.29, -76.61], ['Richmond', 37.54, -77.43], ['Philadelphia', 39.95, -75.17], ['Wilmington', 39.74, -75.55],
  ['Frederick', 39.41, -77.41], ['Fredericksburg', 38.30, -77.46], ['Harrisburg', 40.27, -76.88], ['Norfolk', 36.85, -76.29], ['Hagerstown', 39.64, -77.72]];

/* the gold paths between our places (drawn first, under the trees) */
HOOKS.terrain.unshift(function () {
  if (S.mode !== 'map' || S.zoom > 10.6) return;
  var P = {
    n: proj(HOMEBASE[0].lat, HOMEBASE[0].lng),
    e: proj(HOMES.elena.lat, HOMES.elena.lng), b: proj(HOMES.bruce.lat, HOMES.bruce.lng)
  };
  var links = [['e', 'b'], ['b', 'n'], ['n', 'e']];
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  function path(a, b, bow) {
    var dx = b.x - a.x, dy = b.y - a.y;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo((a.x + b.x) / 2 - dy * bow, (a.y + b.y) / 2 + dx * bow, b.x, b.y);
  }
  links.forEach(function (l, i) {
    var bow = i % 2 ? 0.14 : -0.12;
    path(P[l[0]], P[l[1]], bow); ctx.strokeStyle = 'rgba(245,216,142,.38)'; ctx.lineWidth = 8; ctx.stroke();
    path(P[l[0]], P[l[1]], bow); ctx.strokeStyle = 'rgba(231,183,101,.9)'; ctx.lineWidth = 2.2; ctx.stroke();
  });
  ctx.restore();
});

/* ghost cities and the two home-base landmarks (after the trees, so they sit on top) */
HOOKS.terrain.push(function () {
  if (S.mode !== 'map') return;
  var z = S.zoom;
  if (z > 5.6 && z < 9.6) {
    GHOST_CITIES.forEach(function (c) {
      if (isRevealed(c[1], c[2], 1.1)) return;
      var p = proj(c[1], c[2]);
      if (p.x < -60 || p.y < -10 || p.x > W + 60 || p.y > H + 60) return;
      ctx.save(); ctx.globalAlpha = 0.5;
      drawArt(ctx, 'city-ghost', p.x, p.y, Math.min(46, 24 + (z - 6) * 6), DPR);
      ctx.restore();
    });
  }
  HBBOX = {};
  HOMEBASE.forEach(function (h) {
    var p = proj(h.lat, h.lng);
    if (p.x < -80 || p.y < -20 || p.x > W + 80 || p.y > H + 80) return;
    var b = drawArt(ctx, h.art, p.x, p.y, homeArtH(z) * h.scale, DPR);
    if (b) { HBBOX[h.id] = b; addHit(b, { kind: 'beacon', lat: h.lat, lng: h.lng }); }
  });
});

/* heart badges and name pills (after the homes are drawn) */
function drawHeartBadge(x, y, color) {
  ctx.save();
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#D9A3B8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 11, 0, 6.283); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 4, y + 9); ctx.lineTo(x + 4, y + 9); ctx.lineTo(x, y + 15); ctx.closePath(); ctx.fill();
  ctx.restore();
  drawSprite(ctx, SP.heart, { h: color, o: '#6E2549' }, x, y + 7, 2, null);
}
function pill(x, y, text) { tryLabel(x, y, text, { size: 12, force: 1, bg: 'rgba(255,247,242,.96)', border: '#D9A3B8', fg: '#5B3046' }); }
HOOKS.beforePins.push(function () {
  if (S.mode !== 'map' || S.zoom > 9.8) return;
  ['elena', 'bruce'].forEach(function (k) {
    var b = HOMEBOXES[k]; if (!b) return;
    drawHeartBadge(b.x + b.w / 2, b.y - 16, C.pink);
    if (HB_LABEL[k]) pill(b.x + b.w / 2, b.y + b.h + 24, HB_LABEL[k]);
  });
  HOMEBASE.forEach(function (h) {
    var b = HBBOX[h.id]; if (!b) return;
    if (h.heart) drawHeartBadge(b.x + b.w / 2, b.y - 16, h.heart);
    pill(b.x + b.w / 2, b.y + b.h + 24, h.name);
  });
});

/* The home base, drawn like the reference art: big homes with heart badges,
   Northern Virginia's mountains, name pills
   under them, glowing gold paths joining our places, and grey "ghost" cities
   out in the parts we have not explored yet. */

var HOMEBASE = [
  { id: 'hb-nova', name: 'Northern Virginia', lat: 38.79, lng: -77.40, r: 20, art: 'soft-ridge', scale: 1.05 }
];
function homeBaseRegions() { return HOMEBASE.map(function (h) { return { id: h.id, name: h.name, lat: h.lat, lng: h.lng, r: h.r, home: 1 }; }); }

/* one size rule for every home sprite: big at the home-base view, bigger close in */
function homeArtH(z) { return Math.max(28, Math.min(117, 51 + (z - 6.9) * 15)); }

var HBBOX = {};
var HB_LABEL = { bruce: 'Chesapeake Beach', elena: 'Arnold · Annapolis' };
var HB_PILLS = { 'Northern Virginia': 1, 'Calvert County': 1 };
var GHOST_CITIES = [['Baltimore', 39.29, -76.61], ['Richmond', 37.54, -77.43], ['Philadelphia', 39.95, -75.17], ['Wilmington', 39.74, -75.55],
  ['Frederick', 39.41, -77.41], ['Fredericksburg', 38.30, -77.46], ['Harrisburg', 40.27, -76.88], ['Norfolk', 36.85, -76.29], ['Hagerstown', 39.64, -77.72]];

/* Physical paths are cached below vegetation in maryland-landscape.js. */

/* ghost cities and the two home-base landmarks (after the trees, so they sit on top) */
HOOKS.terrain.push(function () {
  if (S.mode !== 'map') return;
  var z = S.zoom;
  if (z > 5.6 && z < 9.6) {
    GHOST_CITIES.forEach(function (c) {
      if(marylandWeight(c[1],c[2])>.2)return;
      if (isRevealed(c[1], c[2], 1.1)) return;
      if (haversine(c[1], c[2], HOMES.elena.lat, HOMES.elena.lng) < 55 || haversine(c[1], c[2], HOMES.bruce.lat, HOMES.bruce.lng) < 55) return;   /* home stays countryside */
      var p = proj(c[1], c[2]);
      if (p.x < -60 || p.y < -10 || p.x > W + 60 || p.y > H + 60) return;
      ctx.save(); ctx.globalAlpha = 0.5;
      drawArt(ctx, 'city-ghost', p.x, p.y, Math.min(46, 24 + (z - 6) * 6), DPR);
      ctx.restore();
    });
  }
  HBBOX = {};
  HOMEBASE.forEach(function (h) {
    var p = repairPoint(h.id)||proj(h.lat, h.lng);
    if (p.x < -80 || p.y < -20 || p.x > W + 80 || p.y > H + 80) return;
    var hh=homeArtH(z)*h.scale,asset=artLoad(h.art);
    if(h.id==='hb-nova'&&asset.ok)hh=Math.min(hh,homeArtH(z)*1.55*asset.img.height/asset.img.width);
    var b = drawArt(ctx, h.art, p.x, p.y, hh, DPR);
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
function pill(x, y, text) { if(S.zoom>9.4)tryLabel(x, y, text, { size: 13 }); }
HOOKS.afterOverlays.push(function(){
  if(S.mode!=='map')return;
  var p=repairPoint('mail');p={x:p.x+40,y:p.y-30};
  if(p.x<0||p.x>W||p.y<30||p.y>H-80)return;
  drawHeartBadge(p.x,p.y,C.pink);
});
HOOKS.beforePins.push(function () {
  if (S.mode !== 'map' || S.zoom > 9.8) return;
  ['elena', 'bruce'].forEach(function (k) {
    var b = HOMEBOXES[k]; if (!b) return;
    if (HB_LABEL[k]) pill(b.x + b.w / 2, b.y + b.h + 24, HB_LABEL[k]);
  });
  HOMEBASE.forEach(function (h) {
    var b = HBBOX[h.id]; if (!b) return;
    pill(b.x + b.w / 2, b.y + b.h + 24, h.name);
  });
});

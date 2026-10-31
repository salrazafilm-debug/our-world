/* Location markers: a pin on "home" (and on far-off places we have been) that
   stays visible on the globe and on the zoomed-out map, so our place in the
   world is always easy to find. Tap a pin to fly straight there. */

SP.mapPin = [
  '..ooooo..', '.oPPPPPo.', 'oPPPPPPPo', 'oPPwwwPPo', 'oPPwwwPPo',
  'oPPPPPPPo', '.oPPPPPo.', '..oPPPo..', '...oPo...', '....o....'
];
PAL.mapPin = { P: C.pink, w: '#FFF0F6', o: '#6E2549' };

var globePins = [];

/* home first, then each far-off place we have cleared (one pin per ~3 degrees) */
function beaconSpots() {
  var hm = { lat: (HOMES.bruce.lat + HOMES.elena.lat) / 2, lng: (HOMES.bruce.lng + HOMES.elena.lng) / 2, home: true };
  var out = [hm], seen = {};
  allRegions().forEach(function (r) {
    if (r.home || haversine(hm.lat, hm.lng, r.lat, r.lng) < 420) return;
    var k = Math.round(r.lat / 3) + ',' + Math.round(r.lng / 3);
    if (seen[k]) return;
    seen[k] = 1; out.push({ lat: r.lat, lng: r.lng });
  });
  return out;
}

function drawBeaconPin(g, x, y, home, unit) {
  var ph = (cloudPhase / 38) % 1, bob = Math.round(Math.sin(cloudPhase / 6));
  g.save();
  g.strokeStyle = 'rgba(231,183,101,' + (0.9 * (1 - ph)).toFixed(2) + ')'; g.lineWidth = Math.max(1, unit);
  g.beginPath(); g.ellipse(x, y, (3 + ph * (home ? 11 : 7)) * unit, (1.4 + ph * (home ? 5 : 3)) * unit, 0, 0, 6.283); g.stroke();
  g.fillStyle = 'rgba(31,29,57,.30)'; g.fillRect(Math.round(x - 2 * unit), Math.round(y), 4 * unit, unit);
  g.restore();
  drawSprite(g, SP.mapPin, PAL.mapPin, x, y - unit + bob * unit, home ? unit : unit, '#FFFFFF');
}

/* called from the globe renderer; draws into the low-res base canvas */
function drawGlobeBeacons(g, pt, cx, cy, Rp, l0, sinp0, cosp0) {
  var k = W / baseCv.width, spots = beaconSpots();
  globePins = [];
  spots.forEach(function (sp) {
    var p = pt(sp.lng, sp.lat);
    if (p) {
      drawBeaconPin(g, p[0], p[1], sp.home, 1);
      globePins.push({ x: p[0] * k, y: p[1] * k, lat: sp.lat, lng: sp.lng, home: sp.home, edge: false });
    } else if (sp.home) {
      /* home is round the back: a small marker on the rim shows which way to turn */
      var dl = rad(sp.lng) - l0, ph = rad(sp.lat);
      var gx = Rp * Math.cos(ph) * Math.sin(dl), gy = Rp * (cosp0 * Math.sin(ph) - sinp0 * Math.cos(ph) * Math.cos(dl));
      var m = Math.hypot(gx, gy) || 1, ex = cx + gx / m * Rp * 0.92, ey = cy - gy / m * Rp * 0.92;
      g.save(); g.globalAlpha = 0.6; drawSprite(g, SP.mapPin, PAL.mapPin, ex, ey + 4, 1, '#FFFFFF'); g.restore();
      globePins.push({ x: ex * k, y: (ey - 4) * k, lat: sp.lat, lng: sp.lng, home: true, edge: true });
    }
  });
}
function handleGlobeTap(pos) {
  for (var i = 0; i < globePins.length; i++) {
    var p = globePins[i];
    if (Math.hypot(pos.x - p.x, pos.y - p.y) < 30) {
      if (p.edge) { S.globe.lon = p.lng; S.globe.lat = p.lat; draw(); }
      else enterMap(p.lat, p.lng, p.home ? 9.6 : 10.8);
      return;
    }
  }
}

/* on the flat map, pins appear once you are far enough out that the sprites shrink */
HOOKS.afterOverlays.push(function () {
  if (S.mode !== 'map' || S.zoom >= 8.6) return;
  var fade = Math.max(0, Math.min(1, (8.6 - S.zoom) / 1.4));
  ctx.imageSmoothingEnabled = false;
  beaconSpots().forEach(function (sp) {
    if (sp.home) return;                 /* home has its own heart badges now */
    var p = proj(sp.lat, sp.lng);
    if (p.x < -30 || p.y < -40 || p.x > W + 30 || p.y > H + 30) return;
    ctx.globalAlpha = fade;
    drawBeaconPin(ctx, p.x, p.y - 22, sp.home, 3);
    ctx.globalAlpha = 1;
    addHit({ x: p.x - 18, y: p.y - 74, w: 36, h: 60 }, { kind: 'beacon', lat: sp.lat, lng: sp.lng });
  });
  ctx.imageSmoothingEnabled = true;
});

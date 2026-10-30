/* Heat trail: a warm glow wherever we have actually been together — built only
   from things we know are true (memories, trip stops, "we're together"
   moments, cleared ground, and walks we chose to record), so it is accurate
   without ever tracking anyone in the background. */

S.moments = []; S.walks = [];
try { S.moments = JSON.parse(localStorage.getItem('ow.moments') || '[]'); S.walks = JSON.parse(localStorage.getItem('ow.walks') || '[]'); } catch (e) {}
ROWHOOKS.moments = function (rows) { S.moments = rows; try { localStorage.setItem('ow.moments', JSON.stringify(rows)); } catch (e) {} };
ROWHOOKS.walks = function (rows) { S.walks = rows; try { localStorage.setItem('ow.walks', JSON.stringify(rows)); } catch (e) {} };
AMB.heat = true;
try { AMB.heat = localStorage.getItem('ow.heat') !== 'off'; } catch (e) {}

/* both phones log the same moment under the same id, so it is only counted once */
function logMoment(p) {
  var rec = { lat: p.lat, lng: p.lng, date: todayISO(), at: Date.now() };
  var id = 'm' + rec.date + '_' + p.lat.toFixed(3) + '_' + p.lng.toFixed(3);
  rec.id = id;
  if (!S.moments.some(function (m) { return m.id === id; })) S.moments.push(rec);
  if (S.db) S.db.collection('moments').doc(id).set(rec).catch(function () {});
}

function heatPoints() {
  var pts = [];
  S.memories.forEach(function (m) { pts.push([m.lat, m.lng, 1]); });
  S.moments.forEach(function (m) { pts.push([m.lat, m.lng, 2.2]); });
  S.regions.forEach(function (r) { pts.push([r.lat, r.lng, .5]); });
  /* a walk adds a glow every ~6 points: enough to warm the route, light enough for a phone to draw every frame */
  S.walks.forEach(function (w) { (w.pts || []).forEach(function (p, i) { if (i % 6 === 0) pts.push([p[0], p[1], .5]); }); });
  return pts.length > 600 ? pts.slice(pts.length - 600) : pts;
}
HOOKS.beforePins.push(function () {
  if (S.mode !== 'map' || !AMB.heat) return;
  var pts = heatPoints(); if (!pts.length) return;
  var r = Math.max(26, Math.min(110, kmToPx(1.4)));
  ctx.save();
  pts.forEach(function (p) {
    var q = proj(p[0], p[1]);
    if (q.x < -r || q.y < -r || q.x > W + r || q.y > H + r) return;
    var a = Math.min(.42, .16 * p[2]);
    var g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
    g.addColorStop(0, 'rgba(255,170,120,' + a + ')');
    g.addColorStop(.5, 'rgba(243,169,199,' + (a * .55) + ')');
    g.addColorStop(1, 'rgba(243,169,199,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 6.283); ctx.fill();
  });
  /* walks we recorded: a soft dotted path */
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  S.walks.concat(WALK.rec ? [{ pts: WALK.pts }] : []).forEach(function (w) {
    var pp = w.pts || []; if (pp.length < 2) return;
    ctx.beginPath();
    pp.forEach(function (p, i) { var q = proj(p[0], p[1]); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
    ctx.strokeStyle = 'rgba(216,90,146,.25)'; ctx.lineWidth = 6; ctx.stroke();
    ctx.setLineDash([2, 6]); ctx.strokeStyle = 'rgba(216,90,146,.85)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]);
  });
  ctx.restore();
});

/* ---------- record our walk (only while you hold it on, with the app open) ---------- */
var WALK = { rec: false, pts: [], id: null, started: 0 };
try { var wd = JSON.parse(localStorage.getItem('ow.walk.draft') || 'null'); if (wd && wd.pts) { WALK.pts = wd.pts; WALK.started = wd.started; } } catch (e) {}
var walkBtn = document.createElement('button');
walkBtn.className = 'pxbtn'; walkBtn.id = 'walkBtn'; walkBtn.type = 'button'; walkBtn.hidden = true;
document.getElementById('stage').appendChild(walkBtn);
walkBtn.addEventListener('click', function () { stopWalk(true); });
function walkKm(pts) { var k = 0; for (var i = 1; i < pts.length; i++) k += haversine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); return k; }
function paintWalk() {
  walkBtn.hidden = !WALK.rec;
  if (WALK.rec) walkBtn.innerHTML = '<span class="rec-dot"></span> Recording · ' + walkKm(WALK.pts).toFixed(2) + ' km — Stop';
}
function startWalk() {
  if (!navigator.geolocation) { toast('This phone cannot share its location.', '📍', 3500); return; }
  WALK.rec = true; WALK.started = WALK.started || Date.now();
  WALK.id = navigator.geolocation.watchPosition(function (pos) {
    var c = pos.coords, last = WALK.pts[WALK.pts.length - 1];
    if (c.accuracy > 50) return;                                  /* too fuzzy to trust */
    if (last && haversine(last[0], last[1], c.latitude, c.longitude) * 1000 < 15) return;   /* GPS jitter */
    WALK.pts.push([+c.latitude.toFixed(6), +c.longitude.toFixed(6)]);
    try { localStorage.setItem('ow.walk.draft', JSON.stringify({ pts: WALK.pts, started: WALK.started })); } catch (e) {}
    paintWalk(); draw();
  }, function (err) {
    /* only a refusal ends the walk; a weak signal just waits for the next fix */
    if (err && err.code === 1) { toast('Location is blocked for this site.', '📍', 4000); stopWalk(true); }
    else if (!WALK.warned) { WALK.warned = true; toast('Weak GPS signal — still recording.', '📍', 3000); }
  }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 60000 });
  paintWalk(); toast('Recording your walk while the app is open.', '👣', 3600);
}
/* drop points that sit on a straight line (Douglas–Peucker, ~8 m) */
function simplify(pts, tolM) {
  if (pts.length < 3) return pts.slice();
  function perp(p, a, b) {
    var k = 111320, cos = Math.cos(a[0] * Math.PI / 180);
    var ax = a[1] * k * cos, ay = a[0] * k, bx = b[1] * k * cos, by = b[0] * k, px = p[1] * k * cos, py = p[0] * k;
    var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    var t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  }
  var keep = new Array(pts.length); keep[0] = keep[pts.length - 1] = true;
  (function rec(i, j) {
    var md = 0, mi = -1;
    for (var k = i + 1; k < j; k++) { var d = perp(pts[k], pts[i], pts[j]); if (d > md) { md = d; mi = k; } }
    if (md > tolM && mi > 0) { keep[mi] = true; rec(i, mi); rec(mi, j); }
  })(0, pts.length - 1);
  return pts.filter(function (p, i) { return keep[i]; });
}
function stopWalk(save) {
  if (WALK.id != null) navigator.geolocation.clearWatch(WALK.id);
  WALK.id = null; WALK.rec = false;
  var pts = simplify(WALK.pts, 8);
  if (save && pts.length >= 2) {
    var rec = { id: uid(), by: S.who, at: Date.now(), start: WALK.started, km: +walkKm(pts).toFixed(2), pts: pts };
    S.walks.push(rec);
    try { localStorage.setItem('ow.walks', JSON.stringify(S.walks)); } catch (e) {}
    if (S.db) S.db.collection('walks').doc(rec.id).set(rec).catch(function () {});
    toast('Walk saved · ' + rec.km + ' km', '👣', 3600); sparkle();
  } else if (save) toast('Too short to save — walk a little further next time.', '👣', 3600);
  WALK.pts = []; WALK.started = 0;
  try { localStorage.removeItem('ow.walk.draft'); } catch (e) {}
  paintWalk(); draw();
}
ACTIONS['walk'] = function () { closeSheet(); if (WALK.rec) stopWalk(true); else startWalk(); };
if (WALK.pts.length) setTimeout(function () { toast('You have an unfinished walk — open ✨ to keep recording or save it.', '👣', 5200); }, 5000);

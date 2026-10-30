/* Ambient life: light that follows the real time of day, weather that follows
   the season, and a burst of sparkle when new ground is cleared. */

var AMB = { tod: 'live', weather: true };
try {
  AMB.tod = localStorage.getItem('ow.tod') || 'live';
  AMB.weather = localStorage.getItem('ow.weather') !== 'off';
} catch (e) {}

function ambHour() {
  if (AMB.tod === 'day') return 12;
  if (AMB.tod === 'night') return 23;
  var d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}
function ambIsNight(h) { return h < 5.5 || h > 19.5; }

/* [hour, r, g, b, alpha] — blended between neighbours, wrapping midnight */
var AMB_LIGHT = [
  [0, 22, 24, 70, .34], [5, 30, 32, 84, .30], [6.5, 255, 150, 110, .16], [8, 255, 230, 200, 0],
  [16.5, 255, 240, 210, 0], [18, 255, 160, 80, .16], [19.5, 110, 70, 120, .24], [21, 25, 26, 74, .32],
  [24, 22, 24, 70, .34]
];
function ambTint(h) {
  for (var i = 0; i < AMB_LIGHT.length - 1; i++) {
    var a = AMB_LIGHT[i], b = AMB_LIGHT[i + 1];
    if (h >= a[0] && h <= b[0]) {
      var t = (h - a[0]) / (b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t, a[4] + (b[4] - a[4]) * t];
    }
  }
  return [0, 0, 0, 0];
}

HOOKS.afterFog.push(function () {
  var t = ambTint(ambHour());
  if (t[3] < 0.01) return;
  ctx.fillStyle = 'rgba(' + (t[0] | 0) + ',' + (t[1] | 0) + ',' + (t[2] | 0) + ',' + t[3].toFixed(3) + ')';
  ctx.fillRect(0, 0, W, H);
});

/* ---------- seasonal weather ---------- */
function ambSeason(night) {
  var m = new Date().getMonth();
  if (m === 11 || m < 2) return 'snow';
  if (m < 5) return 'petal';
  if (m < 8) return night ? 'firefly' : 'seed';
  return 'leaf';
}
var AMB_COLORS = {
  snow: ['#FFFFFF', '#EAF4FF'],
  petal: ['#F3A9C7', '#FBD3E4', '#FFFFFF'],
  leaf: ['#E7B765', '#D9825B', '#C2574A'],
  seed: ['#FFFFFF'],
  firefly: ['#F5D88E', '#FFE9A8']
};
var ambP = { list: [], kind: '', last: 0 };

function ambMake(kind, initial) {
  var cols = AMB_COLORS[kind];
  var p = {
    x: Math.random() * W, y: initial ? Math.random() * H : -6,
    ph: Math.random() * 6.28, c: cols[(Math.random() * cols.length) | 0], sz: 2
  };
  if (kind === 'snow') { p.vx = -4 + Math.random() * 8; p.vy = 18 + Math.random() * 16; p.sz = Math.random() < .3 ? 3 : 2; }
  else if (kind === 'petal') { p.vx = 14 + Math.random() * 16; p.vy = 16 + Math.random() * 14; p.sz = 3; }
  else if (kind === 'leaf') { p.vx = -10 - Math.random() * 14; p.vy = 20 + Math.random() * 16; p.sz = 3; }
  else if (kind === 'seed') { p.vx = 8 + Math.random() * 8; p.vy = -4 - Math.random() * 5; p.y = initial ? Math.random() * H : H + 6; }
  else { p.vx = -3 + Math.random() * 6; p.vy = -3 + Math.random() * 6; p.y = initial ? Math.random() * H : Math.random() * H; }
  return p;
}

HOOKS.afterOverlays.push(function () {
  if (reduceMotion || !AMB.weather || S.mode !== 'map') return;
  var now = performance.now(), dt = Math.min(0.1, (now - ambP.last) / 1000 || 0.05);
  ambP.last = now;
  var kind = ambSeason(ambIsNight(ambHour()));
  var want = Math.min(48, Math.round(W * H / 11000));
  if (kind !== ambP.kind) { ambP.kind = kind; ambP.list = []; }
  while (ambP.list.length < want) ambP.list.push(ambMake(kind, true));
  ctx.imageSmoothingEnabled = false;
  for (var i = 0; i < ambP.list.length; i++) {
    var p = ambP.list[i];
    p.ph += dt * 2;
    p.x += (p.vx + Math.sin(p.ph) * 6) * dt;
    p.y += p.vy * dt;
    if (p.y > H + 8 || p.x > W + 8 || p.x < -8 || p.y < -10) { ambP.list[i] = ambMake(kind, false); if (kind === 'leaf') ambP.list[i].x = Math.random() * (W + 80); continue; }
    ctx.globalAlpha = kind === 'firefly' ? 0.25 + 0.75 * Math.max(0, Math.sin(p.ph * 1.3)) : (kind === 'seed' ? .55 : .85);
    ctx.fillStyle = p.c;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.sz, kind === 'petal' ? 2 : p.sz);
    if (kind === 'firefly') { ctx.globalAlpha *= .25; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, p.sz + 2, p.sz + 2); }
  }
  ctx.globalAlpha = 1;
});

/* ---------- discovery burst ---------- */
var AMB_BURST = { dots: [], rings: [], last: 0 };
var AMB_BCOLS = ['#F3A9C7', '#E7B765', '#FFFFFF', '#D85A92', '#F5D88E'];
function fxDiscover(lat, lng) {
  if (reduceMotion) return;
  var p = proj(lat, lng);
  for (var i = 0; i < 38; i++) {
    var a = Math.random() * 6.283, sp = 60 + Math.random() * 150;
    AMB_BURST.dots.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 1, sz: Math.random() < .35 ? 4 : 3, c: AMB_BCOLS[i % AMB_BCOLS.length] });
  }
  AMB_BURST.rings.push({ x: p.x, y: p.y, r: 6, life: 1 });
  AMB_BURST.rings.push({ x: p.x, y: p.y, r: 2, life: 1.25 });
}
/* confetti from the top of the screen, for anniversaries */
function fxConfetti() {
  if (reduceMotion) return;
  for (var i = 0; i < 90; i++) {
    AMB_BURST.dots.push({ x: Math.random() * W, y: -10 - Math.random() * 120, vx: -40 + Math.random() * 80, vy: 20 + Math.random() * 90,
      life: 1.6 + Math.random(), sz: Math.random() < .4 ? 4 : 3, c: AMB_BCOLS[i % AMB_BCOLS.length] });
  }
}
HOOKS.afterOverlays.push(function () {
  var B = AMB_BURST;
  if (!B.dots.length && !B.rings.length) return;
  var now = performance.now(), dt = Math.min(0.1, (now - B.last) / 1000 || 0.05);
  B.last = now;
  var i, d;
  for (i = B.rings.length - 1; i >= 0; i--) {
    d = B.rings[i]; d.r += 150 * dt; d.life -= dt * 1.1;
    if (d.life <= 0) { B.rings.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, d.life); ctx.strokeStyle = '#E7B765'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.stroke();
  }
  ctx.imageSmoothingEnabled = false;
  for (i = B.dots.length - 1; i >= 0; i--) {
    d = B.dots[i]; d.vy += (d.life > 1.2 ? 40 : 190) * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt * 0.8;
    if (d.life <= 0) { B.dots.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, d.life * 1.4); ctx.fillStyle = d.c;
    ctx.fillRect(Math.round(d.x), Math.round(d.y), d.sz, d.sz);
  }
  ctx.globalAlpha = 1;
});

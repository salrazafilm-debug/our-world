/* Avatars: the two of you as little characters. They appear on the map when
   you are live, hold hands when you are together, and each can change outfit
   colours (top, bottom, shoes). The art is avatars/<who>.png plus a mask PNG
   whose red / green / blue channels mark the top / bottom / shoes. */

var AV_SLOTS = ['top', 'bottom', 'shoes'];
var AV_COLORS = [
  { id: 'orig', name: 'Original', c: null },
  { id: 'rose', name: 'Rose', c: '#D85A92' }, { id: 'blush', name: 'Blush', c: '#F3A9C7' },
  { id: 'coral', name: 'Coral', c: '#E8765C' }, { id: 'gold', name: 'Gold', c: '#E7B765' },
  { id: 'mint', name: 'Mint', c: '#6BBF8E' }, { id: 'sky', name: 'Sky', c: '#63B9C7' },
  { id: 'blue', name: 'Blue', c: '#4F74C9' }, { id: 'violet', name: 'Violet', c: '#A58BD9' },
  { id: 'cream', name: 'Cream', c: '#F2EBDD' }, { id: 'black', name: 'Black', c: '#2B2530' }
];
/* average brightness of each original garment, so shading survives a recolour */
var AV_REF = { bruce: { top: .12, bottom: .101, shoes: .183 }, elena: { top: .102, bottom: .535, shoes: .092 } };
var AVIMG = {}, AVCACHE = {};
var AV_ON = true;
try { AV_ON = localStorage.getItem('ow.avon') !== 'off'; } catch (e) {}
var HOMEBOXES = {};         /* where each home sprite was drawn this frame (set by the map renderer) */
S.avatars = {};
try { S.avatars = JSON.parse(localStorage.getItem('ow.avatars') || '{}') || {}; } catch (e) {}
ROWHOOKS.avatars = function (rows) {
  rows.forEach(function (r) { S.avatars[r.id] = { top: r.top || null, bottom: r.bottom || null, shoes: r.shoes || null }; });
  try { localStorage.setItem('ow.avatars', JSON.stringify(S.avatars)); } catch (e) {}
};

function avLoad(who) {
  if (AVIMG[who]) return AVIMG[who];
  var e = AVIMG[who] = { ready: false }, a = new Image(), m = new Image(), n = 0;
  function done() {
    if (++n < 2) return;
    function grab(img) {
      var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      var g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height);
    }
    e.base = grab(a); e.mask = grab(m); e.ready = true;
  }
  a.onload = done; m.onload = done;
  a.onerror = m.onerror = function () { e.bad = true; };
  a.src = 'avatars/' + who + '.png'; m.src = 'avatars/' + who + '-mask.png';
  return e;
}
function avColor(id) { for (var i = 0; i < AV_COLORS.length; i++) if (AV_COLORS[i].id === id) return AV_COLORS[i].c; return null; }
function avOutfit(who) { return S.avatars[who] || {}; }

function hexToHsl(hex) {
  var r = parseInt(hex.substr(1, 2), 16) / 255, g = parseInt(hex.substr(3, 2), 16) / 255, b = parseInt(hex.substr(5, 2), 16) / 255;
  var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0;
  if (d) {
    s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
  }
  return { h: h, s: s, l: l };
}
function hslToRgb(h, s, l) {
  function f(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
  if (!s) return [l * 255, l * 255, l * 255];
  var q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
}

/* Recolour the masked garments (keeping their shading). Cached per outfit. */
function avRecolor(who, o) {
  var e = avLoad(who);
  if (!e.ready) return null;
  var key = who + '|' + (o.top || '') + '|' + (o.bottom || '') + '|' + (o.shoes || '');
  if (AVCACHE[key]) return AVCACHE[key];
  var w0 = e.base.width, h0 = e.base.height;
  var img = new ImageData(new Uint8ClampedArray(e.base.data), w0, h0), d = img.data, md = e.mask.data;
  AV_SLOTS.forEach(function (slot, si) {
    var col = avColor(o[slot]);
    if (!col) return;
    var t = hexToHsl(col), ref = AV_REF[who][slot];
    for (var i = 0; i < d.length; i += 4) {
      if (!d[i + 3] || md[i + si] < 128) continue;
      var L = (.299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]) / 255;
      var nl = Math.max(.05, Math.min(.95, t.l + (L - ref) * 1.25));
      var rgb = hslToRgb(t.h, t.s, nl);
      d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2];
    }
  });
  var c0 = document.createElement('canvas'); c0.width = w0; c0.height = h0; c0.getContext('2d').putImageData(img, 0, 0);
  AVCACHE[key] = c0;
  return c0;
}
/* A copy at exactly the pixel height it will be shown at — so it is sharp at
   every zoom instead of being squashed from one big image. Aspect ratio kept. */
var AVSIZED = {};
function avSized(who, o, px) {
  var src = avRecolor(who, o);
  if (!src) return null;
  px = Math.max(12, Math.round(px));
  var key = who + '|' + (o.top || '') + '|' + (o.bottom || '') + '|' + (o.shoes || '') + '@' + px;
  if (AVSIZED[key]) return AVSIZED[key];
  var pw = Math.max(4, Math.round(src.width * px / src.height));
  var c = document.createElement('canvas'); c.width = pw; c.height = px;
  var g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, pw, px);
  var id = g.getImageData(0, 0, pw, px);
  for (var k = 3; k < id.data.length; k += 4) id.data[k] = id.data[k] > 110 ? 255 : 0;
  g.putImageData(id, 0, 0);
  AVSIZED[key] = c;
  return c;
}
/* the avatar's width for a given height */
function avWidth(who, h) { var e = avLoad(who); return e.ready ? h * e.base.width / e.base.height : h * .42; }

/* Draws one avatar standing on (x, y), h tall (css px). `res` is device pixels
   per css pixel of the target canvas. Returns its box. */
function drawAvatar(g, who, x, y, h, outfit, opt) {
  opt = opt || {};
  var res = opt.res || 1;
  var c = avSized(who, outfit || avOutfit(who), h * res);
  if (!c) return null;
  var w = c.width / res, hh = c.height / res;
  g.save();
  g.fillStyle = 'rgba(61,40,56,.20)';
  g.beginPath(); g.ellipse(x, y, w * .42, Math.max(1.5, hh * .035), 0, 0, 6.283); g.fill();
  g.imageSmoothingEnabled = false;
  var top = y - hh + (opt.lift || 0);
  if (opt.flip) { g.translate(Math.round(x), 0); g.scale(-1, 1); g.drawImage(c, Math.round(-w / 2), Math.round(top), w, hh); }
  else g.drawImage(c, Math.round(x - w / 2), Math.round(top), w, hh);
  g.restore();
  return { x: x - w / 2, y: top, w: w, h: hh };
}
/* both of you side by side, shoulder to shoulder, a heart above */
function drawTogetherPair(g, x, y, h, res) {
  var wb = avWidth('bruce', h), we = avWidth('elena', h);
  var a = drawAvatar(g, 'bruce', x - wb * .42, y, h, null, { res: res, lift: avBob(0) }),
      b = drawAvatar(g, 'elena', x + we * .42, y, h, null, { res: res, lift: avBob(1.3) });
  if (!a || !b) return null;
  var bob = 0;
  drawSprite(g, SP.heart, PAL.heartP, x, Math.round(y - h - 3 + bob), Math.max(1, Math.min(4, Math.round(h / 40))), '#FFFFFF');
  return { x: a.x, y: a.y - 8, w: b.x + b.w - a.x, h: h + 8 };
}
/* a slow breath while standing still */
function avBob() { return 0; }          /* avatars stand perfectly still */

/* the sign-in screen shows the two of you once the art has loaded */
(function gateAvatars(tries) {
  var pair = document.querySelector('#gate .pair');
  if (!pair) return;
  var a = avLoad('bruce'), b = avLoad('elena');
  if (!a.ready || !b.ready) { if ((tries || 0) < 60) setTimeout(function () { gateAvatars((tries || 0) + 1); }, 150); return; }
  var dpr = Math.min(3, window.devicePixelRatio || 1), cssH = 116;
  var c = document.createElement('canvas');
  c.width = Math.round(110 * dpr); c.height = Math.round((cssH + 30) * dpr);
  c.style.width = '110px'; c.style.height = (cssH + 30) + 'px'; c.className = 'gate-av';
  var g = c.getContext('2d');
  drawTogetherPair(g, c.width / 2, c.height - 3 * dpr, cssH * dpr, 1);
  pair.innerHTML = ''; pair.appendChild(c);
})();

/* ---------- customise ---------- */
var AVD = null;
function avPreviewDraw() {
  [['avA', S.who, AVD], ['avB', other(S.who), avOutfit(other(S.who))]].forEach(function (p) {
    var c = document.getElementById(p[0]); if (!c) return;
    var g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
    if (!drawAvatar(g, p[1], c.width / 2, c.height - 8, c.height - 22, p[2])) setTimeout(avPreviewDraw, 200);
  });
}
function openAvatars() {
  avLoad('bruce'); avLoad('elena');
  AVD = { top: avOutfit(S.who).top || 'orig', bottom: avOutfit(S.who).bottom || 'orig', shoes: avOutfit(S.who).shoes || 'orig' };
  var label = { top: 'Top', bottom: S.who === 'elena' ? 'Skirt' : 'Trousers', shoes: 'Shoes' };
  openSheet(head('Our avatars', 'change your outfit colours') +
    '<div class="av-stage"><div><canvas id="avA" width="170" height="300"></canvas><span>' + esc(whoName(S.who)) + ' (you)</span></div>' +
    '<div><canvas id="avB" width="170" height="300"></canvas><span>' + esc(whoName(other(S.who))) + '</span></div></div>' +
    AV_SLOTS.map(function (slot) {
      return '<div class="av-row"><b>' + label[slot] + '</b><div class="swatches">' + AV_COLORS.map(function (c) {
        return '<button type="button" class="sw' + (AVD[slot] === c.id ? ' on' : '') + '" data-act="av-set" data-slot="' + slot + '" data-c="' + c.id + '" title="' + c.name + '" aria-label="' + label[slot] + ' ' + c.name + '"' +
          (c.c ? ' style="background:' + c.c + '"' : '') + '>' + (c.c ? '' : '↺') + '</button>';
      }).join('') + '</div></div>';
    }).join('') +
    '<div class="sheet-actions" style="margin-top:14px"><button class="pxbtn primary" type="button" data-act="av-save">Save my outfit</button>' +
    '<button class="pxbtn" type="button" data-act="more">Back</button></div>');
  avPreviewDraw();
}
ACTIONS['avatars'] = openAvatars;
ACTIONS['av-set'] = function (b) {
  AVD[b.dataset.slot] = b.dataset.c;
  [].forEach.call(sheet.querySelectorAll('.sw[data-slot="' + b.dataset.slot + '"]'), function (x) { x.classList.toggle('on', x === b); });
  avPreviewDraw();
};
ACTIONS['av-save'] = function () {
  var rec = { top: AVD.top === 'orig' ? null : AVD.top, bottom: AVD.bottom === 'orig' ? null : AVD.bottom, shoes: AVD.shoes === 'orig' ? null : AVD.shoes, by: S.who, at: Date.now() };
  S.avatars[S.who] = { top: rec.top, bottom: rec.bottom, shoes: rec.shoes };
  try { localStorage.setItem('ow.avatars', JSON.stringify(S.avatars)); } catch (e) {}
  if (S.db) S.db.collection('avatars').doc(S.who).set(rec).catch(function () { toast('Saved on this device — could not reach the shared world.', '⚠️', 4000); });
  toast('Looking good!', '👗', 2600); sparkle();
  draw();
};

ACTIONS['av-toggle'] = function () {
  AV_ON = !AV_ON;
  try { localStorage.setItem('ow.avon', AV_ON ? 'on' : 'off'); } catch (e) {}
  openMenu(); draw();
};

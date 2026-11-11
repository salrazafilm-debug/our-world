/* Memories with a photo show on the map as little pixel polaroids. */

var POL = {};
function polHash(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

/* The photo is shrunk to a small grid, then scaled up unsmoothed: real pixel art.
   The whole photo is kept (never cropped); a wide or tall one sits on a soft matte. */
var POL_N = 28;
function polEntry(url) {
  var e = POL[url];
  if (e) return e;
  e = POL[url] = { ok: false, cv: null };
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function () {
    var n = POL_N, c = document.createElement('canvas'); c.width = n; c.height = n;
    var g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.fillStyle = '#F3E2CB'; g.fillRect(0, 0, n, n);
    var k = Math.min(n / img.naturalWidth, n / img.naturalHeight), dw = img.naturalWidth * k, dh = img.naturalHeight * k;
    g.drawImage(img, (n - dw) / 2, (n - dh) / 2, dw, dh);
    e.cv = c; e.ok = true;
  };
  img.onerror = function () { e.bad = true; };
  img.src = url;
  return e;
}

function polaroidPin(m, p, z) {
  if (z < 9.2) return null;
  var urls = photoCandidates((m.photos && m.photos[0]) || m);
  if (!urls.length) return null;
  var e = polEntry(urls[0]);
  if (!e.ok) return null;
  var s = Math.max(1, Math.min(1.5, 1 + (z - 10) * 0.15)), ph = Math.round(42 * s), w = ph + Math.round(10 * s), h = ph + Math.round(20 * s), lift = Math.round(10 * s);
  var rot = ((polHash(m.id) % 13) - 6) * Math.PI / 180;
  ctx.save();
  ctx.translate(p.x, p.y - lift - h / 2);
  ctx.rotate(rot);
  ctx.fillStyle = 'rgba(61,40,56,.28)'; ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = C.deep; ctx.lineWidth = 2; ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(e.cv, 0, 0, POL_N, POL_N, -ph / 2, -h / 2 + Math.round(5 * s), ph, ph);
  ctx.fillStyle = C.pink;
  var hx = 0, hy = h / 2 - Math.round(9 * s), u = Math.max(2, Math.round(2.5 * s));
  ctx.fillRect(hx - u, hy - u, u, u); ctx.fillRect(hx + 0, hy - u, u, u);
  ctx.fillRect(hx - u, hy, u * 2, u);
  ctx.restore();
  ctx.fillStyle = C.deep;
  ctx.beginPath(); ctx.moveTo(p.x - 4, p.y - lift); ctx.lineTo(p.x + 4, p.y - lift); ctx.lineTo(p.x, p.y); ctx.closePath(); ctx.fill();
  ctx.imageSmoothingEnabled = true;
  return { x: p.x - w / 2, y: p.y - lift - h, w: w, h: h + lift };
}

/* The art pack: sprites cut from the new texture sheet (art/*.png). Each is
   shrunk once to the exact pixel height it is drawn at, so it stays sharp at
   every zoom, and keeps its proportions. */

var ART = {}, ARTSIZED = {};
function artLoad(name) {
  if (ART[name]) return ART[name];
  var e = ART[name] = { ok: false }, im = new Image();
  im.onload = function () { e.img = im; e.ok = true; };
  im.onerror = function () { e.bad = true; };
  im.src = 'art/' + name + '.png';
  return e;
}
['castle-pink', 'cottage', 'mountain', 'lighthouse', 'city', 'tree-cherry', 'tree-pine', 'tree-oak', 'bush-pink', 'boat', 'rock', 'flowers', 'sign']
  .forEach(artLoad);
['city-ghost', 'blossom'].forEach(artLoad);

function artSized(name, h, res) {
  var e = artLoad(name);
  if (!e.ok) return null;
  var px = Math.max(8, Math.round(h * (res || 1))), key = name + '@' + px;
  if (ARTSIZED[key]) return ARTSIZED[key];
  var pw = Math.max(4, Math.round(e.img.width * px / e.img.height));
  var c = document.createElement('canvas'); c.width = pw; c.height = px;
  var g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(e.img, 0, 0, pw, px);
  var id = g.getImageData(0, 0, pw, px);
  for (var k = 3; k < id.data.length; k += 4) id.data[k] = id.data[k] > 100 ? 255 : 0;
  g.putImageData(id, 0, 0);
  return (ARTSIZED[key] = c);
}
/* A soft-focus copy for the cinematic edges: shrink, then stretch back with
   smoothing. Works in every browser (no canvas filters needed). */
function artSoft(name, h, res) {
  var sharp = artSized(name, h, res);
  if (!sharp) return null;
  var key = name + '@' + sharp.height + '~soft';
  if (ARTSIZED[key]) return ARTSIZED[key];
  var sw = Math.max(2, Math.round(sharp.width / 3)), sh = Math.max(2, Math.round(sharp.height / 3));
  var t = document.createElement('canvas'); t.width = sw; t.height = sh;
  var tg = t.getContext('2d'); tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = 'high'; tg.drawImage(sharp, 0, 0, sw, sh);
  var c = document.createElement('canvas'); c.width = sharp.width; c.height = sharp.height;
  var g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(t, 0, 0, sharp.width, sharp.height);
  return (ARTSIZED[key] = c);
}
/* stands on (x, y), h tall (css px); returns its box, or null while the art loads */
function drawArt(g, name, x, y, h, res, soft) {
  var c = soft ? artSoft(name, h, res) : artSized(name, h, res);
  if (!c) return null;
  var w = c.width / (res || 1), hh = c.height / (res || 1);
  g.save(); g.imageSmoothingEnabled = !!soft;
  g.drawImage(c, Math.round(x - w / 2), Math.round(y - hh), w, hh);
  g.restore();
  return { x: x - w / 2, y: y - hh, w: w, h: hh };
}

/* Photos on a new memory.
   Add as many as you like. Each one is kept whole: nothing is cut unless you
   choose Crop and drag the box yourself. A small preview shows the page the
   memory will have in the Memories Book, and updates as you write.
   Used by memoryForm() and saveMemory() in index.html. Style rules: STYLE.md. */

var MEMPH = { items: [], ll: null, timer: 0 };
var MP_MAX = 12;

(function () {
  var st = document.createElement('style');
  st.textContent = [
    '.mp-thumbs{display:flex;flex-wrap:wrap;gap:14px 12px;margin-top:12px}',
    '.mp-thumb{position:relative;width:108px;background:#fff;border:2px solid #E2C2AE;padding:6px 6px 30px;box-shadow:0 3px 0 rgba(120,70,60,.22)}',
    '.mp-thumb img{display:block;width:100%;height:84px;object-fit:contain;background:#F3E2CB}',
    '.mp-x{position:absolute;right:-9px;top:-9px;width:28px;height:28px;padding:0;border:3px solid var(--berry);background:var(--cream);color:var(--berry);font:600 14px var(--fdisp);line-height:1;cursor:pointer}',
    '.mp-crop{position:absolute;left:4px;right:4px;bottom:4px;height:22px;border:0;background:none;color:var(--berry);font:600 14px var(--fdisp);cursor:pointer;padding:0}',
    '.mp-crop:hover{text-decoration:underline}',
    '#mpCrop{position:fixed;inset:0;z-index:90;display:none;align-items:center;justify-content:center;background:rgba(40,15,20,.86);padding:16px}',
    '#mpCrop.on{display:flex}',
    '.mpc-card{background:var(--paper);border:4px solid var(--wood-dk);border-bottom-width:8px;padding:14px;max-width:100%;display:flex;flex-direction:column;align-items:center;gap:12px;clip-path:var(--px-step)}',
    '.mpc-card h3{margin:0;font-family:var(--ftitle);color:var(--berry);font-size:24px;font-weight:700}',
    '.mpc-card .hint{margin:0;text-align:center}',
    '.mpc-stage{position:relative;touch-action:none;-webkit-user-select:none;user-select:none;line-height:0;background:#F3E2CB}',
    '.mpc-stage img{display:block;pointer-events:none}',
    '.mpc-box{position:absolute;border:3px solid #fff;outline:2px solid var(--berry);box-shadow:0 0 0 9999px rgba(40,15,20,.62);cursor:move;touch-action:none}',
    '.mpc-h{position:absolute;width:28px;height:28px;background:var(--cream);border:3px solid var(--berry);touch-action:none}',
    '.mpc-h.nw{left:-16px;top:-16px;cursor:nwse-resize}.mpc-h.ne{right:-16px;top:-16px;cursor:nesw-resize}',
    '.mpc-h.sw{left:-16px;bottom:-16px;cursor:nesw-resize}.mpc-h.se{right:-16px;bottom:-16px;cursor:nwse-resize}',
    '.mpc-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}'
  ].join('');
  document.head.appendChild(st);
})();

/* the Photos field of the memory form */
function memPhotosHtml() {
  return '<div class="field"><label for="m-photo">Photos (optional, add as many as you like)</label>' +
    '<input id="m-photo" type="file" accept="image/*" multiple>' +
    '<div class="mp-thumbs" id="mpThumbs"></div>' +
    '<p class="hint">Each photo is kept whole. Tap Crop under a photo only if you want to cut it.</p></div>';
}
/* the live preview field */
function memPreviewField() {
  return '<div class="field"><label>How it will look in the book</label><div id="m-preview"></div></div>';
}

function memPhotosInit(ll) {
  MEMPH.items.forEach(function (it) { try { URL.revokeObjectURL(it.url); } catch (e) {} });
  MEMPH.items = []; MEMPH.ll = ll;
  var inp = document.getElementById('m-photo'), th = document.getElementById('mpThumbs'); if (!inp || !th) return;
  inp.addEventListener('change', function () {
    var over = false;
    Array.prototype.forEach.call(inp.files || [], function (f) {
      if (MEMPH.items.length >= MP_MAX) { over = true; return; }
      MEMPH.items.push({ orig: f, cur: f, url: URL.createObjectURL(f), cropped: false });
    });
    inp.value = '';
    if (over) toast('A memory can hold up to ' + MP_MAX + ' photos.', '📷', 3500);
    memPhotosPaint(); memPreviewSoon();
  });
  th.addEventListener('click', function (e) {
    var b = e.target.closest('[data-mp]'); if (!b) return;
    var i = parseInt(b.dataset.i, 10);
    if (b.dataset.mp === 'crop') mpCrop(i);
    else if (b.dataset.mp === 'del') {
      var gone = MEMPH.items.splice(i, 1)[0]; if (gone) { try { URL.revokeObjectURL(gone.url); } catch (er) {} }
      memPhotosPaint(); memPreviewSoon();
    }
  });
  ['m-title', 'm-note', 'm-date'].forEach(function (id) { var el = document.getElementById(id); if (el) { el.addEventListener('input', memPreviewSoon); el.addEventListener('change', memPreviewSoon); } });
  memPhotosPaint(); memPreviewPaint();
}
function memPhotosPaint() {
  var th = document.getElementById('mpThumbs'); if (!th) return;
  th.innerHTML = MEMPH.items.map(function (it, i) {
    return '<div class="mp-thumb"><img alt="" src="' + it.url + '"><button class="mp-x" type="button" data-mp="del" data-i="' + i + '" aria-label="Remove this photo">✕</button>' +
      '<button class="mp-crop" type="button" data-mp="crop" data-i="' + i + '">' + (it.cropped ? 'Recrop' : 'Crop') + '</button></div>';
  }).join('');
}
function memPreviewSoon() { clearTimeout(MEMPH.timer); MEMPH.timer = setTimeout(memPreviewPaint, 120); }
function memPreviewPaint() {
  var box = document.getElementById('m-preview'); if (!box || !MEMPH.ll) return;
  var g = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
  box.innerHTML = bkPreviewHtml({
    title: g('m-title').trim(), note: g('m-note').trim(), date: g('m-date') || todayISO(),
    lat: MEMPH.ll.lat, lng: MEMPH.ll.lng, by: S.who, srcs: MEMPH.items.map(function (it) { return it.url; })
  });
  bkPreviewFit(box);
}
/* what saveMemory uploads: each photo as it stands now (whole, or cropped by you) */
function memPhotoFiles() { return MEMPH.items.map(function (it) { return it.cur; }).slice(0, MP_MAX); }

/* ---------- the crop box: drag it to move, drag a corner to resize ---------- */
function mpCrop(i) {
  var it = MEMPH.items[i]; if (!it) return;
  var ov = document.getElementById('mpCrop');
  if (!ov) { ov = document.createElement('div'); ov.id = 'mpCrop'; document.body.appendChild(ov); }
  var url = URL.createObjectURL(it.orig), im = new Image();
  im.onerror = function () { URL.revokeObjectURL(url); toast('That photo could not be opened for cropping.', '📷', 3500); };
  im.onload = function () {
    var nw = im.naturalWidth, nh = im.naturalHeight, maxW = Math.min(innerWidth - 64, 640), maxH = Math.max(160, innerHeight - 230);
    var d = Math.min(maxW / nw, maxH / nh), dw = Math.round(nw * d), dh = Math.round(nh * d);
    var r = { x: Math.round(dw * 0.08), y: Math.round(dh * 0.08), w: Math.round(dw * 0.84), h: Math.round(dh * 0.84) };
    ov.innerHTML = '<div class="mpc-card"><h3>Crop this photo</h3>' +
      '<div class="mpc-stage" style="width:' + dw + 'px;height:' + dh + 'px"><img alt="" src="' + url + '" width="' + dw + '" height="' + dh + '">' +
        '<div class="mpc-box" id="mpcBox"><i class="mpc-h nw" data-h="nw"></i><i class="mpc-h ne" data-h="ne"></i><i class="mpc-h sw" data-h="sw"></i><i class="mpc-h se" data-h="se"></i></div></div>' +
      '<p class="hint">Drag the box to move it, or a corner to resize it.</p>' +
      '<div class="mpc-row"><button class="pxbtn primary" type="button" data-mpc="ok">Use crop</button><button class="pxbtn" type="button" data-mpc="whole">Whole photo</button><button class="pxbtn" type="button" data-mpc="cancel">Cancel</button></div></div>';
    ov.classList.add('on');
    var box = document.getElementById('mpcBox');
    function paint() { box.style.left = r.x + 'px'; box.style.top = r.y + 'px'; box.style.width = r.w + 'px'; box.style.height = r.h + 'px'; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    paint();
    box.addEventListener('pointerdown', function (e) {
      var h = e.target.dataset ? e.target.dataset.h : '', sx = e.clientX, sy = e.clientY, o = { x: r.x, y: r.y, w: r.w, h: r.h }, MIN = 48;
      e.preventDefault(); try { box.setPointerCapture(e.pointerId); } catch (er) {}
      function mv(ev) {
        var dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!h) { r.x = clamp(o.x + dx, 0, dw - o.w); r.y = clamp(o.y + dy, 0, dh - o.h); }
        else {
          var x1 = o.x, y1 = o.y, x2 = o.x + o.w, y2 = o.y + o.h;
          if (h.indexOf('w') >= 0) x1 = clamp(o.x + dx, 0, x2 - MIN);
          if (h.indexOf('e') >= 0) x2 = clamp(o.x + o.w + dx, x1 + MIN, dw);
          if (h.indexOf('n') >= 0) y1 = clamp(o.y + dy, 0, y2 - MIN);
          if (h.indexOf('s') >= 0) y2 = clamp(o.y + o.h + dy, y1 + MIN, dh);
          r.x = x1; r.y = y1; r.w = x2 - x1; r.h = y2 - y1;
        }
        paint();
      }
      function up() { box.removeEventListener('pointermove', mv); box.removeEventListener('pointerup', up); box.removeEventListener('pointercancel', up); }
      box.addEventListener('pointermove', mv); box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    });
    function close() { URL.revokeObjectURL(url); ov.classList.remove('on'); ov.innerHTML = ''; memPhotosPaint(); memPreviewSoon(); }
    ov.onclick = function (e) {
      var b = e.target.closest('[data-mpc]'); if (!b) return;
      var a = b.dataset.mpc;
      if (a === 'cancel') return close();
      if (a === 'whole') { try { URL.revokeObjectURL(it.url); } catch (er) {} it.cur = it.orig; it.url = URL.createObjectURL(it.orig); it.cropped = false; return close(); }
      var sx2 = r.x / d, sy2 = r.y / d, sw = r.w / d, sh = r.h / d, k = Math.min(1, 1600 / Math.max(sw, sh));
      var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k));
      c.getContext('2d').drawImage(im, sx2, sy2, sw, sh, 0, 0, c.width, c.height);
      c.toBlob(function (blob) {
        if (blob) { try { URL.revokeObjectURL(it.url); } catch (er) {} it.cur = blob; it.url = URL.createObjectURL(blob); it.cropped = true; }
        close();
      }, 'image/jpeg', 0.9);
    };
  };
  im.src = url;
}

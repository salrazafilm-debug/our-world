/* Placing a memory accurately.
   1. "Where was this?": search a city, state or area and the pin moves there. Our small built-in list
      answers first; anything else is looked up on OpenStreetMap (it sees only the words you type).
   2. A photo that carries its own location (GPS in the picture) can offer to set the place, and the date it
      was taken can set the date. Nothing is changed unless you press the button.
   Used by memoryForm() and memPhotosInit() in index.html. Style rules: STYLE.md. */

var PLACE = { name: '', timer: 0, seq: 0, last: 0, photoKey: '' };

(function () {
  var st = document.createElement('style');
  st.textContent = [
    '.pl-now{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    '.pl-now img{width:22px;height:22px;image-rendering:pixelated}',
    '.pl-now .pl-name{flex:1;min-width:140px;font-family:var(--fdisp);font-weight:600;font-size:16px;color:var(--berry)}',
    '.pl-search{margin-top:10px}',
    '.pl-res{display:flex;flex-direction:column;gap:6px;margin-top:8px}',
    '.pl-row{display:flex;flex-direction:column;align-items:flex-start;text-align:left;width:100%;min-height:44px;padding:8px 12px;border:3px solid var(--berry);border-bottom-width:6px;background:var(--cream);color:var(--berry);clip-path:var(--px-step);cursor:pointer;font-family:var(--fdisp);font-weight:600;font-size:15px}',
    '.pl-row small{font-family:var(--fbody);font-weight:500;font-size:13px;color:var(--ink-70)}',
    '.pl-row:active{transform:translateY(3px);border-bottom-width:3px}',
    '.pl-msg{font-size:13px;color:var(--ink-70);margin:6px 0 0}',
    '.pl-photo{margin-top:10px;padding:10px 12px;border:3px dashed var(--rose);background:var(--rose-lt);display:flex;flex-direction:column;gap:8px;font-size:14px;color:var(--ink)}',
    '.pl-photo .row{display:flex;gap:8px;flex-wrap:wrap}'
  ].join('');
  document.head.appendChild(st);
})();

/* ---------- read the location and date a photo carries (JPEG EXIF) ---------- */
function exifRead(file) {
  return new Promise(function (res) {
    if (!file || !file.slice) { res(null); return; }
    var fr = new FileReader();
    fr.onload = function () { try { res(exifParse(new DataView(fr.result))); } catch (e) { res(null); } };
    fr.onerror = function () { res(null); };
    fr.readAsArrayBuffer(file.slice(0, 262144));
  });
}
function exifParse(v) {
  if (v.byteLength < 12 || v.getUint16(0) !== 0xFFD8) return null;
  var off = 2;
  while (off + 4 < v.byteLength) {
    var marker = v.getUint16(off); if ((marker & 0xFF00) !== 0xFF00) break;
    var len = v.getUint16(off + 2);
    if (marker === 0xFFE1 && v.getUint32(off + 4) === 0x45786966) return exifTiff(v, off + 10);
    off += 2 + len;
  }
  return null;
}
function exifTiff(v, base) {
  var le = v.getUint16(base) === 0x4949;
  function u16(o) { return v.getUint16(base + o, le); }
  function u32(o) { return v.getUint32(base + o, le); }
  function ifd(o) { var n = u16(o), out = {}; for (var i = 0; i < n; i++) { var e = o + 2 + i * 12; out[u16(e)] = { type: u16(e + 2), cnt: u32(e + 4), off: e + 8 }; } return out; }
  function valOff(t) { var size = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1 }[t.type] || 1; return size * t.cnt > 4 ? u32(t.off) : t.off; }
  function str(t) { var o = valOff(t), s = ''; for (var i = 0; i < t.cnt - 1; i++) s += String.fromCharCode(v.getUint8(base + o + i)); return s; }
  function rats(t) { var o = valOff(t), r = []; for (var i = 0; i < t.cnt; i++) r.push(u32(o + i * 8) / (u32(o + i * 8 + 4) || 1)); return r; }
  var i0 = ifd(u32(4)), out = {};
  if (i0[0x8769]) {
    var ex = ifd(u32(i0[0x8769].off)), d = ex[0x9003] || ex[0x9004];
    if (d) { var m = /^(\d{4}):(\d\d):(\d\d)/.exec(str(d)); if (m && m[1] !== '0000') out.date = m[1] + '-' + m[2] + '-' + m[3]; }
  }
  if (i0[0x8825]) {
    var g = ifd(u32(i0[0x8825].off));
    if (g[1] && g[2] && g[3] && g[4]) {
      var la = rats(g[2]), lo = rats(g[4]), lat = la[0] + la[1] / 60 + la[2] / 3600, lng = lo[0] + lo[1] / 60 + lo[2] / 3600;
      if (str(g[1]) === 'S') lat = -lat; if (str(g[3]) === 'W') lng = -lng;
      if (isFinite(lat) && isFinite(lng) && (lat || lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) { out.lat = lat; out.lng = lng; }
    }
  }
  return (out.lat != null || out.date) ? out : null;
}

/* ---------- the "Where was this?" block ---------- */
function memPlaceHtml(ll) {
  var nt = nearestTown(ll.lat, ll.lng);
  return '<div class="field" id="m-place"><label>Where was this?</label>' +
    '<div class="pl-now"><img alt="" src="art/pin.png"><span class="pl-name" id="plName">Near ' + esc(nt.name) + '</span><button class="pxbtn" type="button" data-pl="open">Change place</button></div>' +
    '<div class="pl-search" id="plSearch" hidden><input id="plQ" type="text" maxlength="80" autocomplete="off" placeholder="City, state or area, for example Lusby, MD">' +
    '<div class="pl-res" id="plRes"></div>' +
    '<p class="hint">Pick a result and the pin moves there. Places outside our small built-in list are looked up on OpenStreetMap, which only sees the words you type.</p></div>' +
    '<div id="plPhoto"></div>' +
    '<p class="hint">The pin sits at the middle of the place you choose, so it is roughly where it happened, not an exact address.</p></div>';
}
function memPlaceInit() {
  PLACE.name = ''; PLACE.photoKey = '';
  var box = document.getElementById('m-place'); if (!box) return;
  box.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pl]'); if (!b) return;
    var a = b.dataset.pl;
    if (a === 'open') { var s = document.getElementById('plSearch'); s.hidden = !s.hidden; if (!s.hidden) { var q = document.getElementById('plQ'); q.focus(); } }
    else if (a === 'pick') memPlaceSet(parseFloat(b.dataset.lat), parseFloat(b.dataset.lng), b.dataset.name);
    else if (a === 'photo-place') { memPlaceSet(parseFloat(b.dataset.lat), parseFloat(b.dataset.lng), b.dataset.name || ''); memPlaceName(parseFloat(b.dataset.lat), parseFloat(b.dataset.lng)); }
    else if (a === 'photo-date') { var d = document.getElementById('m-date'); if (d) { d.value = b.dataset.date; d.dispatchEvent(new Event('change')); } b.disabled = true; b.textContent = 'Date set'; }
  });
  document.getElementById('plQ').addEventListener('input', function (e) { memPlaceTyped(e.target.value); });
}
function memPlaceSet(lat, lng, name) {
  if (!isFinite(lat) || !isFinite(lng)) return;
  var btn = document.querySelector('[data-act="save-memory"]'); if (btn) { btn.dataset.lat = lat; btn.dataset.lng = lng; }
  MEMPH.ll = { lat: lat, lng: lng };
  PLACE.name = name || nearestTown(lat, lng).name;
  var el = document.getElementById('plName'); if (el) el.textContent = PLACE.name;
  var s = document.getElementById('plSearch'); if (s) s.hidden = true;
  memPreviewSoon();
  try { flyTo(lat, lng, 11.6); } catch (e) {}                  /* the map behind the form follows, so you can see where it landed */
}
/* our own list first (instant), then OpenStreetMap for anything else */
function memPlaceLocal(q) {
  q = q.toLowerCase(); var out = [], seen = {};
  function add(name, lat, lng, sub) { var k = name.toLowerCase(); if (seen[k]) return; seen[k] = 1; out.push({ name: name, sub: sub, lat: lat, lng: lng }); }
  (window.OW_TOWNS || []).forEach(function (t) { if (t[0].toLowerCase().indexOf(q) >= 0) add(t[0], t[1], t[2], 'City or town'); });
  (window.OW_AREAS || []).forEach(function (a) { if (a[0].toLowerCase().indexOf(q) >= 0) add(a[0], a[1], a[2], 'Area'); });
  (window.OW_STATES_LBL || []).forEach(function (s) { var n = s[0].charAt(0) + s[0].slice(1).toLowerCase(); if (n.toLowerCase().indexOf(q) >= 0) add(n, s[1], s[2], 'State'); });
  out.sort(function (a, b) { return (a.name.toLowerCase().indexOf(q) === 0 ? 0 : 1) - (b.name.toLowerCase().indexOf(q) === 0 ? 0 : 1); });
  return out.slice(0, 5);
}
function memPlaceRows(list, msg) {
  var res = document.getElementById('plRes'); if (!res) return;
  res.innerHTML = list.map(function (r) { return '<button class="pl-row" type="button" data-pl="pick" data-lat="' + r.lat + '" data-lng="' + r.lng + '" data-name="' + esc(r.name) + '">' + esc(r.name) + '<small>' + esc(r.sub) + '</small></button>'; }).join('') + (msg ? '<p class="pl-msg">' + esc(msg) + '</p>' : '');
}
function memPlaceTyped(q) {
  q = (q || '').trim(); clearTimeout(PLACE.timer);
  if (q.length < 2) { memPlaceRows([], ''); return; }
  var local = memPlaceLocal(q); memPlaceRows(local, q.length >= 3 ? 'Searching more places...' : '');
  if (q.length < 3) return;
  var seq = ++PLACE.seq;
  PLACE.timer = setTimeout(function () {
    var wait = Math.max(0, 1100 - (Date.now() - PLACE.last));            /* the free service allows about one search a second */
    setTimeout(function () {
      if (seq !== PLACE.seq) return; PLACE.last = Date.now();
      fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&q=' + encodeURIComponent(q), { headers: { 'Accept-Language': 'en' } })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (rows) {
          if (seq !== PLACE.seq) return;
          var more = (rows || []).map(function (r) {
            var a = r.address || {}, main = r.name || a.city || a.town || a.village || a.county || a.state || (r.display_name || '').split(',')[0];
            var where = [a.state || a.region, a.country_code && a.country_code.toUpperCase() !== 'US' ? a.country : ''].filter(Boolean).join(', ');
            return { name: main + (where ? ', ' + where : ''), sub: (r.display_name || '').split(',').slice(0, 3).join(',').trim(), lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
          }).filter(function (r) { return isFinite(r.lat) && isFinite(r.lng); });
          var seen = {}; local.forEach(function (r) { seen[r.name.toLowerCase()] = 1; });
          var merged = local.concat(more.filter(function (r) { return !seen[r.name.toLowerCase()]; })).slice(0, 8);
          memPlaceRows(merged, merged.length ? '' : 'No place found. Try the city and state, for example Lusby, MD.');
        })
        .catch(function () { if (seq !== PLACE.seq) return; memPlaceRows(local, local.length ? 'Could not reach the online search right now.' : 'Could not search right now. Check your connection, or tap the map to place the pin yourself.'); });
    }, wait);
  }, 450);
}

/* ---------- a photo that knows where and when it was taken ---------- */
function memPlaceFromPhotos(files) {
  var box = document.getElementById('plPhoto'); if (!box) return;
  files.reduce(function (p, f) { return p.then(function (found) { return found && found.lat != null ? found : exifRead(f).then(function (x) { return x && x.lat != null ? x : (found || x); }); }); }, Promise.resolve(null)).then(function (x) {
    if (!x) return;
    var key = (x.lat || '') + '|' + (x.date || ''); if (PLACE.photoKey === key) return; PLACE.photoKey = key;
    var cur = document.getElementById('m-date'), btns = '', msg = '';
    var near = x.lat != null ? nearestTown(x.lat, x.lng) : null;
    if (x.lat != null) {
      var label = near && near.km < 30 ? near.name : x.lat.toFixed(3) + ', ' + x.lng.toFixed(3);
      msg += 'This photo says it was taken <span class="plp-name">' + esc(near && near.km < 30 ? 'near ' + near.name : 'at ' + label) + '</span>. ';
      btns += '<button class="pxbtn" type="button" data-pl="photo-place" data-lat="' + x.lat + '" data-lng="' + x.lng + '" data-name="' + esc(near && near.km < 30 ? 'Near ' + near.name : label) + '">Use the photo’s place</button>';
    }
    if (x.date && (!cur || cur.value !== x.date)) {
      msg += (x.lat != null ? 'It' : 'This photo') + ' was taken on ' + esc(fmtDate(x.date)) + '.';
      btns += '<button class="pxbtn" type="button" data-pl="photo-date" data-date="' + x.date + '">Use that date</button>';
    }
    if (!btns) return;
    box.innerHTML = '<div class="pl-photo"><div>' + msg + '</div><div class="row">' + btns + '</div></div>';
  });
}

/* only once you choose the photo's place: ask OpenStreetMap for a friendly name for those coordinates */
function memPlaceName(lat, lng) {
  fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=' + lat + '&lon=' + lng, { headers: { 'Accept-Language': 'en' } })
    .then(function (r) { return r.ok ? r.json() : null; }).then(function (r) {
      if (!r || !r.address) return; var a = r.address, nm = (a.city || a.town || a.village || a.county || '') + (a.state ? ', ' + a.state : '');
      var el = document.getElementById('plName'); if (nm.trim() && el && MEMPH.ll && Math.abs(MEMPH.ll.lat - lat) < 1e-6) { PLACE.name = nm; el.textContent = nm; }
    }).catch(function () {});
}

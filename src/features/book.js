/* Our Memories Book: a place of its own.
   Tap the book on the dashboard: you arrive at the book on its stand (your cover
   scene). Tap Open and the camera moves in, the cover swings open, and you are
   reading the book. Inside, ribbon bookmarks take you to Our Story (a chapter
   per month), Photos (polaroids), Trips, Places and the Calendar. Pages turn.
   Style rules: STYLE.md. */

var BOOK = { open: false, stage: 'cover', section: 'story', idx: 0, turning: false, pages: [] };
/* where things sit in art/book/cover.jpg (941 x 1672) */
var BK = { w: 941, h: 1672, cx: 215, cy: 520, cw: 560, ch: 455, focusX: 495, focusY: 748, penY: 1278, penH: 108, penX: 272, penW: 398 };
var bookEl = null;

function bookGeom() {
  var vw = innerWidth, vh = innerHeight, wide = vw / vh > 0.7, bh = wide ? Math.min(vh / 0.58, vw * 2.6) : vh, bw = bh * BK.w / BK.h;
  if (!wide && bw < vw) { bw = vw; bh = bw * BK.h / BK.w; }
  var left = (vw - bw) / 2, top = wide ? vh / 2 - 0.58 * bh : Math.min(0, vh - bh);
  var k = bw / BK.w, bookW = BK.cw * k;
  return { bw: bw, bh: bh, left: left, top: top, k: k, zoom: Math.min(1.9, Math.max(1.25, (0.92 * Math.min(vw, 760)) / bookW)), wide: wide };
}

function bookEnsure() {
  if (bookEl) return bookEl;
  var st = document.createElement('style');
  st.textContent = [
    '#bookScene{position:fixed;inset:0;z-index:34;display:none;overflow:hidden;color:var(--ink);font-family:var(--fbody);-webkit-user-select:none;user-select:none;background:#2E1F26}',
    '#bookScene.on{display:block}',
    '#lightbox{z-index:60}#cal{z-index:50}',
    '#bookScene .b-btn,#bookScene .rb,#bookScene .mm-go,#bookScene .pol,#bookScene .pgrow{clip-path:var(--px-step)}',
    '.b-btn{height:46px;min-width:46px;padding:0 14px;border:3px solid var(--berry);border-bottom-width:7px;background:var(--cream);color:var(--berry);font-family:var(--fdisp);font-weight:600;font-size:16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;transition:transform .08s,border-bottom-width .08s}',
    '.b-btn:hover{transform:translateY(-1px)}.b-btn:active{transform:translateY(4px);border-bottom-width:3px}.b-btn[disabled]{opacity:.45;pointer-events:none}',
    '.b-btn.primary{background:var(--berry);color:var(--cream);border-color:var(--berry-dk)}',
    '.b-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:10px;padding:calc(12px + env(safe-area-inset-top)) 14px 10px;z-index:8}',
    '.b-sign{flex:1;text-align:center}.b-sign span{display:inline-block;background:var(--wood);border:4px solid var(--wood-dk);border-bottom-width:8px;clip-path:var(--px-step);padding:6px 18px 8px;font-family:var(--ftitle);font-size:clamp(20px,5.4vw,30px);color:var(--cream);line-height:1;white-space:nowrap}',
    /* the cover scene */
    '.b-cover{position:absolute;inset:0}',
    '.b-blur{position:absolute;inset:-30px;background:center/cover;filter:blur(18px) brightness(.7)}',
    '.b-world{position:absolute;transform-origin:var(--fx) var(--fy)}',
    '.b-world.opening{transition:transform 1.25s cubic-bezier(.55,0,.25,1);transform:scale(var(--z))}',
    '.b-world{perspective:1600px}',
    '.b-scene{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.b-under{position:absolute;background:#FFF4E6;border:0;box-shadow:inset 0 0 0 3px #D9B99A,inset -14px 0 18px -10px rgba(120,70,60,.35);background-image:repeating-linear-gradient(0deg,transparent 0 17px,rgba(190,150,120,.28) 17px 18px)}',
    '.b-leaf{position:absolute;transform-origin:0 50%;transform-style:preserve-3d;transition:transform 1.05s cubic-bezier(.5,0,.3,1) .45s}',
    '.b-leaf.open{transform:rotateY(-171deg)}',
    '.b-leaf>div{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}',
    '.b-leaf .back{transform:rotateY(180deg);background:linear-gradient(90deg,#7A2F4A,#B5546E 18%,#C8647E);box-shadow:inset 0 0 0 4px #5E2238,inset 0 0 0 7px #E3B879}',
    '.b-enter{position:absolute;border:3px solid var(--berry);border-bottom-width:8px;background:var(--cream);color:var(--berry);font-family:var(--fdisp);font-weight:600;font-size:clamp(17px,2.6vw,26px);clip-path:var(--px-step);display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:transform .08s,border-bottom-width .08s}',
    '.b-enter img{height:60%;image-rendering:pixelated}.b-enter:hover{transform:translateY(-1px)}.b-enter:active{transform:translateY(4px);border-bottom-width:4px}',
    '.b-cover.go .b-enter,.b-cover.go .b-top{opacity:0;transition:opacity .25s}',
    '.b-cover.fade{opacity:0;transition:opacity .55s}',
    /* reading */
    '.b-read{position:absolute;inset:0;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:calc(76px + env(safe-area-inset-top)) 12px calc(14px + env(safe-area-inset-bottom))}',
    '.b-read.in,.b-desk.in{animation:bIn .6s ease-out both}@keyframes bIn{from{opacity:0}}',
    '.b-desk{position:absolute;inset:0;background:radial-gradient(circle at 10% 6%,rgba(255,190,110,.35),transparent 30%),radial-gradient(circle at 92% 6%,rgba(255,190,110,.3),transparent 30%),repeating-linear-gradient(90deg,#573226 0 52px,#4D2C22 52px 54px)}',
    '.b-desk:after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,transparent 45%,rgba(30,12,16,.55))}',
    '.b-wrap{position:relative;display:flex;align-items:stretch;gap:10px;max-width:100%;max-height:100%;width:min(1120px,100%);flex:1;min-height:0;justify-content:center}',
    '.b-book{position:relative;flex:1;min-width:0;min-height:0;display:flex;background:#5E2238;border:5px solid #4A1A2C;border-bottom-width:11px;padding:8px;perspective:1800px;box-shadow:0 18px 0 rgba(20,8,12,.35)}',
    '.b-book:before,.b-book:after{content:"";position:absolute;width:26px;height:26px;background:#E3B879;border:3px solid #9A6F22;z-index:3;pointer-events:none}',
    '.b-book:before{left:-8px;top:-8px;clip-path:polygon(0 0,100% 0,0 100%)}.b-book:after{right:-8px;top:-8px;clip-path:polygon(0 0,100% 0,100% 100%)}',
    '.b-pages{position:relative;flex:1;min-width:0;min-height:0;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr);background:#FFF4E6;overflow:hidden}',
    '.b-book.spread .b-pages{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}',
    '.b-book.spread .b-pages:before{content:"";position:absolute;left:50%;top:0;bottom:0;width:34px;margin-left:-17px;background:linear-gradient(90deg,transparent,rgba(120,70,60,.28) 46%,rgba(120,70,60,.34) 54%,transparent);z-index:2;pointer-events:none}',
    '.pg{position:relative;min-width:0;min-height:0;overflow:auto;padding:22px 22px 44px;background:#FFF4E6;background-image:repeating-linear-gradient(0deg,transparent 0 31px,rgba(200,160,130,.22) 31px 32px);-webkit-overflow-scrolling:touch}',
    '.b-book.spread .pg:first-child{box-shadow:inset -10px 0 14px -10px rgba(120,70,60,.3)}.b-book.spread .pg:last-child{box-shadow:inset 10px 0 14px -10px rgba(120,70,60,.3)}',
    '.pg h2{margin:0 0 4px;font-family:var(--ftitle);font-weight:700;font-size:clamp(24px,5.4vw,34px);color:var(--berry);line-height:1.1}',
    '.pg .sub{font-family:var(--fdisp);font-size:14px;color:var(--wood);margin:0 0 14px}',
    '.pg .pgn{position:absolute;bottom:12px;left:0;right:0;text-align:center;font-family:var(--fdisp);font-size:13px;color:#A8826E}',
    '.pg.blank{display:grid;place-items:center;color:#B99A88}',
    '.mm{padding:12px 0 14px;border-bottom:2px dashed #E2C2AE}.mm:last-of-type{border-bottom:none}',
    '.mm-h b{display:block;font-family:var(--fdisp);font-weight:600;font-size:18px;color:var(--berry-dk)}.mm-h span{display:block;font-size:13.5px;color:#9A7A6A;margin-top:2px}',
    '.mm p{margin:8px 0 0;font-size:15.5px;line-height:1.6;color:var(--ink);white-space:pre-wrap}',
    '.mm .ph{display:block;width:min(190px,60%);margin:10px 0 2px;background:#fff;padding:7px 7px 24px;border:2px solid #E2C2AE;transform:rotate(-1.6deg);box-shadow:0 3px 0 rgba(120,70,60,.25);cursor:zoom-in}',
    '.mm .ph img{display:block;width:100%;aspect-ratio:1;object-fit:cover}',
    '.mm-go{margin-top:10px;height:38px;padding:0 12px;border:3px solid var(--berry);border-bottom-width:6px;background:var(--cream);color:var(--berry);font-family:var(--fdisp);font-weight:600;font-size:14px}',
    '.mm-go:active{transform:translateY(3px);border-bottom-width:3px}',
    '.pols{display:grid;grid-template-columns:repeat(2,1fr);gap:14px 12px;margin-top:6px}',
    '.pol{display:flex;flex-direction:column;align-items:center;background:#fff;border:2px solid #E2C2AE;padding:6px 6px 8px;box-shadow:0 3px 0 rgba(120,70,60,.25);transform:rotate(var(--r,0deg));cursor:zoom-in;min-width:0}',
    '.pol img{width:100%;aspect-ratio:1;object-fit:cover;display:block}.pol span{margin-top:6px;font-family:var(--fdisp);font-size:12.5px;color:var(--berry-dk);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.pgrow{display:flex;align-items:center;gap:10px;width:100%;text-align:left;margin:0 0 8px;padding:9px 12px 8px;background:var(--cream);border:3px solid #E2C2AE;border-bottom-width:6px;color:var(--berry-dk);font-family:var(--fdisp);font-weight:600;font-size:15px}',
    '.pgrow small{display:block;font-family:var(--fbody);font-weight:500;font-size:13px;color:#9A7A6A}.pgrow .n{width:26px;height:26px;flex:none;background:var(--berry);color:var(--cream);display:grid;place-items:center;font-size:13px}',
    '.pgrow:active{transform:translateY(3px);border-bottom-width:3px}',
    '.cv{text-align:center;padding-top:8%}.cv .big{font-family:var(--ftitle);font-weight:700;font-size:clamp(28px,6.4vw,44px);color:var(--berry);line-height:1.05}.cv p{font-size:15.5px;line-height:1.6;color:var(--ink-70);margin:14px auto 0;max-width:30ch}.cv .hrt{width:46px;image-rendering:pixelated;margin:14px auto 0;display:block}',
    /* ribbons */
    '.b-rib{display:flex;flex-direction:column;gap:8px;padding-top:14px;flex:none}',
    '.rb{position:relative;width:96px;padding:9px 6px 17px;border:3px solid #4A1A2C;background:#B5546E;color:var(--cream);font-family:var(--fdisp);font-weight:600;font-size:14px;line-height:1.1;text-align:center;clip-path:polygon(0 0,100% 0,100% 100%,50% 84%,0 100%);transition:transform .12s;cursor:pointer}',
    '.rb.on{transform:translateX(10px);background:var(--berry);border-color:#E3B879;color:#FFF2DF}.rb:hover{transform:translateX(5px)}.rb.on:hover{transform:translateX(10px)}',
    '.rb img{display:block;height:22px;margin:0 auto 3px;image-rendering:pixelated}',
    '.b-nav{display:flex;align-items:center;justify-content:center;gap:14px;flex:none;color:var(--cream);font-family:var(--fdisp)}',
    '.b-nav .cnt{min-width:90px;text-align:center;font-size:15px}',
    '@media (max-width:820px){.b-wrap{flex-direction:column;gap:8px}.b-rib{flex-direction:row;padding:0;gap:6px;justify-content:center;order:-1}.rb{width:auto;flex:1;min-width:0;padding:6px 4px 14px;font-size:12.5px}.rb img{display:none}.rb.on{transform:translateY(5px)}.rb:hover{transform:translateY(3px)}.rb.on:hover{transform:translateY(5px)}}',
    /* page turning */
    '.pg.turn-out-f{animation:bOutF .24s ease-in forwards;transform-origin:0 50%}.pg.turn-in-f{animation:bInF .26s ease-out both;transform-origin:0 50%}',
    '.pg.turn-out-b{animation:bOutB .24s ease-in forwards;transform-origin:100% 50%}.pg.turn-in-b{animation:bInB .26s ease-out both;transform-origin:100% 50%}',
    '@keyframes bOutF{to{transform:perspective(1600px) rotateY(-88deg);filter:brightness(.8)}}@keyframes bInF{from{transform:perspective(1600px) rotateY(88deg);filter:brightness(.8)}}',
    '@keyframes bOutB{to{transform:perspective(1600px) rotateY(88deg);filter:brightness(.8)}}@keyframes bInB{from{transform:perspective(1600px) rotateY(-88deg);filter:brightness(.8)}}'
  ].join('');
  document.head.appendChild(st);
  bookEl = document.createElement('section'); bookEl.id = 'bookScene'; bookEl.setAttribute('aria-label', 'Our Memories Book');
  document.body.appendChild(bookEl);
  bookEl.addEventListener('click', bookClick);
  var sx = null;
  bookEl.addEventListener('pointerdown', function (e) { sx = e.target.closest('.b-pages') ? e.clientX : null; });
  bookEl.addEventListener('pointerup', function (e) { if (sx == null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 70) bookTurn(dx < 0 ? 1 : -1); });
  window.addEventListener('keydown', function (e) {
    if (!BOOK.open) return;
    if (e.key === 'Escape') { if (typeof calEl !== 'undefined' && calEl.classList.contains('open')) return; bookClose(); }
    else if (BOOK.stage === 'read') { if (e.key === 'ArrowRight') bookTurn(1); else if (e.key === 'ArrowLeft') bookTurn(-1); }
  });
  window.addEventListener('resize', function () { if (BOOK.open && BOOK.stage === 'read') bookRenderRead(); else if (BOOK.open && BOOK.stage === 'cover') bookRenderCover(); });
  return bookEl;
}

function bookOpen() {
  bookEnsure(); closeSheet();
  if (typeof dashClose === 'function') dashClose();
  BOOK.open = true; BOOK.stage = 'cover'; BOOK.idx = 0;
  bookRenderCover(); bookEl.classList.add('on');
}
function bookClose() { BOOK.open = false; if (bookEl) bookEl.classList.remove('on'); }
window.bookOpen = bookOpen;

/* ---------------- the cover scene and the opening ---------------- */
function bookRenderCover() {
  var g = bookGeom(), k = g.k, px = function (v) { return (v * k).toFixed(1) + 'px'; };
  var url = 'art/book/cover.jpg';
  bookEl.innerHTML = '<div class="b-cover" id="bCover"><div class="b-blur" style="background-image:url(' + url + ')"></div>' +
    '<div class="b-world" id="bWorld" style="left:' + g.left.toFixed(1) + 'px;top:' + g.top.toFixed(1) + 'px;width:' + g.bw.toFixed(1) + 'px;height:' + g.bh.toFixed(1) + 'px;--fx:' + px(BK.focusX) + ';--fy:' + px(BK.focusY) + ';--z:' + g.zoom.toFixed(2) + '">' +
      '<img class="b-scene" alt="Our Memories Book on its stand" src="' + url + '">' +
      '<div class="b-under" style="left:' + px(BK.cx - 4) + ';top:' + px(BK.cy - 12) + ';width:' + px(BK.cw + 34) + ';height:' + px(BK.ch + 24) + '"></div>' +
      '<div class="b-leaf" id="bLeaf" style="left:' + px(BK.cx) + ';top:' + px(BK.cy) + ';width:' + px(BK.cw) + ';height:' + px(BK.ch) + '">' +
        '<div class="front" style="background:url(' + url + ') no-repeat;background-size:' + g.bw.toFixed(1) + 'px ' + g.bh.toFixed(1) + 'px;background-position:-' + px(BK.cx) + ' -' + px(BK.cy) + '"></div><div class="back"></div></div>' +
      '<button class="b-enter" type="button" data-b="enter" style="left:' + px(BK.penX - 10) + ';top:' + px(BK.penY - 8) + ';width:' + px(BK.penW + 20) + ';height:' + px(BK.penH + 16) + '"><img alt="" src="art/heart.png">Open<img alt="" src="art/heart.png"></button>' +
    '</div><div class="b-top"><button class="b-btn" type="button" data-b="close">‹ Back</button></div></div>';
}
function bookEnter() {
  var cover = document.getElementById('bCover'), world = document.getElementById('bWorld'), leaf = document.getElementById('bLeaf');
  if (!cover || BOOK.stage !== 'cover') return;
  BOOK.stage = 'opening';
  if (reduceMotion) { BOOK.stage = 'read'; BOOK.section = 'story'; BOOK.idx = 0; return bookRenderRead(); }
  cover.classList.add('go'); world.classList.add('opening'); leaf.classList.add('open');
  if (typeof playSound === 'function') playSound('chime');
  BOOK.section = 'story'; BOOK.idx = 0;
  setTimeout(function () { var u = document.createElement('div'); u.id = 'bUnder'; u.innerHTML = bookReadHtml(true); bookEl.insertBefore(u, bookEl.firstChild); u.style.cssText = 'position:absolute;inset:0'; cover.style.zIndex = 5; }, 1350);
  setTimeout(function () { cover.classList.add('fade'); }, 1500);
  setTimeout(function () { BOOK.stage = 'read'; bookRenderRead(); }, 2250);
}

/* ---------------- the pages ---------------- */
var BOOK_SECTIONS = [['story', 'Our Story', 'art/ui/book.png'], ['photos', 'Photos', 'art/heart.png'], ['trips', 'Trips', 'art/pin.png'], ['places', 'Places', 'art/house-i.png'], ['cal', 'Calendar', 'art/ui/calendar.png']];
var BOOK_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function pgWrap(inner, n, cls) { return '<div class="pg' + (cls ? ' ' + cls : '') + '">' + inner + (n ? '<div class="pgn">' + n + '</div>' : '') + '</div>'; }
function bkEmpty(title, msg, addBtn) {
  return [pgWrap('<div class="cv"><div class="big">' + esc(title) + '</div><p>' + esc(msg) + '</p>' + (addBtn ? '<button class="b-btn primary" type="button" data-b="add" style="margin-top:18px">Add a memory</button>' : '') + '</div>', '')];
}
function memEntry(m) {
  var src = photoCandidates(m)[0];
  return '<article class="mm"><div class="mm-h"><b>' + esc(m.title || 'A memory') + '</b><span>' + esc(fmtDate(m.date)) + ' · ' + esc(nearestTown(m.lat, m.lng).name) + ' · ' + esc(whoName(m.by)) + '</span></div>' +
    (src ? '<button class="ph" type="button" data-b="photo" data-src="' + esc(src) + '" data-cap="' + esc(m.title || '') + '"><img alt="" src="' + esc(src) + '"></button>' : '') +
    (m.note ? '<p>' + esc(m.note) + '</p>' : '') +
    '<button class="mm-go" type="button" data-b="map" data-id="' + esc(m.id) + '">Show on the map</button></article>';
}
function storyPages() {
  var mems = S.memories.slice().sort(function (a, b) { return (a.date || '').localeCompare(b.date || '') || (a.at || 0) - (b.at || 0); });
  var a = typeof annInfo === 'function' ? annInfo() : null;
  var pages = [pgWrap('<div class="cv"><div class="big">Our<br>Memories<br>Book</div><img class="hrt" alt="" src="art/heart.png"><p>' + (a && a.days > 0 ? 'Together ' + a.days.toLocaleString() + ' days. ' : '') +
    mems.length + (mems.length === 1 ? ' memory' : ' memories') + ' so far, and many more to come.</p></div>', '')];
  if (!mems.length) return bkEmpty('The first page is waiting', 'Pin your first memory and it will be written here.', true);
  var groups = {}, order = [];
  mems.forEach(function (m) { var k = (m.date || '').slice(0, 7) || 'undated'; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(m); });
  order.forEach(function (k) {
    var title = k === 'undated' ? 'Undated' : BOOK_MONTHS[parseInt(k.slice(5, 7), 10) - 1] + ' ' + k.slice(0, 4), list = groups[k];
    for (var i = 0; i < list.length; i += 3) pages.push(pgWrap('<h2>' + esc(title) + '</h2><div class="sub">' + (i === 0 ? list.length + (list.length === 1 ? ' memory' : ' memories') : 'continued') + '</div>' + list.slice(i, i + 3).map(memEntry).join(''), ''));
  });
  return pages;
}
function photoPages() {
  var ph = S.memories.filter(function (m) { return photoCandidates(m).length; }).sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
  if (!ph.length) return bkEmpty('No photos yet', 'Add a memory with a photo and it will be kept here, like a polaroid.', true);
  var pages = [];
  for (var i = 0; i < ph.length; i += 6) pages.push(pgWrap('<h2>Photos</h2><div class="sub">' + (i / 6 + 1) + ' of ' + Math.ceil(ph.length / 6) + '</div><div class="pols">' + ph.slice(i, i + 6).map(function (m, j) {
    var src = photoCandidates(m)[0];
    return '<button class="pol" type="button" data-b="photo" data-src="' + esc(src) + '" data-cap="' + esc((m.title || '') + ' · ' + fmtDate(m.date)) + '" style="--r:' + (((polHash(m.id) % 7) - 3) * 0.7) + 'deg"><img alt="" src="' + esc(src) + '"><span>' + esc(m.title || '') + '</span></button>';
  }).join('') + '</div>', ''));
  return pages;
}
function tripPages() {
  if (!S.trips.length) return bkEmpty('No trips yet', 'A trip threads memories together with a gold line across the map. Add one from the map menu.', false);
  return S.trips.map(function (t) {
    var st = tripStops(t);
    return pgWrap('<h2>' + esc(t.name) + '</h2><div class="sub">' + st.length + ' stops</div>' + st.map(function (m, i) {
      return '<div class="pgrow" style="pointer-events:none"><span class="n">' + (i + 1) + '</span><span>' + esc(m.title) + '<small>' + esc(fmtDate(m.date)) + '</small></span></div>';
    }).join('') + '<button class="mm-go" type="button" data-b="trip" data-id="' + esc(t.id) + '">Show the trip on the map</button>', '');
  });
}
function placePages() {
  var rows = placesList();
  if (!rows.length) return bkEmpty('No places yet', 'Everywhere the clouds lift is kept here.', false);
  var pages = [];
  for (var i = 0; i < rows.length; i += 7) pages.push(pgWrap('<h2>Our places</h2><div class="sub">' + rows.length + ' on the map</div>' + rows.slice(i, i + 7).map(function (r) {
    return '<button class="pgrow" type="button" data-b="goto" data-lat="' + r.lat + '" data-lng="' + r.lng + '" data-z="' + r.z + '"><span>' + esc(r.t) + '<small>' + esc(r.s) + '</small></span></button>';
  }).join(''), ''));
  return pages;
}
function bookBuild() {
  var s = BOOK.section, p = s === 'photos' ? photoPages() : s === 'trips' ? tripPages() : s === 'places' ? placePages() : storyPages();
  p.forEach(function (h, i) { p[i] = h.replace(/<div class="pgn"><\/div>|<\/div>$/, function (m) { return m; }); });
  BOOK.pages = p;
}
function bookPerView() { return innerWidth >= 820 && innerWidth / innerHeight > 1.05 ? 2 : 1; }

function bookReadHtml(fresh) {
  var per = bookPerView(); bookBuild();
  if (BOOK.idx >= BOOK.pages.length) BOOK.idx = Math.max(0, BOOK.pages.length - 1);
  if (per === 2) BOOK.idx -= BOOK.idx % 2;
  var left = BOOK.pages[BOOK.idx] || '', right = per === 2 ? (BOOK.pages[BOOK.idx + 1] || pgWrap('', '', 'blank')) : '';
  var total = BOOK.pages.length, atStart = BOOK.idx <= 0, atEnd = BOOK.idx + per >= total;
  return '<div class="b-desk"></div><div class="b-read' + (fresh ? ' in' : '') + '" id="bRead">' +
    '<div class="b-top"><button class="b-btn" type="button" data-b="close">\u2039 Map</button><div class="b-sign"><span>Our Memories Book</span></div><span style="width:46px"></span></div>' +
    '<div class="b-wrap"><div class="b-rib">' + BOOK_SECTIONS.map(function (s) {
      return '<button class="rb' + (BOOK.section === s[0] ? ' on' : '') + '" type="button" data-b="sec" data-id="' + s[0] + '"><img alt="" src="' + s[2] + '">' + s[1] + '</button>';
    }).join('') + '</div><div class="b-book' + (per === 2 ? ' spread' : '') + '"><div class="b-pages" id="bPages">' + left + right + '</div></div></div>' +
    '<div class="b-nav"><button class="b-btn" type="button" data-b="prev"' + (atStart ? ' disabled' : '') + ' aria-label="Previous page">\u2039</button><span class="cnt">Page ' + (Math.min(total, BOOK.idx + 1)) + (per === 2 && BOOK.idx + 2 <= total ? '\u2013' + (BOOK.idx + 2) : '') + ' of ' + total + '</span>' +
    '<button class="b-btn" type="button" data-b="next"' + (atEnd ? ' disabled' : '') + ' aria-label="Next page">\u203a</button></div></div>';
}
function bookNumber() {
  [].forEach.call(bookEl.querySelectorAll('.pg'), function (pg, i) { if (!pg.classList.contains('blank') && !pg.querySelector('.pgn')) { var n = document.createElement('div'); n.className = 'pgn'; n.textContent = BOOK.idx + i + 1; pg.appendChild(n); } });
}
function bookRenderRead() { bookEl.innerHTML = bookReadHtml(false); bookNumber(); }

function bookTurn(dir) {
  if (BOOK.stage !== 'read' || BOOK.turning) return;
  var per = bookPerView(), next = BOOK.idx + dir * per;
  if (next < 0 || next >= BOOK.pages.length) return;
  var pagesEl = document.getElementById('bPages'); if (!pagesEl) return;
  if (reduceMotion) { BOOK.idx = next; return bookRenderRead(); }
  BOOK.turning = true;
  var pgs = pagesEl.querySelectorAll('.pg'), leaf = dir > 0 ? pgs[pgs.length - 1] : pgs[0];
  leaf.classList.add(dir > 0 ? 'turn-out-f' : 'turn-out-b');
  setTimeout(function () {
    BOOK.idx = next; bookRenderRead();
    var np = document.getElementById('bPages').querySelectorAll('.pg'), nl = dir > 0 ? np[0] : np[np.length - 1];
    if (per === 1) nl = np[0];
    nl.classList.add(dir > 0 ? 'turn-in-f' : 'turn-in-b');
    setTimeout(function () { BOOK.turning = false; }, 280);
  }, 240);
  if (typeof playSound === 'function') playSound('save');
}

function bookClick(e) {
  var b = e.target.closest('[data-b]'); if (!b) return;
  var a = b.dataset.b;
  if (a === 'close') return bookClose();
  if (a === 'enter') return bookEnter();
  if (a === 'prev') return bookTurn(-1);
  if (a === 'next') return bookTurn(1);
  if (a === 'sec') {
    if (b.dataset.id === 'cal') { return openCal(); }
    BOOK.section = b.dataset.id; BOOK.idx = 0; return bookRenderRead();
  }
  if (a === 'photo') return openPhoto(b.dataset.src, b.dataset.cap || '');
  if (a === 'add') { bookClose(); return startPlacing('memory'); }
  if (a === 'goto') { bookClose(); return flyTo(parseFloat(b.dataset.lat), parseFloat(b.dataset.lng), parseFloat(b.dataset.z) || 12.2); }
  if (a === 'map') {
    var id = b.dataset.id, m = null; S.memories.forEach(function (x) { if (x.id === id) m = x; });
    bookClose(); if (m) { flyTo(m.lat, m.lng, 12.4); openItem({ kind: 'memory', id: id }); } return;
  }
  if (a === 'trip') { var t = tripById(b.dataset.id); if (t) { bookClose(); fitStops(tripStops(t)); } }
}

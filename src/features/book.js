/* Our Memories Book: a little game scene of its own.
   The closed book lies on the table (art/book/closed.jpg). Tap "Open our book":
   the cover fades into the open book (art/book/open.jpg), the camera glides in,
   a few hearts float up from the spine, and your memories appear on the real
   pages. The book only shows memories (they are saved with the heart on the map):
   one memory per page, newest first by the memory's own date. A memory with many
   photos runs on to more pages. Pages flip; on a phone the camera shows one page
   at a time and pans across the spread. Style rules: STYLE.md. */

/* where things sit in the pictures. Widescreen pair (desktop, tablets lying down) and
   portrait 9:16 pair (phones). The picture never gets blurred or stretched to fit. */
var BKS = {
  land: {
    W: 1672, H: 941, closedSrc: 'art/book/closed.jpg', openSrc: 'art/book/open.jpg',
    closed: { x: 450, y: 112, w: 795, h: 672 },
    spread: { x: 185, y: 130, w: 1305, h: 645 },
    pages: [{ x: 330, y: 138, w: 496, h: 556 }, { x: 844, y: 138, w: 500, h: 556 }],
    text: [{ x: 404, y: 226, w: 392, h: 420 }, { x: 880, y: 226, w: 396, h: 420 }],
    spine: { x: 838, y: 420 }
  },
  port: {
    W: 941, H: 1672, closedSrc: 'art/book/closed-tall.jpg', openSrc: 'art/book/open-tall.jpg',
    closed: { x: 100, y: 462, w: 760, h: 655 },
    spread: { x: 15, y: 575, w: 910, h: 520 },
    pages: [{ x: 125, y: 585, w: 345, h: 455 }, { x: 474, y: 585, w: 356, h: 455 }],
    text: [{ x: 176, y: 657, w: 273, h: 344 }, { x: 500, y: 657, w: 282, h: 344 }],
    spine: { x: 472, y: 820 }
  }
};
var BK = BKS.land;
var BOOK = { open: false, stage: 'closed', idx: 0, pages: [], busy: false };
var bookEl = null;

function bkPct(r) { return 'left:' + (r.x / BK.W * 100) + '%;top:' + (r.y / BK.H * 100) + '%;width:' + (r.w / BK.W * 100) + '%;height:' + (r.h / BK.H * 100) + '%'; }
function bkMode() { return innerWidth >= 700 && innerWidth / innerHeight >= 0.95 ? 'spread' : 'page'; }
/* the camera: fit a box of the picture into the screen */
function bkCam(box, padTop, padBot) {
  var vw = innerWidth, vh = innerHeight, padX = vw < 500 ? 10 : 40;
  var s = Math.min((vw - 2 * padX) / box.w, (vh - padTop - padBot) / box.h);
  s = Math.max(s, vw / BK.W, vh / BK.H);                      /* the picture always fills the screen */
  var left = vw / 2 - (box.x + box.w / 2) * s, top = padTop + (vh - padTop - padBot) / 2 - (box.y + box.h / 2) * s;
  left = Math.min(0, Math.max(vw - BK.W * s, left)); top = Math.min(0, Math.max(vh - BK.H * s, top));
  return { s: s, left: left, top: top };
}
function bkTarget() {
  if (BOOK.stage === 'closed') return bkCam(BK.closed, 70, 120);
  if (bkMode() === 'spread') return bkCam(BK.spread, 70, 84);
  return bkCam(BK.pages[BOOK.idx % 2], 70, 84);
}
function bkPlace(anim) {
  var w = document.getElementById('bkWorld'); if (!w) return;
  var c = bkTarget();
  w.classList.toggle('anim', !!anim && !reduceMotion);
  w.style.left = c.left.toFixed(1) + 'px'; w.style.top = c.top.toFixed(1) + 'px';
  w.style.width = (BK.W * c.s).toFixed(1) + 'px'; w.style.height = (BK.H * c.s).toFixed(1) + 'px';
  w.style.setProperty('--u', c.s.toFixed(4));
  w.style.perspective = Math.round(2600 * c.s) + 'px';
  if (anim && !reduceMotion) setTimeout(bkFitAll, 1000);       /* pages are re-fitted once the camera has settled */
}

function bkStyle() {
  if (document.getElementById('bkStyle')) return;
  var st = document.createElement('style'); st.id = 'bkStyle';
  st.textContent = [
    '#bookScene{position:fixed;inset:0;z-index:34;display:none;overflow:hidden;color:var(--ink);font-family:var(--fbody);-webkit-user-select:none;user-select:none;background:#5C2A14}',
    '#bookScene.on{display:block;animation:bkIn .45s ease-out both}@keyframes bkIn{from{opacity:0}}',
    '#lightbox{z-index:60}',
    '.bk-world{position:absolute;transform-origin:50% 50%}',
    '.bk-world.anim{transition:left .95s cubic-bezier(.55,0,.25,1),top .95s cubic-bezier(.55,0,.25,1),width .95s cubic-bezier(.55,0,.25,1),height .95s cubic-bezier(.55,0,.25,1)}',
    '.bk-img{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}',
    '.bk-closed{transition:opacity .9s ease}.bk-open{opacity:0;transition:opacity .9s ease}',
    '#bookScene.st-open .bk-closed,#bookScene.st-opening .bk-closed{opacity:0}#bookScene.st-open .bk-open,#bookScene.st-opening .bk-open{opacity:1}',
    /* buttons */
    '#bookScene .b-btn,#bookScene .bk-enter,#bookScene .bk-go{clip-path:var(--px-step)}',
    '.b-btn{height:46px;min-width:46px;padding:0 14px;border:3px solid var(--berry);border-bottom-width:7px;background:var(--cream);color:var(--berry);font-family:var(--fdisp);font-weight:600;font-size:16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;cursor:pointer;transition:transform .08s,border-bottom-width .08s}',
    '.b-btn:hover{transform:translateY(-1px)}.b-btn:active{transform:translateY(4px);border-bottom-width:3px}.b-btn[disabled]{opacity:.45;pointer-events:none}',
    '.bk-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(12px + env(safe-area-inset-top)) 14px 10px;z-index:8}',
    '.bk-enter{position:absolute;left:50%;bottom:calc(34px + env(safe-area-inset-bottom));transform:translateX(-50%);height:58px;padding:0 24px;border:3px solid var(--berry-dk);border-bottom-width:8px;background:var(--berry);color:var(--cream);font-family:var(--fdisp);font-weight:600;font-size:20px;display:flex;align-items:center;gap:12px;white-space:nowrap;cursor:pointer;z-index:8;transition:opacity .3s,transform .08s,border-bottom-width .08s}',
    '.bk-enter img{height:22px;image-rendering:pixelated}.bk-enter:hover{transform:translate(-50%,-1px)}.bk-enter:active{transform:translate(-50%,4px);border-bottom-width:4px}',
    '#bookScene:not(.st-closed) .bk-enter{opacity:0;pointer-events:none}',
    '#bookScene.st-closed .bk-enter{transition-delay:.5s}',
    '.bk-nav{position:absolute;left:0;right:0;bottom:calc(16px + env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:center;gap:14px;z-index:8;color:var(--cream);font-family:var(--fdisp);transition:opacity .4s}',
    '.bk-nav .cnt{min-width:110px;text-align:center;font-size:15px;text-shadow:0 2px 0 rgba(40,15,10,.6)}',
    '#bookScene:not(.st-open) .bk-nav,#bookScene:not(.st-open) #bkShut{opacity:0;pointer-events:none}',
    '#bkShut{transition:opacity .4s}',
    /* the pages: everything is sized from --u (screen pixels per picture pixel) */
    '.bk-pg{position:absolute;display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;opacity:0;transition:opacity .45s ease;-webkit-overflow-scrolling:touch;color:var(--ink)}',
    '.bk-pg::-webkit-scrollbar{display:none}',
    '#bookScene.st-open .bk-pg{opacity:1}#bookScene.st-open .bk-pg.fade{opacity:0;transition-duration:.18s}',
    '.bk-pg h2{margin:0;font-family:var(--ftitle);font-weight:700;font-size:max(18px,calc(var(--u) * 36px));line-height:1.08;color:var(--berry);overflow-wrap:anywhere}',
    '.bk-pg .meta{margin:calc(var(--u) * 6px) 0 0;font-family:var(--fdisp);font-size:max(12px,calc(var(--u) * 17px));color:var(--wood)}',
    '.bk-pg .note{margin:calc(var(--u) * 12px) 0 0;font-size:max(13px,calc(var(--u) * 20px * var(--ps,1)));line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.bk-pg .note.sm{font-size:max(13px,calc(var(--u) * 17px * var(--ps,1)));line-height:1.5}.bk-pg .note.xs{font-size:max(13px,calc(var(--u) * 15px * var(--ps,1)));line-height:1.45}',
    '.bk-pols{display:flex;justify-content:center;align-items:flex-start;gap:calc(var(--u) * 14px);margin:calc(var(--u) * 4px) 0 calc(var(--u) * 14px);flex-wrap:wrap}',
    '.bk-pol{flex:none;width:50%;padding:calc(var(--u) * 9px) calc(var(--u) * 9px) calc(var(--u) * 30px);background:#fff;border:2px solid #E2C2AE;box-shadow:0 calc(var(--u) * 5px) 0 rgba(120,70,60,.22);transform:rotate(var(--r,0deg));cursor:zoom-in;position:relative}',
    '.bk-pol:before{content:"";position:absolute;left:50%;top:calc(var(--u) * -10px);width:34%;height:calc(var(--u) * 20px);margin-left:-17%;background:rgba(242,180,140,.7)}',
    '.bk-pol img{display:block;width:100%;height:auto;background:#F3E2CB}',
        '.bk-pol:hover{transform:rotate(0deg) scale(1.03)}',
    '.bk-go{align-self:flex-start;margin-top:calc(var(--u) * 16px);flex:none;height:max(34px,calc(var(--u) * 46px));padding:0 max(10px,calc(var(--u) * 16px));border:3px solid var(--berry);border-bottom-width:6px;background:var(--cream);color:var(--berry);font-family:var(--fdisp);font-weight:600;font-size:max(13px,calc(var(--u) * 17px));cursor:pointer;white-space:nowrap}',
    '.bk-go:active{transform:translateY(3px);border-bottom-width:3px}',
    '.bk-empty{margin:auto 0;text-align:center;display:flex;flex-direction:column;align-items:center}',
    '.bk-empty h2{font-size:max(22px,calc(var(--u) * 46px))}',
    '.bk-empty p{margin:calc(var(--u) * 12px) 0 0;font-size:max(13px,calc(var(--u) * 19px));line-height:1.5;max-width:30ch}',
    '.bk-heart{margin-top:calc(var(--u) * 22px);width:max(64px,calc(var(--u) * 110px));height:max(64px,calc(var(--u) * 110px));border:0;background:url(art/heart.png) center/contain no-repeat;image-rendering:pixelated;cursor:pointer;animation:bkBeat 1.6s ease-in-out infinite}',
    '.bk-heart:active{transform:scale(.92)}@keyframes bkBeat{0%,100%{transform:scale(1)}12%{transform:scale(1.1)}24%{transform:scale(1)}36%{transform:scale(1.07)}}',
    /* the page that flips */
    '.bk-leaf{position:absolute;z-index:5;background-image:url(art/book/open.jpg);background-repeat:no-repeat;pointer-events:none;backface-visibility:visible}',
    '.bk-pg.away{opacity:0!important}',
    '.bk-leaf.f{transform-origin:0 50%;animation:bkFlipF .62s cubic-bezier(.45,0,.3,1) forwards}.bk-leaf.b{transform-origin:100% 50%;animation:bkFlipB .62s cubic-bezier(.45,0,.3,1) forwards}',
    '@keyframes bkFlipF{0%{transform:rotateY(0)}50%{filter:brightness(.82)}100%{transform:rotateY(-180deg)}}',
    '@keyframes bkFlipB{0%{transform:rotateY(0)}50%{filter:brightness(.82)}100%{transform:rotateY(180deg)}}',
    /* hearts that float up when the book opens */
    '.bk-fx{position:absolute;inset:0;pointer-events:none;z-index:6}',
    '.bk-sp{position:absolute;width:calc(var(--u) * 30px);height:calc(var(--u) * 30px);margin:calc(var(--u) * -15px) 0 0 calc(var(--u) * -15px);background:url(art/heart.png) center/contain no-repeat;image-rendering:pixelated;animation:bkSp 1.3s ease-out forwards}',
    '@keyframes bkSp{0%{transform:translate(0,0) scale(.3);opacity:0}20%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1);opacity:0}}',
    /* the small page shown while writing a memory */
    '.bk-prev{position:relative;width:min(100%,320px);margin:0 auto;box-shadow:0 4px 0 rgba(90,52,36,.35);border:3px solid var(--wood-dk);background-repeat:no-repeat;overflow:hidden;color:var(--ink);font-family:var(--fbody)}',
    '.bk-prev .bk-pg{opacity:1;transition:none}',
    '@media (prefers-reduced-motion:reduce){#bookScene *{transition:none!important;animation:none!important}}'
  ].join('');
  document.head.appendChild(st);
}
function bookEnsure() {
  if (bookEl) return bookEl;
  bkStyle();
  bookEl = document.createElement('section'); bookEl.id = 'bookScene'; bookEl.setAttribute('aria-label', 'Our Memories Book');
  document.body.appendChild(bookEl);
  bookEl.addEventListener('click', bookClick);
  var sx = null;
  bookEl.addEventListener('pointerdown', function (e) { sx = BOOK.stage === 'open' && !e.target.closest('button') ? e.clientX : null; });
  bookEl.addEventListener('pointerup', function (e) { if (sx == null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 60) bookTurn(dx < 0 ? 1 : -1); });
  window.addEventListener('keydown', function (e) {
    if (!BOOK.open) return;
    if (e.key === 'Escape') { if (document.getElementById('lightbox') && document.getElementById('lightbox').classList.contains('on')) return; bookClose(); }
    else if (BOOK.stage === 'open') { if (e.key === 'ArrowRight') bookTurn(1); else if (e.key === 'ArrowLeft') bookTurn(-1); }
    else if (BOOK.stage === 'closed' && e.key === 'Enter') bookEnter();
  });
  window.addEventListener('resize', function () {
    if (!BOOK.open) return;
    if (BK !== (bkMode() === 'spread' ? BKS.land : BKS.port)) { BOOK.busy = false; return bkRender(); }   /* phone turned sideways: swap to the other pictures */
    if (BOOK.stage === 'open' && bkMode() === 'spread') BOOK.idx -= BOOK.idx % 2;
    bkPlace(false); bkFill();
  });
  return bookEl;
}

function bookOpen() {
  bookEnsure(); closeSheet();
  if (typeof dashClose === 'function') dashClose();
  BOOK.open = true; BOOK.stage = 'closed'; BOOK.idx = 0; BOOK.busy = false;
  bkRender();
}
/* draws the scene with the pictures that fit this screen (portrait for phones, widescreen otherwise) */
function bkRender() {
  BK = bkMode() === 'spread' ? BKS.land : BKS.port;
  var isOpen = BOOK.stage === 'open';
  bookEl.innerHTML =
    '<div class="bk-world" id="bkWorld">' +
      '<img class="bk-img bk-closed" src="' + BK.closedSrc + '" alt="Our Memories Book, closed on the table">' +
      '<img class="bk-img bk-open" src="' + BK.openSrc + '" alt="">' +
      '<div class="bk-pg" id="bkL" style="' + bkPct(BK.text[0]) + '"></div>' +
      '<div class="bk-pg" id="bkR" style="' + bkPct(BK.text[1]) + '"></div>' +
      '<div class="bk-fx" id="bkFx"></div>' +
    '</div>' +
    '<div class="bk-top"><button class="b-btn" type="button" data-b="close">\u2039 Map</button><button class="b-btn" type="button" data-b="shut" id="bkShut">Close book</button></div>' +
    '<button class="bk-enter" type="button" data-b="enter"><img alt="" src="art/heart.png">Open our book<img alt="" src="art/heart.png"></button>' +
    '<div class="bk-nav"><button class="b-btn" type="button" data-b="prev" aria-label="Previous page">\u2039</button><span class="cnt" id="bkCnt"></span>' +
      '<button class="b-btn" type="button" data-b="next" aria-label="Next page">\u203a</button></div>';
  bookEl.className = 'on ' + (isOpen ? 'st-open' : 'st-closed');
  bkPlace(false);
  if (isOpen) bkFill();
}
function bookClose() { BOOK.open = false; if (bookEl) { bookEl.classList.remove('on'); bookEl.innerHTML = ''; } }
window.bookOpen = bookOpen;

/* ---------------- opening and closing ---------------- */
function bookEnter() {
  if (BOOK.stage !== 'closed' || BOOK.busy) return;
  BOOK.busy = true; BOOK.idx = 0; bkBuild(); bkFill();
  bookEl.className = 'on st-opening';
  if (typeof playSound === 'function') playSound('chime');
  var q = reduceMotion ? 0 : 1;
  setTimeout(function () { BOOK.stage = 'open'; bkPlace(true); }, 250 * q);
  setTimeout(bkSparkle, 1000 * q);
  setTimeout(function () { bookEl.className = 'on st-open'; BOOK.busy = false; bkFitAll(); }, 1200 * q);
}
function bookShut() {
  if (BOOK.stage !== 'open' || BOOK.busy) return;
  BOOK.busy = true; BOOK.stage = 'closed';
  bookEl.className = 'on st-opening';
  setTimeout(function () { bookEl.className = 'on st-closed'; bkPlace(true); }, reduceMotion ? 0 : 300);
  setTimeout(function () { BOOK.busy = false; }, reduceMotion ? 0 : 1100);
}
function bkSparkle() {
  var fx = document.getElementById('bkFx'); if (!fx || reduceMotion) return;
  for (var i = 0; i < 7; i++) {
    var s = document.createElement('span'), a = -Math.PI / 2 + (i - 3) * 0.32;
    s.className = 'bk-sp';
    s.style.left = (BK.spine.x / BK.W * 100) + '%'; s.style.top = (BK.spine.y / BK.H * 100) + '%';
    s.style.setProperty('--dx', 'calc(var(--u) * ' + Math.round(Math.cos(a) * 260) + 'px)');
    s.style.setProperty('--dy', 'calc(var(--u) * ' + Math.round(Math.sin(a) * 300) + 'px)');
    s.style.animationDelay = (i % 3) * 0.08 + 's';
    fx.appendChild(s);
  }
  setTimeout(function () { fx.innerHTML = ''; }, 1600);
}

/* ---------------- the pages ---------------- */
function memPhotos(m) {
  if (m.previewSrcs) return m.previewSrcs.slice();      /* the preview shown while writing a memory */
  var list = (m.photos && m.photos.length) ? m.photos : [m];
  return list.map(function (p) { return photoCandidates(p)[0] || ''; }).filter(Boolean);
}
function bkPols(list, m) {
  if (!list.length) return '';
  return '<div class="bk-pols n' + Math.min(list.length, 4) + '">' + list.map(function (src, i) {
    var r = ((polHash(m.id + i) % 9) - 4) * 0.8;
    return '<button class="bk-pol" type="button" data-b="photo" data-src="' + esc(src) + '" data-cap="' + esc(m.title || '') + '" style="--r:' + r.toFixed(1) + 'deg"><img alt="" src="' + esc(src) + '"></button>';
  }).join('') + '</div>';
}
/* one memory: the first page holds the polaroid, title, when and where, and the note.
   More photos than fit run on to the next pages, four at a time. */
function memPages(m) {
  var ph = memPhotos(m), note = (m.note || '').trim(), title = esc(m.title || 'A memory');
  var size = note.length > 600 ? ' xs' : note.length > 260 ? ' sm' : '';
  var meta = [fmtDate(m.date), nearestTown(m.lat, m.lng).name, whoName(m.by)].filter(Boolean).join(' · ');
  var firstN = note ? 1 : 2, first = ph.slice(0, firstN), rest = ph.slice(firstN), pages = [];
  pages.push(bkPols(first, m) + '<h2>' + title + '</h2><div class="meta">' + esc(meta) + '</div>' + (note ? '<p class="note' + size + '">' + esc(note) + '</p>' : ''));
  for (var i = 0; i < rest.length; i += 4) pages.push('<h2>' + title + '</h2><div class="meta">more photos</div>' + bkPols(rest.slice(i, i + 4), m));
  pages[pages.length - 1] += '<button class="bk-go" type="button" data-b="map" data-id="' + esc(m.id) + '">Show on map</button>';
  return pages;
}
function bkBuild() {
  var mems = S.memories.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || (b.at || 0) - (a.at || 0); });
  var pages = [];
  mems.forEach(function (m) { memPages(m).forEach(function (p) { pages.push(p); }); });
  if (!pages.length) pages = ['<div class="bk-empty"><h2>Save your memories!</h2><button class="bk-heart" type="button" data-b="heart" aria-label="Save a memory on the map"></button><p>Tap the heart, then pick the spot on the map. Each memory gets its own page here.</p></div>'];
  BOOK.pages = pages;
}
/* Make one page fit: photos take the shape of the photo (never cropped); if the page is
   still too full the photos, then the note, shrink a step at a time. */
function bkFitPage(pg, u) {
  if (!pg || !pg.firstChild) return;
  var pols = pg.querySelectorAll('.bk-pol');
  function layout(ps) {
    pg.style.setProperty('--ps', ps.toFixed(2));
    [].forEach.call(pols, function (pol) {
      var im = pol.querySelector('img'); if (!im || !im.naturalWidth) return;
      var n = Math.min(4, pol.parentNode.children.length), ratio = im.naturalWidth / im.naturalHeight, chrome = 18 * u;
      var maxW = pg.clientWidth * (n === 1 ? 0.62 : 0.44) - chrome, maxH = (n === 1 ? 230 : n === 2 ? 170 : 120) * u * ps;
      pol.style.width = (Math.max(40 * u, Math.min(maxW, maxH * ratio)) + chrome).toFixed(1) + 'px';
    });
  }
  for (var ps = 1; ps >= 0.5; ps -= 0.07) { layout(ps); if (pg.scrollHeight <= pg.clientHeight + 1) break; }
}
function bkFitAll() {
  var w = document.getElementById('bkWorld'); if (!w) return;
  var u = parseFloat(w.style.getPropertyValue('--u')) || 1;
  ['bkL', 'bkR'].forEach(function (id) {
    var pg = document.getElementById(id); if (!pg) return;
    bkFitPage(pg, u);
    [].forEach.call(pg.querySelectorAll('.bk-pol img'), function (im) { if (!im.complete) im.addEventListener('load', function () { bkFitPage(pg, parseFloat(w.style.getPropertyValue('--u')) || 1); }); });
  });
}
function bkFill() {
  var L = document.getElementById('bkL'), R = document.getElementById('bkR'); if (!L) return;
  if (BOOK.idx >= BOOK.pages.length) BOOK.idx = Math.max(0, BOOK.pages.length - 1);
  var start = BOOK.idx - BOOK.idx % 2, n = BOOK.pages.length, spread = bkMode() === 'spread';
  L.innerHTML = BOOK.pages[start] || ''; R.innerHTML = BOOK.pages[start + 1] || '';
  L.scrollTop = 0; R.scrollTop = 0; bkFitAll();
  /* on a phone only the page in view shows its words */
  L.classList.toggle('away', !spread && BOOK.idx % 2 === 1); R.classList.toggle('away', !spread && BOOK.idx % 2 === 0);
  var cnt = document.getElementById('bkCnt');
  if (cnt) cnt.textContent = spread ? 'Pages ' + (start + 1) + (start + 2 <= n ? '–' + (start + 2) : '') + ' of ' + n : 'Page ' + (BOOK.idx + 1) + ' of ' + n;
  var last = spread ? start + 2 >= n : BOOK.idx + 1 >= n;
  var pv = bookEl.querySelector('[data-b="prev"]'), nx = bookEl.querySelector('[data-b="next"]');
  if (pv) pv.disabled = BOOK.idx <= 0; if (nx) nx.disabled = last;
}

/* turning: across a spread the page flips; on a phone, moving between the two
   pages of the same spread is a camera pan */
function bookTurn(dir) {
  if (BOOK.stage !== 'open' || BOOK.busy) return;
  var n = BOOK.pages.length, spread = bkMode() === 'spread', side = BOOK.idx % 2;
  if (!spread && ((dir > 0 && side === 0) || (dir < 0 && side === 1))) {
    var to = BOOK.idx + dir; if (to < 0 || to >= n) return;
    BOOK.idx = to; bkPlace(true); bkFill(); return;
  }
  var next = spread ? BOOK.idx - side + dir * 2 : BOOK.idx + dir;
  if (next < 0 || next >= n) return;
  if (typeof playSound === 'function') playSound('save');
  if (reduceMotion) { BOOK.idx = next; bkFill(); bkPlace(false); return; }
  BOOK.busy = true;
  var w = document.getElementById('bkWorld'), leaf = document.createElement('div');
  leaf.className = 'bk-leaf ' + (dir > 0 ? 'f' : 'b');
  var lp = BK.pages[dir > 0 ? 1 : 0];
  /* the leaf is cut from the open-book picture itself, so it is the same paper */
  leaf.style.cssText = bkPct(lp) + ';background-size:' + (BK.W / lp.w * 100) + '% ' + (BK.H / lp.h * 100) + '%;background-position:' + (lp.x / (BK.W - lp.w) * 100) + '% ' + (lp.y / (BK.H - lp.h) * 100) + '%';
  w.appendChild(leaf);
  var pgs = [document.getElementById('bkL'), document.getElementById('bkR')];
  pgs.forEach(function (p) { p.classList.add('fade'); });
  setTimeout(function () { BOOK.idx = next; bkFill(); pgs.forEach(function (p) { p.classList.remove('fade'); }); }, 320);
  setTimeout(function () { leaf.remove(); if (!spread) bkPlace(true); BOOK.busy = false; }, 640);
}

function bookClick(e) {
  var b = e.target.closest('[data-b]'); if (!b) return;
  var a = b.dataset.b;
  if (a === 'close') return bookClose();
  if (a === 'enter') return bookEnter();
  if (a === 'shut') return bookShut();
  if (a === 'prev') return bookTurn(-1);
  if (a === 'next') return bookTurn(1);
  if (a === 'photo') return openPhoto(b.dataset.src, b.dataset.cap || '');
  if (a === 'heart') { bookClose(); return startPlacing('memory'); }
  if (a === 'map') {
    var id = b.dataset.id, m = null; S.memories.forEach(function (x) { if (x.id === id) m = x; });
    bookClose(); if (m) { flyTo(m.lat, m.lng, 12.4); openItem({ kind: 'memory', id: id }); }
  }
}

/* ---------------- the preview shown when you place a memory ----------------
   The same page the memory will have in the book, drawn small inside the form.
   rec: { title, note, date, lat, lng, by, srcs: [photo urls] } */
function bkPreviewHtml(rec) {
  bkStyle();
  var A = BKS.land, lp = A.pages[1], tx = A.text[1];
  var m = { id: 'preview', title: rec.title || 'Your title', note: rec.note || '', date: rec.date, lat: rec.lat, lng: rec.lng, by: rec.by, previewSrcs: rec.srcs || [] };
  var pages = memPages(m);
  var pos = 'left:' + ((tx.x - lp.x) / lp.w * 100) + '%;top:' + ((tx.y - lp.y) / lp.h * 100) + '%;width:' + (tx.w / lp.w * 100) + '%;height:' + (tx.h / lp.h * 100) + '%';
  var bg = 'background-image:url(' + A.openSrc + ');background-size:' + (A.W / lp.w * 100) + '% ' + (A.H / lp.h * 100) + '%;background-position:' + (lp.x / (A.W - lp.w) * 100) + '% ' + (lp.y / (A.H - lp.h) * 100) + '%;aspect-ratio:' + lp.w + '/' + lp.h;
  return '<div class="bk-prev" style="' + bg + '"><div class="bk-pg" style="' + pos + '">' + pages[0] + '</div></div>' +
    (pages.length > 1 ? '<p class="hint" style="text-align:center">+ ' + (pages.length - 1) + (pages.length === 2 ? ' more page' : ' more pages') + ' for the rest of the photos</p>' : '');
}
/* sizes the small page's type to its width (call after it is in the document) */
function bkPreviewFit(root) {
  var c = root && root.querySelector('.bk-prev'); if (!c) return;
  var u = c.clientWidth / BKS.land.pages[1].w, pg = c.querySelector('.bk-pg');
  c.style.setProperty('--u', u.toFixed(4));
  bkFitPage(pg, u);
  [].forEach.call(pg.querySelectorAll('.bk-pol img'), function (im) { if (!im.complete) im.addEventListener('load', function () { bkFitPage(pg, u); }); });
}

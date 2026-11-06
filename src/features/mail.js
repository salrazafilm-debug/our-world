/* Mail: the post office between our homes (design: docs/MAIL.md, style: STYLE.md).
   On the map it is a little island; with mail waiting it glows and an envelope
   with a red dot floats above it. Tapping it zooms in to the outside of the post
   office; going in opens the mail room: Inbox (today's note and floating
   letters), Compose, Our Letters (look back, one at a time) and Today's Note.
   Letters live in the shared `mail` collection: { title, body, from, to, at, openedAt }. */

S.mail = [];
try { S.mail = JSON.parse(localStorage.getItem('ow.mail') || '[]') || []; } catch (e) {}
ROWHOOKS.mail = function (rows) {
  S.mail = rows || [];
  try { localStorage.setItem('ow.mail', JSON.stringify(S.mail)); } catch (e) {}
  if (MAIL.open) mailRender();
  draw();
};
var MAIL = { open: false, mode: 'ext', tab: 'inbox', read: null, list: null, idx: 0, busy: false };

/* the post office sits halfway between our two homes */
var MAIL_POS = { lat: (HOMES.bruce.lat + HOMES.elena.lat) / 2, lng: (HOMES.bruce.lng + HOMES.elena.lng) / 2 };
function mailUnread() { return S.mail.filter(function (m) { return m.to === S.who && !m.openedAt; }).sort(function (a, b) { return (a.at || 0) - (b.at || 0); }); }
function mailAll() { return S.mail.slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); }); }
function mailSave(m) {
  S.mail = S.mail.filter(function (x) { return x.id !== m.id; }).concat([m]);
  try { localStorage.setItem('ow.mail', JSON.stringify(S.mail)); } catch (e) {}
  if (S.db) S.db.collection('mail').doc(m.id).set(m).catch(function () { toast('Saved on this phone — it will send when you are back online.', '✉️', 4500); });
}
function mailDate(ts) {
  var d = new Date(ts || Date.now());
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}
function shortName(k) { return whoName(k).replace('Princess ', ''); }

/* ---------------- on the map ---------------- */
var MAILBOX = null;
HOOKS.beforePins.push(function () {
  MAILBOX = null;
  if (S.mode !== 'map' || !S.who) return;
  var z = S.zoom; if (z < 6.8) return;                     /* too far out to see or tap */
  var p = proj(MAIL_POS.lat, MAIL_POS.lng);
  var h = Math.round(homeArtH(z) * 0.8), w = h * 449 / 314;
  if (p.x < -w || p.y < -h * 2 || p.x > W + w || p.y > H + h) return;
  var fade = Math.min(1, (z - 6.8) / 0.8), unread = mailUnread().length;
  ctx.save(); ctx.globalAlpha = fade;
  if (unread) {                                            /* a soft glow when mail is waiting */
    var g = ctx.createRadialGradient(p.x, p.y - h * 0.45, 0, p.x, p.y - h * 0.45, w * 0.55);
    g.addColorStop(0, 'rgba(255,214,140,.55)'); g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y - h * 0.45, w * 0.55, 0, 6.283); ctx.fill();
  }
  var box = drawArt(ctx, 'mail/postoffice', p.x, p.y, h, DPR);
  if (box) {
    MAILBOX = box;
    if (unread) {                                          /* the floating envelope with a red dot */
      var bob = reduceMotion ? 0 : Math.sin(cloudPhase / 9) * 3, eh = Math.max(16, h * 0.32);
      var eb = drawArt(ctx, 'mail/env-gold', p.x, box.y + eh * 0.2 + bob, eh, DPR);
      if (eb) {
        var r = Math.max(7, eh * 0.24), cx = eb.x + eb.w - r * 0.5, cy = eb.y + r * 0.4;
        ctx.fillStyle = '#D9363E'; ctx.strokeStyle = '#FFF2DF'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(r * 1.25) + 'px "Pixelify Sans", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(unread > 9 ? '9+' : String(unread), cx, cy + 1);
        ctx.textBaseline = 'alphabetic';
      }
    }
    addHit({ x: box.x, y: box.y - h * 0.4, w: box.w, h: box.h + h * 0.4 }, { kind: 'mail' });
  }
  ctx.restore();
  if (box && z > 8) tryLabel(p.x, p.y + 20, 'Post Office' + (unread ? ' · ' + unread + ' new' : ''), { size: 12, force: 1, bg: 'rgba(255,242,223,.96)', border: '#8E3A57', fg: '#5E2238' });
});

/* ---------------- the scene ---------------- */
var mailEl = null;
function mailEnsure() {
  if (mailEl) return mailEl;
  var st = document.createElement('style');
  st.textContent = [
    '#mailScene{position:fixed;inset:0;z-index:33;display:none;overflow:hidden;color:var(--ink);font-family:var(--fbody);-webkit-user-select:none;user-select:none}',
    '#mailScene.on{display:block}',
    '#mailScene .m-btn,#mailScene .m-tab,#mailScene .m-paper,#mailScene .m-row,#mailScene .m-sign,#mailScene .m-pill{clip-path:var(--px-step)}',
    '.m-btn{height:46px;min-width:46px;padding:0 14px;border:3px solid var(--berry);border-bottom-width:7px;background:var(--cream);color:var(--berry);font-family:var(--fdisp);font-weight:600;font-size:16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform .08s,border-bottom-width .08s}',
    '.m-btn:hover{transform:translateY(-1px)}.m-btn:active{transform:translateY(4px);border-bottom-width:3px}',
    '.m-btn.primary{background:var(--berry);color:var(--cream);border-color:var(--berry-dk)}.m-btn[disabled]{opacity:.5}',
    '.m-btn img{width:22px;height:18px;object-fit:contain;image-rendering:pixelated}',
    /* outside */
    '.m-ext{position:absolute;inset:0;background:#2E2747;overflow:hidden}',
    /* the scene fills the screen; tall art on phones, wide art on computers */
    '.m-ext .box{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:max(100vw,calc(100vh * 1670 / 838));aspect-ratio:1670/838}',
    '.m-ext.tall .box{width:max(100vw,calc(100vh * 941 / 1547));aspect-ratio:941/1547}',
    '.m-ext.zoom .box{animation:mZoom .7s cubic-bezier(.2,.8,.2,1)}@keyframes mZoom{from{transform:translate(-50%,-50%) scale(.3);opacity:.2}}',
    '.m-ext .box img.scene{position:absolute;inset:0;width:100%;height:100%}',
    '.m-door{background:none;border:none;padding:0;position:absolute;left:47.4%;top:31%;width:5.6%;height:19%;cursor:pointer}',
    '.m-ext.tall .m-door{left:45.6%;top:37%;width:9%;height:13%}',
    '.m-float{position:absolute;left:50%;top:4%;width:7.5%;transform:translateX(-50%);animation:mBob 2.6s ease-in-out infinite;pointer-events:none}',
    '.m-ext.tall .m-float{top:21%;width:16%}',
    '.m-float img{width:100%;image-rendering:pixelated;filter:drop-shadow(0 0 12px rgba(255,214,140,.8))}.m-float .m-dot{position:absolute;right:-12%;top:-18%}',
    '.m-pill{position:fixed;left:50%;bottom:calc(26px + env(safe-area-inset-bottom));transform:translateX(-50%);min-width:220px;height:58px;padding:0 22px;border:3px solid var(--berry-dk);border-bottom-width:8px;background:var(--berry);color:var(--cream);font-family:var(--fdisp);font-weight:600;font-size:19px;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer}',
    '.m-pill img{height:26px;image-rendering:pixelated}.m-pill:active{transform:translate(-50%,4px);border-bottom-width:4px}',
    '.m-dot{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 5px;border-radius:50%;background:#D9363E;color:#fff;font-family:var(--fdisp);font-size:13px;border:2px solid var(--cream)}',
    '@keyframes mBob{50%{transform:translate(-50%,-6px)}}',
    '.m-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:10px;padding:calc(12px + env(safe-area-inset-top)) 14px 10px;z-index:5}',
    '.m-sign{flex:1;text-align:center}.m-sign span{display:inline-flex;align-items:center;gap:10px;background:var(--wood);border:4px solid var(--wood-dk);border-bottom-width:8px;clip-path:var(--px-step);padding:6px 18px 8px;font-family:var(--ftitle);font-size:clamp(22px,6vw,32px);color:var(--cream);line-height:1}',
    '.m-sign img{height:26px;image-rendering:pixelated}',
    /* inside */
    '.m-room{position:absolute;inset:0;background:#3A2530}',
    /* a warm wooden room: planks, a shelf line and two lamp glows (no baked UI behind the controls) */
    '.m-room .bg{position:absolute;inset:0;background:radial-gradient(circle at 12% 8%,rgba(255,190,110,.35),transparent 28%),radial-gradient(circle at 88% 8%,rgba(255,190,110,.35),transparent 28%),repeating-linear-gradient(90deg,#4A2C2E 0 46px,#432729 46px 48px);}',
    '.m-room .bg:after{content:"";position:absolute;left:0;right:0;bottom:0;height:22%;background:#5A3424;border-top:6px solid #3B2018}',
    '.m-room.enter{animation:mIn .45s ease-out}@keyframes mIn{from{opacity:0;transform:scale(1.06)}}',
    '.m-body{position:absolute;left:0;right:0;top:calc(84px + env(safe-area-inset-top));bottom:0;display:flex;flex-direction:column;gap:12px;padding:0 14px calc(14px + env(safe-area-inset-bottom));max-width:980px;margin:0 auto}',
    '.m-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}',
    '.m-tab{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px 7px;border:3px solid var(--wood-dk);border-bottom-width:7px;background:#EBD3B5;color:var(--wood-dk);font-family:var(--fdisp);font-weight:600;font-size:13.5px;text-align:center;transition:transform .08s}',
    '.m-tab img{width:30px;height:24px;object-fit:contain;image-rendering:pixelated}',
    '.m-tab.on{background:var(--cream);color:var(--berry-dk);border-color:var(--berry);border-bottom-color:var(--berry-dk)}',
    '.m-tab:active{transform:translateY(4px);border-bottom-width:3px}.m-tab .m-dot{position:absolute;top:4px;right:6px}',
    '.m-main{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:14px;align-items:center;padding-bottom:6px}',
    '@media (min-width:860px){.m-body{flex-direction:row;align-items:flex-start}.m-tabs{grid-template-columns:1fr;width:230px;flex:none}.m-tab{flex-direction:row;justify-content:flex-start;gap:12px;padding:12px 14px 11px;font-size:17px}.m-tab .m-dot{position:static;margin-left:auto}.m-main{height:100%}}',
    '.m-paper{width:min(100%,560px);background:#FFF4E6;border:3px solid #C99A84;border-bottom-width:7px;padding:18px 20px 20px;color:var(--ink);box-shadow:none}',
    '.m-paper h3{margin:0 0 10px;text-align:center;font-family:var(--fdisp);font-weight:600;font-size:20px;color:var(--berry-dk)}',
    '.m-paper .txt{font-size:16.5px;line-height:1.65;white-space:pre-wrap;word-wrap:break-word;user-select:text;-webkit-user-select:text}',
    '.m-paper .meta{margin-top:12px;font-family:var(--fdisp);font-size:14px;color:var(--rose);text-align:right}',
    '.m-paper.pinned{position:relative}.m-paper.pinned:before{content:"";position:absolute;top:-2px;left:50%;width:14px;height:14px;margin-left:-7px;background:var(--berry);clip-path:polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)}',
    '.m-env-row{display:flex;flex-wrap:wrap;justify-content:center;gap:18px;padding:8px 0 4px}',
    '.m-env{position:relative;width:96px;background:none;border:none;padding:0;cursor:pointer;animation:mBob 2.8s ease-in-out infinite}',
    '.m-env:nth-child(2){animation-delay:-.9s}.m-env:nth-child(3){animation-delay:-1.8s}',
    '.m-env img{width:100%;image-rendering:pixelated;filter:drop-shadow(0 0 10px rgba(255,214,140,.65));transition:transform .15s}',
    '.m-env:hover img{transform:translateY(-4px) rotate(-3deg)}.m-env span{display:block;margin-top:6px;font-family:var(--fdisp);font-size:13px;color:var(--cream);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.m-empty{color:var(--cream);text-align:center;font-size:15px;line-height:1.5;padding:12px}',
    /* reading */
    '.m-read{width:min(100%,560px);display:flex;flex-direction:column;align-items:center}',
    '.m-read .m-paper{animation:mUnfold .55s cubic-bezier(.2,.8,.2,1) both}',
    '@keyframes mUnfold{0%{transform:translateY(60px) scaleY(.15);opacity:0}60%{opacity:1}100%{transform:none}}',
    '.m-read .under{width:150px;margin-top:-6px;image-rendering:pixelated;animation:mFlap .4s ease-out both}@keyframes mFlap{from{transform:translateY(-30px);opacity:0}}',
    '.m-nav{display:flex;align-items:center;gap:12px;margin-top:12px;color:var(--cream);font-family:var(--fdisp)}',
    /* compose */
    '.m-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}.m-field label{font-family:var(--fdisp);font-size:15px;color:var(--berry-dk)}',
    '.m-field input,.m-field textarea{font:inherit;font-size:16px;color:var(--ink);background:#FFFDF8;border:3px solid #E2C2AE;padding:10px 12px;border-radius:0;user-select:text;-webkit-user-select:text}',
    '.m-field input:focus,.m-field textarea:focus{outline:none;border-color:var(--berry)}.m-field textarea{min-height:150px;resize:vertical;line-height:1.6}',
    '.m-tools{display:flex;align-items:center;gap:10px}.m-tools .grow{flex:1}',
    '.m-fly{position:fixed;z-index:40;width:110px;pointer-events:none;image-rendering:pixelated;animation:mFly 1.1s cubic-bezier(.5,0,.75,0) forwards}',
    '@keyframes mFly{0%{transform:translate(0,0) scale(1) rotate(0)}100%{transform:translate(42vw,-70vh) scale(.3) rotate(-18deg);opacity:0}}',
    '.m-fold{animation:mFold .45s ease-in forwards}@keyframes mFold{to{transform:scaleY(.1) translateY(80px);opacity:0}}',
    /* look back */
    '.m-list{width:min(100%,560px);display:flex;flex-direction:column;gap:9px}',
    '.m-row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:9px 12px 8px;background:var(--cream);border:3px solid #C99A84;border-bottom-width:6px;cursor:pointer}',
    '.m-row:active{transform:translateY(3px);border-bottom-width:3px}.m-row.new{border-color:var(--berry)}',
    '.m-row img{width:48px;image-rendering:pixelated;flex:none}.m-row b{display:block;font-family:var(--fdisp);font-weight:600;font-size:16px;color:var(--berry-dk)}',
    '.m-row small{font-size:13.5px;color:#8A6A5E}.m-row .chev{margin-left:auto;font-size:22px;color:var(--berry)}'
  ].join('');
  document.head.appendChild(st);
  mailEl = document.createElement('section'); mailEl.id = 'mailScene'; mailEl.setAttribute('aria-label', 'Post Office');
  document.body.appendChild(mailEl);
  mailEl.addEventListener('click', mailClick);
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && MAIL.open) mailBack(); });
  return mailEl;
}

function mailOpen(opts) {
  opts = opts || {};
  mailEnsure(); closeSheet();
  if (typeof dashClose === 'function') dashClose();
  MAIL.open = true; MAIL.read = null;
  MAIL.mode = opts.room ? 'room' : 'ext';
  MAIL.tab = opts.tab || 'inbox';
  if (!opts.room) flyTo(MAIL_POS.lat, MAIL_POS.lng, Math.max(S.zoom, 11.6));
  mailRender(true);
  mailEl.classList.add('on');
}
function mailClose() { MAIL.open = false; if (mailEl) mailEl.classList.remove('on'); draw(); }
function mailBack() {
  if (MAIL.mode === 'room' && MAIL.read) { MAIL.read = null; return mailRender(); }
  if (MAIL.mode === 'room') { MAIL.mode = 'ext'; return mailRender(true); }
  mailClose();
}
window.mailOpen = mailOpen;
ACTIONS['mail-open'] = function () { mailOpen({ room: true }); };

function dot(n) { return n ? '<span class="m-dot">' + (n > 9 ? '9+' : n) + '</span>' : ''; }
function mailRender(anim) {
  var n = mailUnread().length;
  if (MAIL.mode === 'ext') {
    var tall = innerWidth / innerHeight < 0.9;
    mailEl.innerHTML = '<div class="m-ext' + (tall ? ' tall' : '') + (anim ? ' zoom' : '') + '">' +
      '<div class="box"><img class="scene" alt="The post office" src="art/mail/exterior-' + (tall ? 'tall' : 'wide') + '.jpg">' +
        (n ? '<div class="m-float"><img alt="" src="art/mail/env-gold.png">' + dot(n) + '</div>' : '') +
        '<button class="m-door" type="button" data-m="enter" aria-label="Go inside"></button>' +
        '<button class="m-pill" type="button" data-m="enter"><img alt="" src="art/mail/env-row.png">' + (n ? 'New mail!' + dot(n) : 'Go inside') + '</button>' +
      '</div>' +
      '<div class="m-top"><button class="m-btn" type="button" data-m="back">‹ Map</button></div></div>';
    return;
  }
  var tabs = [['inbox', 'art/mail/env-row.png', 'Inbox', n], ['compose', 'art/ui/letters.png', 'Compose', 0], ['letters', 'art/ui/book.png', 'Our Letters', 0], ['note', 'art/heart.png', 'Today’s Note', 0]];
  mailEl.innerHTML = '<div class="m-room' + (anim ? ' enter' : '') + '"><div class="bg"></div>' +
    '<div class="m-top"><button class="m-btn" type="button" data-m="back" aria-label="Back">‹</button><div class="m-sign"><span><img alt="" src="art/mail/env-row.png">Mail Room</span></div><span style="width:46px"></span></div>' +
    '<div class="m-body"><nav class="m-tabs">' + tabs.map(function (t) {
      return '<button class="m-tab' + (MAIL.tab === t[0] && !MAIL.read ? ' on' : '') + '" type="button" data-m="tab" data-id="' + t[0] + '"><img alt="" src="' + t[1] + '">' + t[2] + dot(t[3]) + '</button>';
    }).join('') + '</nav><div class="m-main">' + (MAIL.read ? mailReadHtml() : mailTabHtml()) + '</div></div></div>';
}

function todayNoteHtml() {
  var them = other(S.who), n = S.notes && S.notes[them];
  return '<div class="m-paper pinned"><h3>Today’s Note ♥</h3><div class="txt">' +
    (n && n.text ? esc(n.text) : 'No note from ' + esc(shortName(them)) + ' yet today.') + '</div>' +
    (n && n.text ? '<div class="meta">from ' + esc(shortName(them)) + '</div>' : '') + '</div>';
}
function mailTabHtml() {
  var t = MAIL.tab;
  if (t === 'inbox') {
    var un = mailUnread();
    return todayNoteHtml() +
      (un.length ? '<div class="m-env-row">' + un.slice(0, 6).map(function (m) {
        return '<button class="m-env" type="button" data-m="open" data-id="' + esc(m.id) + '"><img alt="" src="art/mail/env-gold.png"><span>' + esc(m.title || 'A letter') + '</span></button>';
      }).join('') + '</div>' : '<p class="m-empty">No new letters right now.<br>Write one, or look back at old ones.</p>');
  }
  if (t === 'compose') {
    var to = shortName(other(S.who));
    return '<div class="m-paper" id="mPaper"><h3>A letter for ' + esc(to) + '</h3>' +
      '<div class="m-field"><label for="mTitle">Letter title</label><input id="mTitle" type="text" maxlength="60" placeholder="Tonight ♥"></div>' +
      '<div class="m-field"><label for="mBody">Your letter</label><textarea id="mBody" maxlength="4000" placeholder="Dear ' + esc(to) + ',"></textarea></div>' +
      '<div class="m-tools"><button class="m-btn" type="button" data-m="heart" aria-label="Add a heart">♥</button><span class="grow"></span>' +
      '<button class="m-btn primary" type="button" data-m="send"><img alt="" src="art/mail/env-row.png">Send</button></div></div>';
  }
  if (t === 'letters') {
    var all = mailAll();
    if (!all.length) return '<p class="m-empty">No letters yet. The first one is waiting to be written.</p>';
    return '<div class="m-list">' + all.map(function (m, i) {
      var mine = m.from === S.who, isNew = !mine && !m.openedAt;
      return '<button class="m-row' + (isNew ? ' new' : '') + '" type="button" data-m="look" data-i="' + i + '"><img alt="" src="art/mail/env-row.png"><span><b>' + esc(m.title || 'A letter') + '</b><small>' +
        mailDate(m.at) + ' · ' + (mine ? 'to ' + esc(shortName(m.to)) : 'from ' + esc(shortName(m.from))) + (isNew ? ' · new' : '') + '</small></span><span class="chev">›</span></button>';
    }).join('') + '</div>' +
      '<button class="m-btn" type="button" data-m="sealed" style="margin-top:4px">Sealed letters on the map</button>';
  }
  /* today's note: read theirs, write yours */
  var mineN = S.notes && S.notes[S.who];
  return todayNoteHtml() +
    '<div class="m-paper"><h3>Your note for ' + esc(shortName(other(S.who))) + '</h3>' +
    '<div class="m-field"><textarea id="mNote" maxlength="280" style="min-height:96px" placeholder="Good morning, I’m thinking about you…">' + esc(mineN && mineN.text || '') + '</textarea></div>' +
    '<div class="m-tools"><span class="grow"></span><button class="m-btn primary" type="button" data-m="note">Pin it</button></div></div>';
}
function mailReadHtml() {
  var m = MAIL.read, list = MAIL.list, mine = m.from === S.who;
  return '<div class="m-read"><div class="m-paper"><h3>' + esc(m.title || 'A letter') + ' ♥</h3><div class="txt">' + esc(m.body || '') + '</div>' +
    '<div class="meta">' + (mine ? 'to ' + esc(shortName(m.to)) : 'from ' + esc(shortName(m.from))) + ' · ' + mailDate(m.at) + '</div></div>' +
    '<img class="under" alt="" src="art/mail/env-gold.png">' +
    (list ? '<div class="m-nav"><button class="m-btn" type="button" data-m="prev"' + (MAIL.idx <= 0 ? ' disabled' : '') + ' aria-label="Newer letter">‹</button>' +
      '<span>' + (MAIL.idx + 1) + ' of ' + list.length + '</span>' +
      '<button class="m-btn" type="button" data-m="next"' + (MAIL.idx >= list.length - 1 ? ' disabled' : '') + ' aria-label="Older letter">›</button></div>'
      : '<div class="m-nav"><button class="m-btn" type="button" data-m="tab" data-id="inbox">Back to inbox</button></div>') + '</div>';
}
function mailMarkOpened(m) {
  if (m.to !== S.who || m.openedAt) return;
  m.openedAt = Date.now(); mailSave(m);
  if (typeof playSound === 'function') playSound('chime');
}

function mailClick(e) {
  var b = e.target.closest('[data-m]'); if (!b || MAIL.busy) return;
  var a = b.dataset.m;
  if (a === 'back') return mailBack();
  if (a === 'enter') { MAIL.mode = 'room'; MAIL.tab = mailUnread().length ? 'inbox' : 'inbox'; return mailRender(true); }
  if (a === 'tab') { MAIL.tab = b.dataset.id; MAIL.read = null; MAIL.list = null; return mailRender(); }
  if (a === 'open') {
    var m = S.mail.filter(function (x) { return x.id === b.dataset.id; })[0]; if (!m) return;
    MAIL.read = m; MAIL.list = null; mailMarkOpened(m); return mailRender();
  }
  if (a === 'look') {
    MAIL.list = mailAll(); MAIL.idx = parseInt(b.dataset.i, 10) || 0; MAIL.read = MAIL.list[MAIL.idx];
    mailMarkOpened(MAIL.read); return mailRender();
  }
  if (a === 'prev' || a === 'next') {
    MAIL.idx = Math.max(0, Math.min(MAIL.list.length - 1, MAIL.idx + (a === 'next' ? 1 : -1)));
    MAIL.read = MAIL.list[MAIL.idx]; mailMarkOpened(MAIL.read); return mailRender();
  }
  if (a === 'heart') {
    var ta = document.getElementById('mBody'); if (!ta) return;
    var pos = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, pos) + ' ♥' + ta.value.slice(pos); ta.focus();
    return;
  }
  if (a === 'sealed') { mailClose(); return ACTIONS['letters'](); }
  if (a === 'note') {
    var txt = (document.getElementById('mNote').value || '').trim();
    if (!txt) { toast('Write a few words first.', '✏️', 2600); return; }
    var rec = { text: txt, by: S.who, at: Date.now() };
    S.notes[S.who] = rec;
    try { localStorage.setItem('ow.notes', JSON.stringify(S.notes)); } catch (er) {}
    if (S.db) S.db.collection('notes').doc(S.who).set(rec).catch(function () {});
    if (window.earnHearts) earnHearts(1, 'note');
    toast('Pinned for ' + shortName(other(S.who)) + '.', '♥', 2600);
    return;
  }
  if (a === 'send') return mailSend();
}
function mailSend() {
  var title = (document.getElementById('mTitle').value || '').trim(), body = (document.getElementById('mBody').value || '').trim();
  if (!title) { toast('Give your letter a title first.', '✏️', 2600); document.getElementById('mTitle').focus(); return; }
  if (!body) { toast('Write your letter first.', '✏️', 2600); document.getElementById('mBody').focus(); return; }
  var m = { id: uid(), title: title, body: body, from: S.who, to: other(S.who), at: Date.now(), openedAt: null };
  MAIL.busy = true;
  var paper = document.getElementById('mPaper'), r = paper.getBoundingClientRect();
  if (!reduceMotion) paper.classList.add('m-fold');
  setTimeout(function () {
    if (!reduceMotion) {
      var f = document.createElement('img'); f.className = 'm-fly'; f.alt = ''; f.src = 'art/mail/env-gold.png';
      f.style.left = (r.left + r.width / 2 - 55) + 'px'; f.style.top = (r.top + r.height / 2 - 40) + 'px';
      document.body.appendChild(f); setTimeout(function () { f.remove(); }, 1200);
    }
    mailSave(m);
    if (typeof playSound === 'function') playSound('heart');
    if (window.earnHearts) earnHearts(1, 'letter');
    toast('Sent to ' + shortName(m.to) + ' ♥', '✉️', 3000);
    MAIL.busy = false; MAIL.tab = 'letters'; mailRender();
  }, reduceMotion ? 0 : 420);
}

/* a little nudge on the map when something new arrives */
var mailSeen = 0;
setInterval(function () {
  if (!S.who) return;
  var n = mailUnread().length;
  if (n > mailSeen && !MAIL.open) toast(n === 1 ? 'A letter is waiting at the post office' : n + ' letters are waiting at the post office', '✉️', 4500);
  mailSeen = n;
}, 5000);

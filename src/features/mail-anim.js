/* Letter animations for the post office. Our own code, in our style; the ideas (a sheet folding in thirds into an
   envelope that is sealed and flies off, and a wax seal popping before the flap flips and the letter slides up)
   were inspired by examples on animorio.com and animacious.com, but none of their code is used.
   Built on the browser's Web Animations API, so it is smooth and needs no library. Reduced motion gets a quick fade.

   mailAnimSend(paperEl, onDone)  the letter folds in three, drops into an envelope, is sealed with a heart, stamped,
                                  and flies off toward the other person's home
   mailAnimOpen(letter, onDone)   an envelope arrives, the seal pops, the flap flips open, the letter slides up */
(function () {
  var st = document.createElement('style');
  st.textContent = [
    '.ma-layer{position:fixed;inset:0;z-index:70;pointer-events:none}',
    '.ma-env{position:absolute;transform-style:preserve-3d}',
    '.ma-back{position:absolute;inset:0;background:#F3DDC2;border:3px solid #8E3A57;box-shadow:0 10px 0 rgba(60,25,35,.18)}',
    '.ma-front{position:absolute;inset:0;background:#FFF2DF;clip-path:polygon(0 0,50% 52%,100% 0,100% 100%,0 100%);border:3px solid #8E3A57;z-index:3}',
    '.ma-front:after{content:"";position:absolute;inset:0;background:linear-gradient(160deg,transparent 48%,rgba(142,58,87,.18) 49%,transparent 51%),linear-gradient(200deg,transparent 48%,rgba(142,58,87,.18) 49%,transparent 51%)}',
    '.ma-flap{position:absolute;left:0;right:0;top:0;height:58%;transform-origin:50% 0;z-index:4}',
    '.ma-flap>i{position:absolute;inset:0;clip-path:polygon(0 0,100% 0,50% 100%)}',
    '.ma-flap>i.o{background:#F7E6CF;box-shadow:inset 0 3px 0 #8E3A57}',
    '.ma-flap>i.o:after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom right,transparent 49%,#8E3A57 49.5%,#8E3A57 51.5%,transparent 52%),linear-gradient(to bottom left,transparent 49%,#8E3A57 49.5%,#8E3A57 51.5%,transparent 52%)}',
    '.ma-flap>i.b{background:#EFD3B4;opacity:0}.ma-flap.in>i.b{opacity:1}.ma-flap.in>i.o{opacity:0}',
    '.ma-seal{position:absolute;left:50%;top:58%;width:34px;height:34px;margin:-20px 0 0 -17px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#E0607E,#B03158 60%,#7E1E3E);border:2px solid #5E2238;box-shadow:0 2px 0 rgba(60,20,30,.35);z-index:6;display:grid;place-items:center}',
    '.ma-seal img{width:18px;image-rendering:pixelated;filter:brightness(1.6) saturate(.3)}',
    '.ma-stamp{position:absolute;right:9%;top:46%;width:30px;height:36px;background:#FFF;border:2px dashed #D9879F;outline:2px solid #FFF;display:grid;place-items:center;z-index:5}',
    '.ma-stamp img{width:18px;image-rendering:pixelated}',
    '.ma-letter{position:absolute;left:7%;right:7%;top:6%;height:90%;background:#FFFBF4;border:2px solid #E2C2AE;z-index:2;padding:10px 12px;overflow:hidden;font-family:var(--fbody);color:#4A2A33;box-shadow:0 2px 0 rgba(120,70,60,.15)}',
    '.ma-letter b{display:block;font-family:var(--fdisp);color:#8E3A57;font-size:15px;margin-bottom:6px}',
    '.ma-letter p{margin:0;font-size:12px;line-height:1.5;white-space:pre-wrap}',
    '.ma-sheet{position:absolute;transform-style:preserve-3d}',
    '.ma-panel{position:absolute;left:0;right:0;transform-style:preserve-3d}',
    '.ma-panel>i{position:absolute;inset:0;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#FFFBF4;border:2px solid #E2C2AE}',
    '.ma-panel>i.b{transform:rotateX(180deg);background:#F6EADB}',
    '.ma-panel>i>div{position:absolute;left:0;right:0;padding:18px 20px;font-family:var(--fbody);color:#4A2A33}',
    '.ma-panel>i>div b{display:block;font-family:var(--fdisp);color:#8E3A57;font-size:18px;margin-bottom:8px}',
    '.ma-panel>i>div p{margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap}',
    '.ma-shade{position:absolute;inset:0;background:#5E2238;opacity:0;pointer-events:none}',
    '.ma-spark{position:absolute;width:16px;height:16px;background:url(art/heart.png) center/contain no-repeat;image-rendering:pixelated}'
  ].join('');
  document.head.appendChild(st);
})();

function maLayer() { var l = document.createElement('div'); l.className = 'ma-layer'; document.body.appendChild(l); return l; }
function maWait(anims) { return Promise.all(anims.map(function (a) { return a.finished.catch(function () {}); })); }
function maAnim(el, frames, opt) { return el.animate(frames, Object.assign({ fill: 'forwards' }, opt)); }
function maEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

/* an envelope of size w x h at (x, y) (top-left, px). Optional letter inside. */
function maEnvelope(layer, x, y, w, h, letter) {
  var e = document.createElement('div'); e.className = 'ma-env';
  e.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;perspective:' + (w * 4) + 'px';
  e.innerHTML = '<div class="ma-back"></div>' +
    (letter ? '<div class="ma-letter"><b>' + maEsc(letter.title || 'A letter') + ' ♥</b><p>' + maEsc((letter.body || '').slice(0, 220)) + '</p></div>' : '') +
    '<div class="ma-front"></div><div class="ma-flap"><i class="o"></i><i class="b"></i></div>' +
    '<div class="ma-seal"><img alt="" src="art/heart.png"></div>';
  layer.appendChild(e);
  return { el: e, flap: e.querySelector('.ma-flap'), seal: e.querySelector('.ma-seal'), letter: e.querySelector('.ma-letter'), front: e.querySelector('.ma-front') };
}
function maSparkle(layer, x, y, n) {
  for (var i = 0; i < n; i++) {
    var s = document.createElement('div'); s.className = 'ma-spark'; s.style.left = (x - 8) + 'px'; s.style.top = (y - 8) + 'px'; layer.appendChild(s);
    var a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.55, d = 46 + (i % 2) * 18;
    maAnim(s, [{ transform: 'translate(0,0) scale(.3)', opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px) scale(1)', opacity: 0 }], { duration: 900, delay: i * 50, easing: 'cubic-bezier(.2,.8,.3,1)' });
  }
}

/* ---------------- sending: fold in three, into the envelope, seal, stamp, fly ---------------- */
function mailAnimSend(paperEl, letter, onDone) {
  var r = paperEl.getBoundingClientRect(), layer = maLayer();
  var finish = function () { layer.remove(); onDone && onDone(); };
  if (reduceMotion) {
    paperEl.style.transition = 'opacity .25s'; paperEl.style.opacity = '0';
    setTimeout(function () { paperEl.style.opacity = ''; paperEl.style.transition = ''; finish(); }, 260); return;
  }
  /* the sheet: three panels showing slices of the same letter, so the words fold with the paper */
  var W = r.width, H = r.height, third = H / 3;
  var sheet = document.createElement('div'); sheet.className = 'ma-sheet';
  sheet.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + W + 'px;height:' + H + 'px;perspective:' + (W * 3) + 'px';
  var content = '<b>' + maEsc(letter.title) + ' ♥</b><p>' + maEsc(letter.body) + '</p>';
  function panel(i) {
    var p = document.createElement('div'); p.className = 'ma-panel';
    p.style.cssText = 'top:' + (third * i) + 'px;height:' + third + 'px;transform-origin:50% ' + (i === 2 ? '0%' : i === 0 ? '100%' : '50%');
    p.innerHTML = '<i class="f"><div style="top:' + (-third * i) + 'px">' + content + '</div><span class="ma-shade"></span></i><i class="b"></i>';
    sheet.appendChild(p); return p;
  }
  var top = panel(0), mid = panel(1), bot = panel(2);
  layer.appendChild(sheet);
  paperEl.style.visibility = 'hidden';
  var shade = function (p) { return p.querySelector('.ma-shade'); };
  var ease = 'cubic-bezier(.45,0,.25,1)';
  var t0 = 0, FOLD = 520;
  var A = [];
  A.push(maAnim(sheet, [{ transform: 'rotateX(0)' }, { transform: 'rotateX(14deg)' }], { duration: 260, easing: 'ease-out' }));
  /* bottom third folds up over the middle, springs back a touch, settles */
  A.push(maAnim(bot, [{ transform: 'rotateX(0)' }, { transform: 'rotateX(172deg) translateZ(1px)', offset: 0.8 }, { transform: 'rotateX(166deg) translateZ(1px)', offset: 0.9 }, { transform: 'rotateX(179deg) translateZ(1px)' }], { duration: FOLD, delay: 220, easing: ease }));
  A.push(maAnim(shade(bot), [{ opacity: 0 }, { opacity: 0.28, offset: 0.5 }, { opacity: 0 }], { duration: FOLD, delay: 220 }));
  /* then the top third comes down and presses it flat */
  A.push(maAnim(top, [{ transform: 'rotateX(0)' }, { transform: 'rotateX(-179deg) translateZ(2px)' }], { duration: FOLD, delay: 220 + FOLD - 60, easing: ease }));
  A.push(maAnim(shade(top), [{ opacity: 0 }, { opacity: 0.3, offset: 0.5 }, { opacity: 0 }], { duration: FOLD, delay: 220 + FOLD - 60 }));
  var folded = 220 + FOLD * 2 - 60;
  /* the folded strip (the middle third) shrinks to letter size and drops into the envelope */
  var ew = Math.min(240, innerWidth * 0.62), eh = ew * 0.62, ex = innerWidth / 2 - ew / 2, ey = Math.min(innerHeight * 0.62, r.top + H * 0.55);
  var env = maEnvelope(layer, ex, ey + 90, ew, eh, null);
  layer.appendChild(sheet);                           /* keep the letter in front of the open envelope while it comes down */
  env.el.style.opacity = '0';
  env.flap.style.transform = 'scaleY(-1)'; env.flap.style.zIndex = '1'; env.flap.classList.add('in');
  env.seal.style.transform = 'scale(0)';
  var stamp = document.createElement('div'); stamp.className = 'ma-stamp'; stamp.innerHTML = '<img alt="" src="art/heart.png">'; stamp.style.opacity = '0'; env.el.appendChild(stamp);
  maAnim(env.el, [{ transform: 'translateY(60px)', opacity: 0 }, { transform: 'translateY(-90px)', opacity: 1 }], { duration: 480, delay: folded - 200, easing: 'cubic-bezier(.2,.9,.3,1.15)' });
  var midTop = r.top + third, cx = r.left + W / 2, cy = midTop + third / 2;
  var targetW = ew * 0.82, k = targetW / W, tx = (ex + ew / 2) - cx, ty = (ey - 90 + eh * 0.36) - cy;
  A.push(maAnim(sheet, [
    { transform: 'rotateX(14deg) translate(0,0) scale(1)', transformOrigin: (W / 2) + 'px ' + (third * 1.5) + 'px' },
    { transform: 'rotateX(0) translate(' + tx + 'px,' + (ty - eh * 0.6) + 'px) scale(' + k + ')', transformOrigin: (W / 2) + 'px ' + (third * 1.5) + 'px', offset: 0.6 },
    { transform: 'rotateX(0) translate(' + tx + 'px,' + ty + 'px) scale(' + k + ')', transformOrigin: (W / 2) + 'px ' + (third * 1.5) + 'px' }
  ], { duration: 700, delay: folded + 60, easing: 'cubic-bezier(.4,0,.2,1)' }));
  var inside = folded + 60 + 700;
  setTimeout(function () {
    /* the letter is in: swap the flying sheet for a letter tucked behind the front pocket (same place, no blink) */
    sheet.style.opacity = '0';
    var l = document.createElement('div'); l.className = 'ma-letter'; l.style.cssText = 'top:' + (36 - third * k / eh * 50) + '%;height:' + (third * k / eh * 100) + '%;min-height:30%'; l.innerHTML = '<b>' + maEsc(letter.title) + '</b>';
    env.el.insertBefore(l, env.front);
    /* flap closes, seal pops on with a squash and bounce, a stamp drops in */
    var close = maAnim(env.flap, [{ transform: 'scaleY(-1)', zIndex: 1 }, { transform: 'scaleY(-0.02)', zIndex: 1, offset: 0.5 }, { transform: 'scaleY(0.02)', zIndex: 4, offset: 0.51 }, { transform: 'scaleY(1.06)', zIndex: 4, offset: 0.85 }, { transform: 'scaleY(1)', zIndex: 4 }], { duration: 440, easing: 'cubic-bezier(.45,0,.25,1)' });
    setTimeout(function () { env.flap.classList.remove('in'); }, 220);
    maAnim(env.seal, [{ transform: 'scale(0)' }, { transform: 'scale(1.35,0.8)', offset: 0.55 }, { transform: 'scale(0.9,1.1)', offset: 0.75 }, { transform: 'scale(1)' }], { duration: 420, delay: 400, easing: 'ease-out' });
    maAnim(stamp, [{ transform: 'translateY(-40px) rotate(-12deg)', opacity: 0 }, { transform: 'translateY(4px) rotate(4deg)', opacity: 1, offset: 0.7 }, { transform: 'translateY(0) rotate(3deg)', opacity: 1 }], { duration: 380, delay: 700, easing: 'cubic-bezier(.3,1.4,.6,1)' });
    setTimeout(function () { maSparkle(layer, ex + ew / 2, ey - 90 + eh * 0.58, 5); if (typeof playSound === 'function') playSound('heart'); }, 520);
    /* a short hold, then off it flies on a curve, up and to the right, turning and shrinking */
    var fly = maAnim(env.el, [
      { transform: 'translate(0,-90px) rotate(0) scale(1)', opacity: 1 },
      { transform: 'translate(-12px,-80px) rotate(-4deg) scale(1)', opacity: 1, offset: 0.12 },
      { transform: 'translate(' + innerWidth * 0.18 + 'px,' + (-innerHeight * 0.28) + 'px) rotate(-12deg) scale(.7)', opacity: 1, offset: 0.55 },
      { transform: 'translate(' + innerWidth * 0.42 + 'px,' + (-innerHeight * 0.72) + 'px) rotate(-22deg) scale(.25)', opacity: 0 }
    ], { duration: 950, delay: 1450, easing: 'cubic-bezier(.45,0,.6,1)' });
    fly.finished.then(function () { paperEl.style.visibility = ''; finish(); }, finish);
  }, inside);
}

/* ---------------- opening: seal pops, flap flips open, letter slides up ---------------- */
function mailAnimOpen(letter, onDone, fromEl) {
  if (reduceMotion) { onDone && onDone(); return; }
  var layer = maLayer(), ew = Math.min(280, innerWidth * 0.72), eh = ew * 0.62, ex = innerWidth / 2 - ew / 2, ey = innerHeight * 0.52 - eh / 2;
  var env = maEnvelope(layer, ex, ey, ew, eh, letter);
  layer.style.background = 'rgba(40,15,20,0)';
  maAnim(layer, [{ background: 'rgba(40,15,20,0)' }, { background: 'rgba(40,15,20,.35)' }], { duration: 300 });
  var from = fromEl && fromEl.getBoundingClientRect(), start = 'translateY(40px) scale(.85)';
  if (from && from.width) {                          /* it grows out of the envelope you tapped */
    var k0 = from.width / ew, dx = from.left + from.width / 2 - (ex + ew / 2), dy = from.top + from.height / 2 - (ey + eh / 2);
    start = 'translate(' + dx + 'px,' + dy + 'px) scale(' + k0 + ')';
    fromEl.style.visibility = 'hidden';
  }
  maAnim(env.el, [{ transform: start, opacity: 1 }, { transform: 'translate(0,0) scale(1)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.1)' });
  var T = 440;
  /* the wax seal pops */
  maAnim(env.seal, [{ transform: 'scale(1)' }, { transform: 'scale(1.3)', offset: 0.4 }, { transform: 'scale(0)', opacity: 0 }], { duration: 340, delay: T, easing: 'ease-in' });
  setTimeout(function () { maSparkle(layer, ex + ew / 2, ey + eh * 0.58, 4); if (typeof playSound === 'function') playSound('chime'); }, T + 160);
  /* the flap flips open with a little overshoot, then sits behind the letter */
  maAnim(env.flap, [{ transform: 'scaleY(1)', zIndex: 4 }, { transform: 'scaleY(0.02)', zIndex: 4, offset: 0.45 }, { transform: 'scaleY(-0.02)', zIndex: 1, offset: 0.46 }, { transform: 'scaleY(-1.12)', zIndex: 1, offset: 0.8 }, { transform: 'scaleY(-1)', zIndex: 1 }], { duration: 520, delay: T + 280, easing: 'cubic-bezier(.4,0,.2,1)' });
  setTimeout(function () { env.flap.classList.add('in'); }, T + 280 + 240);
  /* the letter slides up and out, the envelope gives a small squash */
  var up = maAnim(env.letter, [{ transform: 'translateY(0)' }, { transform: 'translateY(' + (-eh * 0.82) + 'px)', offset: 0.8 }, { transform: 'translateY(' + (-eh * 0.74) + 'px)' }], { duration: 760, delay: T + 640, easing: 'cubic-bezier(.3,1.3,.5,1)' });
  maAnim(env.el, [{ transform: 'scale(1,1)' }, { transform: 'scale(1.02,.95)', offset: 0.4 }, { transform: 'scale(1,1)' }], { duration: 360, delay: T + 640, easing: 'ease-out' });
  up.finished.then(function () {
    /* hand over to the reading page: the scene fades as the letter page appears beneath */
    onDone && onDone();
    var out = maAnim(layer, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease-out' });
    out.finished.then(function () { layer.remove(); }, function () { layer.remove(); });
  }, function () { layer.remove(); onDone && onDone(); });
}

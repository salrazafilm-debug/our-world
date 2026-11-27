/* Sounds and music: soft chimes for little moments, and an optional music-box
   tune. Both are made on the fly (no audio files) and both start OFF. */

var SND = { on: false, music: false, ctx: null, out: null, timer: null, step: 0 };
try { SND.on = localStorage.getItem('ow.sound') === 'on'; SND.music = localStorage.getItem('ow.music') === 'on'; } catch (e) {}

function audio() {
  if (SND.ctx) { if (SND.ctx.state === 'suspended') SND.ctx.resume(); return SND.ctx; }
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  SND.ctx = new AC();
  SND.out = SND.ctx.createGain(); SND.out.gain.value = .5;
  /* a little echo makes everything feel like a music box */
  var dl = SND.ctx.createDelay(); dl.delayTime.value = .28;
  var fb = SND.ctx.createGain(); fb.gain.value = .28;
  SND.out.connect(SND.ctx.destination); SND.out.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(SND.ctx.destination);
  return SND.ctx;
}
function tone(freq, when, dur, vol, type) {
  var a = audio(); if (!a) return;
  var o = a.createOscillator(), g = a.createGain();
  o.type = type || 'triangle'; o.frequency.value = freq;
  g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vol, when + .012);
  g.gain.exponentialRampToValueAtTime(.0001, when + dur);
  o.connect(g); g.connect(SND.out); o.start(when); o.stop(when + dur + .05);
}
var NOTE = function (n) { return 440 * Math.pow(2, (n - 69) / 12); };
function playSound(kind) {
  if (!SND.on) return;
  var a = audio(); if (!a) return;
  var t = a.currentTime + .01;
  if (kind === 'chime') { tone(NOTE(84), t, .5, .09); tone(NOTE(91), t + .09, .7, .07); }
  else if (kind === 'heart') { [76, 79, 83, 88].forEach(function (n, i) { tone(NOTE(n), t + i * .08, .6, .07); }); }
  else if (kind === 'save') { tone(NOTE(79), t, .25, .08); tone(NOTE(86), t + .07, .4, .06); }
  else { tone(NOTE(81), t, .12, .05, 'sine'); }
}
/* sparkle() and the discovery burst already mark the happy moments: give them a sound */
var sparkleQuiet = sparkle;
sparkle = function () { sparkleQuiet(); playSound('chime'); };

/* ---------- music box ---------- */
var TUNE = [[72, 76, 79, 84], [69, 72, 76, 81], [65, 69, 72, 77], [67, 71, 74, 79]];   /* C – Am – F – G */
function musicTick() {
  if (!SND.music || !SND.ctx) return;
  var a = SND.ctx, chord = TUNE[Math.floor(SND.step / 8) % TUNE.length], i = SND.step % 8;
  var seq = [0, 1, 2, 3, 2, 1, 2, 3];
  var t = a.currentTime + .02;
  tone(NOTE(chord[seq[i]]), t, 1.4, .035, 'sine');
  if (i === 0) tone(NOTE(chord[0] - 24), t, 2.6, .03, 'sine');
  SND.step++;
}
function startMusic() {
  if (songHas('bg')) { clearInterval(SND.timer); SND.timer = null; plStart(); return; }
  if (SND.timer || !audio()) return;
  SND.timer = setInterval(musicTick, 420);
}
function stopMusic() { clearInterval(SND.timer); SND.timer = null; plStop(); }
function setMusic(on) {
  SND.music = on;
  try { localStorage.setItem('ow.music', on ? 'on' : 'off'); } catch (e) {}
  if (on) startMusic(); else stopMusic();
}
function setSound(on) {
  SND.on = on;
  try { localStorage.setItem('ow.sound', on ? 'on' : 'off'); } catch (e) {}
  if (on) { audio(); playSound('chime'); }
}
/* browsers only allow sound after a tap: start whatever was switched on, on the first one */
document.addEventListener('pointerdown', function first() {
  document.removeEventListener('pointerdown', first, true);
  if (SND.on || SND.music) audio();
  if (SND.music) startMusic();
}, true);
document.addEventListener('visibilitychange', function () {
  if (!SND.ctx) return;
  if (document.visibilityState === 'hidden') { SND.ctx.suspend(); } else if (SND.on || SND.music) SND.ctx.resume();
});

/* ---------- your own songs (MP3 upload) ----------
   'bg' is a playlist that plays softly behind the map, each song fading into the next.
   'env' is one song that plays while a letter or envelope is open.
   Files stay on this device (IndexedDB); nothing is uploaded anywhere. */
var FADE = 6;                                   /* seconds of crossfade between songs */
var BGV = .35, ENVV = .6;                       /* volumes */
var PL = { i: 0, cur: null, timer: null, lists: { bg: [], env: [] } };   /* lists hold { url, name } */
function songDb(cb) {
  try {
    var r = indexedDB.open('ow-songs', 1);
    r.onupgradeneeded = function () { r.result.createObjectStore('songs'); };
    r.onsuccess = function () { cb(r.result); };
    r.onerror = function () { cb(null); };
  } catch (e) { cb(null); }
}
/* stored value per slot: an array of { blob, name } (older single-song saves are upgraded) */
function songRead(db, slot, cb) {
  var q = db.transaction('songs').objectStore('songs').get(slot);
  q.onsuccess = function () { var v = q.result; cb(!v ? [] : Array.isArray(v) ? v : (v.blob ? [v] : [])); };
  q.onerror = function () { cb([]); };
}
function songLoad(slot, done) {
  songDb(function (db) {
    if (!db) return done && done();
    songRead(db, slot, function (recs) {
      PL.lists[slot].forEach(function (s) { URL.revokeObjectURL(s.url); });
      PL.lists[slot] = recs.map(function (r) { return { url: URL.createObjectURL(r.blob), name: r.name || 'My song' }; });
      done && done();
    });
  });
}
function songAdd(slot, files, done) {
  var ok = [].slice.call(files || []).filter(function (f) {
    if (!/\.mp3$/i.test(f.name) && f.type !== 'audio/mpeg') { toast('“' + f.name + '” is not an MP3.', '🎵', 3500); return false; }
    if (f.size > 25 * 1024 * 1024) { toast('“' + f.name + '” is too big (25 MB max).', '🎵', 3500); return false; }
    return true;
  });
  if (!ok.length) return;
  songDb(function (db) {
    if (!db) { toast('Could not save songs on this device.', '🎵', 3500); return; }
    songRead(db, slot, function (recs) {
      var add = ok.map(function (f) { return { blob: f, name: f.name.replace(/\.mp3$/i, '') }; });
      recs = slot === 'bg' ? recs.concat(add) : [add[0]];
      var tx = db.transaction('songs', 'readwrite'); tx.objectStore('songs').put(recs, slot);
      tx.oncomplete = function () { songLoad(slot, function () { if (slot === 'bg' && SND.music) { plStop(); plStart(); } done && done(); }); };
    });
  });
}
function songClear(slot, done) {
  songDb(function (db) {
    if (!db) return;
    var tx = db.transaction('songs', 'readwrite'); tx.objectStore('songs').delete(slot);
    tx.oncomplete = function () {
      if (slot === 'bg') plStop(); else envSongStop(true);
      PL.lists[slot].forEach(function (s) { URL.revokeObjectURL(s.url); }); PL.lists[slot] = [];
      if (slot === 'bg' && SND.music) startMusic();
      done && done();
    };
  });
}
function songHas(slot) { return PL.lists[slot].length > 0; }
function songLabel(slot) {
  var l = PL.lists[slot];
  return !l.length ? 'none' : l.length === 1 ? l[0].name : l.length + ' songs (' + l.map(function (s) { return s.name; }).join(', ') + ')';
}

/* --- background playlist with crossfade --- */
function plTrack(n) {
  var l = PL.lists.bg, a = new Audio(l[n % l.length].url);
  a.volume = 0; a.preload = 'auto'; a.play().catch(function () {});
  return { a: a, fadeOut: false };
}
function plStart() {
  if (!songHas('bg') || PL.timer) return;
  PL.i = 0; PL.live = [plTrack(0)];
  PL.timer = setInterval(plTick, 200);
}
function plStop() {
  clearInterval(PL.timer); PL.timer = null;
  (PL.live || []).forEach(function (t) { t.a.pause(); }); PL.live = [];
}
function plPause() { (PL.live || []).forEach(function (t) { t.a.pause(); }); }
function plResume() { (PL.live || []).forEach(function (t) { t.a.play().catch(function () {}); }); }
function plTick() {
  var step = .2 / FADE * BGV;
  PL.live = PL.live.filter(function (t) {
    var a = t.a, d = a.duration, fade = Math.min(FADE, (d || 2 * FADE) / 2);
    if (!t.fadeOut) {
      /* fade in over the first seconds, hold, then hand over to the next song */
      a.volume = Math.min(BGV, a.volume + step);
      if (d && a.currentTime >= d - fade) {
        t.fadeOut = true; PL.i = (PL.i + 1) % PL.lists.bg.length; PL.live.push(plTrack(PL.i));
      }
    } else {
      a.volume = Math.max(0, a.volume - step);
      if (a.volume <= 0 || a.ended) { a.pause(); return false; }
    }
    return true;
  });
  /* a song that ended with no live successor (e.g. a very short file) */
  if (PL.timer && !PL.live.length) { PL.i = (PL.i + 1) % PL.lists.bg.length; PL.live = [plTrack(PL.i)]; }
}

/* --- envelope song: pauses the background while a letter is open, then gives it back --- */
var ENV = { a: null };
function envSongStart() {
  if (!songHas('env')) return;
  plPause();
  if (!ENV.a) { ENV.a = new Audio(PL.lists.env[0].url); ENV.a.loop = true; ENV.a.volume = 0; }
  ENV.a.currentTime = 0; ENV.a.play().catch(function () {});
  clearInterval(ENV.t);
  ENV.t = setInterval(function () { ENV.a.volume = Math.min(ENVV, ENV.a.volume + .06); if (ENV.a.volume >= ENVV) clearInterval(ENV.t); }, 120);
}
function envSongStop(drop) {
  if (ENV.a) {
    var a = ENV.a; clearInterval(ENV.t);
    if (drop) ENV.a = null;
    ENV.t = setInterval(function () { a.volume = Math.max(0, a.volume - .08); if (a.volume <= 0) { clearInterval(ENV.t); a.pause(); } }, 100);
  }
  if (SND.music && songHas('bg')) plResume();
}

songLoad('bg', function () { if (SND.music && SND.ctx) startMusic(); });
songLoad('env');

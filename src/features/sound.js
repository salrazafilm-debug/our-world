/* Sounds and music: soft chimes for little moments, and an optional music-box
   tune. Both are made on the fly (no audio files) and both start OFF. */

var SND = { on: false, music: false, ctx: null, out: null, timer: null, step: 0 };
try { SND.on = localStorage.getItem('ow.sound') === 'on'; SND.music = localStorage.getItem('ow.music') === 'on'; SND.songs = localStorage.getItem('ow.songsOn') === 'on'; SND.muted = localStorage.getItem('ow.muted') === 'on'; SND.letters = localStorage.getItem('ow.lettersOn'); } catch (e) {}

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
  if (!SND.on || SND.muted) return;
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
  if (!SND.music || !SND.ctx || SND.muted) return;
  var a = SND.ctx, chord = TUNE[Math.floor(SND.step / 8) % TUNE.length], i = SND.step % 8;
  var seq = [0, 1, 2, 3, 2, 1, 2, 3];
  var t = a.currentTime + .02;
  tone(NOTE(chord[seq[i]]), t, 1.4, .035, 'sine');
  if (i === 0) tone(NOTE(chord[0] - 24), t, 2.6, .03, 'sine');
  SND.step++;
}
function startMusic() {
  if (SND.timer || !audio()) return;
  SND.timer = setInterval(musicTick, 420);
}
function stopMusic() { clearInterval(SND.timer); SND.timer = null; }
function startSongs() { if (SND.songs && bgP.has()) { SND.songsRun = true; bgP.start(); } }
function setSongs(on) {
  SND.songs = on;
  try { localStorage.setItem('ow.songsOn', on ? 'on' : 'off'); } catch (e) {}
  if (on) startSongs(); else bgP.stop(true);
}
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
  startSongs();
}, true);
document.addEventListener('visibilitychange', function () {
  if (!SND.ctx) return;
  if (document.visibilityState === 'hidden') { SND.ctx.suspend(); } else if (SND.on || SND.music) SND.ctx.resume();
});

/* ---------- your own songs (MP3 library) ----------
   Upload MP3s once, then tick which ones play behind the map ("music") and which play when a
   letter or envelope is open ("letters"). Several ticked songs play in order, each fading into
   the next; a single ticked song simply loops. Files stay on this device (IndexedDB). */
var CLOUD = function () { return !!(window.OWCloud && OWCloud.configured && OWCloud.songs); };
var FADE = 6;                                       /* seconds of crossfade */
var LIB = [];                                       /* { id, name, url } */
var SEL = { bg: [], env: [], pre: [], chosen: false };             /* ordered song ids per slot */
try { SEL.bg = JSON.parse(localStorage.getItem('ow.songs.bg') || '[]'); SEL.env = JSON.parse(localStorage.getItem('ow.songs.env') || '[]'); } catch (e) {}
try { SEL.chosen = localStorage.getItem('ow.songs.bg') !== null; } catch (e) {}
function selSave() { SEL.chosen = true; try { localStorage.setItem('ow.songs.bg', JSON.stringify(SEL.bg)); localStorage.setItem('ow.songs.env', JSON.stringify(SEL.env)); } catch (e) {} }
function songById(id) { return LIB.filter(function (s) { return s.id === id; })[0]; }
function songDb(cb) {
  try {
    var r = indexedDB.open('ow-songs', 1);
    r.onupgradeneeded = function () { r.result.createObjectStore('songs'); };
    r.onsuccess = function () { cb(r.result); };
    r.onerror = function () { cb(null); };
  } catch (e) { cb(null); }
}
function dbGet(db, k, cb) { var q = db.transaction('songs').objectStore('songs').get(k); q.onsuccess = function () { cb(q.result); }; q.onerror = function () { cb(undefined); }; }
function songLoad(done) {
  if (CLOUD()) return songLoadCloud(done);
  songDb(function (db) {
    if (!db) return done && done();
    dbGet(db, 'lib', function (lib) {
      function finish(recs) {
        LIB.forEach(function (s) { URL.revokeObjectURL(s.url); });
        LIB = recs.map(function (r) { return { id: r.id, name: r.name, url: URL.createObjectURL(r.blob) }; });
        SEL.bg = SEL.bg.filter(function (i) { return songById(i); });
        SEL.env = SEL.env.filter(function (i) { return songById(i); });
        done && done();
      }
      if (lib) return finish(lib);
      /* first run after the older version: bring its saved songs into the library */
      dbGet(db, 'bg', function (bg) { dbGet(db, 'env', function (env) {
        var recs = [];
        function mk(v, slot) {
          (Array.isArray(v) ? v : (v && v.blob ? [v] : [])).forEach(function (r, i) {
            var id = slot + i + Date.now().toString(36);
            recs.push({ id: id, name: r.name, blob: r.blob }); SEL[slot].push(id);
          });
        }
        mk(bg, 'bg'); mk(env, 'env');
        if (recs.length) { selSave(); songWrite(recs); }
        finish(recs);
      }); });
    });
  });
}
function songLoadCloud(done) {
  OWCloud.songs.list().then(function (rows) {
    LIB.forEach(function (x) { if (x.local) URL.revokeObjectURL(x.url); });
    LIB = rows;
    SEL.bg = SEL.bg.filter(function (i) { return songById(i); });
    SEL.env = SEL.env.filter(function (i) { return songById(i); });
    /* nobody has picked yet: play everything in the library behind the map */
    if (!SEL.chosen && LIB.length) SEL.bg = LIB.map(function (x) { return x.id; });
    if (done) done();
  }).catch(function () { if (done) done(); });
}
function songWrite(recs, done) {
  songDb(function (db) {
    if (!db) return;
    var tx = db.transaction('songs', 'readwrite'); tx.objectStore('songs').put(recs, 'lib');
    tx.oncomplete = function () { if (done) done(); };
  });
}
function songRecs(cb) {            /* the library with its files, read back from the db */
  songDb(function (db) { if (!db) return cb([]); dbGet(db, 'lib', function (l) { cb(l || []); }); });
}
function songAdd(files, done) {
  var ok = [].slice.call(files || []).filter(function (f) {
    if (!/\.mp3$/i.test(f.name) && f.type !== 'audio/mpeg') { toast('“' + f.name + '” is not an MP3.', '🎵', 3500); return false; }
    if (f.size > 25 * 1024 * 1024) { toast('“' + f.name + '” is too big (25 MB max).', '🎵', 3500); return false; }
    return true;
  });
  /* let her name each song (cancel skips it) */
  var named = [];
  ok.forEach(function (f) {
    var def = f.name.replace(/.mp3$/i, ''), nm = prompt('Name this song:', def);
    if (nm !== null) named.push({ f: f, name: (nm.trim() || def) });
  });
  if (!named.length) return;
  if (CLOUD()) {
    toast('Uploading ' + named.length + (named.length > 1 ? ' songs' : ' song') + '…', '🎵', 3000);
    var chain = Promise.resolve();
    named.forEach(function (n) { chain = chain.then(function () { return OWCloud.songs.add(n.f, n.name); }); });
    chain.then(function () { toast('Songs saved for both of you.', '🎵', 3000); songLoad(done); })
      .catch(function () { toast('Could not upload — is the songs setup (supabase/songs.sql) run?', '🎵', 6000); songLoad(done); });
    return;
  }
  songRecs(function (recs) {
    named.forEach(function (n) {
      recs.push({ id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: n.name, blob: n.f });
    });
    songWrite(recs, function () { songLoad(done); });
  });
}
function songRename(id, name, done) {
  var sg = songById(id); if (!sg) return;
  if (CLOUD()) { OWCloud.songs.rename(id, name).catch(function () { toast('Could not rename.', '🎵', 3000); }).then(function () { sg.name = name; if (done) done(); }); return; }
  songRecs(function (recs) { recs.forEach(function (r) { if (r.id === id) r.name = name; }); songWrite(recs, function () { sg.name = name; if (done) done(); }); });
}
function songRemove(id, done) {
  plStopAll();
  if (CLOUD()) {
    var sg = songById(id);
    OWCloud.songs.remove(id, sg && sg.path).catch(function () {}).then(function () {
      SEL.bg = SEL.bg.filter(function (i) { return i !== id; }); SEL.env = SEL.env.filter(function (i) { return i !== id; }); selSave();
      songLoad(function () { startSongs(); if (done) done(); });
    });
    return;
  }
  songRecs(function (recs) {
    songWrite(recs.filter(function (r) { return r.id !== id; }), function () {
      SEL.bg = SEL.bg.filter(function (i) { return i !== id; });
      SEL.env = SEL.env.filter(function (i) { return i !== id; });
      selSave();
      songLoad(function () { startSongs(); if (done) done(); });
    });
  });
}
function songToggle(slot, id) {
  var i = SEL[slot].indexOf(id);
  if (i < 0) SEL[slot].push(id); else SEL[slot].splice(i, 1);
  selSave();
  if (slot === 'bg') { bgP.stop(true); startSongs(); }
}

/* --- one player: plays its slot's songs in order, crossfading, looping forever --- */
var ALLA = [];                                      /* every song element ever started, so mute can silence them all */
function Player(slot, vol) { this.slot = slot; this.vol = vol; this.i = 0; this.live = []; this.timer = null; this.closing = false; this.paused = false; }
Player.prototype.urls = function () { return (this.over || SEL[this.slot]).map(songById).filter(Boolean); };
Player.prototype.has = function () { return this.urls().length > 0; };
Player.prototype.next = function () {
  var l = this.urls(); if (!l.length) return;
  var a = new Audio(l[this.i % l.length].url); a.volume = 0; a.preload = 'auto';
  ALLA = ALLA.filter(function (x) { return !x.ended; }); ALLA.push(a);
  if (!this.paused && !SND.muted) a.play().catch(function () {});
  this.live.push({ a: a, out: false });
};
Player.prototype.start = function () {
  if (!this.has()) return false;
  if (this.timer && !this.closing) { this.resume(); return true; }
  this.stop(true); this.paused = !!SND.muted; this.i = 0; this.next();
  var me = this; this.timer = setInterval(function () { me.tick(); }, 200);
  return true;
};
Player.prototype.stop = function (hard) {      /* soft: fade everything out, then stop */
  if (hard) { clearInterval(this.timer); this.timer = null; this.live.forEach(function (t) { t.a.pause(); }); this.live = []; this.closing = false; return; }
  if (!this.timer) return;
  this.closing = true; this.live.forEach(function (t) { t.out = true; });
};
Player.prototype.pause = function () { this.paused = true; this.live.forEach(function (t) { t.a.pause(); }); };
Player.prototype.resume = function () { if (SND.muted) return; this.paused = false; this.live.forEach(function (t) { t.a.play().catch(function () {}); }); };
Player.prototype.tick = function () {
  if (this.paused) return;
  var me = this, step = .2 / FADE * this.vol;
  this.live = this.live.filter(function (t) {
    var a = t.a, d = a.duration, fade = Math.min(FADE, (d || 2 * FADE) / 2);
    if (!t.out) {
      a.volume = Math.min(me.vol, a.volume + step);
      if (d && a.currentTime >= d - fade) { t.out = true; me.i++; me.next(); }
    } else {
      a.volume = Math.max(0, a.volume - step * 1.5);
      if (a.volume <= 0 || a.ended) { a.pause(); return false; }
    }
    return true;
  });
  if (!this.live.length) {
    if (this.closing) { clearInterval(this.timer); this.timer = null; this.closing = false; }
    else if (this.timer) { this.i++; this.next(); }
  }
};
var bgP = new Player('bg', .35), envP = new Player('env', .6), preP = new Player('pre', .6);
var PRE = { on: null };                            /* what the preview plays: a song id, or 'env' for the letter music */
function plStopAll() { bgP.stop(true); envP.stop(true); preP.stop(true); PRE.on = null; }

/* preview: 'env' tests the letter music, a song id tests that one song; tap again to stop */
function songPreview(what) {
  if (PRE.on === what) { songPreviewStop(); return; }
  preP.stop(true);
  SEL.pre = what === 'env' ? SEL.env.slice() : [what];
  if (!preP.has()) { toast('Tick a song for letters first.', '🎵', 2500); return; }
  bgP.pause(); preP.start(); PRE.on = what;
}
function songPreviewStop() {
  preP.stop(); PRE.on = null;
  if (SND.songs && bgP.has()) bgP.resume();
}

/* envelope song: the background pauses while a letter is open, then comes back */
/* spec: a song id, a list of ids, 'all', 'none' (silence), or empty = the usual letter songs */
function envSongStart(spec) {
  if (spec === 'none') { envSongStop(); return; }
  var ids = null;
  if (spec === 'all') ids = LIB.map(function (x) { return x.id; });
  else if (Array.isArray(spec)) ids = spec.filter(songById);
  else if (spec && songById(spec)) ids = [spec];
  if (ids && !ids.length) ids = null;
  var want = ids || SEL.env;
  if (!want.length) { envSongStop(); return; }
  if (SND.letters === 'off') { envSongStop(); return; }
  if (SND.letters !== 'on') { letterAsk(function () { envSongStart(spec); }); return; }
  var key = ids ? ids.join(',') : '';
  if (envP.timer && !envP.closing && (envP.key || '') === key) { envP.resume(); return; }
  preP.stop(true); PRE.on = null;
  envP.stop(true); envP.over = ids; envP.key = key;
  bgP.pause(); envP.start();
}
function envSongStop() {
  if (envP.timer) envP.stop();
  if (SND.songs && bgP.has()) bgP.resume();
}
if (!CLOUD()) songLoad(function () { startSongs(); });

/* ---------- mute button (top right): silences everything, tap again to carry on ---------- */
function setMuted(m) {
  SND.muted = m;
  try { localStorage.setItem('ow.muted', m ? 'on' : 'off'); } catch (e) {}
  var b = document.getElementById('muteBtn');
  if (b) { b.classList.toggle('muted', m); b.setAttribute('aria-pressed', m ? 'true' : 'false'); b.setAttribute('aria-label', m ? 'Sound off — tap to turn on' : 'Sound on — tap to mute'); }
  if (m) {
    bgP.pause(); envP.pause(); preP.pause();
    ALLA.forEach(function (a) { a.pause(); });
    if (SND.ctx) SND.ctx.suspend();
  } else {
    if (SND.ctx && (SND.on || SND.music)) SND.ctx.resume();
    if (preP.timer) preP.resume();
    else if (envP.timer && !envP.closing) envP.resume();
    else if (SND.songs) { if (bgP.timer) bgP.resume(); else startSongs(); }
  }
}
(function () {
  var b = document.getElementById('muteBtn'); if (!b) return;
  b.addEventListener('click', function () { setMuted(!SND.muted); });
  setMuted(SND.muted);
})();


/* ---------- letters with music: ask first ("Music will play — enable?") ---------- */
function setLetterMusic(on) {
  SND.letters = on ? 'on' : 'off';
  try { localStorage.setItem('ow.lettersOn', SND.letters); } catch (e) {}
  if (!on) envSongStop();
}
function letterAsk(yes) {
  if (SND.lettersNo || document.getElementById('musicAsk')) return;
  var w = document.createElement('div'); w.id = 'musicAsk';
  w.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(60,28,40,.55);padding:20px';
  w.innerHTML = '<div role="dialog" aria-modal="true" aria-label="Music" style="max-width:340px;width:100%;background:#FFF3E0;border:4px solid #7a4a3a;box-shadow:0 6px 0 #4b3540;padding:22px 20px;text-align:center;font-family:var(--fdisp,inherit);color:#8E3A57">' +
    '<div style="font-size:34px;line-height:1">♪</div><p style="margin:10px 0 4px;font-size:19px">Music will play with this letter.</p>' +
    '<p style="margin:0 0 16px;font-size:15px;color:#5a3a40">Enable it?</p>' +
    '<div style="display:flex;gap:10px;justify-content:center"><button type="button" class="pxbtn primary" id="musicYes">Enable music</button><button type="button" class="pxbtn" id="musicNo">Not now</button></div></div>';
  document.body.appendChild(w);
  document.getElementById('musicYes').onclick = function () { w.remove(); setLetterMusic(true); setMuted(false); yes(); };
  document.getElementById('musicNo').onclick = function () { w.remove(); SND.lettersNo = true; };
  document.getElementById('musicYes').focus();
}

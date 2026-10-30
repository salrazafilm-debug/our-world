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
  if (SND.timer || !audio()) return;
  SND.timer = setInterval(musicTick, 420);
}
function stopMusic() { clearInterval(SND.timer); SND.timer = null; }
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

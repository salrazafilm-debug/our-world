/* Our anniversary: how long you have been together, a countdown to the next
   one, a little celebration on the day (and a smaller one each month). */

S.us = {};
try { S.us = JSON.parse(localStorage.getItem('ow.us') || '{}') || {}; } catch (e) {}
ROWHOOKS.settings = function (rows) {
  rows.forEach(function (r) { if (r.id === 'us') S.us = r; });
  try { localStorage.setItem('ow.us', JSON.stringify(S.us)); } catch (e) {}
  celebrateIfToday();
};

function dayDiff(a, b) { return Math.round((b - a) / 86400000); }
function midnight(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function annInfo() {
  if (!S.us.anniversary) return null;
  var start = midnight(S.us.anniversary + 'T00:00:00'), today = midnight(new Date());
  if (isNaN(start)) return null;
  var days = dayDiff(start, today);
  var next = new Date(start); next.setFullYear(today.getFullYear());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  var years = next.getFullYear() - start.getFullYear();
  var months = (today.getFullYear() - start.getFullYear()) * 12 + today.getMonth() - start.getMonth();
  return {
    days: days, nextIn: dayDiff(today, next), years: years, next: next,
    isAnniv: days > 0 && today.getMonth() === start.getMonth() && today.getDate() === start.getDate(),
    isMonthiv: days > 0 && today.getDate() === start.getDate() && months > 0 && months % 12 !== 0, months: months
  };
}
function annCardHtml() {
  var a = annInfo();
  if (!a) return '<button type="button" class="ann-card ann-empty" data-act="ann-edit"><b>When did we start?</b><span>Set our anniversary to count our days together</span></button>';
  if (a.days < 0) return '<button type="button" class="ann-card" data-act="ann-edit"><b>' + (-a.days) + ' days to go</b><span>until our first day</span></button>';
  return '<button type="button" class="ann-card" data-act="ann-edit"><b>Together ' + a.days.toLocaleString() + ' days 💗</b><span>' +
    (a.isAnniv ? 'Happy anniversary! ' + (a.years - (a.nextIn === 0 ? 0 : 1)) + ' year' + ((a.years - (a.nextIn === 0 ? 0 : 1)) === 1 ? '' : 's') + ' today'
      : (a.nextIn === 1 ? 'Our anniversary is tomorrow' : 'Our ' + ordinal(a.years) + ' anniversary in ' + a.nextIn + ' days')) + '</span></button>';
}
function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

var annCelebrated = false;
function celebrateIfToday() {
  var a = annInfo();
  if (annCelebrated || !a || !S.who) return;
  if (!a.isAnniv && !a.isMonthiv) return;
  annCelebrated = true;
  setTimeout(function () {
    fxConfetti();
    playSound('heart');
    toast(a.isAnniv ? 'Happy anniversary, you two 💗' : 'Happy ' + a.months + ' months together 💗', '🎉', 7000);
  }, 3500);
}

ACTIONS['ann-edit'] = function () {
  openSheet(head('Our anniversary', 'the day it all started') +
    '<div class="field"><label for="a-date">Our first day</label><input id="a-date" type="date" value="' + esc(S.us.anniversary || '') + '"></div>' +
    '<p class="hint">Shared between you both. The map counts your days together, counts down to the next anniversary, and celebrates on the day.</p>' +
    '<div class="sheet-actions"><button class="pxbtn primary" type="button" data-act="ann-save">Save</button><button class="pxbtn" type="button" data-act="more">Back</button></div>');
};
ACTIONS['ann-save'] = function () {
  var d = document.getElementById('a-date').value;
  if (!d) { toast('Pick the date first.', '📅', 2600); return; }
  S.us = Object.assign({}, S.us, { anniversary: d, by: S.who, at: Date.now() });
  try { localStorage.setItem('ow.us', JSON.stringify(S.us)); } catch (e) {}
  if (S.db) S.db.collection('settings').doc('us').set(S.us).catch(function () {});
  sparkle(); openMore();
};

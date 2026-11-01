/* The calendar: memories (pink hearts) and shared events (gold dots) on one month
   grid. Tap any day for its panel: what happened, what is planned, and a quick form
   to add something to the shared calendar (work days, dates, appointments...).
   Events live in the shared `calendar` collection, so you both see them. */

S.calendarEvents = [];
try { S.calendarEvents = JSON.parse(localStorage.getItem('ow.calendar') || '[]') || []; } catch (e) {}
var CALSEL = null;                                   /* the selected day, as YYYY-MM-DD */
ROWHOOKS.calendar = function (rows) {
  S.calendarEvents = rows || [];
  try { localStorage.setItem('ow.calendar', JSON.stringify(S.calendarEvents)); } catch (e) {}
  if (calEl.classList.contains('open')) renderCal();
};
function calIso(y, m, d) { return y + '-' + pad2(m + 1) + '-' + pad2(d); }
function monthEvents(y, m) { var k = y + '-' + pad2(m + 1); return S.calendarEvents.filter(function (x) { return x.date && x.date.slice(0, 7) === k; }); }
function evSort(a, b) { return (a.time || '99') .localeCompare(b.time || '99') || (a.at || 0) - (b.at || 0); }
function evTime(t) { if (!t) return ''; var p = t.split(':'), h = parseInt(p[0], 10); return ((h + 11) % 12 + 1) + ':' + p[1] + (h < 12 ? ' am' : ' pm'); }

function renderCal() {
  var y = calCur.y, m = calCur.m;
  document.getElementById('calMonth').innerHTML = MONTHS[m] + '<span class="yr">' + y + '</span>';
  document.getElementById('calPrev').disabled = beforeMin(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1);
  var body = document.getElementById('calBody'), mems = monthMemories(y, m), evs = monthEvents(y, m);
  var memBy = {}, evBy = {};
  mems.forEach(function (x) { var d = parseInt((x.date || '').slice(8, 10), 10); (memBy[d] = memBy[d] || []).push(x); });
  evs.forEach(function (x) { var d = parseInt(x.date.slice(8, 10), 10); (evBy[d] = evBy[d] || []).push(x); });

  var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  var now = new Date(), isNow = now.getFullYear() === y && now.getMonth() === m;
  var html = '<div class="cal-grid">';
  for (var d = 0; d < 7; d++) html += '<div class="cal-dow">' + DOW[d] + '</div>';
  for (var b = 0; b < first; b++) html += '<div class="cal-day blank"></div>';
  for (var n = 1; n <= days; n++) {
    var iso = calIso(y, m, n), hm = memBy[n], he = evBy[n];
    html += '<button type="button" data-cday="' + iso + '" class="cal-day' + (hm ? ' has' : '') + (isNow && now.getDate() === n ? ' today' : '') + (CALSEL === iso ? ' picked' : '') + '">' +
      '<span>' + n + '</span><span class="hrt">' + (hm ? '💗' + (hm.length > 1 ? '×' + hm.length : '') : '') + (he ? '<i class="evdot">●' + (he.length > 1 ? he.length : '') + '</i>' : '') + '</span></button>';
  }
  html += '</div>';

  if (CALSEL && CALSEL.slice(0, 7) === y + '-' + pad2(m + 1)) html += dayPanel(CALSEL, memBy, evBy);
  else {
    var rows = [];
    mems.forEach(function (x) { rows.push({ day: parseInt(x.date.slice(8, 10), 10), t: '', html: memRowHtml(x) }); });
    evs.sort(evSort).forEach(function (x) { rows.push({ day: parseInt(x.date.slice(8, 10), 10), t: x.time || '', html: evRowHtml(x, false) }); });
    rows.sort(function (a, b) { return a.day - b.day || a.t.localeCompare(b.t); });
    html += rows.length ? '<div class="cal-list">' + rows.map(function (r) { return r.html; }).join('') + '</div>' +
        '<div class="cal-count">' + mems.length + (mems.length === 1 ? ' memory' : ' memories') + (evs.length ? ' · ' + evs.length + (evs.length === 1 ? ' event' : ' events') : '') + ' this month</div>'
      : '<div class="cal-empty"><div class="big">' + MONTHS[m] + '</div><p>Nothing here yet. Tap a day to add something to our calendar, or add a memory.</p></div>';
  }
  body.innerHTML = html;
}
function memRowHtml(x) {
  return '<button class="cal-item" type="button" data-mem="' + esc(x.id) + '">' + (photoCandidates(x).length ? photoImg(x, '') : '<span class="ph">💗</span>') +
    '<span><span class="t">' + esc(x.title) + '</span><br><span class="s">' + esc(fmtDate(x.date)) + ' · ' + esc(whoName(x.by)) + ' · ' + esc(nearestTown(x.lat, x.lng).name) + '</span></span></button>';
}
function evRowHtml(x, withDel) {
  return '<div class="cal-item cal-ev"><span class="ph ev">●</span><span class="grow"><span class="t">' + esc(x.title) + '</span><br><span class="s">' + esc(fmtDate(x.date)) + (x.time ? ' · ' + esc(evTime(x.time)) : '') + ' · ' + esc(whoName(x.by)) +
    (x.note ? '<br>' + esc(x.note) : '') + '</span></span>' + (withDel && x.by === S.who ? '<button class="ev-del" type="button" data-evdel="' + esc(x.id) + '" aria-label="Remove">✕</button>' : '') + '</div>';
}
function dayPanel(iso, memBy, evBy) {
  var d = parseInt(iso.slice(8, 10), 10), mems = memBy[d] || [], evs = (evBy[d] || []).slice().sort(evSort);
  return '<div class="day-panel"><div class="dp-h"><b>' + esc(fmtDate(iso)) + '</b><button type="button" class="chipb" data-cday="">Close</button></div>' +
    (evs.length ? '<div class="cal-list" style="margin-top:8px">' + evs.map(function (x) { return evRowHtml(x, true); }).join('') + '</div>' : '') +
    (mems.length ? '<div class="cal-list" style="margin-top:8px">' + mems.map(memRowHtml).join('') + '</div>' : '') +
    (!evs.length && !mems.length ? '<p class="hint" style="margin:10px 0 0">Nothing on this day yet.</p>' : '') +
    '<div class="dp-form"><b>Add to our calendar</b>' +
      '<input id="ev-title" type="text" maxlength="70" placeholder="Work, date night, appointment…">' +
      '<div class="dp-row"><input id="ev-time" type="time"><input id="ev-note" type="text" maxlength="120" placeholder="Note (optional)"></div>' +
      '<button class="pxbtn primary" type="button" data-evadd="' + iso + '">Add for both of us</button></div></div>';
}
calEl.addEventListener('click', function (e) {
  var dd = e.target.closest('[data-cday]');
  if (dd) { CALSEL = dd.dataset.cday || null; renderCal(); var p = calEl.querySelector('.day-panel'); if (p) p.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
  var add = e.target.closest('[data-evadd]');
  if (add) {
    var t = (document.getElementById('ev-title').value || '').trim();
    if (!t) { toast('Give it a name first.', '🗓️', 2600); return; }
    var rec = { id: uid(), title: t, date: add.dataset.evadd, time: document.getElementById('ev-time').value || '', note: (document.getElementById('ev-note').value || '').trim(), by: S.who, at: Date.now() };
    S.calendarEvents = S.calendarEvents.concat([rec]);
    try { localStorage.setItem('ow.calendar', JSON.stringify(S.calendarEvents)); } catch (er) {}
    if (S.db) S.db.collection('calendar').doc(rec.id).set(rec).catch(function () { toast('Saved on this device — could not reach the shared world.', '⚠️', 4500); });
    if (window.earnHearts) earnHearts(1, 'calendar');
    toast('Added for both of you.', '🗓️', 2600); renderCal(); return;
  }
  var del = e.target.closest('[data-evdel]');
  if (del) {
    var id = del.dataset.evdel;
    S.calendarEvents = S.calendarEvents.filter(function (x) { return x.id !== id; });
    try { localStorage.setItem('ow.calendar', JSON.stringify(S.calendarEvents)); } catch (er) {}
    if (S.db) S.db.collection('calendar').doc(id).delete().catch(function () {});
    renderCal();
  }
});
(function () {
  var st = document.createElement('style');
  st.textContent = '.cal-day{cursor:pointer}.cal-day.picked{outline:3px solid var(--deep); outline-offset:-1px}.cal-day .evdot{font-style:normal; color:#C98A1E; font-size:9px; margin-left:2px}' +
    '.cal-ev .ph.ev{background:#FFF1D4; color:#C98A1E; font-size:14px}.cal-ev .grow{flex:1; min-width:0}.ev-del{border:none; background:none; color:var(--ink-45); font-size:14px; padding:6px}' +
    '.day-panel{margin-top:18px; border:3px solid var(--princess); background:#FFF9FC; padding:12px}.dp-h{display:flex; align-items:center; justify-content:space-between; gap:10px; font-family:var(--fdisp); color:var(--deep); font-size:17px}' +
    '.dp-form{margin-top:14px; display:flex; flex-direction:column; gap:8px}.dp-form b{font-family:var(--fdisp); color:var(--deep); font-size:15px}.dp-row{display:flex; gap:8px}' +
    '.dp-form input{font:inherit; font-size:16px; padding:9px 11px; border:2.5px solid var(--panel-edge); background:#fff; min-width:0}.dp-row input[type=text]{flex:1}.dp-form input:focus{outline:none; border-color:var(--pink)}';
  document.head.appendChild(st);
})();

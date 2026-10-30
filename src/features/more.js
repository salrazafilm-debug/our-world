/* The "More of us" sheet: trips, plans, a look back at this day, a poster of the
   map, and the atmosphere settings. */

function moreRow(act, ic, title, sub, data) {
  return '<button type="button" data-act="' + act + '"' + (data || '') + '><span class="ico">' + ic + '</span>' +
    '<span><span class="t">' + esc(title) + '</span><br><span class="s">' + esc(sub) + '</span></span></button>';
}
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function byDateThenTime(a, b) { return (a.date || '').localeCompare(b.date || '') || (a.at || 0) - (b.at || 0); }
function sectionTitle(t) { return '<h3 style="font-family:var(--fdisp);font-size:15px;color:var(--deep);margin:18px 0 6px">' + esc(t) + '</h3>'; }

/* ---------- this day, years ago ---------- */
function thisDayList() {
  var t = new Date(), mmdd = pad2(t.getMonth() + 1) + '-' + pad2(t.getDate()), y = t.getFullYear(), out = [];
  S.memories.forEach(function (m) {
    if (m.date && m.date.slice(5) === mmdd && parseInt(m.date.slice(0, 4), 10) < y) {
      out.push({ m: m, years: y - parseInt(m.date.slice(0, 4), 10) });
    }
  });
  return out.sort(function (a, b) { return a.years - b.years; });
}
function yearsAgo(n) { return n === 1 ? 'One year ago today' : n + ' years ago today'; }
function thisDayToast() {
  var list = thisDayList();
  if (!list.length) return;
  try { if (localStorage.getItem('ow.thisday') === todayISO()) return; localStorage.setItem('ow.thisday', todayISO()); } catch (e) {}
  setTimeout(function () { toast(yearsAgo(list[0].years) + ': ' + list[0].m.title, '💗', 7000); }, 2500);
}

/* ---------- the sheet ---------- */
function openMore() {
  var td = thisDayList(), html = head('More of us', 'little extras');
  if (td.length) {
    html += sectionTitle('Looking back') + '<div class="list">' + td.map(function (it) {
      return '<button type="button" data-act="goto" data-lat="' + it.m.lat + '" data-lng="' + it.m.lng + '" data-z="13">' +
        '<span class="ico">💗</span><span><span class="t">' + esc(it.m.title) + '</span><br><span class="s">' + esc(yearsAgo(it.years)) + '</span></span></button>';
    }).join('') + '</div>';
  }
  html += sectionTitle('Together') + '<div class="list">' +
    moreRow('trips-list', '🧵', 'Our trips', S.trips.length ? S.trips.length + (S.trips.length === 1 ? ' trip' : ' trips') + ' threaded across the map' : 'Thread memories into a journey') +
    moreRow('plans-list', '⭐', 'Places we want to go', S.plans.length ? S.plans.length + ' on the list' : 'Plan the next adventure') +
    moreRow('poster', '🖼️', 'Save our map as a poster', 'Frame it, or send it to her') +
    '</div>' + sectionTitle('This device') + '<div class="list">' +
    moreRow('install', '\ud83d\udcf1', 'Add to your home screen', 'Opens full-screen like a real app') +
    moreRow('atmos', '🌙', 'Time of day and weather', (AMB.tod === 'live' ? 'Follows the real clock' : AMB.tod === 'day' ? 'Always daytime' : 'Always night') + (AMB.weather ? ' · weather on' : ' · weather off')) +
    moreRow('sign-out', '🚪', 'Sign out', 'Locks this device again') +
    '</div>';
  openSheet(html);
}
document.getElementById('btnMore').addEventListener('click', openMore);
ACTIONS['more'] = openMore;
ACTIONS['atmos'] = openAtmos;
ACTIONS['poster'] = savePoster;
ACTIONS['install'] = function () {
  openSheet(head('Add to your home screen', 'so it opens like an app') +
    '<p class="note"><b>iPhone (Safari):</b> tap the Share button, then <b>Add to Home Screen</b>.<br><br>' +
    '<b>Android (Chrome):</b> tap the ⋮ menu, then <b>Install app</b> or <b>Add to Home screen</b>.</p>' +
    '<p class="hint">You will get the little pixel castle on your home screen, and it opens full-screen with no browser bars.</p>' +
    '<div class="sheet-actions"><button class="pxbtn" type="button" data-act="more">Back</button></div>');
};

/* ---------- atmosphere ---------- */
function openAtmos() {
  function opt(act, v, label, on) { return '<button class="pxbtn" type="button" aria-pressed="' + (on ? 'true' : 'false') + '" data-act="' + act + '" data-v="' + v + '">' + label + '</button>'; }
  openSheet(head('Atmosphere', 'light and weather') +
    '<p class="note">The map can follow the real clock — dusk, night and dawn — and the seasons: snow in winter, petals in spring, fireflies on summer nights, leaves in autumn.</p>' +
    sectionTitle('Time of day') + '<div class="sheet-actions">' +
      opt('tod', 'live', 'Live clock', AMB.tod === 'live') + opt('tod', 'day', 'Always day', AMB.tod === 'day') + opt('tod', 'night', 'Always night', AMB.tod === 'night') + '</div>' +
    sectionTitle('Weather') + '<div class="sheet-actions">' +
      opt('weather', 'on', 'On', AMB.weather) + opt('weather', 'off', 'Off', !AMB.weather) + '</div>' +
    '<div class="sheet-actions" style="margin-top:16px"><button class="pxbtn" type="button" data-act="more">Back</button></div>');
}
ACTIONS['tod'] = function (b) { AMB.tod = b.dataset.v; try { localStorage.setItem('ow.tod', AMB.tod); } catch (e) {} openAtmos(); draw(); };
ACTIONS['weather'] = function (b) { AMB.weather = b.dataset.v === 'on'; try { localStorage.setItem('ow.weather', AMB.weather ? 'on' : 'off'); } catch (e) {} openAtmos(); draw(); };
ACTIONS['sign-out'] = function () { if (window.OWCloud && OWCloud.configured) OWCloud.signOut(); else location.reload(); };

/* ---------- poster ---------- */
function savePoster() {
  closeSheet();
  setTimeout(function () {
    draw();
    var mw = cv.width, mh = cv.height, pad = Math.round(mw * 0.06), cap = Math.round(mw * 0.34);
    var out = document.createElement('canvas');
    out.width = mw + pad * 2; out.height = mh + pad * 2 + cap;
    var g = out.getContext('2d');
    g.fillStyle = '#FFF8FB'; g.fillRect(0, 0, out.width, out.height);
    g.imageSmoothingEnabled = false;
    g.drawImage(cv, pad, pad);
    var lw = Math.max(4, Math.round(mw * 0.012));
    g.strokeStyle = C.deep; g.lineWidth = lw; g.strokeRect(pad - lw / 2, pad - lw / 2, mw + lw, mh + lw);
    g.strokeStyle = C.princess; g.lineWidth = lw; g.strokeRect(lw, lw, out.width - lw * 2, out.height - lw * 2);
    var cx = out.width / 2, base = pad + mh + pad;
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = C.deep; g.font = Math.round(mw * 0.12) + 'px "Pixelify Sans", monospace';
    g.fillText('Our World', cx, base + cap * 0.42);
    g.fillStyle = C.pink; g.font = Math.round(mw * 0.05) + 'px "Pixelify Sans", monospace';
    g.fillText('Bruce & Princess Elena', cx, base + cap * 0.62);
    g.fillStyle = 'rgba(61,40,56,.55)'; g.font = Math.round(mw * 0.034) + 'px "Quicksand", sans-serif';
    g.fillText(['January','February','March','April','May','June','July','August','September','October','November','December'][new Date().getMonth()] + ' ' + new Date().getFullYear(), cx, base + cap * 0.78);
    out.toBlob(function (blob) {
      if (!blob) { toast('Could not make the poster — try again.', '⚠️', 4000); return; }
      var file = null;
      try { file = new File([blob], 'our-world.png', { type: 'image/png' }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Our World' }).catch(function () {});
      } else {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'our-world.png';
        document.body.appendChild(a); a.click(); a.remove();
        toast('Poster saved', '🖼️', 3000);
      }
    }, 'image/png');
  }, 250);
  toast('Framing your poster…', '🖼️', 1800);
}

/* ---------- trips ---------- */
function tripStops(t) {
  var out = [];
  (t.ids || []).forEach(function (id) {
    for (var i = 0; i < S.memories.length; i++) if (S.memories[i].id === id) out.push(S.memories[i]);
  });
  return out.sort(byDateThenTime);
}
function tripById(id) { for (var i = 0; i < S.trips.length; i++) if (S.trips[i].id === id) return S.trips[i]; return null; }
function fitStops(stops) {
  if (!stops.length) return;
  var la0 = 90, la1 = -90, ln0 = 180, ln1 = -180;
  stops.forEach(function (s) { la0 = Math.min(la0, s.lat); la1 = Math.max(la1, s.lat); ln0 = Math.min(ln0, s.lng); ln1 = Math.max(ln1, s.lng); });
  var z = 12.6;
  for (; z > 4.8; z -= 0.3) {
    var dx = Math.abs(lngToWX(ln1, z) - lngToWX(ln0, z)), dy = Math.abs(latToWY(la0, z) - latToWY(la1, z));
    if (dx < W * 0.72 && dy < H * 0.42) break;
  }
  flyTo((la0 + la1) / 2, (ln0 + ln1) / 2, z);
}
ACTIONS['trips-list'] = function () {
  var rows = S.trips.map(function (t) {
    var st = tripStops(t);
    return moreRow('trip-open', '🧵', t.name, st.length + ' stops' + (st.length ? ' · ' + fmtDate(st[0].date) : ''), ' data-id="' + esc(t.id) + '"');
  }).join('');
  openSheet(head('Our trips', 'a gold thread through the memories') +
    (rows ? '<div class="list">' + rows + '</div>' : '<p class="hint">No trips yet. A trip links memories, in order, with a gold thread across the map.</p>') +
    '<div class="sheet-actions" style="margin-top:14px"><button class="pxbtn primary" type="button" data-act="trip-new">New trip</button>' +
    '<button class="pxbtn" type="button" data-act="more">Back</button></div>');
};
ACTIONS['trip-new'] = function () {
  var mems = S.memories.slice().sort(byDateThenTime);
  if (mems.length < 2) {
    openSheet(head('New trip', 'needs two memories') +
      '<p class="hint">A trip connects memories, so add at least two first — then thread them together here.</p>' +
      '<div class="sheet-actions"><button class="pxbtn" type="button" data-act="trips-list">Back</button></div>');
    return;
  }
  openSheet(head('New trip', 'pick the stops, in any order') +
    '<div class="field"><label for="t-name">Name</label><input id="t-name" type="text" maxlength="60" placeholder="our September weekend"></div>' +
    '<div class="field"><label>Stops (we order them by date)</label><div class="chks">' +
    mems.map(function (m) {
      return '<label class="chk"><input type="checkbox" value="' + esc(m.id) + '"><span><b>' + esc(m.title) + '</b><br><i>' + esc(fmtDate(m.date)) + '</i></span></label>';
    }).join('') + '</div></div>' +
    '<div class="sheet-actions"><button class="pxbtn primary" type="button" data-act="trip-save">Thread it together</button>' +
    '<button class="pxbtn" type="button" data-act="trips-list">Cancel</button></div>');
};
ACTIONS['trip-save'] = function () {
  var name = (document.getElementById('t-name').value || '').trim();
  var ids = [].map.call(sheet.querySelectorAll('.chks input:checked'), function (c) { return c.value; });
  if (!name) { toast('Give the trip a name first.', '✏️', 3000); return; }
  if (ids.length < 2) { toast('Pick at least two stops.', '📍', 3000); return; }
  var rec = { id: uid(), name: name, ids: ids, by: S.who, at: Date.now() };
  S.trips = [rec].concat(S.trips); LS.write('trips', S.trips);
  if (S.db) S.db.collection('trips').doc(rec.id).set(rec).catch(function () { toast('Saved on this device — could not reach the shared world.', '⚠️', 5000); });
  closeSheet(); fitStops(tripStops(rec)); sparkle();
  toast('Trip threaded: ' + name, '🧵', 4000);
};
ACTIONS['trip-open'] = function (b) {
  var t = tripById(b.dataset.id); if (!t) return;
  var st = tripStops(t);
  openSheet(head(t.name, st.length + ' stops') +
    '<div class="list">' + st.map(function (m, i) {
      return '<button type="button" data-act="goto" data-lat="' + m.lat + '" data-lng="' + m.lng + '" data-z="13"><span class="ico">' + (i + 1) + '</span><span><span class="t">' + esc(m.title) + '</span><br><span class="s">' + esc(fmtDate(m.date)) + '</span></span></button>';
    }).join('') + '</div>' +
    '<div class="sheet-actions" style="margin-top:14px"><button class="pxbtn primary" type="button" data-act="trip-show" data-id="' + esc(t.id) + '">Show on the map</button>' +
    '<button class="pxbtn" type="button" data-act="trip-del" data-id="' + esc(t.id) + '">Delete trip</button>' +
    '<button class="pxbtn" type="button" data-act="trips-list">Back</button></div>');
};
ACTIONS['trip-show'] = function (b) { var t = tripById(b.dataset.id); if (t) { closeSheet(); fitStops(tripStops(t)); } };
ACTIONS['trip-del'] = function (b) {
  var id = b.dataset.id;
  S.trips = S.trips.filter(function (t) { return t.id !== id; }); LS.write('trips', S.trips);
  if (S.db) S.db.collection('trips').doc(id).delete().catch(function () { toast('Removed here — could not reach the shared world.', '⚠️', 4000); });
  toast('Trip removed (the memories are untouched).', '🧵', 3200);
  ACTIONS['trips-list']();
};

/* the gold thread, drawn under the pins */
HOOKS.beforePins.push(function () {
  if (S.mode !== 'map' || !S.trips.length) return;
  S.trips.forEach(function (t, ti) {
    var st = tripStops(t);
    if (st.length < 2) return;
    var pts = st.map(function (m) { return proj(m.lat, m.lng); });
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    function path() {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y;
        ctx.quadraticCurveTo((a.x + b.x) / 2 - dy * 0.16, (a.y + b.y) / 2 + dx * 0.16, b.x, b.y);
      }
    }
    path(); ctx.strokeStyle = 'rgba(245,216,142,.5)'; ctx.lineWidth = 8; ctx.stroke();
    path(); ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -cloudPhase * 0.35; ctx.stroke();
    ctx.restore();
    if (S.zoom > 8) {
      ctx.font = '11px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      pts.forEach(function (p, i) {
        ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 6.283); ctx.fill();
        ctx.strokeStyle = C.deep; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = C.deep; ctx.fillText(String(i + 1), p.x, p.y + 1);
      });
      tryLabel(pts[0].x, pts[0].y - 16, t.name, { size: 11, border: C.gold });
    }
  });
});

/* ---------- plans: places we want to go ---------- */
function planById(id) { for (var i = 0; i < S.plans.length; i++) if (S.plans[i].id === id) return S.plans[i]; return null; }
function daysUntil(iso) {
  if (!iso) return null;
  var d = new Date(iso + 'T00:00:00'), t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}
function countdownText(iso) {
  var n = daysUntil(iso);
  if (n === null) return '';
  if (n === 0) return 'today!';
  if (n === 1) return 'tomorrow';
  if (n > 1) return 'in ' + n + ' days';
  return 'a while ago';
}
ACTIONS['plans-list'] = function () {
  var rows = S.plans.slice().sort(function (a, b) { return (a.date || '9999').localeCompare(b.date || '9999'); }).map(function (p) {
    return moreRow('plan-open', '⭐', p.title, p.date ? fmtDate(p.date) + ' · ' + countdownText(p.date) : 'someday', ' data-id="' + esc(p.id) + '"');
  }).join('');
  openSheet(head('Places we want to go', 'the next adventures') +
    (rows ? '<div class="list">' + rows + '</div>' : '<p class="hint">Nothing planned yet. Drop a star where you want to go next — it waits on the map, and counts down if you give it a date.</p>') +
    '<div class="sheet-actions" style="margin-top:14px"><button class="pxbtn primary" type="button" data-act="plan-new">Add a plan</button>' +
    '<button class="pxbtn" type="button" data-act="more">Back</button></div>');
};
ACTIONS['plan-new'] = function () { startPlacing('plan'); };
function planForm(ll) {
  var nt = nearestTown(ll.lat, ll.lng);
  openSheet(head('New plan', nt.name) +
    '<div class="field"><label for="p-title">Where / what</label><input id="p-title" type="text" maxlength="80" placeholder="e.g. Chicago weekend"></div>' +
    '<div class="field"><label for="p-date">Date (optional)</label><input id="p-date" type="date"></div>' +
    '<div class="field"><label for="p-note">Note</label><textarea id="p-note" maxlength="600" placeholder="Why we want to go."></textarea></div>' +
    '<div class="sheet-actions"><button class="pxbtn primary" type="button" data-act="plan-save" data-lat="' + ll.lat + '" data-lng="' + ll.lng + '">Save plan</button>' +
    '<button class="pxbtn" type="button" data-act="close">Cancel</button></div>');
  setTimeout(function () { var e = document.getElementById('p-title'); if (e) e.focus(); }, 120);
}
ACTIONS['plan-save'] = function (b) {
  var title = (document.getElementById('p-title').value || '').trim();
  if (!title) { toast('Name the plan first.', '✏️', 3000); return; }
  var rec = { id: uid(), title: title, date: document.getElementById('p-date').value || '', note: (document.getElementById('p-note').value || '').trim(),
    lat: parseFloat(b.dataset.lat), lng: parseFloat(b.dataset.lng), by: S.who, at: Date.now() };
  S.plans = [rec].concat(S.plans); LS.write('plans', S.plans);
  if (S.db) S.db.collection('plans').doc(rec.id).set(rec).catch(function () { toast('Saved on this device — could not reach the shared world.', '⚠️', 5000); });
  closeSheet(); draw();
  toast('On the list: ' + title, '⭐', 3600); sparkle();
};
function openPlan(id) {
  var p = planById(id); if (!p) return;
  openSheet(head(p.title, nearestTown(p.lat, p.lng).name) +
    (p.date ? '<p><span class="pill locked">' + esc(fmtDate(p.date) + ' · ' + countdownText(p.date)) + '</span></p>' : '<p><span class="pill locked">Someday</span></p>') +
    (p.note ? '<p class="note">' + esc(p.note) + '</p>' : '') +
    '<p class="hint">Planned by ' + esc(whoName(p.by)) + '. When you get there, turn it into a memory.</p>' +
    '<div class="sheet-actions"><button class="pxbtn primary" type="button" data-act="plan-done" data-id="' + esc(p.id) + '">We went! Make it a memory</button>' +
    '<button class="pxbtn" type="button" data-act="plan-del" data-id="' + esc(p.id) + '">Remove</button>' +
    '<button class="pxbtn" type="button" data-act="close">Close</button></div>');
}
ACTIONS['plan-open'] = function (b) { openPlan(b.dataset.id); };
function removePlan(id) {
  S.plans = S.plans.filter(function (p) { return p.id !== id; }); LS.write('plans', S.plans);
  if (S.db) S.db.collection('plans').doc(id).delete().catch(function () {});
}
ACTIONS['plan-del'] = function (b) { removePlan(b.dataset.id); closeSheet(); draw(); toast('Plan removed.', '⭐', 2600); };
ACTIONS['plan-done'] = function (b) {
  var p = planById(b.dataset.id); if (!p) return;
  removePlan(p.id);
  memoryForm({ lat: p.lat, lng: p.lng }, null, p.title);
};
HOOKS.beforePins.push(function () {
  if (S.mode !== 'map' || !S.plans.length) return;
  S.plans.forEach(function (pl) {
    var p = proj(pl.lat, pl.lng);
    if (p.x < -40 || p.y < -50 || p.x > W + 40 || p.y > H + 40) return;
    ctx.save();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.lineDashOffset = cloudPhase * 0.3;
    ctx.beginPath(); ctx.arc(p.x, p.y - 12, 17, 0, 6.283); ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = .9 + Math.sin(cloudPhase / 9) * .1;
    ctx.fillStyle = C.softgold; ctx.beginPath(); ctx.arc(p.x, p.y - 12, 12, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.deep; ctx.font = '16px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('★', p.x, p.y - 11);
    ctx.globalAlpha = 1;
    addHit({ x: p.x - 20, y: p.y - 34, w: 40, h: 40 }, { kind: 'plan', id: pl.id });
    tryLabel(p.x, p.y - 32, pl.title + (pl.date ? ' · ' + countdownText(pl.date) : ''), { size: 11, border: C.gold });
  });
});

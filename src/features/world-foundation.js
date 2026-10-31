/* Our World foundation pages.
   Small, shared, and intentionally easy to extend. The map remains home;
   these pages give the new relationship systems a clear place to live. */

(function () {
  var root, page, state = { section: 'hub', month: new Date().getMonth(), year: new Date().getFullYear() };
  S.calendarEvents = S.calendarEvents || [];
  S.plans = S.plans || [];
  S.loveHearts = S.loveHearts || 0;
  var baby = { name: 'Your Baby', body: '#f3a9c7', scarf: 'none', bow: 'none', animation: 'idle', room: 'cozy' };
  try { baby = Object.assign(baby, JSON.parse(localStorage.getItem('ow.baby') || '{}')); } catch (e) {}
  try { S.loveHearts = parseInt(localStorage.getItem('ow.hearts') || '0', 10) || 0; } catch (e) {}

  function putLocal(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }
  function nowId(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
  function saveShared(collection, item) {
    putLocal('ow.' + collection, collection === 'calendar' ? S.calendarEvents : S.plans);
    if (S.db) S.db.collection(collection).doc(item.id).set(item).catch(function () {
      toast('Saved on this device — shared sync will retry.', '⚠️', 4000);
    });
  }
  function saveBaby() { putLocal('ow.baby', baby); }
  function addHearts(n, reason) {
    S.loveHearts = Math.max(0, (S.loveHearts || 0) + n);
    putLocal('ow.hearts', S.loveHearts);
    if (S.db) S.db.collection('love').doc('shared').set({ hearts: S.loveHearts, reason: reason || '', at: Date.now() }).catch(function () {});
    toast('+' + n + ' Love Hearts', '💗', 2600);
  }
  function dailyHeart() {
    var key = 'ow.heartday', today = todayISO(), old = '';
    try { old = localStorage.getItem(key) || ''; } catch (e) {}
    if (old !== today) { try { localStorage.setItem(key, today); } catch (e) {} addHearts(1, 'daily'); }
  }
  dailyHeart();

  ROWHOOKS.calendar = function (rows) {
    S.calendarEvents = rows || [];
    putLocal('ow.calendar', S.calendarEvents);
    if (page && state.section === 'calendar') renderPage();
  };
  ROWHOOKS.love = function (rows) {
    if (rows && rows[0] && rows[0].hearts != null) {
      S.loveHearts = Math.max(S.loveHearts || 0, Number(rows[0].hearts) || 0);
      putLocal('ow.hearts', S.loveHearts);
    }
    if (page && state.section === 'baby') renderPage();
  };
  try {
    S.calendarEvents = JSON.parse(localStorage.getItem('ow.calendar') || '[]') || [];
    S.plans = JSON.parse(localStorage.getItem('ow.plans') || '[]') || S.plans;
  } catch (e) {}

  function inject() {
    if (document.getElementById('owWorldPage')) return;
    var style = document.createElement('style');
    style.textContent = [
      '#owWorldPage{position:fixed;inset:0;z-index:30;background:linear-gradient(180deg,#fff8fb,#f8e9f2);overflow:auto;display:none;color:var(--ink);font-family:var(--fbody)}',
      '#owWorldPage.on{display:block;animation:owIn .22s ease-out}', '@keyframes owIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
      '.ow-shell{max-width:900px;margin:0 auto;padding:18px 16px 50px}', '.ow-head{display:flex;align-items:center;gap:12px;margin-bottom:20px}',
      '.ow-back{width:42px;height:42px;font-size:22px;padding:0}', '.ow-title{font-family:var(--fdisp);font-size:clamp(24px,6vw,36px);color:var(--deep);margin:0}',
      '.ow-sub{font-size:12px;color:var(--ink-45);font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-top:3px}',
      '.ow-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}', '.ow-card{border:3px solid var(--panel-edge);background:rgba(255,255,255,.72);padding:17px;text-align:left;box-shadow:0 5px 0 rgba(159,61,109,.1);min-height:116px}',
      '.ow-card:hover{border-color:var(--pink);transform:translateY(-1px)}', '.ow-card .ow-ico{font-size:28px;display:block;margin-bottom:8px}', '.ow-card b{font-family:var(--fdisp);font-size:18px;color:var(--deep)}', '.ow-card small{display:block;color:var(--ink-70);line-height:1.45;margin-top:5px}',
      '.ow-panel{border:3px solid var(--panel-edge);background:#fffafd;padding:16px;box-shadow:0 5px 0 rgba(159,61,109,.1);margin-bottom:13px}', '.ow-panel h3{font-family:var(--fdisp);color:var(--deep);margin:0 0 10px;font-size:20px}',
      '.ow-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}', '.ow-form .wide{grid-column:1/-1}', '.ow-form input,.ow-form textarea,.ow-form select{width:100%;padding:10px;border:2px solid var(--panel-edge);background:#fff;font:inherit;color:var(--ink)}', '.ow-form textarea{min-height:74px;resize:vertical}',
      '.ow-list{display:flex;flex-direction:column;gap:8px}', '.ow-row{display:flex;gap:11px;align-items:flex-start;border:2px solid var(--panel-edge);padding:11px;background:#fff}', '.ow-row b{color:var(--deep)}', '.ow-row small{display:block;color:var(--ink-45);margin-top:3px}', '.ow-row .ow-grow{flex:1}',
      '.ow-book{background:#c78d5a;border:8px solid #7e4f34;padding:10px;box-shadow:0 8px 0 rgba(70,38,28,.22)}', '.ow-page{background:#fff4d8;min-height:210px;padding:20px;color:#5e4736;border:2px solid #e1bf87;margin-bottom:12px}', '.ow-page h3{font-family:var(--fdisp);font-size:26px;margin:0 0 10px;color:#7c4e37}', '.ow-page img{width:100%;max-height:230px;object-fit:cover;border:3px solid #d4aa72;margin:7px 0}', '.ow-stamp{color:#a96d55;font-size:12px;letter-spacing:.1em;text-transform:uppercase}',
      '.ow-pet{display:grid;grid-template-columns:180px 1fr;gap:18px;align-items:center}', '.ow-pet-preview{min-height:180px;display:grid;place-items:center;background:linear-gradient(180deg,#e7d7f3,#fff1f7);border:3px solid var(--panel-edge);font-size:70px}', '.ow-heart{font-family:var(--fdisp);color:var(--deep);font-size:18px}', '.ow-pill{display:inline-block;border:2px solid var(--panel-edge);background:#fff;padding:6px 9px;margin:3px;font-size:12px}', '@media(max-width:600px){.ow-form{grid-template-columns:1fr}.ow-pet{grid-template-columns:1fr}.ow-pet-preview{min-height:150px}}'
    ].join('');
    document.head.appendChild(style);
    root = document.createElement('section'); root.id = 'owWorldPage'; root.setAttribute('aria-label', 'Our World pages');
    document.body.appendChild(root);
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-world]'); if (!b) return;
      var act = b.dataset.world;
      if (act === 'back') { if (state.section === 'hub') closePage(); else { state.section = 'hub'; renderPage(); } }
      else if (act === 'map') closePage();
      else if (act === 'calendar') { state.section = 'calendar'; renderPage(); }
      else if (act === 'remember') { state.section = 'remember'; renderPage(); }
      else if (act === 'plan') { state.section = 'plan'; renderPage(); }
      else if (act === 'together') { state.section = 'together'; renderPage(); }
      else if (act === 'baby') { state.section = 'baby'; renderPage(); }
      else if (act === 'explore') closePage();
      else if (act === 'prev-month') { stepMonth(-1); }
      else if (act === 'next-month') { stepMonth(1); }
      else if (act === 'add-calendar') { addCalendar(); }
      else if (act === 'add-plan') { addPlan(); }
      else if (act === 'save-baby') { saveBabyForm(); }
      else if (act === 'heart') { addHearts(Number(b.dataset.n || 1), 'manual'); renderPage(); }
      else if (act === 'buy') { buyItem(b.dataset.item); }
    });
    root.addEventListener('input', function (e) { if (e.target.dataset.baby) baby[e.target.dataset.baby] = e.target.value; });
  }
  function top(title, sub) {
    return '<div class="ow-head"><button class="pxbtn ow-back" type="button" data-world="back" aria-label="Back">‹</button><div><h1 class="ow-title">' + esc(title) + '</h1><div class="ow-sub">' + esc(sub || '') + '</div></div></div>';
  }
  function card(act, icon, title, sub) {
    return '<button class="ow-card" type="button" data-world="' + act + '"><span class="ow-ico">' + icon + '</span><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></button>';
  }
  function hub() {
    return top('Our World', 'A place made for both of you') + '<div class="ow-grid">' +
      card('explore', '🗺️', 'Explore', 'Move through the map, discover places, and find each other.') +
      card('remember', '📖', 'Remember', 'Open Our Story, memories, letters, journal, and albums.') +
      card('plan', '✦', 'Plan', 'Shared calendar, trips, places to go, and bucket list.') +
      card('together', '💗', 'Together', 'Presence, avatars, walks, anniversaries, and shared moments.') +
      card('baby', '🧸', 'Your Baby', 'Visit your companion, change accessories, and spend Love Hearts.') +
      card('calendar', '🗓️', 'Shared Calendar', 'Work days, dates, plans, and reminders you both see.') +
      '</div><div class="ow-panel" style="margin-top:15px"><h3>Keep it simple</h3><p style="margin:0;line-height:1.55;color:var(--ink-70)">The map is still home. These pages are just the quiet rooms around it.</p></div>';
  }
  function renderRemember() {
    var groups = {}, order = [];
    (S.memories || []).forEach(function (m) {
      var key = (m.date || todayISO()).slice(0, 7); if (!groups[key]) { groups[key] = []; order.push(key); } groups[key].push(m);
    });
    order.sort().reverse();
    var pages = order.length ? order.map(function (key) {
      var title = new Date(key + '-01T12:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      return '<article class="ow-page"><div class="ow-stamp">Our story · ' + esc(title) + '</div>' + groups[key].map(function (m) {
        var src = m.photoUrl || (window.OWCloud && OWCloud.photoUrl ? OWCloud.photoUrl(m.assetId) : '');
        return '<div style="margin-top:13px"><h3>' + esc(m.title || 'A memory') + '</h3>' + (src ? '<img src="' + esc(src) + '" alt="">' : '') + '<div>' + esc(nearestTown(m.lat, m.lng).name) + ' · ' + esc(fmtDate(m.date)) + '</div>' + (m.note ? '<p>' + esc(m.note) + '</p>' : '') + '</div>';
      }).join('') + '</article>';
    }).join('') : '<div class="ow-page"><h3>The first page is waiting</h3><p>Add a memory and it will live here.</p></div>';
    return top('Our Story', 'A scrapbook of the places and days you share') + '<div class="ow-book">' + pages + '</div>';
  }
  function renderCalendar() {
    var y = state.year, m = state.month, first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), key = y + '-' + String(m + 1).padStart(2, '0');
    var events = S.calendarEvents.filter(function (x) { return x.date && x.date.slice(0, 7) === key; });
    var cells = []; for (var i = 0; i < first; i++) cells.push('<span></span>');
    for (var d = 1; d <= days; d++) {
      var iso = key + '-' + String(d).padStart(2, '0'), count = events.filter(function (x) { return x.date === iso; }).length;
      cells.push('<div style="min-height:44px;border:2px solid ' + (iso === todayISO() ? 'var(--gold)' : 'var(--panel-edge)') + ';padding:5px;background:' + (count ? 'var(--princess)' : '#fff') + '"><b>' + d + '</b>' + (count ? '<div style="font-size:11px">' + count + ' ♥</div>' : '') + '</div>');
    }
    return top('Shared Calendar', 'Anything added here belongs to both of you') + '<div class="ow-panel"><div style="display:flex;justify-content:space-between;align-items:center"><button class="pxbtn" data-world="prev-month">‹</button><h3>' + new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) + '</h3><button class="pxbtn" data-world="next-month">›</button></div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;text-align:center;margin-bottom:12px;color:var(--ink-45);font-size:12px">' + ['S','M','T','W','T','F','S'].map(esc).join('') + '</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;text-align:center">' + cells.join('') + '</div></div>' +
      '<div class="ow-panel"><h3>Add to our calendar</h3><div class="ow-form"><input id="owCalTitle" class="wide" placeholder="Work, date night, appointment…"><input id="owCalDate" type="date"><input id="owCalTime" type="time"><textarea id="owCalNote" class="wide" placeholder="Optional note"></textarea><button class="pxbtn primary wide" data-world="add-calendar">Add shared date</button></div></div>' +
      '<div class="ow-panel"><h3>This month</h3><div class="ow-list">' + (events.length ? events.map(function (x) { return '<div class="ow-row"><span>💗</span><div class="ow-grow"><b>' + esc(x.title) + '</b><small>' + esc(x.date) + (x.time ? ' · ' + esc(x.time) : '') + (x.note ? ' · ' + esc(x.note) : '') + '</small></div></div>'; }).join('') : '<p style="margin:0;color:var(--ink-45)">Nothing scheduled yet.</p>') + '</div></div>';
  }
  function renderPlan() {
    var plans = (S.plans || []).slice().sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
    return top('Plan', 'Imagine what comes next') + '<div class="ow-panel"><h3>Add a simple plan</h3><div class="ow-form"><input id="owPlanTitle" class="wide" placeholder="Trip or place name"><input id="owPlanPlace" placeholder="Location"><input id="owPlanDate" type="date"><textarea id="owPlanNote" class="wide" placeholder="Optional note"></textarea><button class="pxbtn primary wide" data-world="add-plan">Add plan</button></div></div><div class="ow-panel"><h3>Our plans</h3><div class="ow-list">' + (plans.length ? plans.map(function (x) { return '<div class="ow-row"><span>✦</span><div class="ow-grow"><b>' + esc(x.title) + '</b><small>' + esc(x.place || '') + (x.date ? ' · ' + esc(x.date) : '') + (x.note ? ' · ' + esc(x.note) : '') + '</small></div></div>'; }).join('') : '<p style="margin:0;color:var(--ink-45)">No plans yet.</p>') + '</div></div><div class="ow-panel"><h3>Also in Plan</h3><div class="ow-grid">' + card('calendar','🗓️','Shared Calendar','Work days, dates, and reminders.') + card('map','🗺️','Back to the map','See your future place as a star when it is connected.') + '</div></div>';
  }
  function renderTogether() {
    var online = typeof PR !== 'undefined' && PR.partner;
    return top('Together', 'Feel connected now') + '<div class="ow-grid">' + card('baby','🧸','Your Baby','Visit your shared companion.') + card('map','🗺️','Meet on the map','See your avatars and shared places.') + '</div><div class="ow-panel" style="margin-top:14px"><h3>' + (online ? 'Your princess is here 💗' : 'Together mode') + '</h3><p style="margin:0;line-height:1.55;color:var(--ink-70)">' + (online ? 'Open the map to see your avatars together.' : 'When both of you are online, your avatars can meet on the map.') + '</p></div>';
  }
  function renderBaby() {
    var items = [{ id: 'blue-scarf', label: 'Blue scarf', kind: 'scarf' }, { id: 'pink-bow', label: 'Pink bow', kind: 'bow' }, { id: 'gold-bow', label: 'Gold bow', kind: 'bow' }];
    return top('Your Baby', 'Your little companion') + '<div class="ow-panel ow-pet"><div class="ow-pet-preview">🧸</div><div><div class="ow-heart">💗 ' + (S.loveHearts || 0) + ' Love Hearts</div><h3 style="margin-top:8px">Meet your baby</h3><p style="color:var(--ink-70)">A simple shared companion for the world you are building.</p><input data-baby="name" value="' + esc(baby.name) + '" placeholder="Baby name"><div style="margin-top:10px"><select data-baby="animation"><option value="idle"' + (baby.animation === 'idle' ? ' selected' : '') + '>Idle</option><option value="happy"' + (baby.animation === 'happy' ? ' selected' : '') + '>Happy</option><option value="spin"' + (baby.animation === 'spin' ? ' selected' : '') + '>Spin</option><option value="sleep"' + (baby.animation === 'sleep' ? ' selected' : '') + '>Sleeping</option></select> <button class="pxbtn primary" data-world="save-baby">Save</button></div></div></div><div class="ow-panel"><h3>Small shop</h3><div class="ow-grid">' + items.map(function (it) { return '<button class="ow-card" data-world="buy" data-item="' + it.id + '"><span class="ow-ico">' + (it.kind === 'scarf' ? '🧣' : '🎀') + '</span><b>' + esc(it.label) + '</b><small>1 Love Heart</small></button>'; }).join('') + '</div></div><div class="ow-panel"><h3>Pet room</h3><p style="color:var(--ink-70)">Room customization comes next. Your design can drop into this room without changing the foundation.</p></div><div class="ow-panel"><button class="pxbtn" data-world="heart" data-n="1">Earn a practice heart</button></div>';
  }
  function renderPage() {
    if (!root) inject();
    var body = state.section === 'remember' ? renderRemember() : state.section === 'calendar' ? renderCalendar() : state.section === 'plan' ? renderPlan() : state.section === 'together' ? renderTogether() : state.section === 'baby' ? renderBaby() : hub();
    root.innerHTML = '<div class="ow-shell">' + body + '</div>'; root.classList.add('on');
  }
  function closePage() { if (root) root.classList.remove('on'); }
  function stepMonth(n) { state.month += n; if (state.month < 0) { state.month = 11; state.year--; } if (state.month > 11) { state.month = 0; state.year++; } renderPage(); }
  function addCalendar() {
    var title = document.getElementById('owCalTitle').value.trim(), date = document.getElementById('owCalDate').value;
    if (!title || !date) return toast('Add a title and date first.', '🗓️', 2600);
    var item = { id: nowId('cal'), title: title, date: date, time: document.getElementById('owCalTime').value, note: document.getElementById('owCalNote').value.trim(), by: S.who, at: Date.now() };
    S.calendarEvents.push(item); saveShared('calendar', item); addHearts(1, 'calendar'); state.year = parseInt(date.slice(0, 4), 10); state.month = parseInt(date.slice(5, 7), 10) - 1; renderPage();
  }
  function addPlan() {
    var title = document.getElementById('owPlanTitle').value.trim(); if (!title) return toast('Give the plan a name first.', '✦', 2600);
    var item = { id: nowId('plan'), title: title, place: document.getElementById('owPlanPlace').value.trim(), date: document.getElementById('owPlanDate').value, note: document.getElementById('owPlanNote').value.trim(), by: S.who, at: Date.now() };
    S.plans.push(item); saveShared('plans', item); addHearts(1, 'plan'); renderPage();
  }
  function saveBabyForm() { baby.name = (baby.name || 'Your Baby').trim() || 'Your Baby'; saveBaby(); toast('Your Baby saved.', '🧸', 2400); renderPage(); }
  function buyItem(item) {
    if ((S.loveHearts || 0) < 1) return toast('Earn a Love Heart first.', '💗', 2600);
    S.loveHearts--; putLocal('ow.hearts', S.loveHearts);
    if (item === 'blue-scarf') baby.scarf = item; else baby.bow = item;
    saveBaby(); toast('Added to Your Baby.', '🎁', 2600); renderPage();
  }

  window.openWorldHub = function () { state.section = 'hub'; renderPage(); };
  window.openWorldCalendar = function () { state.section = 'calendar'; renderPage(); };
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root && root.classList.contains('on')) closePage(); });
})();

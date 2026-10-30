/* A private journal and photo diary. Entries are stored in a table that only
   their author can read (row-level security in the database), and the photos
   in a bucket that only their author can open. Nothing here is shared. */

var JR = { entries: [], paths: {}, form: null };
var JR_MOODS = [['loved', '🥰', 'Loved'], ['happy', '😊', 'Happy'], ['calm', '😌', 'Calm'], ['tired', '😴', 'Tired'],
  ['sad', '🥺', 'Sad'], ['low', '😢', 'Low'], ['stressed', '😤', 'Stressed']];
var JR_MISS = ['Not today', 'A little', 'A lot', 'So much'];
function jrMood(k) { for (var i = 0; i < JR_MOODS.length; i++) if (JR_MOODS[i][0] === k) return JR_MOODS[i]; return null; }
function jrApi() { return window.OWCloud && OWCloud.configured && OWCloud.journal ? OWCloud.journal : null; }
function jrHearts(n) { var s = ''; for (var i = 0; i < 3; i++) s += i < n ? '💗' : '🤍'; return s; }
var JR_LOCK = '<p class="note" style="border:3px solid var(--panel-edge);background:#FFF9FC;padding:9px 12px">🔒 Only you can see your journal. Not even ' + '<b>' + 'the other person' + '</b> can open it.</p>';

ACTIONS['journal'] = function () {
  var api = jrApi();
  if (!api) { openSheet(head('My journal', 'private') + '<p class="hint">The journal needs you to be signed in.</p><div class="sheet-actions"><button class="pxbtn" type="button" data-act="more">Back</button></div>'); return; }
  openSheet(head('My journal', 'private, just for you') + JR_LOCK + '<p class="hint">Loading…</p>');
  api.list().then(function (rows) {
    JR.entries = rows;
    var paths = []; rows.forEach(function (r) { (r.photos || []).forEach(function (p) { paths.push(p); }); });
    return api.signPhotos(paths.slice(0, 200));
  }).then(function (map) {
    JR.paths = map; renderJournal();
  }).catch(function (e) {
    openSheet(head('My journal', 'private') + '<p class="note">Could not load your journal (' + esc((e && (e.message || e.code)) || 'error') + '). Has the Phase 4 setup script been run in Supabase?</p><div class="sheet-actions"><button class="pxbtn" type="button" data-act="more">Back</button></div>');
  });
};
function renderJournal() {
  var rows = JR.entries, html = head('My journal', rows.length + (rows.length === 1 ? ' entry' : ' entries')) + JR_LOCK +
    '<div class="sheet-actions" style="margin:12px 0"><button class="pxbtn primary" type="button" data-act="jr-new">Write today’s entry</button><button class="pxbtn" type="button" data-act="more">Back</button></div>';
  if (!rows.length) html += '<p class="hint">Nothing here yet. Log how you felt today, whether you miss them, and any photos from your day — even if it has nothing to do with the map.</p>';
  else html += '<div class="list">' + rows.map(function (r) {
    var mo = jrMood(r.mood), first = (r.body || '').split('\n')[0].slice(0, 70);
    return '<button type="button" data-act="jr-open" data-id="' + esc(r.id) + '"><span class="ico">' + (mo ? mo[1] : '📓') + '</span><span><span class="t">' + esc(fmtDate(r.day)) +
      '</span><br><span class="s">' + jrHearts(r.miss || 0) + (r.photos && r.photos.length ? ' · 📷 ' + r.photos.length : '') + (first ? ' · ' + esc(first) : '') + '</span></span></button>';
  }).join('') + '</div>';
  openSheet(html);
}
ACTIONS['jr-new'] = function () {
  JR.form = { mood: 'loved', miss: 1, files: [] };
  openSheet(head('Today’s entry', 'only you can see this') +
    '<div class="field"><label for="j-day">Day</label><input id="j-day" type="date" value="' + todayISO() + '"></div>' +
    '<div class="field"><label>How are you feeling?</label><div class="chips" id="j-moods">' + JR_MOODS.map(function (m) {
      return '<button type="button" class="chipb' + (m[0] === JR.form.mood ? ' on' : '') + '" data-act="jr-mood" data-v="' + m[0] + '">' + m[1] + ' ' + m[2] + '</button>'; }).join('') + '</div></div>' +
    '<div class="field"><label>Do you miss them?</label><div class="chips" id="j-miss">' + JR_MISS.map(function (t, i) {
      return '<button type="button" class="chipb' + (i === JR.form.miss ? ' on' : '') + '" data-act="jr-miss" data-v="' + i + '">' + jrHearts(i) + ' ' + t + '</button>'; }).join('') + '</div></div>' +
    '<div class="field"><label for="j-body">Your day</label><textarea id="j-body" maxlength="4000" placeholder="What happened, how it felt, what you want to remember…" style="min-height:130px"></textarea></div>' +
    '<div class="field"><label for="j-photos">Photos from your day (optional)</label><input id="j-photos" type="file" accept="image/*" multiple></div>' +
    '<div class="sheet-actions"><button class="pxbtn primary" type="button" data-act="jr-save">Save entry</button><button class="pxbtn" type="button" data-act="journal">Cancel</button></div>');
};
ACTIONS['jr-mood'] = function (b) { JR.form.mood = b.dataset.v; [].forEach.call(sheet.querySelectorAll('#j-moods .chipb'), function (x) { x.classList.toggle('on', x === b); }); };
ACTIONS['jr-miss'] = function (b) { JR.form.miss = parseInt(b.dataset.v, 10); [].forEach.call(sheet.querySelectorAll('#j-miss .chipb'), function (x) { x.classList.toggle('on', x === b); }); };
ACTIONS['jr-save'] = function (b) {
  var api = jrApi(); if (!api) return;
  var files = [].slice.call(document.getElementById('j-photos').files || [], 0, 8);
  var entry = { day: document.getElementById('j-day').value || todayISO(), mood: JR.form.mood, miss: JR.form.miss, body: (document.getElementById('j-body').value || '').trim(), photos: [] };
  if (!entry.body && !files.length) { toast('Write something or add a photo first.', '✏️', 3000); return; }
  b.disabled = true; b.textContent = 'Saving…';
  var chain = Promise.resolve();
  files.forEach(function (f) {
    chain = chain.then(function () {
      return new Promise(function (res) { shrinkImage(f, function (blob) { res(blob); }); }).then(function (blob) {
        return blob ? api.uploadPhoto(blob).then(function (p) { entry.photos.push(p); }) : null;
      });
    });
  });
  chain.then(function () { return api.add(entry); }).then(function () {
    toast('Saved to your private journal.', '📓', 3200);
    ACTIONS['journal']();
  }).catch(function (e) {
    b.disabled = false; b.textContent = 'Save entry';
    toast('Could not save (' + ((e && (e.message || e.code)) || 'error') + ').', '⚠️', 5200);
  });
};
ACTIONS['jr-open'] = function (b) {
  var r = null; JR.entries.forEach(function (x) { if (x.id === b.dataset.id) r = x; });
  if (!r) return;
  var mo = jrMood(r.mood);
  openSheet(head(fmtDate(r.day), (mo ? mo[1] + ' ' + mo[2] : '') + ' · missing them: ' + JR_MISS[r.miss || 0]) +
    (r.body ? '<p class="note" style="white-space:pre-wrap;font-size:14.5px;color:var(--ink)">' + esc(r.body) + '</p>' : '') +
    (r.photos && r.photos.length ? '<div class="jr-photos">' + r.photos.map(function (p) {
      return JR.paths[p] ? '<img src="' + esc(JR.paths[p]) + '" alt="" data-act="jr-photo" data-src="' + esc(JR.paths[p]) + '">' : ''; }).join('') + '</div>' : '') +
    '<div class="sheet-actions" style="margin-top:14px"><button class="pxbtn" type="button" data-act="jr-del" data-id="' + esc(r.id) + '">Delete entry</button><button class="pxbtn" type="button" data-act="journal">Back</button></div>');
};
ACTIONS['jr-photo'] = function (b) { openPhoto(b.dataset.src, ''); };
ACTIONS['jr-del'] = function (b) {
  var api = jrApi(); if (!api) return;
  api.remove(b.dataset.id).then(function () { toast('Entry deleted.', '📓', 2600); ACTIONS['journal'](); })
    .catch(function (e) { toast('Could not delete (' + ((e && e.message) || 'error') + ').', '⚠️', 4000); });
};

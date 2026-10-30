/* Our journal: daily entries you write for each other — how the day felt, how
   much you miss them, photos from your day. Both of you can read every entry;
   only its author can change or delete it (enforced by the database). The other
   person can send a heart back. */

var JR = { entries: [], paths: {}, form: null, filter: 'all', edit: null };
var JR_MOODS = [['loved', '🥰', 'Loved'], ['happy', '😊', 'Happy'], ['calm', '😌', 'Calm'], ['tired', '😴', 'Tired'],
  ['sad', '🥺', 'Sad'], ['low', '😢', 'Low'], ['stressed', '😤', 'Stressed']];
var JR_MISS = ['Not today', 'A little', 'A lot', 'So much'];
S.jrLove = {};
ROWHOOKS.jrlove = function (rows) { rows.forEach(function (r) { S.jrLove[r.id] = r; }); if (sheet.dataset.view === 'jr-entry') reopenEntry(); };

function jrMood(k) { for (var i = 0; i < JR_MOODS.length; i++) if (JR_MOODS[i][0] === k) return JR_MOODS[i]; return null; }
function jrApi() { return window.OWCloud && OWCloud.configured && OWCloud.journal ? OWCloud.journal : null; }
function jrHearts(n) { var s = ''; for (var i = 0; i < 3; i++) s += i < n ? '💗' : '🤍'; return s; }
function jrWho(r) { return r.who === 'bruce' || r.who === 'elena' ? r.who : null; }
function jrShort(k) { return whoName(k).replace('Princess ', ''); }
function jrById(id) { for (var i = 0; i < JR.entries.length; i++) if (JR.entries[i].id === id) return JR.entries[i]; return null; }

function jrLoad() {
  var api = jrApi();
  if (!api) return Promise.reject(new Error('Sign in to use the journal.'));
  return api.list().then(function (rows) {
    JR.entries = rows;
    var paths = []; rows.forEach(function (r) { (r.photos || []).forEach(function (p) { paths.push(p); }); });
    return api.signPhotos(paths.slice(0, 300));
  }).then(function (map) { JR.paths = map; return JR.entries; });
}

/* a gentle nudge when the other person has written something new */
function jrCheckNew() {
  if (!jrApi() || !S.who) return;
  jrLoad().then(function (rows) {
    var them = other(S.who), last = 0;
    try { last = parseInt(localStorage.getItem('ow.jr.seen') || '0', 10); } catch (e) {}
    var fresh = rows.filter(function (r) { return jrWho(r) === them && new Date(r.created_at).getTime() > last; });
    if (fresh.length) setTimeout(function () { toast(jrShort(them) + ' wrote in our journal', '📓', 5200); }, 6000);
  }).catch(function () {});
}
function jrMarkSeen() { try { localStorage.setItem('ow.jr.seen', String(Date.now())); } catch (e) {} }

ACTIONS['journal'] = function () {
  if (!jrApi()) { openSheet(head('Our journal', 'notes for each other') + '<p class="hint">The journal needs you to be signed in.</p><div class="sheet-actions"><button class="pxbtn" type="button" data-act="more">Back</button></div>'); return; }
  openSheet(head('Our journal', 'notes for each other') + '<p class="hint">Loading…</p>');
  jrLoad().then(function () { jrMarkSeen(); renderJournal(); }).catch(function (e) {
    openSheet(head('Our journal', 'notes for each other') + '<p class="note">Could not load the journal (' + esc((e && (e.message || e.code)) || 'error') +
      '). If this is the first time, the Phase 4 setup script needs to be run in Supabase.</p><div class="sheet-actions"><button class="pxbtn" type="button" data-act="more">Back</button></div>');
  });
};
function renderJournal() {
  var f = JR.filter, rows = JR.entries.filter(function (r) { return f === 'all' || jrWho(r) === f; });
  function tab(v, label) { return '<button type="button" class="chipb' + (f === v ? ' on' : '') + '" data-act="jr-filter" data-v="' + v + '">' + label + '</button>'; }
  var html = head('Our journal', 'notes for each other') +
    '<div class="chips" style="margin-bottom:10px">' + tab('all', 'Both of us') + tab('bruce', 'Bruce') + tab('elena', 'Elena') + '</div>' +
    '<div class="sheet-actions" style="margin:4px 0 12px"><button class="pxbtn primary" type="button" data-act="jr-new">Write today’s entry</button><button class="pxbtn" type="button" data-act="more">Back</button></div>';
  if (!rows.length) html += '<p class="hint">Nothing here yet. Write how today felt, whether you miss them, add photos from your day — they will read it, and you will read theirs.</p>';
  else html += '<div class="list">' + rows.map(function (r) {
    var mo = jrMood(r.mood), first = (r.body || '').split('\n')[0].slice(0, 64), w = jrWho(r), loved = S.jrLove[r.id] && w && S.jrLove[r.id][other(w)];
    return '<button type="button" data-act="jr-open" data-id="' + esc(r.id) + '"><span class="ico">' + (mo ? mo[1] : '📓') + '</span><span><span class="t">' +
      (w ? esc(jrShort(w)) + ' · ' : '') + esc(fmtDate(r.day)) + (loved ? ' 💗' : '') +
      '</span><br><span class="s">' + jrHearts(r.miss || 0) + (r.photos && r.photos.length ? ' · 📷 ' + r.photos.length : '') + (first ? ' · ' + esc(first) : '') + '</span></span></button>';
  }).join('') + '</div>';
  sheet.dataset.view = 'jr-list';
  openSheet(html);
}
ACTIONS['jr-filter'] = function (b) { JR.filter = b.dataset.v; renderJournal(); };

function jrForm(entry) {
  JR.edit = entry ? entry.id : null;
  JR.form = { mood: entry ? entry.mood : 'loved', miss: entry ? (entry.miss || 0) : 1 };
  var them = jrShort(other(S.who));
  openSheet(head(entry ? 'Edit entry' : 'Today’s entry', 'for you and ' + them) +
    '<div class="field"><label for="j-day">Day</label><input id="j-day" type="date" value="' + esc(entry ? entry.day : todayISO()) + '"></div>' +
    '<div class="field"><label>How are you feeling?</label><div class="chips" id="j-moods">' + JR_MOODS.map(function (m) {
      return '<button type="button" class="chipb' + (m[0] === JR.form.mood ? ' on' : '') + '" data-act="jr-mood" data-v="' + m[0] + '">' + m[1] + ' ' + m[2] + '</button>'; }).join('') + '</div></div>' +
    '<div class="field"><label>Do you miss ' + esc(them) + '?</label><div class="chips" id="j-miss">' + JR_MISS.map(function (t, i) {
      return '<button type="button" class="chipb' + (i === JR.form.miss ? ' on' : '') + '" data-act="jr-miss" data-v="' + i + '">' + jrHearts(i) + ' ' + t + '</button>'; }).join('') + '</div></div>' +
    '<div class="field"><label for="j-body">Your day</label><textarea id="j-body" maxlength="4000" placeholder="What happened, how it felt, what you want them to know…" style="min-height:130px">' + esc(entry ? entry.body : '') + '</textarea></div>' +
    (entry ? '' : '<div class="field"><label for="j-photos">Photos from your day (optional)</label><input id="j-photos" type="file" accept="image/*" multiple></div>') +
    '<p class="hint">' + esc(them) + ' can read this. Only you can change or delete it.</p>' +
    '<div class="sheet-actions"><button class="pxbtn primary" type="button" data-act="jr-save">' + (entry ? 'Save changes' : 'Share entry') + '</button><button class="pxbtn" type="button" data-act="journal">Cancel</button></div>');
}
ACTIONS['jr-new'] = function () { jrForm(null); };
ACTIONS['jr-edit'] = function (b) { var r = jrById(b.dataset.id); if (r) jrForm(r); };
ACTIONS['jr-mood'] = function (b) { JR.form.mood = b.dataset.v; [].forEach.call(sheet.querySelectorAll('#j-moods .chipb'), function (x) { x.classList.toggle('on', x === b); }); };
ACTIONS['jr-miss'] = function (b) { JR.form.miss = parseInt(b.dataset.v, 10); [].forEach.call(sheet.querySelectorAll('#j-miss .chipb'), function (x) { x.classList.toggle('on', x === b); }); };
ACTIONS['jr-save'] = function (b) {
  var api = jrApi(); if (!api) return;
  var input = document.getElementById('j-photos');
  var files = input ? [].slice.call(input.files || [], 0, 8) : [];
  var entry = { day: document.getElementById('j-day').value || todayISO(), mood: JR.form.mood, miss: JR.form.miss, body: (document.getElementById('j-body').value || '').trim() };
  if (!entry.body && !files.length && !JR.edit) { toast('Write something or add a photo first.', '✏️', 3000); return; }
  b.disabled = true; b.textContent = 'Saving…';
  var done;
  if (JR.edit) done = api.update(JR.edit, entry);
  else {
    entry.photos = []; entry.who = S.who;
    var chain = Promise.resolve();
    files.forEach(function (f) {
      chain = chain.then(function () {
        return new Promise(function (res) { shrinkImage(f, function (blob) { res(blob); }); }).then(function (blob) {
          return blob ? api.uploadPhoto(blob).then(function (p) { entry.photos.push(p); }) : null;
        });
      });
    });
    done = chain.then(function () { return api.add(entry); });
  }
  done.then(function () {
    toast(JR.edit ? 'Entry updated.' : 'Shared with ' + jrShort(other(S.who)) + '.', '📓', 3200);
    playSound('save');
    ACTIONS['journal']();
  }).catch(function (e) {
    b.disabled = false; b.textContent = 'Try again';
    toast('Could not save (' + ((e && (e.message || e.code)) || 'error') + ').', '⚠️', 5200);
  });
};
var jrOpenId = null;
function reopenEntry() { if (jrOpenId) ACTIONS['jr-open']({ dataset: { id: jrOpenId } }); }
ACTIONS['jr-open'] = function (b) {
  var r = jrById(b.dataset.id); if (!r) return;
  jrOpenId = r.id;
  var mo = jrMood(r.mood), w = jrWho(r), mine = w === S.who, love = S.jrLove[r.id] || {};
  var missWho = w ? jrShort(other(w)) : 'them';
  openSheet(head((w ? jrShort(w) + ' · ' : '') + fmtDate(r.day), (mo ? mo[1] + ' ' + mo[2] : '') + ' · missing ' + missWho + ': ' + JR_MISS[r.miss || 0]) +
    (r.body ? '<p class="note" style="white-space:pre-wrap;font-size:14.5px;color:var(--ink)">' + esc(r.body) + '</p>' : '') +
    (r.photos && r.photos.length ? '<div class="jr-photos">' + r.photos.map(function (p) {
      return JR.paths[p] ? '<img src="' + esc(JR.paths[p]) + '" alt="" data-act="jr-photo" data-src="' + esc(JR.paths[p]) + '">' : ''; }).join('') + '</div>' : '') +
    (w && love[other(w)] ? '<p class="jr-love">💗 ' + esc(jrShort(other(w))) + ' sent a heart</p>' : '') +
    '<div class="sheet-actions" style="margin-top:14px">' +
      (!mine && w ? '<button class="pxbtn primary" type="button" data-act="jr-heart" data-id="' + esc(r.id) + '">' + (love[S.who] ? '💗 Heart sent' : 'Send a heart 💗') + '</button>' : '') +
      (mine ? '<button class="pxbtn" type="button" data-act="jr-edit" data-id="' + esc(r.id) + '">Edit</button><button class="pxbtn" type="button" data-act="jr-del" data-id="' + esc(r.id) + '">Delete</button>' : '') +
      '<button class="pxbtn" type="button" data-act="journal">Back</button></div>');
  sheet.dataset.view = 'jr-entry';
};
ACTIONS['jr-heart'] = function (b) {
  var id = b.dataset.id, cur = S.jrLove[id] || {};
  var next = { bruce: !!cur.bruce, elena: !!cur.elena }; next[S.who] = !cur[S.who];
  S.jrLove[id] = next;
  if (S.db) S.db.collection('jrlove').doc(id).set(next).catch(function () {});
  if (next[S.who]) { sparkle(); playSound('heart'); }
  reopenEntry();
};
ACTIONS['jr-photo'] = function (b) { openPhoto(b.dataset.src, ''); };
ACTIONS['jr-del'] = function (b) {
  var api = jrApi(); if (!api) return;
  if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Tap again to delete'; return; }
  api.remove(b.dataset.id).then(function () { toast('Entry deleted.', '📓', 2600); jrOpenId = null; ACTIONS['journal'](); })
    .catch(function (e) { toast('Could not delete (' + ((e && e.message) || 'error') + ').', '⚠️', 4000); });
};

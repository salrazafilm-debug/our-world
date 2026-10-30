/* Our shared bucket list. Either of you adds things; each taps a heart if
   they want it too; things you both want rise to the top; tick it off when done. */

S.bucket = [];
try { S.bucket = JSON.parse(localStorage.getItem('ow.bucket') || '[]') || []; } catch (e) {}
ROWHOOKS.bucket = function (rows) { S.bucket = rows; saveBucketLocal(); };
function saveBucketLocal() { try { localStorage.setItem('ow.bucket', JSON.stringify(S.bucket)); } catch (e) {} }
function bucketById(id) { for (var i = 0; i < S.bucket.length; i++) if (S.bucket[i].id === id) return S.bucket[i]; return null; }
function bucketWrite(it) {
  saveBucketLocal();
  if (S.db) S.db.collection('bucket').doc(it.id).set(it).catch(function () { toast('Saved on this device — could not reach the shared world.', '⚠️', 4500); });
}
var BUCKET_ICONS = ['⭐', '✈️', '🍕', '🎢', '🏖️', '🏔️', '🎬', '🍷', '📸', '💐'];

ACTIONS['bucket'] = function () {
  var open = S.bucket.filter(function (b) { return !b.done; }), done = S.bucket.filter(function (b) { return b.done; });
  function score(b) { return (b.votes && b.votes.bruce ? 1 : 0) + (b.votes && b.votes.elena ? 1 : 0); }
  open.sort(function (a, b) { return score(b) - score(a) || (b.at || 0) - (a.at || 0); });
  function row(b) {
    var vb = !!(b.votes && b.votes.bruce), ve = !!(b.votes && b.votes.elena), both = vb && ve;
    return '<div class="bk' + (both ? ' both' : '') + (b.done ? ' done' : '') + '">' +
      '<button class="bk-tick" type="button" data-act="bk-done" data-id="' + esc(b.id) + '" aria-label="' + (b.done ? 'Mark not done' : 'Mark done') + '">' + (b.done ? '✔' : '') + '</button>' +
      '<div class="bk-main"><b>' + esc(b.icon || '⭐') + ' ' + esc(b.title) + '</b>' +
      '<span>' + (b.done ? 'Done ' + (b.doneAt ? fmtDate(new Date(b.doneAt).toISOString().slice(0, 10)) : '') : (both ? 'We both want this 💗' : 'Added by ' + esc(whoName(b.by)))) + '</span></div>' +
      '<div class="bk-votes"><button type="button" class="bk-v' + (vb ? ' on' : '') + '" data-act="bk-vote" data-id="' + esc(b.id) + '" data-who="bruce" title="Bruce wants this">B</button>' +
      '<button type="button" class="bk-v' + (ve ? ' on' : '') + '" data-act="bk-vote" data-id="' + esc(b.id) + '" data-who="elena" title="Elena wants this">E</button></div>' +
      '<button class="bk-x" type="button" data-act="bk-del" data-id="' + esc(b.id) + '" aria-label="Remove">✕</button></div>';
  }
  openSheet(head('Our bucket list', 'things we want to do together') +
    '<div class="bk-add"><input id="bk-title" type="text" maxlength="80" placeholder="Add something we should do…"><button class="pxbtn primary" type="button" data-act="bk-add">Add</button></div>' +
    '<div class="chips" id="bk-icons">' + BUCKET_ICONS.map(function (ic, i) { return '<button type="button" class="chipb' + (i === 0 ? ' on' : '') + '" data-act="bk-icon" data-ic="' + ic + '">' + ic + '</button>'; }).join('') + '</div>' +
    (open.length ? '<div class="bk-list">' + open.map(row).join('') + '</div>' : '<p class="hint" style="margin-top:12px">Nothing on the list yet — add the first thing. Tap B or E to say who wants it; things you both want rise to the top.</p>') +
    (done.length ? sectionTitle('Done together 🎉') + '<div class="bk-list">' + done.map(row).join('') + '</div>' : '') +
    '<div class="sheet-actions" style="margin-top:14px"><button class="pxbtn" type="button" data-act="more">Back</button></div>');
  sheet.dataset.bkIcon = BUCKET_ICONS[0];
};
ACTIONS['bk-icon'] = function (b) { sheet.dataset.bkIcon = b.dataset.ic; [].forEach.call(sheet.querySelectorAll('#bk-icons .chipb'), function (x) { x.classList.toggle('on', x === b); }); };
ACTIONS['bk-add'] = function () {
  var t = (document.getElementById('bk-title').value || '').trim();
  if (!t) { toast('Type what you want to do first.', '✏️', 2600); return; }
  var it = { id: uid(), title: t, icon: sheet.dataset.bkIcon || '⭐', by: S.who, at: Date.now(), done: false, votes: {} };
  it.votes[S.who] = true;
  S.bucket = [it].concat(S.bucket); bucketWrite(it);
  ACTIONS['bucket'](); sparkle();
};
ACTIONS['bk-vote'] = function (b) {
  var it = bucketById(b.dataset.id); if (!it) return;
  if (b.dataset.who !== S.who) { toast('You can only tap your own letter — ' + whoName(b.dataset.who).replace('Princess ', '') + ' taps theirs.', '💗', 3200); return; }
  it.votes = it.votes || {}; it.votes[S.who] = !it.votes[S.who];
  bucketWrite(it); ACTIONS['bucket']();
};
ACTIONS['bk-done'] = function (b) {
  var it = bucketById(b.dataset.id); if (!it) return;
  it.done = !it.done; it.doneAt = it.done ? Date.now() : null;
  bucketWrite(it); ACTIONS['bucket']();
  if (it.done) { sparkle(); toast('Done together: ' + it.title, '🎉', 4200); }
};
ACTIONS['bk-del'] = function (b) {
  var id = b.dataset.id;
  S.bucket = S.bucket.filter(function (x) { return x.id !== id; }); saveBucketLocal();
  if (S.db) S.db.collection('bucket').doc(id).delete().catch(function () {});
  ACTIONS['bucket']();
};

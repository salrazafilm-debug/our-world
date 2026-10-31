/* Daily love note. Each of you writes a note for the other; whenever the other
   opens Our World, your latest note is waiting for them. */

S.notes = {};
try { S.notes = JSON.parse(localStorage.getItem('ow.notes') || '{}') || {}; } catch (e) {}
ROWHOOKS.notes = function (rows) {
  rows.forEach(function (r) { S.notes[r.id] = r; });
  try { localStorage.setItem('ow.notes', JSON.stringify(S.notes)); } catch (e) {}
  maybeShowNote();
};

var noteShown = false;
function noteWhen(ts) {
  if (!ts) return '';
  var d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) return 'written today';
  var y = new Date(now.getTime() - 86400000);
  if (d.toDateString() === y.toDateString()) return 'written yesterday';
  return 'written ' + ['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()] + ' ' + d.getDate();
}
function maybeShowNote(tries) {
  if (noteShown || !S.who) return;
  var n = S.notes[other(S.who)];
  if (!n || !n.text) return;
  var intro = document.getElementById('intro'), quote = document.getElementById('quote');
  if ((intro && intro.style.display !== 'none') || (quote && quote.classList.contains('on'))) {
    if ((tries || 0) < 120) setTimeout(function () { maybeShowNote((tries || 0) + 1); }, 1000);
    return;
  }
  noteShown = true;
  var el = document.getElementById('noteCard');
  if (!el) {
    el = document.createElement('div'); el.id = 'noteCard'; el.className = 'notecard';
    el.innerHTML = '<div class="nc-card" role="dialog" aria-label="A note for you"><div class="nc-env">💌</div><div class="nc-from"></div><p class="nc-text"></p><div class="nc-when"></div><button class="pxbtn primary" type="button">Aww 💗</button></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) { if (e.target === el || e.target.tagName === 'BUTTON') el.classList.remove('on'); });
  }
  el.querySelector('.nc-from').textContent = 'A note from ' + whoName(other(S.who)).replace('Princess ', '');
  el.querySelector('.nc-text').textContent = n.text;
  el.querySelector('.nc-when').textContent = noteWhen(n.at);
  el.classList.add('on');
  sparkle();
}

ACTIONS['note-edit'] = function () {
  var mine = S.notes[S.who] || {};
  openSheet(head('My daily note', 'for ' + whoName(other(S.who)).replace('Princess ', '')) +
    '<p class="note">Write something sweet. It shows up for them every time they open Our World, until you change it.</p>' +
    '<div class="field"><label for="n-text">Your note</label><textarea id="n-text" maxlength="280" placeholder="Good morning, I’m thinking about you…">' + esc(mine.text || '') + '</textarea></div>' +
    '<p class="hint">' + (mine.at ? 'Currently showing: ' + noteWhen(mine.at) + '.' : 'You have not written one yet.') + '</p>' +
    '<div class="sheet-actions"><button class="pxbtn primary" type="button" data-act="note-save">Send it</button>' +
    '<button class="pxbtn" type="button" data-act="more">Back</button></div>');
  setTimeout(function () { var e = document.getElementById('n-text'); if (e) e.focus(); }, 120);
};
ACTIONS['note-save'] = function () {
  var text = (document.getElementById('n-text').value || '').trim();
  if (!text) { toast('Write a few words first.', '✏️', 2800); return; }
  var rec = { text: text, by: S.who, at: Date.now() };
  S.notes[S.who] = rec;
  try { localStorage.setItem('ow.notes', JSON.stringify(S.notes)); } catch (e) {}
  if (S.db) S.db.collection('notes').doc(S.who).set(rec).catch(function () { toast('Saved on this device — could not reach the shared world.', '⚠️', 4500); });
  closeSheet(); sparkle();
  toast('Note sent — it will be waiting for them.', '💌', 3600);
};

/* Letters: a list of every sealed letter, and letters that open on a date
   (birthdays, anniversaries) announce themselves the day they unlock. */

function letterDateReady(s) { return !!(s && s.unlockDate && s.unlockDate <= todayISO()); }

var lettersChecked = false;
function checkDateLetters() {
  if (lettersChecked || !S.who) return;
  var ready = S.surprises.filter(function (s) { return !s.opened && s.forWho === S.who && letterDateReady(s); });
  if (!ready.length) return;
  lettersChecked = true;
  setTimeout(function () {
    toast('A letter from ' + whoName(ready[0].by).replace('Princess ', '') + ' is ready to open', '💌', 6500);
    playSound('chime');
  }, 4500);
}
ROWHOOKS.surprises = function () { checkDateLetters(); };

ACTIONS['letters'] = function () {
  var forMe = S.surprises.filter(function (s) { return s.forWho === S.who; }),
      fromMe = S.surprises.filter(function (s) { return s.by === S.who && s.forWho !== S.who; });
  function row(s, mine) {
    var state = s.opened ? 'Opened' : (letterDateReady(s) ? 'Ready to open' : (s.unlockDate ? 'Opens ' + fmtDate(s.unlockDate) + ' · ' + countdownText(s.unlockDate) : 'Opens at ' + nearestTown(s.lat, s.lng).name));
    return '<button type="button" data-act="letter-open" data-id="' + esc(s.id) + '"><span class="ico">' + (s.opened ? '📬' : '💌') + '</span><span><span class="t">' +
      esc(s.title) + '</span><br><span class="s">' + (mine ? 'For ' + esc(whoName(s.forWho)) + ' · ' : 'From ' + esc(whoName(s.by)) + ' · ') + esc(state) + '</span></span></button>';
  }
  openSheet(head('Letters', 'sealed for each other') +
    sectionTitle('For you') + (forMe.length ? '<div class="list">' + forMe.map(function (s) { return row(s, false); }).join('') + '</div>' : '<p class="hint">No letters for you yet.</p>') +
    sectionTitle('From you') + (fromMe.length ? '<div class="list">' + fromMe.map(function (s) { return row(s, true); }).join('') + '</div>' : '<p class="hint">Leave one with the ✉️ button: pick a spot on the map, and optionally a date.</p>') +
    '<div class="sheet-actions" style="margin-top:14px"><button class="pxbtn" type="button" data-act="more">Back</button></div>');
};
ACTIONS['letter-open'] = function (b) {
  var s = null; S.surprises.forEach(function (x) { if (x.id === b.dataset.id) s = x; });
  if (!s) return;
  if (!letterDateReady(s) || s.opened || s.forWho !== S.who) flyTo(s.lat, s.lng, Math.max(S.zoom, 11));
  openItem({ kind: 'surprise', id: s.id });
};

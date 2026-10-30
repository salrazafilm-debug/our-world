/* Photo albums: memories with photos, grouped by place, shown as a stack of
   polaroids you flip through. */

function albumGroups() {
  var by = {};
  S.memories.forEach(function (m) {
    if (!photoCandidates(m).length) return;
    var k = nearestTown(m.lat, m.lng).name;
    (by[k] = by[k] || []).push(m);
  });
  return Object.keys(by).map(function (k) {
    by[k].sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || (b.at || 0) - (a.at || 0); });
    return { place: k, items: by[k] };
  }).sort(function (a, b) { return b.items.length - a.items.length || a.place.localeCompare(b.place); });
}
ACTIONS['albums'] = function () {
  var groups = albumGroups();
  openSheet(head('Photo albums', 'by place') +
    (groups.length ? '<div class="list">' + groups.map(function (g, i) {
      var c = photoCandidates(g.items[0])[0];
      return '<button type="button" data-act="album-open" data-i="' + i + '"><span class="ico"><img class="alb-cover" alt="" src="' + esc(c) + '"></span><span><span class="t">' + esc(g.place) +
        '</span><br><span class="s">' + g.items.length + (g.items.length === 1 ? ' photo' : ' photos') + '</span></span></button>';
    }).join('') + '</div>' : '<p class="hint">No photos yet. Add a memory with a photo and it will appear here, stacked by place.</p>') +
    '<div class="sheet-actions" style="margin-top:14px"><button class="pxbtn" type="button" data-act="more">Back</button></div>');
};

var ALB = { items: [], i: 0, el: null, startX: null };
ACTIONS['album-open'] = function (b) {
  var g = albumGroups()[parseInt(b.dataset.i, 10)]; if (!g) return;
  ALB.items = g.items; ALB.i = 0; ALB.place = g.place;
  closeSheet(); showAlbum();
};
function ensureAlbumEl() {
  if (ALB.el) return ALB.el;
  var el = ALB.el = document.createElement('div');
  el.id = 'albumView'; el.className = 'albumview';
  el.innerHTML = '<button class="closex alb-close" type="button" aria-label="Close">✕</button><div class="alb-title"></div><div class="alb-stack"></div>' +
    '<div class="alb-nav"><button class="pxbtn" type="button" data-d="-1" aria-label="Previous">‹</button><span class="alb-count"></span><button class="pxbtn" type="button" data-d="1" aria-label="Next">›</button></div>';
  document.body.appendChild(el);
  el.querySelector('.alb-close').addEventListener('click', function () { el.classList.remove('on'); });
  [].forEach.call(el.querySelectorAll('.alb-nav button'), function (b) { b.addEventListener('click', function () { albumStep(parseInt(b.dataset.d, 10)); }); });
  var stack = el.querySelector('.alb-stack');
  stack.addEventListener('pointerdown', function (e) { ALB.startX = e.clientX; });
  stack.addEventListener('pointerup', function (e) {
    if (ALB.startX == null) return;
    var dx = e.clientX - ALB.startX; ALB.startX = null;
    if (Math.abs(dx) > 40) albumStep(dx < 0 ? 1 : -1); else albumStep(1);
  });
  el.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') albumStep(1); else if (e.key === 'ArrowLeft') albumStep(-1); else if (e.key === 'Escape') el.classList.remove('on'); });
  return el;
}
function albumStep(d) { var n = ALB.items.length; ALB.i = (ALB.i + d + n) % n; showAlbum(d); }
function showAlbum(dir) {
  var el = ensureAlbumEl(), n = ALB.items.length;
  el.querySelector('.alb-title').textContent = ALB.place;
  el.querySelector('.alb-count').textContent = (ALB.i + 1) + ' / ' + n;
  var stack = el.querySelector('.alb-stack'); stack.innerHTML = '';
  for (var k = Math.min(3, n - 1); k >= 0; k--) {
    var m = ALB.items[(ALB.i + k) % n], c = photoCandidates(m)[0];
    var card = document.createElement('div');
    card.className = 'pol-card' + (k === 0 ? ' top' : '');
    var rot = ((polHash(m.id) % 9) - 4) * (k === 0 ? 0.5 : 1.4);
    card.style.transform = 'translate(' + (k ? (k % 2 ? 10 : -10) * k : 0) + 'px,' + (k * 7) + 'px) rotate(' + rot + 'deg)';
    card.innerHTML = '<img alt="" src="' + esc(c) + '"><div class="pc-cap"><b>' + esc(m.title) + '</b><span>' + esc(fmtDate(m.date)) + ' · ' + esc(whoName(m.by)) + '</span></div>';
    if (k === 0 && dir) card.classList.add(dir > 0 ? 'in-r' : 'in-l');
    stack.appendChild(card);
  }
  el.classList.add('on'); el.tabIndex = -1; el.focus();
}

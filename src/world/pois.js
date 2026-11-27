/* Places with their own little pixel icons: Annapolis Mall, the airports, and the DC buildings that appear as
   you zoom into the city. Each shows from its own zoom level, so the zoomed-out map keeps its simple look
   (the DC monument and capitol picture), and zooming in reveals more buildings at their real places.
   Tap one for its name. Style rules: STYLE.md. */
var POI_SP = {
  mall: [
    '..........oooooo..........',
    '.........obbwbbbo.........',
    '........obwbbwbbbo........',
    '.......obbbbbbwbbbo.......',
    'oooooooooooooooooooooooooo',
    'oPPPPPPPPPPPPPPPPPPPPPPPPo',
    'oPppSSSSSSSSSSSSSSSSSSppPo',
    'oPppSPPPPPPPPPPPPPPPPSppPo',
    'oPppSSSSSSSSSSSSSSSSSSppPo',
    'oooooooooooooooooooooooooo',
    'opwpwpwpwpwpwpwpwpwpwpwpwo',
    'oooooooooooooooooooooooooo',
    'owwwwwwwwwwwwwwwwwwwwwwwwo',
    'owbbwwbbwwbbbbbbwwbbwwbbwo',
    'owbbwwbbwwbwwwwbwwbbwwbbwo',
    'owwwwwwwwwbwwwwbwwwwwwwwwo',
    'owbbwwbbwwbbbbbbwwbbwwbbwo',
    'owbbwwbbwwddddddwwbbwwbbwo',
    'owwwwwwwwwddddddwwwwwwwwwo',
    'oooooooooooooooooooooooooo'],
  gym: [
    'oooooooooooooooooooooo',
    'oYYYYYYYYYYYYYYYYYYYYo',
    'oYvvvvvvvvvvvvvvvvvvYo',
    'oYvYYvYYYYYYYYYYvYYvYo',
    'oYvvvvvvvvvvvvvvvvvvYo',
    'oYYYYYYYYYYYYYYYYYYYYo',
    'oooooooooooooooooooooo',
    'ovvvvvvvvvvvvvvvvvvvvo',
    'ovbbvvbbvvbbbbvvbbvbbo',
    'ovbbvvbbvvbbbbvvbbvbbo',
    'ovvvvvvvvvddddvvvvvvvo',
    'ovbbvvbbvvddddvvbbvbbo',
    'ovvvvvvvvvddddvvvvvvvo',
    'oooooooooooooooooooooo'],
  airport: [
    '.......oo.......',
    '......owwo......',
    '.....owbbwo.....',
    '.....owbbwo.....',
    '......owwo......',
    '......owwo......',
    '...o..owwo......',
    '..owooowwoooooo.',
    '.owwwwwwwwwwwwwo',
    '..owooowwoooooo.',
    '...o..owwo......',
    '.....owwwwo.....',
    '....owwwwwwo....',
    '....oooooooo....'],
  whitehouse: [
    '.......oo.......',
    '......owwo......',
    '...oooooooooo...',
    '..owwwwwwwwwwo..',
    'oooooooooooooooo',
    'owwwwcwcwcwwwwwo',
    'owbwwcwcwcwwbwwo',
    'owwwwcwcwcwwwwwo',
    'owbwwcwcwcwwbwwo',
    'owwwwwwddwwwwwwo',
    'oooooooooooooooo'],
  temple: [
    '.....oooooo.....',
    '...oowwwwwwoo...',
    '.oowwwwwwwwwwoo.',
    'oooooooooooooooo',
    'owcwcwcwcwcwcwco',
    'owcwcwcwcwcwcwco',
    'owcwcwcwcwcwcwco',
    'owcwcwcwcwcwcwco',
    'oooooooooooooooo',
    'owwwwwwwwwwwwwwo',
    'oooooooooooooooo'],
  dome: [
    '.......oo.......',
    '......owwo......',
    '.....owwwwo.....',
    '....owwwwwwo....',
    '...owwwwwwwwo...',
    '...occcccccco...',
    'oooooooooooooooo',
    'owcwcwcwcwcwcwco',
    'owcwcwcwcwcwcwco',
    'oooooooooooooooo'],
  castle: [
    'o.o.........o.o.',
    'ooo.........ooo.',
    'oro.oo.oo.oo.oro',
    'orooroorooroorro',
    'orrrrrrrrrrrrrro',
    'orbrrrrddrrrrbro',
    'orrrrrrddrrrrrro',
    'oooooooooooooooo']
};
var POI_PAL = {
  mall: { o: '#5E2238', p: '#D9879F', P: '#8E3A57', S: '#FFE2A1', w: '#FFF2DF', b: '#7FC3DF', d: '#8A5638' },
  gym: { o: '#2E1F4A', Y: '#F5C518', v: '#5B2D8E', b: '#C9B6F2', d: '#2E1F4A' },
  airport: { o: '#3D4B5C', w: '#EEF2F5', b: '#7FC3DF' },
  whitehouse: { o: '#6B6F7A', w: '#FFFFFF', c: '#D7DBE0', b: '#7FC3DF', d: '#8A5638' },
  temple: { o: '#7A7064', w: '#F4EFE6', c: '#D2C8B8' },
  dome: { o: '#7A7064', w: '#F7F3EA', c: '#D7CEBE' },
  castle: { o: '#5A2A2A', r: '#B5553F', b: '#7FC3DF', d: '#3D2A20' }
};
/* id, name, lat, lng, icon, shows from zoom, note */
var POIS = [
  ['annapolis-mall', 'Annapolis Mall', 38.9875, -76.5446, 'art:poi-mall', 10.0, 'Westfield Annapolis Mall and the AMC theatre, off Jennifer Road by the US-50 and Route 2 junction.'],
  ['planet-fitness', 'Planet Fitness', 39.1246, -76.5836, 'gym', 10.4, 'Planet Fitness on Ritchie Highway, Severna Park and Pasadena.'],
  ['dca', 'Reagan National Airport', 38.8512, -77.0402, 'airport', 8.6, 'Ronald Reagan Washington National (DCA), right on the Potomac.'],
  ['bwi', 'BWI Airport', 39.1774, -76.6684, 'airport', 8.6, 'Baltimore/Washington International Thurgood Marshall (BWI).'],
  ['iad', 'Dulles Airport', 38.9531, -77.4565, 'airport', 8.6, 'Washington Dulles International (IAD).'],
  ['whitehouse', 'The White House', 38.8977, -77.0365, 'whitehouse', 12.2, '1600 Pennsylvania Avenue.'],
  ['lincoln', 'Lincoln Memorial', 38.8893, -77.0502, 'temple', 12.2, 'At the west end of the National Mall, facing the Reflecting Pool.'],
  ['jefferson', 'Jefferson Memorial', 38.8814, -77.0365, 'dome', 12.2, 'On the Tidal Basin, ringed by cherry trees.'],
  ['smithsonian', 'Smithsonian Castle', 38.8888, -77.0260, 'castle', 12.6, 'The red sandstone castle on the Mall.']
];
var POI_DC_DETAIL = 12.2;               /* from this zoom the single DC picture gives way to the real buildings */
function poiScale(z, from) { return Math.max(2, Math.min(5, Math.round(2 + (z - from) * 0.9))); }
HOOKS.beforePins.push(function () {
  if (S.mode !== 'map') return;
  var z = S.zoom;
  POIS.forEach(function (it) {
    if (z < it[5]) return;
    var p = proj(it[2], it[3]); if (p.x < -40 || p.y < -50 || p.x > W + 40 || p.y > H + 30) return;
    var s = poiScale(z, it[5]), a = Math.min(1, (z - it[5]) / 0.5 + 0.35), b;
    ctx.save(); ctx.globalAlpha = a;
    if (/^art:/.test(it[4])) {
      /* a painted picture, kept well under the castle's size: about 40% of a home's height, growing gently with zoom */
      var ph = Math.max(34, Math.min(76, homeArtH(z) * 0.52));      /* a little bigger since it carries no name label */
      ctx.fillStyle = 'rgba(60,40,50,.2)'; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, ph * 0.5, ph * 0.1, 0, 0, 7); ctx.fill();
      b = drawArt(ctx, it[4].slice(4), p.x, p.y, ph, DPR);
    } else {
      ctx.fillStyle = 'rgba(60,40,50,.22)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, s * POI_SP[it[4]][0].length * 0.46, s * 2, 0, 0, 7); ctx.fill();
      b = drawSprite(ctx, POI_SP[it[4]], POI_PAL[it[4]], p.x, p.y, s, '#FFFFFF');
    }
    ctx.restore();
    if (!b) return;
    addHit({ x: b.x - 6, y: b.y - 6, w: b.w + 12, h: b.h + 12 }, { kind: 'poi', id: it[0] });
    if (z > it[5] + 0.6 && !/^art:/.test(it[4])) tryLabel(p.x, b.y - 3, it[1], { size: 12, force: 1 });      /* a painted picture speaks for itself */
    labelBoxes.push({ x: b.x - 3, y: b.y - 3, w: b.w + 6, h: b.h + 6 });
  });
});
function poiOpen(id) {
  var it = null; POIS.forEach(function (x) { if (x[0] === id) it = x; }); if (!it) return;
  openSheet(head(it[1], nearestTown(it[2], it[3]).name) + '<p class="note">' + esc(it[6]) + '</p>' +
    '<div class="sheet-actions"><button class="pxbtn" type="button" data-act="close">Close</button></div>');
}

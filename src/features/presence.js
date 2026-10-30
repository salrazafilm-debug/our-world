/* Presence and "together". Shows whether the other person is online, and — only
   if both of you switch on live location — where they are. When you are close
   and both tap "We're together", your avatars hold hands on the map.

   Live location travels over a private realtime channel only while the app is
   open, is never written to the database, and is off until you turn it on. */

var PR = {
  partner: null,                     /* the other person's live presence, or null when offline */
  mine: { sharing: false, lat: null, lng: null, acc: null, together: false },
  seen: {},                          /* last time each of us had the app open */
  joined: false, near: false, hands: false, dist: null, wasHands: false, watchId: null, lastPush: 0, nearSince: 0
};
try { PR.mine.sharing = localStorage.getItem('ow.share') === 'on'; } catch (e) {}

ROWHOOKS.seen = function (rows) { rows.forEach(function (r) { PR.seen[r.id] = r.at; }); paintPartner(); };

function presMeta() {
  return { who: S.who, at: Date.now(), sharing: PR.mine.sharing, lat: PR.mine.lat, lng: PR.mine.lng, acc: PR.mine.acc, together: PR.mine.together };
}
var pushTimer = null;
function pushPresence(force) {
  if (!PR.joined) return;
  var now = Date.now(), wait = 3500 - (now - PR.lastPush);
  if (!force && wait > 0) {                      /* too soon: send once, a moment later, with the latest values */
    if (!pushTimer) pushTimer = setTimeout(function () { pushTimer = null; pushPresence(true); }, wait);
    return;
  }
  PR.lastPush = now;
  OWCloud.presenceTrack(presMeta());
}
function agoText(ts) {
  if (!ts) return '';
  var m = Math.round((Date.now() - ts) / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return m + ' min ago';
  var h = Math.round(m / 60);
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  var d = Math.round(h / 24); return d + (d === 1 ? ' day ago' : ' days ago');
}

/* ---------- the little status pill ---------- */
var partnerChip = document.getElementById('partnerchip'), partnerNam = document.getElementById('partnernam');
function paintPartner() {
  if (!S.who || !window.OWCloud || !OWCloud.configured) { partnerChip.hidden = true; return; }
  var them = other(S.who), n = whoName(them).replace('Princess ', '');
  partnerChip.hidden = false;
  var on = !!PR.partner;
  partnerChip.classList.toggle('live', on);
  if (on) partnerNam.textContent = n + (PR.partner.sharing ? ' · live' : ' · online');
  else partnerNam.textContent = n + ' · offline' + (PR.seen[them] ? ' · ' + agoText(PR.seen[them]) : '');
}
partnerChip.addEventListener('click', function () {
  var them = other(S.who);
  openSheet(head(whoName(them), PR.partner ? 'online right now' : 'offline') +
    '<p class="note">' + (PR.partner
      ? (PR.partner.sharing ? 'Sharing live location — you can see them on the map.' : 'Online, but not sharing a live location.')
      : (PR.seen[them] ? 'Last had Our World open ' + agoText(PR.seen[them]) + '.' : 'Has not opened Our World yet.')) + '</p>' +
    '<div class="sheet-actions">' + (PR.partner && PR.partner.sharing && PR.partner.lat != null
      ? '<button class="pxbtn primary" type="button" data-act="goto" data-lat="' + PR.partner.lat + '" data-lng="' + PR.partner.lng + '" data-z="13">Find them on the map</button>' : '') +
    '<button class="pxbtn" type="button" data-act="share-loc">' + (PR.mine.sharing ? 'Stop sharing my location' : 'Share my live location') + '</button>' +
    '<button class="pxbtn" type="button" data-act="close">Close</button></div>');
});

/* ---------- joining, and last-seen ---------- */
function startPresence() {
  if (PR.joined || !S.who || !window.OWCloud || !OWCloud.configured || !OWCloud.presenceJoin) { paintPartner(); return; }
  PR.joined = true;
  OWCloud.presenceJoin(S.who, presMeta(), function (state) {
    var arr = state && state[other(S.who)];
    PR.partner = arr && arr.length ? arr[arr.length - 1] : null;
    recomputeTogether(); paintPartner(); draw();
  });
  function beat() {
    if (document.visibilityState === 'hidden' || !S.db) return;
    S.db.collection('seen').doc(S.who).set({ at: Date.now(), by: S.who }).catch(function (e) { console.warn('last-seen:', e); });
  }
  beat(); setInterval(beat, 60000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { beat(); pushPresence(true); } });
  setInterval(paintPartner, 30000);
  if (PR.mine.sharing) startWatch();
  paintPartner();
}

/* ---------- live location ---------- */
function startWatch() {
  if (PR.watchId != null || !navigator.geolocation) return;
  PR.watchId = navigator.geolocation.watchPosition(function (pos) {
    PR.mine.lat = pos.coords.latitude; PR.mine.lng = pos.coords.longitude; PR.mine.acc = Math.round(pos.coords.accuracy);
    recomputeTogether(); pushPresence(false); draw();
  }, function (err) {
    PR.mine.sharing = false; stopWatch();
    try { localStorage.setItem('ow.share', 'off'); } catch (e) {}
    pushPresence(true);
    toast(err && err.code === 1 ? 'Location is blocked for this site — allow it in your browser settings.' : 'Could not get your location.', '📍', 5200);
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
}
function stopWatch() { if (PR.watchId != null) navigator.geolocation.clearWatch(PR.watchId); PR.watchId = null; }
function setSharing(on) {
  PR.mine.sharing = on;
  try { localStorage.setItem('ow.share', on ? 'on' : 'off'); } catch (e) {}
  if (on) startWatch();
  else { stopWatch(); PR.mine.lat = PR.mine.lng = PR.mine.acc = null; PR.mine.together = false; }
  recomputeTogether(); pushPresence(true); paintPartner(); draw();
}
ACTIONS['share-loc'] = function () {
  setSharing(!PR.mine.sharing);
  toast(PR.mine.sharing ? 'Sharing your live location while the app is open.' : 'Live location is off.', '📍', 3200);
  if (sheet.classList.contains('open')) openMore();
};

/* ---------- are we together? ---------- */
function recomputeTogether() {
  var p = PR.partner, m = PR.mine;
  PR.near = false; PR.dist = null;
  if (p && p.sharing && m.sharing && m.lat != null && p.lat != null) {
    PR.dist = haversine(m.lat, m.lng, p.lat, p.lng) * 1000;
    PR.near = PR.dist < Math.max(150, (m.acc || 0) + (p.acc || 0));
  }
  if (!PR.near && m.together) { if (!PR.nearSince) PR.nearSince = Date.now(); if (Date.now() - PR.nearSince > 45000) { m.together = false; PR.nearSince = 0; pushPresence(true); } }
  else PR.nearSince = 0;
  PR.hands = PR.near && m.together && !!(p && p.together);
  if (PR.hands && !PR.wasHands) celebrateTogether();
  PR.wasHands = PR.hands;
  paintTogetherBtn();
}
function midpoint() { return { lat: (PR.mine.lat + PR.partner.lat) / 2, lng: (PR.mine.lng + PR.partner.lng) / 2 }; }
function celebrateTogether() {
  var mid = midpoint(), town = nearestTown(mid.lat, mid.lng).name;
  discover(mid.lat, mid.lng, false);
  flyTo(mid.lat, mid.lng, Math.max(S.zoom, 12.4));
  sparkle();
  openSheet(head('Together, right now', town) +
    '<p class="note">You are both here, holding hands on the map. 💗</p>' +
    '<div class="sheet-actions"><button class="pxbtn primary" type="button" data-act="mem-at" data-lat="' + mid.lat + '" data-lng="' + mid.lng + '">Save this moment</button>' +
    '<button class="pxbtn" type="button" data-act="close">Not now</button></div>');
}

var togetherBtn = document.getElementById('togetherBtn');
function paintTogetherBtn() {
  var them = whoName(other(S.who || 'bruce')).replace('Princess ', '');
  if (!PR.near) { togetherBtn.hidden = true; return; }
  togetherBtn.hidden = false;
  if (PR.hands) togetherBtn.textContent = '💗 Together — tap to let go';
  else if (PR.mine.together) togetherBtn.textContent = 'Waiting for ' + them + '… (tap to cancel)';
  else togetherBtn.textContent = '💗 We’re together';
}
togetherBtn.addEventListener('click', function () {
  PR.mine.together = !PR.mine.together;
  recomputeTogether(); pushPresence(true); draw();
});

/* ---------- on the map ---------- */
function avatarHeight() { return S.zoom < 5.2 ? 0 : Math.max(36, Math.min(104, 36 + (S.zoom - 6) * 13)); }
HOOKS.afterOverlays.push(function () {
  if (S.mode !== 'map') return;
  var h = avatarHeight(); if (!h) return;
  var m = PR.mine, p = PR.partner, box, pt;
  function tag(who, x, y, text) { tryLabel(x, y, text, { size: 11, border: C.pink }); }
  if (PR.hands && m.lat != null && p && p.lat != null) {
    var mid = midpoint(); pt = proj(mid.lat, mid.lng);
    box = drawHoldingHands(ctx, pt.x, pt.y, h * 1.08);
    if (box) { addHit(box, { kind: 'avatar', who: 'both' }); tag('both', pt.x, box.y - 4, 'Together'); }
    return;
  }
  if (p && p.sharing && p.lat != null) {
    pt = proj(p.lat, p.lng); box = drawAvatar(ctx, other(S.who), pt.x, pt.y, h);
    if (box) { addHit(box, { kind: 'avatar', who: other(S.who) }); tag(other(S.who), pt.x, box.y - 4, whoName(other(S.who)).replace('Princess ', '') + ' · live'); }
  }
  if (m.sharing && m.lat != null) {
    pt = proj(m.lat, m.lng); box = drawAvatar(ctx, S.who, pt.x, pt.y, h);
    if (box) { addHit(box, { kind: 'avatar', who: S.who }); tag(S.who, pt.x, box.y - 4, 'You'); }
  }
});
function openAvatarInfo(who) {
  if (who === 'both') { openSheet(head('Together', 'holding hands') + '<p class="note">You are both here. 💗</p><div class="sheet-actions"><button class="pxbtn" type="button" data-act="close">Close</button></div>'); return; }
  openSheet(head(whoName(who), who === S.who ? 'you, live' : 'live location') +
    '<div class="sheet-actions"><button class="pxbtn primary" type="button" data-act="avatars">Change outfit</button><button class="pxbtn" type="button" data-act="close">Close</button></div>');
}

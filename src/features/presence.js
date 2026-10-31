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
  jrCheckNew();
}

/* ---------- live location ---------- */
function startWatch() {
  if (PR.watchId != null || !navigator.geolocation) return;
  PR.watchId = navigator.geolocation.watchPosition(function (pos) {
    PR.mine.lat = pos.coords.latitude; PR.mine.lng = pos.coords.longitude; PR.mine.acc = Math.round(pos.coords.accuracy);
    recomputeTogether(); pushPresence(false); draw();
  }, function (err) {
    if (err && err.code === 1) {            /* refused: switch sharing off and say how to fix it */
      PR.mine.sharing = false; stopWatch();
      try { localStorage.setItem('ow.share', 'off'); } catch (e) {}
      pushPresence(true); paintPartner();
      toast('Location is blocked for this site — allow it in your browser settings.', '📍', 5200);
    }
    /* a timeout or weak signal: keep watching, the next fix will come */
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 60000 });
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
  logMoment(mid);
  playSound('heart');
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

/* ---------- on the map ----------
   Avatars are drawn at the same scale as the home icons (a touch shorter than
   the castle), keep their proportions, glide to new positions instead of
   jumping, breathe when standing still, and step aside rather than cover a
   house. When someone is online but not sharing a location, they wait beside
   their own home. */
function homeScaleNow() { var z = S.zoom; return z > 10.6 ? 4 : (z > 9 ? 3 : 2); }
function avatarHeight() { return S.zoom < 7.2 ? 0 : Math.round(homeArtH(S.zoom) * 0.8); }

/* A live avatar eases to its new place on the WORLD (not the screen), and only
   when it has really moved: panning, zooming and GPS noise never make it move. */
var AVW = {};
function worldGlide(key, lat, lng) {
  var p = AVW[key];
  if (!p) p = AVW[key] = { lat: lat, lng: lng };
  var dm = haversine(p.lat, p.lng, lat, lng) * 1000;
  if (dm < 6) return p;                                   /* GPS noise: stay put */
  if (dm > 600) { p.lat = lat; p.lng = lng; return p; }   /* a jump: don't slide across the map */
  p.lat += (lat - p.lat) * 0.12; p.lng += (lng - p.lng) * 0.12;
  return p;
}
/* nudge a figure of width w off any home sprite it would overlap */
function besideHomes(x, y, w) {
  ['bruce', 'elena'].forEach(function (k) {
    var hb = HOMEBOXES[k];
    if (!hb) return;
    var overlapX = x + w / 2 > hb.x - 2 && x - w / 2 < hb.x + hb.w + 2;
    var overlapY = y > hb.y && y - 10 < hb.y + hb.h + 6;
    if (overlapX && overlapY) x = (x >= hb.x + hb.w / 2) ? hb.x + hb.w + w / 2 + 2 : hb.x - w / 2 - 2;
  });
  return x;
}
function drawFigure(who, x, y, h) {
  return drawAvatar(ctx, who, besideHomes(x, y, avWidth(who, h)), y, h, null, { res: DPR });
}
HOOKS.afterOverlays.push(function () {
  if (S.mode !== 'map' || !S.who || !AV_ON) return;
  var h = avatarHeight(); if (!h) return;
  var m = PR.mine, p = PR.partner, box, pt, labels = S.zoom > 9;
  function tag(x, y, text) { if (labels) tryLabel(x, y, text, { size: 10 }); }

  if (PR.hands && m.lat != null && p && p.lat != null) {
    var mid = midpoint(), g = worldGlide('pair', mid.lat, mid.lng);
    pt = proj(g.lat, g.lng);
    var pw = avWidth('bruce', h) + avWidth('elena', h);
    box = drawTogetherPair(ctx, besideHomes(pt.x, pt.y, pw), pt.y, h, DPR);
    if (box) { addHit(box, { kind: 'avatar', who: 'both' }); tag(box.x + box.w / 2, box.y - 2, 'Together'); }
    return;
  }
  var them = other(S.who);
  [[them, p, p && p.sharing && p.lat != null], [S.who, m, m.sharing && m.lat != null]].forEach(function (it) {
    var who = it[0], st = it[1], live = it[2], online = who === S.who ? true : !!st;
    if (live) {
      var gw = worldGlide(who, st.lat, st.lng);
      pt = proj(gw.lat, gw.lng);
      box = drawFigure(who, pt.x, pt.y, h);
      if (box) { addHit(box, { kind: 'avatar', who: who }); tag(box.x + box.w / 2, box.y - 2, who === S.who ? 'You' : jrShortName(who) + ' \u00b7 live'); }
    } else if (online && HOMEBOXES[who] && S.zoom > 8.6) {
      /* waiting at home: standing beside the house, on its ground line, never moving */
      var hb = HOMEBOXES[who], w = avWidth(who, h);
      var x = who === 'elena' ? hb.x - w / 2 - 1 : hb.x + hb.w + w / 2 + 1;
      box = drawAvatar(ctx, who, x, hb.baseY, h, null, { res: DPR });
      if (box) addHit(box, { kind: 'avatar', who: who });
    }
  });
});
function jrShortName(k) { return whoName(k).replace('Princess ', ''); }
function openAvatarInfo(who) {
  if (who === 'both') { openSheet(head('Together', 'holding hands') + '<p class="note">You are both here. 💗</p><div class="sheet-actions"><button class="pxbtn" type="button" data-act="close">Close</button></div>'); return; }
  var live = who === S.who ? PR.mine.sharing : !!(PR.partner && PR.partner.sharing);
  openSheet(head(whoName(who), who === S.who ? (live ? 'you, live' : 'you, at home') : (live ? 'live location' : (PR.partner ? 'online, at home' : 'offline'))) +
    '<div class="sheet-actions"><button class="pxbtn primary" type="button" data-act="avatars">Change outfit</button><button class="pxbtn" type="button" data-act="close">Close</button></div>');
}

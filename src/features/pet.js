/* Your Baby: a shared puppy who lives in a cozy room.
   - The room, the puppy and the accessories come from art/pets/ (cut from the art sheets
     in art-src/pets/).
   - Love Hearts are the currency. Each of you earns them just by using Our World
     (memories, notes, journal entries, plans, walks, being together...). They are shared:
     the total is what you have both earned, minus what has been spent.
   - Spend them in the Pup Shop on hats, scarves, collars, boots, extras and treats.
   Storage (all in the shared `docs` table, so no database change is needed):
     love/<who>   { n }                    hearts earned by that person
     pet/main     { name, owned[], equipped{}, spent, treats }
     petvisit/<who> { at }                 when each of you last visited */

var PET_STARTER = 20;                        /* a welcome gift of hearts */
var PET = { open: false, name: 'Baby', owned: [], equipped: {}, spent: 0, treats: 0, mode: 'room', tab: 'mine', sel: null, woke: 0, lastPet: 0, bubble: '', visits: {} };
S.love = { bruce: 0, elena: 0 };
try {
  var pl = JSON.parse(localStorage.getItem('ow.pet') || 'null'); if (pl) { PET.name = pl.name || PET.name; PET.owned = pl.owned || []; PET.equipped = pl.equipped || {}; PET.spent = pl.spent || 0; PET.treats = pl.treats || 0; }
  var ll = JSON.parse(localStorage.getItem('ow.love') || 'null'); if (ll) S.love = { bruce: ll.bruce || 0, elena: ll.elena || 0 };
} catch (e) {}

/* ---------------- the catalogue ---------------- */
var PET_SLOTS = ['hat', 'scarf', 'collar', 'boots', 'extra'];
var PET_TABS = [['mine', 'Mine'], ['hat', 'Hats'], ['scarf', 'Scarves'], ['collar', 'Collars'], ['boots', 'Boots'], ['extra', 'Extras'], ['treat', 'Treats']];
function petItems(slot, list) { return list.map(function (r) { return { id: slot + '-' + r[0], slot: slot, file: (slot === 'extra' ? 'extra-' : slot + '-') + r[0], name: r[1], price: r[2] }; }); }
var PET_CATALOG = [].concat(
  petItems('hat', [['cap-red', 'Red cap', 12], ['cap-black', 'Camera cap', 12], ['beanie-cream', 'Cream beanie', 15], ['beanie-grey', 'Grey beanie', 15], ['straw', 'Straw hat', 18],
    ['aviator', 'Aviator cap', 22], ['hardhat', 'Hard hat', 18], ['cowboy', 'Cowboy hat', 25], ['crown', 'Royal crown', 40], ['wizard', 'Wizard hat', 30]]),
  petItems('scarf', [['bandana-plaid', 'Plaid bandana', 8], ['scarf-blue', 'Blue scarf', 12], ['scarf-cream', 'Cream scarf', 12], ['scarf-red', 'Red scarf', 12], ['scarf-green', 'Green scarf', 12],
    ['bandana-moon', 'Moon bandana', 20], ['scarf-purple', 'Purple scarf', 14], ['scarf-yellow', 'Striped scarf', 14], ['scarf-checker', 'Checker scarf', 14], ['scarf-snow', 'Snowflake scarf', 18]]),
  petItems('collar', [['red-paw', 'Paw collar', 8], ['blue-bone', 'Bone collar', 8], ['brown-paw', 'Brown collar', 8], ['black-bone', 'Black collar', 8], ['green-clover', 'Lucky collar', 12],
    ['purple-star', 'Star collar', 12], ['gold-bell', 'Bell collar', 12], ['blue-camera', 'Camera collar', 14], ['red-heart', 'Heart collar', 20], ['spike', 'Spiky collar', 18]]),
  petItems('boots', [['tan', 'Hiking boots', 15], ['black', 'Black boots', 15], ['red-sneaker', 'Red sneakers', 20], ['white', 'White boots', 18], ['purple-paw', 'Paw boots', 22],
    ['yellow-rain', 'Rain boots', 20], ['black-buckle', 'Buckle boots', 20], ['fur-brown', 'Cozy boots', 25], ['blue-snow', 'Snow boots', 25], ['red-fur', 'Winter boots', 25]]),
  petItems('extra', [['sunglasses', 'Sunglasses', 18], ['goggles', 'Goggles', 18], ['headphones', 'Headphones', 25], ['camera', 'Camera', 22], ['backpack', 'Backpack', 25],
    ['cape', 'Hero cape', 30], ['wings', 'Angel wings', 40], ['bat-wings', 'Bat wings', 35], ['halo', 'Halo', 45]])
);
var PET_TREATS = [{ id: 'bone', name: 'Bone', icon: '🦴', price: 3 }, { id: 'cookie', name: 'Heart cookie', icon: '🍪', price: 5 }, { id: 'ball', name: 'Squeaky ball', icon: '🎾', price: 2 }];
function petItem(id) { for (var i = 0; i < PET_CATALOG.length; i++) if (PET_CATALOG[i].id === id) return PET_CATALOG[i]; return null; }

/* where each item sits on the puppy (the puppy sprite is 195 x 236) */
var PET_DOG_W = 195, PET_DOG_H = 236;
var PET_ANCHOR = {
  hat: { cx: 112, y: 30, sc: 0.9, a: 'b', z: 6 }, scarf: { cx: 120, y: 100, sc: 0.72, a: 't', z: 4 }, collar: { cx: 120, y: 103, sc: 0.5, a: 't', z: 3 }, boots: { cx: 130, y: 238, sc: 0.7, a: 'b', z: 5 },
  'extra-sunglasses': { cx: 118, y: 58, sc: 0.72, a: 'c', z: 7 }, 'extra-goggles': { cx: 116, y: 38, sc: 0.72, a: 'c', z: 7 }, 'extra-headphones': { cx: 112, y: 55, sc: 1.35, a: 'c', z: 7 },
  'extra-halo': { cx: 112, y: -2, sc: 0.65, a: 'c', z: 8 }, 'extra-camera': { cx: 150, y: 170, sc: 0.45, a: 'c', z: 6 },
  'extra-backpack': { cx: 112, y: 150, sc: 1.1, a: 'c', z: 0 }, 'extra-cape': { cx: 112, y: 108, sc: 1.4, a: 't', z: 0 }, 'extra-wings': { cx: 112, y: 110, sc: 1.5, a: 'c', z: 0 }, 'extra-bat-wings': { cx: 112, y: 110, sc: 1.4, a: 'c', z: 0 }
};
var PET_SIZE = {};                           /* natural size of each accessory, learned as images load */

function petLayer(item, s) {
  var an = PET_ANCHOR[item.slot === 'extra' ? item.file : item.slot], nat = PET_SIZE[item.file];
  var url = 'art/pets/acc/' + item.file + '.png';
  var w = (nat ? nat[0] : 130) * an.sc * s, h = (nat ? nat[1] : 100) * an.sc * s;
  var left = an.cx * s - w / 2, top = an.a === 'b' ? an.y * s - h : (an.a === 'c' ? an.y * s - h / 2 : an.y * s);
  return '<img class="pf-l" alt="" draggable="false" src="' + url + '" data-file="' + item.file + '" style="left:' + left.toFixed(1) + 'px;top:' + top.toFixed(1) + 'px;width:' + w.toFixed(1) + 'px;z-index:' + an.z + '">';
}
/* the puppy plus what it is wearing; `h` is its height in css px, `eq` the outfit to show */
function petFigure(h, eq, sleeping) {
  var s = h / PET_DOG_H, w = PET_DOG_W * s;
  if (sleeping) return '<div class="pf" style="width:' + (163 * s).toFixed(0) + 'px;height:' + (71 * s).toFixed(0) + 'px"><img class="pf-dog" alt="" draggable="false" src="art/pets/dog-sleep.png" style="width:100%;z-index:1"></div>';
  var html = '<div class="pf" style="width:' + w.toFixed(0) + 'px;height:' + h.toFixed(0) + 'px">';
  var layers = [];
  PET_SLOTS.forEach(function (sl) { var it = petItem(eq[sl]); if (it) layers.push(petLayer(it, s)); });
  html += layers.join('') + '<img class="pf-dog" alt="" draggable="false" src="art/pets/dog-front.png" style="width:100%;height:100%;z-index:1"></div>';
  return html;
}
/* a sprite's natural size is needed to place it: read each once, then lay out again (once) */
var petLearnT = null;
function petLearnSizes(root) {
  var need = [].filter.call(root.querySelectorAll('img.pf-l[data-file]'), function (im) { return !PET_SIZE[im.dataset.file]; });
  if (!need.length) return;
  var left = need.length;
  need.forEach(function (im) {
    var t = new Image();
    function done() { if (--left === 0) { clearTimeout(petLearnT); petLearnT = setTimeout(function () { if (PET.open) petRender(); }, 30); } }
    t.onload = function () { PET_SIZE[im.dataset.file] = [t.naturalWidth, t.naturalHeight]; done(); };
    t.onerror = function () { PET_SIZE[im.dataset.file] = [130, 100]; done(); };
    t.src = im.src;
  });
}

/* ---------------- hearts ---------------- */
function petHearts() { return Math.max(0, (S.love.bruce || 0) + (S.love.elena || 0) + PET_STARTER - (PET.spent || 0)); }
function petPersistLocal() {
  try { localStorage.setItem('ow.pet', JSON.stringify({ name: PET.name, owned: PET.owned, equipped: PET.equipped, spent: PET.spent, treats: PET.treats })); localStorage.setItem('ow.love', JSON.stringify(S.love)); } catch (e) {}
}
function petSavePet() {
  petPersistLocal();
  if (S.db) S.db.collection('pet').doc('main').set({ name: PET.name, owned: PET.owned, equipped: PET.equipped, spent: PET.spent, treats: PET.treats, by: S.who, at: Date.now() }).catch(function () {});
}
window.earnHearts = function (n, why) {
  if (!S.who || !n) return;
  S.love[S.who] = (S.love[S.who] || 0) + n;
  petPersistLocal();
  if (S.db) S.db.collection('love').doc(S.who).set({ n: S.love[S.who], at: Date.now(), why: why || '' }).catch(function () {});
  petPill(); petBump();
  toast('+' + n + ' Love Heart' + (n > 1 ? 's' : ''), '💗', 2200);
};
function petDaily() {
  if (!S.who) return;
  var today = todayISO(), key = 'ow.hday.' + S.who, last = '';
  try { last = localStorage.getItem(key) || ''; } catch (e) {}
  if (last === today) return;
  try { localStorage.setItem(key, today); } catch (e) {}
  setTimeout(function () { earnHearts(1, 'daily'); }, 2500);
}
ROWHOOKS.love = function (rows) {
  rows.forEach(function (r) { if (r.id === 'bruce' || r.id === 'elena') S.love[r.id] = Math.max(S.love[r.id] || 0, Number(r.n) || 0); });
  petPersistLocal(); petPill();
};
ROWHOOKS.pet = function (rows) {
  rows.forEach(function (r) {
    if (r.id !== 'main') return;
    PET.name = r.name || PET.name; PET.owned = r.owned || []; PET.equipped = r.equipped || {}; PET.spent = r.spent || 0; PET.treats = r.treats || 0;
  });
  petPersistLocal(); if (PET.open) petRender();
};
ROWHOOKS.petvisit = function (rows) { rows.forEach(function (r) { PET.visits[r.id] = r.at; }); };

/* ---------------- the scene ---------------- */
var petEl = null, ROOM_W = 1280, ROOM_H = 720;
/* two versions of the room: wide for computers, tall for phones (no dog painted in either) */
var ROOMS = {
  wide: { src: 'art/pets/room.jpg', w: 1280, h: 720, cx: 0.49, cy: 0.56, floor: 0.775, x0: 0.37, x1: 0.62, dogH: 0.24 },
  tall: { src: 'art/pets/room-mobile.jpg', w: 900, h: 1198, cx: 0.5, cy: 0.62, floor: 0.735, x0: 0.25, x1: 0.75, dogH: 0.2 }
};
function roomNow() { return petEl && petEl.clientWidth / Math.max(1, petEl.clientHeight) < 0.9 ? ROOMS.tall : ROOMS.wide; }
function petEnsure() {
  if (petEl) return petEl;
  var st = document.createElement('style');
  st.textContent = [
    '#petScene{position:fixed;inset:0;z-index:32;display:none;background:#2a1b22;color:#4a2a2f;font-family:var(--fbody);overflow:hidden;touch-action:manipulation;-webkit-user-select:none;user-select:none}',
    '#petScene.on{display:block;animation:psIn .25s ease-out}@keyframes psIn{from{opacity:0}}',
    '#petScene .ps-room{position:absolute;inset:0;overflow:hidden}',
    '#petScene .ps-bg{position:absolute;max-width:none;image-rendering:auto}',
    '#petScene .ps-dog{position:absolute;transform:translateX(-50%);cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '#petScene .ps-dog .pf{position:relative;transform-origin:50% 100%;animation:psBreathe 3.4s ease-in-out infinite}',
    '#petScene .ps-dog.happy .pf{animation:psHop .9s cubic-bezier(.3,.7,.4,1)}',
    '@keyframes psBreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.012,.988)}}',
    '@keyframes psHop{0%{transform:translateY(0)}25%{transform:translateY(-34px) rotate(-3deg)}50%{transform:translateY(0)}70%{transform:translateY(-14px) rotate(2deg)}100%{transform:translateY(0)}}',
    '.pf{position:relative}.pf-dog{position:absolute;left:0;top:0;pointer-events:none;filter:drop-shadow(0 3px 0 rgba(60,30,30,.18))}.pf-l{position:absolute;pointer-events:none;height:auto}',
    '.ps-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 12px 10px;z-index:5}',
    '.ps-btn{width:46px;height:46px;border:3px solid #7a4a3a;background:linear-gradient(#fff1d9,#f6dcb4);color:#7a3d2e;font-size:24px;line-height:1;padding:0;box-shadow:0 4px 0 #a9744f;display:grid;place-items:center}',
    '.ps-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #a9744f}',
    '.ps-name{flex:1;min-width:0;text-align:center;font-family:var(--fdisp);font-size:19px;color:#fff3e0;text-shadow:0 2px 0 rgba(90,40,30,.6),0 0 14px rgba(0,0,0,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:none;border:none;padding:0}',
    '.ps-hearts{display:flex;align-items:center;gap:7px;height:46px;padding:0 13px;border:3px solid #7a4a3a;background:linear-gradient(#fff1d9,#f6dcb4);box-shadow:0 4px 0 #a9744f;font-family:var(--fdisp);font-size:18px;color:#8a2f3f}',
    '.ps-hearts img{width:22px;height:22px;image-rendering:pixelated}.ps-hearts.bump{animation:psBump .5s}@keyframes psBump{40%{transform:scale(1.15)}}',
    '.ps-say{position:absolute;left:50%;transform:translateX(-50%);max-width:78%;background:#fffaf0;border:3px solid #7a4a3a;padding:8px 13px;font-weight:700;font-size:14px;line-height:1.35;text-align:center;box-shadow:0 4px 0 rgba(90,40,30,.25);z-index:4;opacity:0;transition:opacity .25s;pointer-events:none}',
    '.ps-say.on{opacity:1}.ps-say:after{content:"";position:absolute;left:50%;bottom:-11px;margin-left:-8px;border:8px solid transparent;border-top-color:#7a4a3a;border-bottom:0}',
    '.ps-bar{position:absolute;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(4,1fr);gap:9px;padding:12px 12px calc(14px + env(safe-area-inset-bottom));z-index:5;background:linear-gradient(0deg,rgba(60,28,30,.55),rgba(60,28,30,0))}',
    '.ps-act{display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 4px 8px;border:3px solid #7a4a3a;background:linear-gradient(#fff1d9,#f6dcb4);box-shadow:0 4px 0 #a9744f;color:#7a3d2e;font-weight:700;font-size:12.5px}',
    '.ps-act .ic{font-size:25px;line-height:1}.ps-act small{font-size:10.5px;color:#a0604a;font-weight:700}.ps-act:active{transform:translateY(3px);box-shadow:0 1px 0 #a9744f}',
    '.ps-fly{position:absolute;z-index:6;pointer-events:none;font-size:30px;animation:psFly 1s ease-in forwards}@keyframes psFly{to{transform:translate(var(--dx),var(--dy)) scale(.6);opacity:0}}',
    '.ps-heart{position:absolute;z-index:6;pointer-events:none;width:26px;height:26px;image-rendering:pixelated;animation:psRise 1.5s ease-out forwards}@keyframes psRise{0%{opacity:0;transform:translateY(0) scale(.6)}15%{opacity:1}100%{opacity:0;transform:translateY(-90px) scale(1.2)}}',
    /* the shop */
    '#petScene .shop{position:absolute;inset:0;display:flex;flex-direction:column;background:linear-gradient(180deg,#3b2420,#2a1b22);z-index:7}',
    '.shop-hd{display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 12px 8px;background:linear-gradient(#5b2f2a,#3b2420)}',
    '.shop-sign{flex:1;text-align:center;font-family:var(--fdisp);font-size:22px;color:#ffe9c4;text-shadow:0 2px 0 #3b1a14;position:relative;padding:5px 0 6px;background:linear-gradient(#a8473c,#8b362f);border:3px solid #5b2f2a;box-shadow:0 4px 0 #3b1a14;letter-spacing:.5px}',
    '.shop-sign small{display:block;font-family:var(--fbody);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#ffd9a1;margin-top:1px}',
    '.shop-stage{display:flex;align-items:flex-end;justify-content:center;gap:14px;padding:46px 14px 0;min-height:230px;position:relative}',
    '.shop-ped{position:relative;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px}',
    '.shop-ped:after{content:"";position:absolute;left:-14px;right:-14px;bottom:-2px;height:34px;background:linear-gradient(#e9c58f,#b98a5a);border:3px solid #6b4330;border-radius:50%/60%;z-index:0;box-shadow:0 6px 0 #4a2c20}',
    '.shop-ped .pf{z-index:1;margin-bottom:12px}',
    '.shop-card{align-self:center;max-width:150px;background:#fff6e4;border:3px solid #7a4a3a;padding:8px 10px;box-shadow:0 4px 0 rgba(0,0,0,.25);font-size:12.5px;line-height:1.35}',
    '.shop-card b{display:block;font-family:var(--fdisp);font-size:15px;color:#8a2f3f}',
    '.shop-tabs{display:flex;gap:6px;overflow-x:auto;padding:10px 12px 8px;scrollbar-width:none;background:#3b2420}.shop-tabs::-webkit-scrollbar{display:none}',
    '.shop-tab{flex:none;padding:7px 13px;border:3px solid #7a4a3a;background:#f6dcb4;color:#7a3d2e;font-weight:700;font-size:13px;border-radius:0}',
    '.shop-tab.on{background:#e9a23b;color:#4a1f10;border-color:#8a4a1c;box-shadow:0 3px 0 #8a4a1c}',
    '.shop-grid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:6px 12px 12px;align-content:start;background:linear-gradient(180deg,#7b4a36,#5b3427);border-top:4px solid #4a2c20}',
    '@media (min-width:600px){.shop-grid{grid-template-columns:repeat(6,1fr)}}',
    '.it{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;aspect-ratio:1;background:#fbeed2;border:3px solid #c79a6b;padding:4px;min-width:0}',
    '.it img{max-width:78%;max-height:56%;object-fit:contain}.it .ic{font-size:30px}.it .pr{font-size:11px;font-weight:700;color:#8a2f3f;display:flex;align-items:center;gap:3px}.it .pr img{width:12px;height:12px;image-rendering:pixelated}',
    '.it.sel{border-color:#d4457a;box-shadow:0 0 0 2px #fff,0 0 0 5px #d4457a}.it.worn{background:#ffe3ee}.it .tick{position:absolute;top:2px;right:4px;font-size:12px;color:#2e7d5b}',
    '.shop-bar{display:flex;align-items:center;gap:10px;padding:10px 12px calc(12px + env(safe-area-inset-bottom));background:#3b2420;border-top:4px solid #4a2c20;color:#ffe9c4}',
    '.shop-bar .nm{flex:1;min-width:0;font-weight:700;font-size:14px;line-height:1.25}.shop-bar .nm small{display:block;color:#ffd9a1;font-weight:600}',
    '.shop-go{padding:11px 18px;border:3px solid #8a4a1c;background:#e9a23b;color:#4a1f10;font-family:var(--fdisp);font-size:16px;box-shadow:0 4px 0 #8a4a1c}',
    '.shop-go[disabled]{opacity:.45;box-shadow:none}.shop-empty{grid-column:1/-1;text-align:center;color:#ffe9c4;padding:26px 10px;line-height:1.5}'
  ].join('');
  document.head.appendChild(st);
  petEl = document.createElement('section'); petEl.id = 'petScene'; petEl.setAttribute('aria-label', 'Your Baby'); document.body.appendChild(petEl);
  petEl.addEventListener('click', petClick);
  window.addEventListener('resize', function () { if (PET.open && PET.mode === 'room') petLayout(); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && PET.open) { if (PET.mode === 'shop') { PET.mode = 'room'; petRender(); } else petClose(); } });
  return petEl;
}
function petSleeping() {
  if (Date.now() - PET.woke < 10 * 60000) return false;
  var h = new Date().getHours();
  return h >= 22 || h < 6;
}
function petHeartPill() { return '<div class="ps-hearts" id="psHearts"><img src="art/heart.png" alt="">' + petHearts() + '</div>'; }
function petPill() { var p = document.getElementById('psHearts'); if (p) p.innerHTML = '<img src="art/heart.png" alt="">' + petHearts(); }
function petBump() { var p = document.getElementById('psHearts'); if (p) { p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); } }

function petOpen() {
  petEnsure(); closeSheet();
  PET.open = true; PET.mode = 'room'; PET.sel = null;
  if (S.who) {
    PET.visits[S.who] = Date.now();
    if (S.db) S.db.collection('petvisit').doc(S.who).set({ at: Date.now(), by: S.who }).catch(function () {});
  }
  if (location.hash !== '#baby') { history.pushState(null, '', '#baby'); PET.pushed = true; }
  petEl.classList.add('on'); petRender();            /* show first: the layout needs the real size */
  var other_ = other(S.who), t = PET.visits[other_];
  var recent = t && Date.now() - t < 6 * 3600000 ? jrShortName(other_) + ' was just here. ' : '';
  setTimeout(function () { petSay(petSleeping() ? 'Zzz…' : (recent ? recent + 'Hi, ' + jrShortName(S.who) + '!' : 'You’re here! 💗'), 3200); }, 450);
}
function petClose() {
  PET.open = false; if (petEl) petEl.classList.remove('on');
  if (location.hash === '#baby') {
    if (PET.pushed) { PET.pushed = false; history.back(); }            /* undo our own history step */
    else history.replaceState(null, '', location.pathname + location.search);
  }
}
/* Your Baby has its own page: our-world/#baby opens straight into the room */
function petFromHash() { if (location.hash === '#baby' && !PET.open && S.who) petOpen(); else if (location.hash !== '#baby' && PET.open) { PET.pushed = false; petClose(); } }
window.addEventListener('hashchange', petFromHash);
(function waitForWho(n) { if (S.who) return petFromHash(); if (n < 80) setTimeout(function () { waitForWho(n + 1); }, 250); })(0);
ACTIONS['pet-open'] = petOpen;

function petRender() {
  petEnsure();
  if (PET.mode === 'shop') return petRenderShop();
  var sleeping = petSleeping();
  petEl.innerHTML =
    '<div class="ps-room"><img class="ps-bg" id="psBg" alt="" src="' + roomNow().src + '"><div class="ps-dog" id="psDog"></div></div>' +
    '<div class="ps-top"><button class="ps-btn" type="button" data-pet="back" aria-label="Back to the map">‹</button><button class="ps-name" type="button" data-pet="rename">' + esc(PET.name) + '</button>' + petHeartPill() + '</div>' +
    '<div class="ps-say" id="psSay"></div>' +
    '<div class="ps-bar">' +
      '<button class="ps-act" type="button" data-pet="cuddle"><span class="ic">🤗</span>Cuddle</button>' +
      '<button class="ps-act" type="button" data-pet="treat"><span class="ic">🦴</span>Treat<small>3 hearts</small></button>' +
      '<button class="ps-act" type="button" data-pet="play"><span class="ic">🎾</span>Play</button>' +
      '<button class="ps-act" type="button" data-pet="shop"><span class="ic">🛍️</span>Shop<small>& dress up</small></button>' +
    '</div>';
  petLayout(sleeping);
}
/* ---------------- he lives in the room ----------------
   A small brain walks him around the bed, sits, wags his tail, lies down for a
   nap and sleeps at night. Sitting facing you is when you see his outfit. */
var PG = null;                                     /* room geometry on screen */
var PB = { x: 0.49, dir: 1, act: 'sit', until: 0, tx: 0.49, f: 0, raf: 0, last: 0, shown: '' };
var PF = {};                                       /* frame images, by name */
['walk1', 'walk2', 'walk3', 'walk4', 'wag1', 'wag2', 'wag3', 'bow', 'sitdown', 'lay', 'sleep', 'jump1', 'jump2', 'jump3', 'jump4', 'idle1'].forEach(function (n) {
  var im = new Image(); im.src = 'art/pets/dog-' + n + '.png'; PF[n] = im;
});
var X_MIN = 0.37, X_MAX = 0.62;
function petLayout(sleeping) {
  var bg = document.getElementById('psBg'), dog = document.getElementById('psDog');
  if (!bg || !dog) return;
  var vw = petEl.clientWidth, vh = petEl.clientHeight;
  var R = roomNow(); if (bg.getAttribute('src') !== R.src) bg.src = R.src;
  var sc = Math.max(vw / R.w, vh / R.h), dw = R.w * sc, dh = R.h * sc;
  var ox = Math.min(0, Math.max(vw - dw, vw / 2 - R.cx * dw)), oy = Math.min(0, Math.max(vh - dh, vh / 2 - R.cy * dh));
  bg.style.width = dw + 'px'; bg.style.height = dh + 'px'; bg.style.left = ox + 'px'; bg.style.top = oy + 'px';
  var h = Math.max(110, Math.min(dh * R.dogH, vh * 0.27, vw * 0.62));
  PG = { ox: ox, oy: oy, dw: dw, dh: dh, h: h, baseY: oy + dh * R.floor, vw: vw };
  /* on a narrow screen he may only roam the part of the bed you can see */
  var vis0 = (-ox + vw * 0.12) / dw, vis1 = (-ox + vw * 0.88) / dw;
  X_MIN = Math.max(R.x0, vis0); X_MAX = Math.min(R.x1, vis1);
  PB.x = Math.max(X_MIN, Math.min(X_MAX, PB.x));
  PB.shown = '';
  if (petSleeping()) PB.act = 'sleep';
  else if (PB.act === 'sleep') { PB.act = 'sit'; PB.until = 0; }
  petPose();
  var say = document.getElementById('psSay'); if (say) say.style.top = Math.max(70, PG.baseY - h - 62) + 'px';
  if (!PB.raf) { PB.last = performance.now(); PB.raf = requestAnimationFrame(petTick); }
}
/* the small sheet frames are drawn at the same scale as the big front sprite */
function frameScale() { return PG.h / 236 * 2.05; }
function petPose() {
  var dog = document.getElementById('psDog'); if (!dog || !PG) return;
  var x = PG.ox + PG.dw * PB.x, key, html;
  if (PB.act === 'sit') {
    key = 'sit|' + JSON.stringify(PET.equipped) + '|' + PG.h;
    if (PB.shown !== key) { dog.innerHTML = petFigure(PG.h, PET.equipped, false); petLearnSizes(dog); PB.shown = key; }
    dog.style.left = x + 'px'; dog.style.top = (PG.baseY - PG.h) + 'px';
    return;
  }
  var name = PB.frame || 'idle1', im = PF[name], s = frameScale();
  var w = (im.naturalWidth || 100) * s, hh = (im.naturalHeight || 100) * s;
  key = 'f|' + name + '|' + PB.dir + '|' + Math.round(hh);
  if (PB.shown !== key) {
    dog.innerHTML = '<div class="pf pf-frame" style="width:' + w.toFixed(0) + 'px;height:' + hh.toFixed(0) + 'px"><img alt="" draggable="false" src="' + im.src + '" style="width:100%;height:100%;' + (PB.dir < 0 ? 'transform:scaleX(-1)' : '') + '"></div>';
    PB.shown = key;
  }
  dog.style.left = x + 'px'; dog.style.top = (PG.baseY - hh + (PB.act === 'sleep' || PB.act === 'lay' ? hh * 0.08 : 0)) + 'px';
}
function petNext(now) {
  if (petSleeping()) { PB.act = 'sleep'; PB.frame = 'sleep'; PB.until = now + 60000; return; }
  var r = Math.random();
  if (PB.act !== 'sit') { PB.act = 'sit'; PB.until = now + 4000 + Math.random() * 5000; return; }
  if (r < 0.55) { PB.act = 'walk'; PB.tx = X_MIN + Math.random() * (X_MAX - X_MIN); PB.dir = PB.tx > PB.x ? 1 : -1; PB.until = now + 20000; }
  else if (r < 0.78) { PB.act = 'wag'; PB.until = now + 2600; }
  else { PB.act = 'lay'; PB.t0 = now; PB.until = now + 7000 + Math.random() * 5000; }
}
function petTick(now) {
  if (!PET.open || PET.mode !== 'room') { PB.raf = 0; return; }
  PB.raf = requestAnimationFrame(petTick);
  var dt = Math.min(0.1, (now - PB.last) / 1000); PB.last = now;
  if (reduceMotion && PB.act !== 'sleep') { if (PB.act !== 'sit') { PB.act = 'sit'; petPose(); } return; }
  if (now > PB.until) petNext(now);
  var f = Math.floor(now / 140);
  if (PB.act === 'walk') {
    var step = 0.045 * dt * PB.dir; PB.x += step;
    if ((PB.dir > 0 && PB.x >= PB.tx) || (PB.dir < 0 && PB.x <= PB.tx)) { PB.x = PB.tx; PB.until = 0; }
    PB.frame = 'walk' + (f % 4 + 1);
  } else if (PB.act === 'wag') PB.frame = 'wag' + ([1, 2, 3, 2][Math.floor(now / 180) % 4]);
  else if (PB.act === 'lay') PB.frame = now - PB.t0 < 700 ? 'sitdown' : 'lay';
  else if (PB.act === 'sleep') PB.frame = 'sleep';
  else if (PB.act === 'play') {
    var t = now - PB.t0;
    PB.frame = t < 800 ? 'bow' : ('jump' + Math.min(4, Math.floor((t - 800) / 160) + 1));
    if (t > 1600) PB.until = 0;
  }
  petPose();
}
function petSitFront() { PB.act = 'sit'; PB.until = performance.now() + 5000; petPose(); }

var petSayT = null;
function petSay(text, ms) {
  var el = document.getElementById('psSay'); if (!el) return;
  el.textContent = text; el.classList.add('on');
  clearTimeout(petSayT); petSayT = setTimeout(function () { el.classList.remove('on'); }, ms || 2600);
}
function petHearts_fx() {
  var room = petEl.querySelector('.ps-room'), dog = document.getElementById('psDog'); if (!room || !dog) return;
  var r = dog.getBoundingClientRect(), pr = petEl.getBoundingClientRect();
  for (var i = 0; i < 5; i++) {
    (function (i) {
      setTimeout(function () {
        var h = document.createElement('img'); h.className = 'ps-heart'; h.src = 'art/heart.png'; h.alt = '';
        h.style.left = (r.left - pr.left + r.width / 2 - 13 + (Math.random() - 0.5) * r.width * 0.7) + 'px';
        h.style.top = (r.top - pr.top + r.height * 0.15 + Math.random() * 30) + 'px';
        petEl.appendChild(h); setTimeout(function () { h.remove(); }, 1600);
      }, i * 110);
    })(i);
  }
}
function petHop() {
  petSitFront();
  var d = document.getElementById('psDog'); if (!d) return;
  d.classList.remove('happy'); void d.offsetWidth; d.classList.add('happy'); petHearts_fx();
}
var PET_LINES = ['Woof! 💗', 'I love you both!', 'Best day ever!', 'Pet me again!', 'Where are we going next?', '*tail wags*', 'Did you bring treats?', 'I missed you!', 'You two are my favourite people.'];

function petClick(e) {
  var b = e.target.closest('[data-pet],[data-shop]');
  if (!b) { if (e.target.closest('#psDog') && PET.mode === 'room') petAct('cuddle'); return; }
  if (b.dataset.shop) return shopClick(b);
  petAct(b.dataset.pet);
}
function petAct(a) {
  if (a === 'back') return petClose();
  if (a === 'shop') { PET.mode = 'shop'; PET.tab = PET.owned.length ? 'mine' : 'hat'; PET.sel = null; return petRender(); }
  if (a === 'rename') {
    var nm = window.prompt('What is our baby called?', PET.name);
    if (nm && nm.trim()) { PET.name = nm.trim().slice(0, 18); petSavePet(); petRender(); }
    return;
  }
  if (petSleeping()) { PET.woke = Date.now(); PB.act = 'sit'; PB.until = 0; petRender(); petSay('*yawn* Oh! Hi! 💗', 2600); setTimeout(petHop, 350); return; }
  if (a === 'cuddle') {
    petHop(); petSay(PET_LINES[Math.floor(Math.random() * PET_LINES.length)], 2600);
    if (typeof playSound === 'function') playSound('heart');
    if (Date.now() - PET.lastPet > 15 * 60000) { PET.lastPet = Date.now(); setTimeout(function () { earnHearts(1, 'cuddle'); }, 500); }
  } else if (a === 'play') {
    PB.act = 'play'; PB.t0 = performance.now(); PB.until = PB.t0 + 5000; petHearts_fx(); petSay('Again! Again! 🎾', 2400);
  } else if (a === 'treat') {
    petGiveTreat(PET_TREATS[0]);
  }
}
function petGiveTreat(t) {
  if (petHearts() < t.price) { toast('Not enough Love Hearts yet — earn some by adding memories, notes and more.', '💗', 3600); return false; }
  PET.spent += t.price; PET.treats = (PET.treats || 0) + 1; petSavePet(); petPill();
  var dog = document.getElementById('psDog');
  if (dog && PET.mode === 'room') {
    var f = document.createElement('div'); f.className = 'ps-fly'; f.textContent = t.icon;
    var r = dog.getBoundingClientRect(), pr = petEl.getBoundingClientRect();
    f.style.left = (r.left - pr.left + r.width * 0.2) + 'px'; f.style.top = (pr.height - 130) + 'px';
    f.style.setProperty('--dx', (r.width * 0.3) + 'px'); f.style.setProperty('--dy', -(pr.height - 130 - (r.top - pr.top) - r.height * 0.4) + 'px');
    petEl.appendChild(f); setTimeout(function () { f.remove(); }, 1000);
    setTimeout(function () { petHop(); petSay('Yum! Thank you! 💗', 2800); }, 800);
  }
  if (typeof playSound === 'function') playSound('save');
  return true;
}

/* ---------------- the Pup Shop ---------------- */
function shopOutfit() {
  var eq = {}; PET_SLOTS.forEach(function (s) { eq[s] = PET.equipped[s]; });
  if (PET.sel) { var it = petItem(PET.sel); if (it) eq[it.slot] = it.id; }      /* previewing an item: show it on the puppy */
  return eq;
}
function shopCards() {
  var tab = PET.tab, html = '', list;
  if (tab === 'treat') {
    return PET_TREATS.map(function (t) { return '<button class="it' + (PET.sel === 'treat:' + t.id ? ' sel' : '') + '" type="button" data-shop="pick" data-id="treat:' + t.id + '"><span class="ic">' + t.icon + '</span><span class="pr"><img src="art/heart.png" alt="">' + t.price + '</span></button>'; }).join('');
  }
  list = tab === 'mine' ? PET_CATALOG.filter(function (i) { return PET.owned.indexOf(i.id) >= 0; }) : PET_CATALOG.filter(function (i) { return i.slot === tab; });
  if (!list.length) return '<div class="shop-empty">' + (tab === 'mine' ? 'Nothing in the wardrobe yet.<br>Open a shelf above and treat ' + esc(PET.name) + ' to something.' : 'Nothing here.') + '</div>';
  list.forEach(function (i) {
    var own = PET.owned.indexOf(i.id) >= 0, worn = PET.equipped[i.slot] === i.id;
    html += '<button class="it' + (PET.sel === i.id ? ' sel' : '') + (worn ? ' worn' : '') + '" type="button" data-shop="pick" data-id="' + i.id + '"><img alt="" src="art/pets/acc/' + i.file + '.png">' +
      (own ? '<span class="tick">' + (worn ? '✔' : '●') + '</span><span class="pr">' + (worn ? 'Wearing' : 'Owned') + '</span>' : '<span class="pr"><img src="art/heart.png" alt="">' + i.price + '</span>') + '</button>';
  });
  return html;
}
function shopBarInfo() {
  var id = PET.sel, h = petHearts();
  if (!id) return { name: 'Pick something', sub: 'Tap an item to try it on ' + esc(PET.name), btn: '', dis: true };
  if (id.indexOf('treat:') === 0) {
    var t = PET_TREATS.filter(function (x) { return 'treat:' + x.id === id; })[0];
    return { name: t.name, sub: 'A treat for ' + esc(PET.name), btn: 'Give ♥' + t.price, act: 'treat', dis: h < t.price };
  }
  var it = petItem(id), own = PET.owned.indexOf(id) >= 0, worn = PET.equipped[it.slot] === id;
  if (!own) return { name: it.name, sub: 'Costs ♥' + it.price + (h < it.price ? ' · you have ♥' + h : ''), btn: 'Buy ♥' + it.price, act: 'buy', dis: h < it.price };
  return { name: it.name, sub: worn ? 'Wearing it now' : 'In the wardrobe', btn: worn ? 'Take off' : 'Wear', act: worn ? 'off' : 'on', dis: false };
}
function petRenderShop() {
  var info = shopBarInfo(), eq = shopOutfit();
  petEl.innerHTML =
    '<div class="shop">' +
      '<div class="shop-hd"><button class="ps-btn" type="button" data-shop="back" aria-label="Back to the room">‹</button><div class="shop-sign">\ud83d\udc3e Pup Shop \ud83d\udc3e<small>Accessories · Treats · Love</small></div>' + petHeartPill() + '</div>' +
      '<div class="shop-stage"><div class="shop-ped">' + petFigure(160, eq) + '</div>' +
        '<div class="shop-card"><b>' + esc(PET.name) + '</b>' + (PET.owned.length ? PET.owned.length + ' item' + (PET.owned.length > 1 ? 's' : '') + ' owned' : 'Just a puppy in a bandana') + '<br>' + (PET.treats || 0) + ' treat' + ((PET.treats || 0) === 1 ? '' : 's') + ' eaten</div></div>' +
      '<div class="shop-tabs">' + PET_TABS.map(function (t) { return '<button class="shop-tab' + (PET.tab === t[0] ? ' on' : '') + '" type="button" data-shop="tab" data-id="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="shop-grid">' + shopCards() + '</div>' +
      '<div class="shop-bar"><div class="nm">' + info.name + '<small>' + info.sub + '</small></div>' + (info.btn ? '<button class="shop-go" type="button" data-shop="' + info.act + '"' + (info.dis ? ' disabled' : '') + '>' + info.btn + '</button>' : '') + '</div>' +
    '</div>';
  petLearnSizes(petEl);
}
function shopClick(b) {
  var a = b.dataset.shop, id = b.dataset.id;
  if (a === 'back') { PET.mode = 'room'; PET.sel = null; return petRender(); }
  if (a === 'tab') { PET.tab = id; PET.sel = null; return petRenderShop(); }
  if (a === 'pick') { PET.sel = PET.sel === id ? null : id; return petRenderShop(); }
  var sel = PET.sel; if (!sel) return;
  if (a === 'treat') {
    var t = PET_TREATS.filter(function (x) { return 'treat:' + x.id === sel; })[0];
    if (t && petGiveTreat(t)) { toast(esc(PET.name) + ' loved it!', t.icon, 2400); }
    return petRenderShop();
  }
  var it = petItem(sel); if (!it) return;
  if (a === 'buy') {
    if (petHearts() < it.price) return;
    PET.spent += it.price; PET.owned.push(it.id); PET.equipped[it.slot] = it.id;
    petSavePet(); toast('New: ' + it.name + ' — now wearing it', '🎀', 3000); sparkle();
    if (typeof playSound === 'function') playSound('chime');
    PET.sel = null; return petRenderShop();
  }
  if (a === 'on') { PET.equipped[it.slot] = it.id; }
  else if (a === 'off') { delete PET.equipped[it.slot]; }
  petSavePet(); PET.sel = null; petRenderShop();
}

/* the card at the top of the menu */
function petCardHtml() {
  return '<button type="button" class="pet-card" data-act="pet-open"><img src="art/pets/dog-face-happy.png" alt=""><span><b>' + esc(PET.name) + '</b><small>Our baby · <img class="hh" src="art/heart.png" alt=""> ' + petHearts() + ' Love Hearts</small></span><span class="go">›</span></button>';
}
(function () {
  var st = document.createElement('style');
  st.textContent = '.pet-card{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:10px 12px;margin:2px 0 8px;background:linear-gradient(135deg,#FFEBD2,#FFE0EC);border:3px solid #E9B089;box-shadow:0 4px 0 rgba(169,116,79,.25)}' +
    '.pet-card>img{width:54px;height:46px;object-fit:contain;flex:none}.pet-card b{display:block;font-family:var(--fdisp);font-size:18px;color:#8a2f3f}.pet-card small{display:flex;align-items:center;gap:5px;font-size:12px;color:#8a5a4a;font-weight:700;margin-top:2px}' +
    '.pet-card .hh{width:14px;height:14px;image-rendering:pixelated}.pet-card .go{margin-left:auto;font-size:26px;color:#c0786a}';
  document.head.appendChild(st);
})();
setInterval(petDaily, 60000); setTimeout(petDaily, 5000);

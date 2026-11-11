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
var PET_SHOP_ENABLED = false;                /* accessory art is being refit; keep the room available */
var PET = { open: false, name: 'Baby', owned: [], equipped: {}, spent: 0, treats: 0, mode: 'room', tab: 'mine', sel: null, woke: 0, lastPet: 0, bubble: '', visits: {} };
S.love = { bruce: 0, elena: 0 };
S.spend = { bruce: 0, elena: 0 };          /* what each of you has spent (own document each, so shopping together is safe) */
try { var sp0 = JSON.parse(localStorage.getItem('ow.spend') || 'null'); if (sp0) S.spend = { bruce: sp0.bruce || 0, elena: sp0.elena || 0 }; } catch (e) {}
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
var PET_TREATS = [{ id: 'bone', name: 'Bone', img: 'art/ui/treat-bone.png', price: 3 }, { id: 'cookie', name: 'Heart cookie', img: 'art/ui/treat-cookie.png', price: 5 }, { id: 'zoom', name: 'Zoomies snack', img: 'art/ui/treat-zoom.png', price: 4 }];
function treatImg(t) { return '<img alt="" src="' + t.img + '">'; }
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
petInitFits();

function petLayer(item, s) {
  return petFittedLayer(item,s,'front');
/* Legacy measurements kept below for reference during fitting migration.
  var an = PET_ANCHOR[item.slot === 'extra' ? item.file : item.slot], nat = PET_SIZE[item.file];
  var url = 'art/pets/acc/' + item.file + '.png';
  var w = (nat ? nat[0] : 130) * an.sc * s, h = (nat ? nat[1] : 100) * an.sc * s;
  var left = an.cx * s - w / 2, top = an.a === 'b' ? an.y * s - h : (an.a === 'c' ? an.y * s - h / 2 : an.y * s);
  return '<img class="pf-l" alt="" draggable="false" src="' + url + '" data-file="' + item.file + '" style="left:' + left.toFixed(1) + 'px;top:' + top.toFixed(1) + 'px;width:' + w.toFixed(1) + 'px;z-index:' + an.z + '">';
*/
}
/* the puppy plus what it is wearing; `h` is its height in css px, `eq` the outfit to show */
function petFigure(h, eq, sleeping) {
  var s = h / PET_DOG_H, w = PET_DOG_W * s;
  if (sleeping) {var sleepLayers='';if(PET_SHOP_ENABLED)PET_SLOTS.forEach(function(slot){var it=petItem(eq[slot]);if(it)sleepLayers+=petFittedLayer(it,s,'sleep');});return '<div class="pf" style="width:' + (163 * s).toFixed(0) + 'px;height:' + (71 * s).toFixed(0) + 'px">'+sleepLayers+'<img class="pf-dog" alt="" draggable="false" src="art/pets/dog-sleep.png" style="width:100%;z-index:1"></div>';}
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
function petHearts() { return Math.max(0, (S.love.bruce || 0) + (S.love.elena || 0) + PET_STARTER - (PET.spent || 0) - (S.spend.bruce || 0) - (S.spend.elena || 0)); }
function petSpend(n) {
  if (!S.who) return;
  S.spend[S.who] = (S.spend[S.who] || 0) + n;
  try { localStorage.setItem('ow.spend', JSON.stringify(S.spend)); } catch (e) {}
  if (S.db) S.db.collection('petspend').doc(S.who).set({ n: S.spend[S.who], at: Date.now() }).catch(function () {});
}
ROWHOOKS.petspend = function (rows) {
  rows.forEach(function (r) { if (r.id === 'bruce' || r.id === 'elena') S.spend[r.id] = Math.max(S.spend[r.id] || 0, Number(r.n) || 0); });
  try { localStorage.setItem('ow.spend', JSON.stringify(S.spend)); } catch (e) {}
  petPill();
};
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
    '.ps-btn,.ps-hearts,.ps-act,.shop-tab,.it,.shop-go,.shop-card,.ps-say{clip-path:var(--px-step)}',
    '.ps-btn{width:46px;height:46px;border:3px solid var(--berry);border-bottom-width:7px;background:var(--cream);color:var(--berry);font-size:24px;line-height:1;padding:0;display:grid;place-items:center}',
    '.ps-btn:active{transform:translateY(4px);border-bottom-width:3px}',
    '.ps-name{flex:1;min-width:0;text-align:center;background:none;border:none;padding:0}',
    '.ps-name span{display:inline-block;background:var(--wood);border:3px solid var(--wood-dk);border-bottom-width:6px;clip-path:var(--px-step);padding:5px 16px 6px;font-family:var(--ftitle);font-size:20px;color:var(--cream);max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.ps-hearts{display:flex;align-items:center;gap:7px;height:46px;padding:0 13px;border:3px solid var(--berry);border-bottom-width:7px;background:var(--cream);font-family:var(--fdisp);font-size:18px;color:var(--berry)}',
    '.ps-hearts img{width:22px;height:22px;image-rendering:pixelated}.ps-hearts.bump{animation:psBump .5s}@keyframes psBump{40%{transform:scale(1.12)}}',
    '.ps-say{position:absolute;left:50%;transform:translateX(-50%);max-width:78%;background:var(--cream);border:3px solid var(--berry);padding:8px 14px;font-family:var(--fdisp);font-size:15px;color:var(--berry-dk);text-align:center;z-index:4;opacity:0;transition:opacity .25s;pointer-events:none}',
    '.ps-say.on{opacity:1}',
    '.ps-bar{position:absolute;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:12px 12px calc(14px + env(safe-area-inset-bottom));z-index:5;max-width:620px;margin:0 auto}',
    '.ps-act{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px 7px;border:3px solid var(--berry);border-bottom-width:7px;background:var(--cream);color:var(--berry-dk);font-family:var(--fdisp);font-weight:600;font-size:14px;transition:transform .08s,border-bottom-width .08s}',
    '.ps-act .ic{width:34px;height:28px;object-fit:contain;image-rendering:pixelated}.ps-act small{font-size:12px;color:var(--rose);font-weight:600}',
    '.ps-act:hover{transform:translateY(-1px)}.ps-act:active{transform:translateY(4px);border-bottom-width:3px}',
    '.ps-fly{position:absolute;z-index:6;pointer-events:none;animation:psFly 1s ease-in forwards}.ps-fly img{width:46px;image-rendering:pixelated}@keyframes psFly{to{transform:translate(var(--dx),var(--dy)) scale(.6);opacity:0}}',
    '.ps-heart{position:absolute;z-index:6;pointer-events:none;width:22px;height:22px;image-rendering:pixelated;animation:psRise 1.4s ease-out forwards}@keyframes psRise{0%{opacity:0;transform:translateY(0) scale(.6)}15%{opacity:1}100%{opacity:0;transform:translateY(-80px) scale(1.1)}}',
    '#petScene .shop{position:absolute;inset:0;display:flex;flex-direction:column;background:#4A2C22}',
    '#petScene .shop:before{content:"";position:absolute;inset:0;background:url(art/pets/room.jpg) center/cover;filter:blur(3px) brightness(.55);z-index:0}',
    '#petScene .shop>*{position:relative;z-index:1}',
    '.shop-hd{display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 12px 0}',
    '.shop-sign{flex:1;text-align:center}',
    '.shop-sign .board{display:inline-block;background:var(--wood);border:4px solid var(--wood-dk);border-bottom-width:8px;clip-path:var(--px-step);padding:6px 18px 8px}',
    '.shop-sign b{display:block;font-family:var(--ftitle);font-size:clamp(24px,7vw,34px);color:var(--cream);line-height:1}',
    '.shop-sign small{display:block;font-family:var(--fdisp);font-size:13px;color:var(--peach);margin-top:3px}',
    '.awning{height:24px;margin:10px 10px 0;background:repeating-linear-gradient(90deg,#B9443F 0 34px,var(--cream) 34px 68px);border:3px solid var(--berry-dk);border-bottom:none}',
    '.awning-sc{height:12px;margin:0 10px;background:radial-gradient(circle at 17px 0,#B9443F 11px,transparent 12px) 0 0/68px 12px repeat-x,radial-gradient(circle at 51px 0,var(--cream) 11px,transparent 12px) 0 0/68px 12px repeat-x}',
    '.shop-body{flex:1;min-height:0;display:flex;flex-direction:column;margin:0 10px calc(10px + env(safe-area-inset-bottom));background:#7A4A34;border:4px solid var(--wood-dk);border-top:none}',
    '.shop-stage{display:flex;align-items:flex-end;justify-content:center;gap:14px;padding:30px 14px 0;min-height:200px;position:relative;background:#5E3828}',
    '.shop-ped{position:relative;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px}',
    '.shop-ped:after{content:"";position:absolute;left:-14px;right:-14px;bottom:-2px;height:30px;background:#C99A68;border:3px solid var(--wood-dk);border-radius:50%/60%;z-index:0}',
    '.shop-ped .pf{z-index:1;margin-bottom:10px}',
    '.shop-card{align-self:center;max-width:150px;background:var(--cream);border:3px solid var(--berry);padding:8px 10px;font-size:14px;line-height:1.35;color:var(--ink)}',
    '.shop-card b{display:block;font-family:var(--fdisp);font-size:16px;color:var(--berry)}',
    '.shop-tabs{display:flex;gap:6px;overflow-x:auto;padding:12px 10px 10px;scrollbar-width:none}.shop-tabs::-webkit-scrollbar{display:none}',
    '.shop-tab{flex:none;padding:7px 13px 6px;border:3px solid var(--wood-dk);border-bottom-width:6px;background:#E9C9A2;color:var(--wood-dk);font-family:var(--fdisp);font-weight:600;font-size:14px}',
    '.shop-tab.on{background:var(--gold);color:var(--berry-dk);border-color:var(--berry-dk)}',
    '.shop-grid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:0 10px 12px;align-content:start}',
    '@media (min-width:600px){.shop-grid{grid-template-columns:repeat(6,1fr)}}',
    '.it{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;aspect-ratio:1;background:var(--cream);border:3px solid #C99A68;border-bottom-width:6px;padding:4px;min-width:0}',
    '.it img{max-width:78%;max-height:56%;object-fit:contain;image-rendering:pixelated}.it .pr{font-family:var(--fdisp);font-size:13px;color:var(--berry);display:flex;align-items:center;gap:3px}.it .pr img{width:13px;height:13px}',
    '.it:active{transform:translateY(3px);border-bottom-width:3px}',
    '.it.sel{border-color:var(--berry);background:var(--rose-lt)}.it.worn{background:#FFE3EA}.it .tick{position:absolute;top:3px;right:5px;font-size:12px;color:var(--berry)}',
    '.shop-bar{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#5E3828;border-top:4px solid var(--wood-dk);color:var(--cream)}',
    '.shop-bar .nm{flex:1;min-width:0;font-family:var(--fdisp);font-size:16px;line-height:1.25}.shop-bar .nm small{display:block;font-family:var(--fbody);font-size:13px;color:var(--peach)}',
    '.shop-go{padding:10px 18px;border:3px solid var(--berry-dk);border-bottom-width:7px;background:var(--berry);color:var(--cream);font-family:var(--fdisp);font-size:16px}',
    '.shop-go:active{transform:translateY(4px);border-bottom-width:3px}.shop-go[disabled]{opacity:.5}.shop-empty{grid-column:1/-1;text-align:center;color:var(--cream);padding:26px 10px;line-height:1.5;font-size:15px}',
    '.shop-treats{display:none;flex-direction:column;gap:8px;padding:12px 10px}.shop-treats h4{margin:0;text-align:center;font-family:var(--fdisp);color:var(--cream);font-size:16px}',
    '@media (min-width:900px){.shop-body{display:grid;grid-template-columns:240px 1fr 190px;grid-template-rows:auto 1fr auto}.shop-stage{grid-column:1;grid-row:1/4;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:20px}.shop-tabs{grid-column:2;grid-row:1}.shop-grid{grid-column:2;grid-row:2;grid-template-columns:repeat(5,1fr)}.shop-treats{display:flex;grid-column:3;grid-row:1/3}.shop-bar{grid-column:2/4;grid-row:3}.shop-tab[data-id=treat]{display:none}}'
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
  petEnsure(); closeSheet(); PET.mode = 'room';
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
    '<div class="ps-top"><button class="ps-btn" type="button" data-pet="back" aria-label="Back to the map">‹</button><button class="ps-name" type="button" data-pet="rename"><span>' + esc(PET.name) + '</span></button>' + petHeartPill() + '</div>' +
    '<div class="ps-say" id="psSay"></div>' +
    '<div class="ps-bar">' +
      '<button class="ps-act" type="button" data-pet="cuddle"><img class="ic" alt="" src="art/heart.png">Cuddle</button>' +
      '<button class="ps-act" type="button" data-pet="treat"><img class="ic" alt="" src="art/ui/bone.png">Treat<small>\u2665 3</small></button>' +
      '<button class="ps-act" type="button" data-pet="play"><img class="ic" alt="" src="art/ui/ball.png">Play</button>' +
      (PET_SHOP_ENABLED ? '<button class="ps-act" type="button" data-pet="shop"><img class="ic" alt="" src="art/ui/shop.png">Pup Shop</button>' : '') +
    '</div>';
  petLayout(sleeping);
}
/* ---------------- he lives in the room ----------------
   A small brain walks him around the bed, sits, wags his tail, lies down for a
   nap and sleeps at night. Sitting facing you is when you see his outfit. */
var PG = null;                                     /* room geometry on screen */
var PB = { x: 0.49, dir: 1, act: 'sit', until: 0, tx: 0.49, f: 0, raf: 0, last: 0, shown: '' };
var PF = {};                                       /* frame images, by name */
var puppyMotion = new Image(); puppyMotion.src = 'art/pets/puppy-motion.png';
/* The sitting puppy: a real 3-second loop (breathing, head tilts, blinks, tail wag) as a 6 x 6 sheet of 36 frames.
   It plays, then rests on the first frame for a moment, then plays again. Only the sheet position changes, so nothing is rebuilt per frame. */
var puppyIdle = new Image(); puppyIdle.src = 'art/pets/puppy-idle.webp';
var IDLE = { cw: 236, ch: 256, cols: 6, rows: 6, n: 36, fps: 12, t0: 0, rest: 2500 };
function petIdlePose(x) {
  var dog = document.getElementById('psDog'), size = PG.h * 1.12, w = size * IDLE.cw / IDLE.ch, now = performance.now();
  var key = 'idle|' + Math.round(size);
  if (PB.shown !== key) {
    dog.innerHTML = '<div class="pf puppy-idle" role="img" aria-label="Puppy" style="position:relative;width:' + w.toFixed(1) + 'px;height:' + size.toFixed(1) + 'px;background:url(art/pets/puppy-idle.webp) no-repeat;background-size:' + (w * IDLE.cols).toFixed(1) + 'px ' + (size * IDLE.rows).toFixed(1) + 'px"></div>';
    PB.shown = key;
  }
  var f = 0;
  if (!reduceMotion) {
    if (!IDLE.t0) IDLE.t0 = now;
    var run = IDLE.n / IDLE.fps * 1000, t = now - IDLE.t0;
    if (t >= run + IDLE.rest) { IDLE.t0 = now; IDLE.rest = 1500 + Math.random() * 3500; t = 0; }
    f = t < run ? Math.floor(t / 1000 * IDLE.fps) % IDLE.n : 0;
  }
  var el = dog.firstChild;
  if (el) el.style.backgroundPosition = '-' + ((f % IDLE.cols) * w).toFixed(1) + 'px -' + (Math.floor(f / IDLE.cols) * size).toFixed(1) + 'px';
  dog.style.left = Math.max(w / 2 + 12, Math.min(PG.vw - w / 2 - 12, x)) + 'px'; dog.style.top = (PG.baseY - size * 0.945) + 'px';
}
['sleep'].forEach(function (n) { var im = new Image(); im.src = 'art/pets/dog-' + n + '.png'; PF[n] = im; });
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
/* He always faces you. Awake, he is the dressed front-facing puppy: he sits,
   breathes, and now and then hops along the bed to a new spot. At night he
   curls up asleep. No side or back views, so nothing ever flips or jumps size. */
function frameScale() { return PG.h / 236 * 2.05; }
function petPose(bounce) {
  var dog = document.getElementById('psDog'); if (!dog || !PG) return;
  var x = PG.ox + PG.dw * PB.x, key;
  if (PB.act === 'sleep') {
    var im = PF.sleep, s = frameScale(), w = (im.naturalWidth || 163) * s, hh = (im.naturalHeight || 71) * s;
    key = 'sleep|' + Math.round(hh)+'|'+JSON.stringify(PET.equipped);
    if (PB.shown !== key) { dog.innerHTML = petFigure(236*s,PET.equipped,true); PB.shown = key; }
    dog.style.left = Math.max(w/2+12,Math.min(PG.vw-w/2-12,x)) + 'px'; dog.style.top = (PG.baseY - hh * 0.92) + 'px';
    return;
  }
  if(puppyMotion.complete&&puppyMotion.naturalWidth){
    var time=performance.now(),walking=PB.act==='scoot',row=walking?1:PB.act==='eat'||PB.act==='sniff'?2:PB.act==='play'||PB.act==='happy'?3:0;
    var frame=reduceMotion?0:row===0?(time%6000>5300?Math.floor(time/170)%4:0):Math.floor(time/(walking?135:240))%4;
    if(row===0&&puppyIdle.complete&&puppyIdle.naturalWidth){petIdlePose(x);return;}
    var size=PG.h*1.12;
    /* without outfits the figure is built once and only its sheet position changes, so frames never flicker */
    var stable=!PET_SHOP_ENABLED;
    var motionKey=[row,stable?'':frame,size,walking&&PB.tx<PB.x0,JSON.stringify(PET.equipped),JSON.stringify(PET_FIT_OVERRIDES)].join('|');
    if(PB.shown!==motionKey){dog.innerHTML=petMotionFigure(size,row*4+frame,PET.equipped,walking&&PB.tx<PB.x0);PB.shown=motionKey;}
    if(stable){var bgEl=dog.firstChild&&dog.firstChild.lastElementChild;if(bgEl)bgEl.style.backgroundPosition=(frame%4*100/3)+'% '+(row*100/3)+'%';}
    dog.style.left=Math.max(size/2+12,Math.min(PG.vw-size/2-12,x))+'px';dog.style.top=(PG.baseY-size*.94)+'px';return;
  }
  key = 'front|' + JSON.stringify(PET.equipped) + '|' + PG.h;
  if (PB.shown !== key) { dog.innerHTML = petFigure(PG.h, PET.equipped, false); petLearnSizes(dog); PB.shown = key; }
  dog.style.left = x + 'px'; dog.style.top = (PG.baseY - PG.h - (bounce || 0)) + 'px';
}
function petNext(now) {
  if (petSleeping()) { PB.act = 'sleep'; PB.until = now + 60000; return; }
  if (PB.act !== 'sit') { PB.act = 'sit'; PB.until = now + 5000 + Math.random() * 7000; return; }
  /* a little hop to a new spot on the bed, still facing you */
  PB.act = Math.random()<.35?'sniff':'scoot'; PB.t0 = now; PB.x0 = PB.x;
  var span = X_MAX - X_MIN, d = (0.15 + Math.random() * 0.25) * span;
  PB.tx = Math.max(X_MIN, Math.min(X_MAX, PB.x + (Math.random() < 0.5 ? -d : d)));
  PB.until = now + (PB.act==='sniff'?2200:20000);
}
function petTick(now) {
  if (!PET.open || PET.mode !== 'room') { PB.raf = 0; return; }
  PB.raf = requestAnimationFrame(petTick);
  PB.last = now;
  if (reduceMotion && PB.act !== 'sleep') { if (PB.act !== 'sit') { PB.act = 'sit'; petPose(); } return; }
  if (now > PB.until) petNext(now);
  if (PB.act === 'scoot') {
    var dur = Math.max(700, Math.abs(PB.tx - PB.x0) * PG.dw * 9), t = Math.min(1, (now - PB.t0) / dur);
    PB.x = PB.x0 + (PB.tx - PB.x0) * (t * t * (3 - 2 * t));
    var hops = Math.max(1, Math.round(dur / 380));
    petPose();
    if (t >= 1) { PB.act=PB.after||'sniff';PB.after=null;PB.t0=now;PB.until=now+3500; }
    return;
  }
  if (PB.act === 'play') {
    var tp = now - PB.t0;
    petPose();
    if (tp > 3500) { PB.act = 'sit'; PB.until = now + 5000; }
    return;
  }
  petPose();
}
function petSitFront() { PB.act = 'sit'; PB.until = performance.now() + 5000; petPose(); }

var petSayT = null;
function petSay(text, ms) {
  /* Reactions are expressed by poses; the puppy no longer speaks in popups. */
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
  PB.act='happy';PB.until=performance.now()+2400;petPose();petHearts_fx();
}
var PET_LINES = ['Woof! 💗', 'I love you both!', 'Best day ever!', 'Pet me again!', 'Where are we going next?', '*tail wags*', 'Did you bring treats?', 'I missed you!', 'You two are my favourite people.'];

function petClick(e) {
  var b = e.target.closest('[data-pet],[data-shop]');
  if (!b) { if (e.target.closest('#psDog') && PET.mode === 'room') petAct('cuddle');
    else if(PET.mode==='room'&&PG&&e.target.closest('.ps-room')&&!petSleeping()&&!reduceMotion&&e.clientY>PG.baseY-PG.h*.45){PB.act='scoot';PB.t0=performance.now();PB.x0=PB.x;PB.tx=Math.max(X_MIN,Math.min(X_MAX,(e.clientX-PG.ox)/PG.dw));PB.until=PB.t0+20000;PB.after='sniff';}return; }
  if (b.dataset.shop) return shopClick(b);
  petAct(b.dataset.pet);
}
function petAct(a) {
  if (a === 'back') return petClose();
  if (a === 'shop') { if (!PET_SHOP_ENABLED) return; PET.mode = 'shop'; PET.tab = PET.owned.length ? 'mine' : 'hat'; PET.sel = null; return petRender(); }
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
    var old=document.getElementById('puppyToy');if(old)old.remove();
    PB.act=reduceMotion?'play':'scoot';PB.t0=performance.now();PB.x0=PB.x;PB.tx=PB.x<(X_MIN+X_MAX)/2?X_MAX:X_MIN;PB.after='play';PB.until=PB.t0+20000;
    var toy=document.createElement('img');toy.id='puppyToy';toy.src='art/ui/ball.png';toy.alt='Play ball';toy.style.cssText='position:absolute;pointer-events:none;width:26px;left:'+(PG.ox+PG.dw*PB.tx-13)+'px;top:'+(PG.baseY-23)+'px';petEl.querySelector('.ps-room').appendChild(toy);
    setTimeout(function(){toy.remove();},6500);
  } else if (a === 'treat') {
    petGiveTreat(PET_TREATS[0]);
  }
}
function petGiveTreat(t) {
  if (petHearts() < t.price) { toast('Not enough Love Hearts yet — earn some by adding memories, notes and more.', '💗', 3600); return false; }
  petSpend(t.price); PET.treats = (PET.treats || 0) + 1; petSavePet(); petPill();
  var dog = document.getElementById('psDog');
  if (dog && PET.mode === 'room') {
    var f = document.createElement('div'); f.className = 'ps-fly'; f.innerHTML = treatImg(t);
    var r = dog.getBoundingClientRect(), pr = petEl.getBoundingClientRect();
    f.style.left = (r.left - pr.left + r.width * 0.2) + 'px'; f.style.top = (pr.height - 130) + 'px';
    f.style.setProperty('--dx', (r.width * 0.3) + 'px'); f.style.setProperty('--dy', -(pr.height - 130 - (r.top - pr.top) - r.height * 0.4) + 'px');
    petEl.appendChild(f); setTimeout(function () { f.remove(); }, 1000);
    setTimeout(function () { if(!PET.open||PET.mode!=='room')return;PB.act='eat';PB.until=performance.now()+3000;petPose(); }, 800);
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
    return PET_TREATS.map(function (t) { return '<button class="it' + (PET.sel === 'treat:' + t.id ? ' sel' : '') + '" type="button" data-shop="pick" data-id="treat:' + t.id + '">' + treatImg(t) + '<span class="pr"><img src="art/heart.png" alt="">' + t.price + '</span></button>'; }).join('');
  }
  list = tab === 'mine' ? PET_CATALOG.filter(function (i) { return PET.owned.indexOf(i.id) >= 0; }) : PET_CATALOG.filter(function (i) { return i.slot === tab; });
  if (!list.length) return '<div class="shop-empty">' + (tab === 'mine' ? 'Nothing in the wardrobe yet.<br>Open a shelf above and treat ' + esc(PET.name) + ' to something.' : 'Nothing here.') + '</div>';
  list.forEach(function (i) {
    var own = PET.owned.indexOf(i.id) >= 0, worn = PET.equipped[i.slot] === i.id;
    html += '<button class="it' + (PET.sel === i.id ? ' sel' : '') + (worn ? ' worn' : '') + '" type="button" data-shop="pick" data-id="' + i.id + '"><img alt="" src="art/pets/fitted/' + i.file + '.png">' +
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
      '<div class="shop-hd"><button class="ps-btn" type="button" data-shop="back" aria-label="Back to the room">‹</button><div class="shop-sign"><div class="board"><b>Pup Shop</b><small>Accessories \u00b7 Treats \u00b7 Love</small></div></div>' + petHeartPill() + '</div>' +
      '<div class="awning"></div><div class="awning-sc"></div><div class="shop-body">' +
      '<div class="shop-stage"><div class="shop-ped">' + petFigure(160, eq) + '</div>' +
        '<div class="shop-card"><b>' + esc(PET.name) + '</b>' + (PET.owned.length ? PET.owned.length + ' item' + (PET.owned.length > 1 ? 's' : '') + ' owned' : 'Just a puppy in a bandana') + '<br>' + (PET.treats || 0) + ' treat' + ((PET.treats || 0) === 1 ? '' : 's') + ' eaten</div></div>' +
      '<div class="shop-tabs">' + PET_TABS.map(function (t) { return '<button class="shop-tab' + (PET.tab === t[0] ? ' on' : '') + '" type="button" data-shop="tab" data-id="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="shop-grid">' + shopCards() + '</div>' +
      '<div class="shop-treats"><h4>Dog Treats</h4>' + PET_TREATS.map(function (t) { return '<button class="it' + (PET.sel === 'treat:' + t.id ? ' sel' : '') + '" type="button" data-shop="pick" data-id="treat:' + t.id + '">' + treatImg(t) + '<span class="pr"><img src="art/heart.png" alt="">' + t.price + '</span></button>'; }).join('') + '</div>' +
      '<div class="shop-bar"><div class="nm">' + info.name + '<small>' + info.sub + '</small></div>' + (info.btn ? '<button class="shop-go" type="button" data-shop="' + info.act + '"' + (info.dis ? ' disabled' : '') + '>' + info.btn + '</button>' : '') + '</div>' +
    '</div></div>';
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
    if (t && petGiveTreat(t)) { toast(esc(PET.name) + ' loved it!', '\u2665', 2400); }
    return petRenderShop();
  }
  var it = petItem(sel); if (!it) return;
  if (a === 'buy') {
    if (petHearts() < it.price) return;
    petSpend(it.price); PET.owned.push(it.id); PET.equipped[it.slot] = it.id;
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

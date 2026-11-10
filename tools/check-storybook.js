/* Focused regression checks for geographic placement and presence portraits.
   Run with node tools/check-storybook.js; no packages or private data needed. */
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
function load(file, name, globals) {
  const src = fs.readFileSync(file, 'utf8');
  const match = src.match(new RegExp('function ' + name + '\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}'));
  assert(match, name + ' exists');
  const context = vm.createContext(globals);
  vm.runInContext(match[0], context);
  return context;
}
const homes = { bruce: { lat: 38.6935, lng: -76.5333 }, elena: { lat: 39.0332, lng: -76.503 } };
const original = JSON.stringify(homes);
const placement = load('src/index.html', 'homeDisplayPos', {
  HOMES: homes, homeArtH: z => Math.max(28,Math.min(117,51+(z-6.9)*15)), proj: () => ({ x: 20, y: 40 }), terrainAt: x => x <= 0 ? 'land' : 'water'
});
for (const who of ['bruce', 'elena']) for (const zoom of [7.8, 9.2, 11.2]) {
  assert(placement.homeDisplayPos(who, zoom).x <= 0, 'home must move inland, never east over the bay');
  if(who==='bruce')assert(placement.homeDisplayPos(who,zoom).x+placement.homeArtH(zoom)*.78*1.6*.47<=0,'the eastern foundation edge must also stay on land');
}
assert.equal(JSON.stringify(homes), original, 'display adjustments must preserve real coordinates');
const ground = load('src/features/presence.js', 'avatarGroundPoint', { terrainAt: x => x < 85 ? 'land' : 'water' });
assert(ground.avatarGroundPoint(100, 20, 20).x + 5 < 85, 'both avatar feet must stand on dry land');
ground.terrainAt = () => 'water';
assert.equal(ground.avatarGroundPoint(100, 20, 20), null, 'avatar is omitted when no dry footing exists');
const states = {};
const buttons = ['bruce', 'elena'].map(who => ({ dataset: { explorer: who },
  classList: { toggle: (_, on) => { states[who] = on; } }, setAttribute() {}, getAttribute() { return ''; } }));
const cloud = { configured: true };
const presence = load('src/features/presence.js', 'paintAvatarDock', {
  document: { querySelectorAll: () => buttons }, S: { who: 'bruce' }, PR: { partner: null },
  window: { OWCloud: cloud }, OWCloud: cloud, jrShortName: who => who
});
presence.paintAvatarDock(); assert.deepEqual(states, { bruce: true, elena: false });
presence.PR.partner = { who: 'elena' };
presence.paintAvatarDock(); assert.deepEqual(states, { bruce: true, elena: true });
presence.PR.partner = null; cloud.configured = false;
presence.paintAvatarDock(); assert.deepEqual(states, { bruce: false, elena: false });
console.log('ok: Maryland home placement, dry avatar footing, and all presence portrait states');

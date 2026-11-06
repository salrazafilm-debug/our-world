const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const nav = [];
const context = vm.createContext({
  artLoad() {}, ACTIONS: {}, HOOKS: { beforePins: [] },
  S: { zoom: 12, regions: [], memories: [] }, closeSheet() {},
  flyTo(...args) { nav.push(args); }, W: 430, H: 932
});
vm.runInContext(fs.readFileSync('src/features/city-data.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('src/features/cities.js', 'utf8'), context);
const cities = context.CITY_ATLAS;
assert.equal(cities.length, 8);
assert.equal(new Set(cities.map(c => c.id)).size, cities.length);
for (const city of cities) {
  assert(city.bounds[0] < city.bounds[2] && city.bounds[1] < city.bounds[3]);
  assert(city.z >= 11.8 && city.z <= 14.5);
  assert.equal(new Set(city.landmarks.map(l => l[0])).size, city.landmarks.length);
  for (const l of city.landmarks) assert(Math.abs(l[2]) < 85 && Math.abs(l[3]) < 180);
  for (const street of city.streets) assert(street[1].length >= 2);
}
assert.equal(context.cityDetail(8), 0);
assert.equal(context.cityDetail(13), 1);
let previous = 0;
for (let z = 9; z < 13; z += .05) {
  const detail = context.cityDetail(z);
  assert(detail >= previous && detail <= 1);
  previous = detail;
}
const dc = context.cityFind('dc'), nyc = context.cityFind('nyc');
assert(context.cityOpenSpace(dc, 38.8896, -77.030), 'National Mall must stay open');
assert(context.cityOpenSpace(dc, 38.8893, -77.045), 'Reflecting Pool must stay open');
assert(context.cityOpenSpace(nyc, 40.78, -73.966), 'Central Park must stay open');
assert(!context.cityOpenSpace(nyc, 40.7484, -73.9857), 'Empire State is outside the park');
const personal = JSON.stringify(context.S);
context.cityExplore('dc');
assert.equal(nav[0][0], dc.lat);
assert.equal(nav[0][1], dc.lng);
assert.equal(nav[0][2], dc.z);
assert.equal(JSON.stringify(context.S), personal, 'atlas navigation must not manufacture a visit');
context.cityExplore('not-a-city');
assert.equal(nav.length, 1);
const drawn = [], hits = [];
Object.assign(context, {
  DPR: 1, proj: () => ({ x: 215, y: 400 }),
  ctx: { save() {}, restore() {}, fillRect() {}, strokeRect() {} },
  drawArt(g, name) { drawn.push(name); return { x: 180, y: 300, w: 70, h: 100 }; },
  addHit(box, item) { hits.push(item); }, tryLabel() {}
});
context.S.mode = 'map'; context.S.zoom = 8;
context.HOOKS.beforePins[0]();
assert.equal(drawn.filter(name => name === 'story-nyc').length, 1, 'distant NYC is one city silhouette');
assert.equal(drawn.filter(name => name === 'city-empire').length, 0);
drawn.length = hits.length = 0;
context.S.zoom = 13;
context.HOOKS.beforePins[0]();
assert(!drawn.includes('story-nyc'), 'close NYC must not retain the combined image');
assert(drawn.includes('city-empire') && drawn.includes('city-chrysler') && drawn.includes('city-liberty'));
assert(drawn.includes('city-whitehouse') && drawn.includes('city-capitol') && drawn.includes('city-monument'));
assert(hits.some(hit => hit.kind === 'cityplace' && hit.id === 'empire'), 'individual landmarks remain clickable');
console.log('ok: eight atlas cities, zoom transitions, geographic parks, and navigation without visit writes');

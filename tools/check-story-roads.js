/* Guard the two concrete road risks: unbounded close-zoom sampling and
   vegetation covering a geographic road after panning. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const c=vm.createContext({W:430,H:932});vm.runInContext(fs.readFileSync('src/world/story-roads.js','utf8'),c);
assert(c.storyRoadSamples({x:-1e8,y:300},{x:1e8,y:300},1).length<200,'sample only the viewport, even for huge projected segments');
assert.equal(c.storyRoadSamples({x:-1e8,y:-1000},{x:1e8,y:-1000},1).length,0,'cull offscreen segments');
const first=c.storyRoadSamples({x:-90,y:300},{x:900,y:300},1),moved=c.storyRoadSamples({x:-114,y:288},{x:876,y:288},1);
for(const p of first){const q=moved.find(q=>q.index===p.index);if(q){assert(Math.abs(q.x-p.x+24)<1e-7);assert(Math.abs(q.y-p.y+12)<1e-7);}}
c.STORY_ROAD_GEOMETRY=[{points:[{x:10,y:30},{x:100,y:30}]}];
assert(c.storyRoadNear(50,33,5));assert(!c.storyRoadNear(50,40,5));
assert(Math.abs(c.storyRoadOffset(50,33,10).y-40)<1e-7,'place decorative cottages beside roads continuously');
console.log('ok: bounded close-zoom road sampling, geographic pan stability, vegetation clearance');

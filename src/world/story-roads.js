/* A sparse illustrated road hierarchy over the existing geographic routes.
   Decoration only: no new destinations, routing or stored coordinates. */
var STORY_ROAD_GEOMETRY=[];
var STORY_ROADS={'I-95':1,'US-50 / Bay Bridge':1,'MD-2/4':.8,'I-66':.75};
function storyRoadNear(x,y,r){return STORY_ROAD_GEOMETRY.some(function(road){for(var i=1;i<road.points.length;i++){var a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));if(Math.hypot(x-a.x-t*dx,y-a.y-t*dy)<r)return true;}return false;});}
function storyRoadOffset(x,y,r){
 var nearest=null;
 STORY_ROAD_GEOMETRY.forEach(function(road){for(var i=1;i<road.points.length;i++){var a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1))),px=a.x+t*dx,py=a.y+t*dy,d=Math.hypot(x-px,y-py);if(!nearest||d<nearest.d)nearest={x:px,y:py,d:d,dx:dx,dy:dy};}});
 if(!nearest||nearest.d>=r)return{x:x,y:y};
 var nx=x-nearest.x,ny=y-nearest.y,d=nearest.d;
 if(d<.001){nx=-nearest.dy;ny=nearest.dx;d=Math.hypot(nx,ny)||1;}
 return{x:nearest.x+nx/d*r,y:nearest.y+ny/d*r};
}
function storyRoadSamples(a,b,id){
 var lo=0,hi=1,dx=b.x-a.x,dy=b.y-a.y;
 [[a.x,dx,-40,W+40],[a.y,dy,-40,H+40]].forEach(function(axis){if(Math.abs(axis[1])<.00001){if(axis[0]<axis[2]||axis[0]>axis[3])hi=-1;return;}var t0=(axis[2]-axis[0])/axis[1],t1=(axis[3]-axis[0])/axis[1];lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));});
 var samples=[],n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));for(var j=Math.ceil(lo*n);j<=Math.floor(hi*n);j++){var t=j/n;samples.push({x:a.x+dx*t,y:a.y+dy*t,index:id*10000000+j});}return samples;
}
function drawStoryRoads(g){
 STORY_ROAD_GEOMETRY=[];var z=S.zoom,alpha=cloudEase(5.8,7.4,z);if(alpha<.001)return;
 var u=homeArtH(z),width=Math.min(8,Math.max(3,u*.075));
 (window.OW_ROUTES||[]).forEach(function(route){
  if(!STORY_ROADS[route[0]])return;
  var points=route[1].map(function(a){return proj(a[0],a[1]);}),samples=[];
  for(var i=1;i<points.length;i++)samples=samples.concat(storyRoadSamples(points[i-1],points[i],i));
  var onscreen=samples.some(function(p){return p.x>-30&&p.x<W+30&&p.y>-30&&p.y<H+30;});if(!onscreen)return;
  STORY_ROAD_GEOMETRY.push({id:route[0],points:points});
  function trace(list){g.beginPath();list.forEach(function(p,i){if(i)g.lineTo(p.x,p.y);else g.moveTo(p.x,p.y);});}
  g.save();g.globalAlpha=alpha*STORY_ROADS[route[0]];g.lineCap='round';g.lineJoin='round';
  /* Deck edges also read as small bridge railings over geographic water. */
  trace(points);g.strokeStyle='#bdc5b8';g.lineWidth=width+3;g.stroke();
  trace(points);g.strokeStyle='#8195a0';g.lineWidth=width;g.stroke();
  g.globalAlpha*=cloudEase(7,8.5,z);g.setLineDash([Math.max(4,width*.85),Math.max(7,width*1.5)]);trace(points);g.strokeStyle='#fff0ce';g.lineWidth=Math.max(.8,width*.15);g.stroke();g.setLineDash([]);
  g.globalAlpha=alpha*.75;
  /* A few bridge piers, only on the US-50 crossing; never random water roads. */
  if(route[0]==='US-50 / Bay Bridge')samples.forEach(function(p){if(p.index%8||p.x<0||p.x>W||p.y<0||p.y>H||terrainAt(p.x,p.y)!=='water')return;g.fillStyle='#b5b8ad';g.fillRect(p.x-1,p.y+width*.5,2,4);});
  g.restore();
 });
}

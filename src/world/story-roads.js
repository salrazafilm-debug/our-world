/* A sparse illustrated road hierarchy over the existing geographic routes.
   Decoration only: no new destinations, routing or stored coordinates. */
var STORY_ROAD_GEOMETRY=[];
var STORY_ROADS={'I-95':1,'US-50 / Bay Bridge':1,'MD-2/4':.8,'I-66':.75};
/* Named crossings, geographic approaches; never infer bridges from wet pixels.
   US-50/301 Bay Bridge, US-50 Severn (Pearl Harbor Memorial), I-66 Roosevelt.
   Coordinates describe decorative spans, not navigation or memory positions. */
var STORY_BRIDGES=[
 {id:'US-50 / Bay Bridge',name:'Chesapeake Bay Bridge',a:[39.005,-76.445],b:[38.977,-76.333],cable:true},
 {id:'US-50 / Bay Bridge',name:'Severn River Bridge',a:[38.995,-76.515],b:[39.003,-76.500]},
 {id:'I-66',name:'Theodore Roosevelt Bridge',a:[38.890,-77.066],b:[38.893,-77.049]}
];
function storyBridge(g,bridge,width){
 var a=proj.apply(null,bridge.a),b=proj.apply(null,bridge.b),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<3)return;
 if(Math.max(a.x,b.x)<-80||Math.min(a.x,b.x)>W+80||Math.max(a.y,b.y)<-80||Math.min(a.y,b.y)>H+80)return;
 g.save();g.translate(a.x,a.y);g.rotate(Math.atan2(dy,dx));
 g.strokeStyle='#485968';g.lineWidth=width+4;g.beginPath();g.moveTo(0,3);g.lineTo(len,3);g.stroke();
 g.strokeStyle='#9baab0';g.lineWidth=width;g.beginPath();g.moveTo(0,0);g.lineTo(len,0);g.stroke();
 g.strokeStyle='#e4dfca';g.lineWidth=1.5;
 [-1,1].forEach(function(side){g.beginPath();g.moveTo(0,side*width*.55);g.lineTo(len,side*width*.55);g.stroke();});
 if(bridge.cable){var height=Math.min(36,Math.max(9,len*.18));
  [.28,.72].forEach(function(t){g.fillStyle='#6b7181';g.fillRect(len*t-2,-height,4,height+width);});
  g.beginPath();g.moveTo(0,0);g.lineTo(len*.28,-height);g.quadraticCurveTo(len*.5,height*.35,len*.72,-height);g.lineTo(len,0);g.stroke();
  for(var t=.32;t<.71;t+=.055){var q=(t-.28)/.44,y=-height*(1-q)*(1-q)+height*.7*(1-q)*q-height*q*q;g.beginPath();g.moveTo(len*t,y);g.lineTo(len*t,0);g.stroke();}
 }else{g.fillStyle='#777e88';[.25,.5,.75].forEach(function(t){g.fillRect(len*t-1,width*.5,3,5);});}
 g.restore();
}
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
  var coords=route[1];
  if(route[0]==='US-50 / Bay Bridge')coords=[[38.90,-77.02],[38.92,-76.92],[38.96,-76.73],[38.98,-76.61],[38.995,-76.515],[39.003,-76.500],[39.005,-76.445],[38.977,-76.333],[38.98,-76.16],[38.86,-76.10],[38.77,-76.08],[38.57,-76.07],[38.44,-75.83]];
  if(route[0]==='I-66')coords=[[38.893,-77.049],[38.890,-77.066],[38.88,-77.11],[38.86,-77.30],[38.79,-77.52]];
  var points=coords.map(function(a){return proj(a[0],a[1]);}),samples=[];
  for(var i=1;i<points.length;i++)samples=samples.concat(storyRoadSamples(points[i-1],points[i],i));
  var onscreen=samples.some(function(p){return p.x>-30&&p.x<W+30&&p.y>-30&&p.y<H+30;});if(!onscreen)return;
  STORY_ROAD_GEOMETRY.push({id:route[0],points:points});
  function trace(){g.beginPath();for(var i=1;i<points.length;i++){var list=storyRoadSamples(points[i-1],points[i],i),last=null;list.forEach(function(p){var dry=terrainAt(p.x,p.y)==='land'&&terrainAt(p.x-width,p.y)==='land'&&terrainAt(p.x+width,p.y)==='land';if(dry&&last){g.moveTo(last.x,last.y);g.lineTo(p.x,p.y);}last=dry?p:null;});}}
  g.save();g.globalAlpha=alpha*STORY_ROADS[route[0]];g.lineCap='round';g.lineJoin='round';
  /* Deck edges also read as small bridge railings over geographic water. */
  trace(points);g.strokeStyle='#bdc5b8';g.lineWidth=width+3;g.stroke();
  trace(points);g.strokeStyle='#8195a0';g.lineWidth=width;g.stroke();
  g.globalAlpha*=cloudEase(7,8.5,z);g.setLineDash([Math.max(4,width*.85),Math.max(7,width*1.5)]);trace(points);g.strokeStyle='#fff0ce';g.lineWidth=Math.max(.8,width*.15);g.stroke();g.setLineDash([]);
  g.globalAlpha=alpha*.75;
  STORY_BRIDGES.filter(function(b){return b.id===route[0];}).forEach(function(b){storyBridge(g,b,width);});
  g.restore();
 });
}

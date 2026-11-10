/* Decorative landmark spacing only. Geographic projection and data stay intact. */
var FLIGHT_FRAME={plane:null,flight:null};
var REPAIR={key:'',points:{},boxes:[]};
function repairPrepare(){
 var key=[S.center.lat,S.center.lng,S.zoom,W,H].join('/');if(key===REPAIR.key)return;
 REPAIR.key=key;
 var e=proj(HOMES.elena.lat,HOMES.elena.lng),b=proj(HOMES.bruce.lat,HOMES.bruce.lng);
 var m=proj((HOMES.elena.lat+HOMES.bruce.lat)/2,(HOMES.elena.lng+HOMES.bruce.lng)/2);
 var gap=Math.max(0,homeArtH(S.zoom)*1.45-(b.y-e.y)/2);
 e.y-=gap;b.y+=gap;b.x-=homeArtH(S.zoom)*.5;
 var dc=proj(38.8895,-77.0353),n=proj(38.79,-77.40);
 dc.x=Math.min(dc.x,m.x-homeArtH(S.zoom)*2.65);
 n.x=Math.min(n.x,m.x-homeArtH(S.zoom)*2.15);n.y=Math.max(n.y,m.y+homeArtH(S.zoom)*1.65);
 /* The wider civic facade needs a dry clearing on the western shore. */
 m.x-=homeArtH(S.zoom)*.7;
 REPAIR.points={elena:e,bruce:b,mail:m,dc:dc,'hb-nova':n};
 REPAIR.boxes=['elena','bruce','mail','dc','hb-nova'].map(repairBox);
}
function repairPoint(id){var p=REPAIR.points[id];return p?{x:p.x,y:p.y}:null;}
function repairBox(id){
 var p=repairPoint(id),h=homeArtH(S.zoom),w;
 if(id==='elena'){h*=1.12;w=h*.8;}
 else if(id==='bruce'){h*=.86;w=h*1.6;}
 else if(id==='mail'){h*=.82;w=h*1.35;}
 else if(id==='dc'){return{x:p.x-homeArtH(S.zoom)*1.35,y:p.y-homeArtH(S.zoom)*1.5,w:homeArtH(S.zoom)*2.5,h:homeArtH(S.zoom)*1.85,id:id};}
 else {h*=1.05;w=homeArtH(S.zoom)*1.55;}
 return{x:p.x-w/2,y:p.y-h,w:w,h:h,id:id};
}
function repairClear(x,y){return REPAIR.boxes.some(function(b){return x>b.x-16&&x<b.x+b.w+16&&y>b.y-12&&y<b.y+b.h+18;});}
function repairReserveLabels(){
 REPAIR.boxes.forEach(function(b){labelBoxes.push({x:b.x-8,y:b.y-8,w:b.w+16,h:b.h+16});});
 S.memories.forEach(function(m){var p=proj(m.lat,m.lng);labelBoxes.push({x:p.x-26,y:p.y-65,w:52,h:74});});
}
function repairFlightPath(){
 var f=FLIGHT_FRAME.flight;if(!f)return;
 ctx.save();ctx.setLineDash([7,9]);ctx.strokeStyle='rgba(255,247,228,.65)';ctx.lineWidth=2;
 for(var i=0;i<f.points.length-1;i++){ctx.beginPath();ctx.moveTo(f.points[i].x,f.points[i].y);ctx.quadraticCurveTo(f.ctrl[i].x,f.ctrl[i].y,f.points[i+1].x,f.points[i+1].y);ctx.stroke();}ctx.restore();
}

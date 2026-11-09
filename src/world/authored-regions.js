/* Ordinary-map painted regions only. Camera/proj/unproj and memory data are
   unchanged. UV points describe decorative artwork, not navigable geography. */
var PAINTED={current:null,rect:null,matrix:null,alpha:0,plane:null};
var PAINTED_REGIONS={
 maryland:{lat:38.86335,lng:-76.51815,radius:155,anchor:{u:.55,v:.585},width:700,
  atlas:'art/world/painted/maryland-atlas.webp',local:'art/world/painted/maryland-local.webp',
  points:{elena:{u:.545,v:.505,w:.19,h:.105},bruce:{u:.59,v:.68,w:.21,h:.09},mail:{u:.552,v:.583,w:.17,h:.075},dc:{u:.29,v:.445,w:.27,h:.095}},
  localPoints:{elena:{u:.54,v:.50,w:.075,h:.052},bruce:{u:.575,v:.672,w:.08,h:.04},mail:{u:.554,v:.581,w:.07,h:.035},dc:{u:.30,v:.44,w:.10,h:.05}}},
 nyc:{lat:40.758,lng:-73.9855,radius:125,anchor:{u:.67,v:.445},width:650,
  atlas:'art/world/painted/nyc-regional.webp',
  points:{nyc:{u:.67,v:.445,w:.56,h:.15}}}
};
Object.keys(PAINTED_REGIONS).forEach(function(id){var c=PAINTED_REGIONS[id];['atlas','local'].forEach(function(k){if(!c[k])return;var im=new Image();im.onload=function(){c[k+'Image']=im;};im.src=c[k];});});
function paintedSmooth(a,b,v){var t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);}
function paintedPrepare(){
 PAINTED.current=null;PAINTED.rect=null;PAINTED.alpha=0;
 if(S.mode!=='map'||SPECIAL.active)return;
 var chosen=null,best=Infinity;
 Object.keys(PAINTED_REGIONS).forEach(function(id){var c=PAINTED_REGIONS[id],d=haversine(S.center.lat,S.center.lng,c.lat,c.lng);if(d<c.radius&&d<best&&c.atlasImage){chosen=id;best=d;}});
 if(!chosen)return;
 var c=PAINTED_REGIONS[chosen],im=c.atlasImage,p=proj(c.lat,c.lng);
 /* Fixed Mercator-sized patch: pan/zoom remains the ordinary map transform. */
 var w=c.width*Math.pow(2,S.zoom-7.8),h=w*im.naturalHeight/im.naturalWidth;
 PAINTED.current=chosen;PAINTED.alpha=(1-paintedSmooth(c.radius*.8,c.radius,best))*paintedSmooth(5.8,6.8,S.zoom);
 var a=w,b=0,d=h,tx=p.x-c.anchor.u*w,ty=p.y-c.anchor.v*h;
 if(chosen==='maryland'){
  var e=proj(HOMES.elena.lat,HOMES.elena.lng),house=proj(HOMES.bruce.lat,HOMES.bruce.lng),dc=proj(38.8895,-77.0353);
  var extra=Math.max(0,110-(house.y-e.y)/2);e.y-=extra;house.y+=extra;
  var pe=c.points.elena,pb=c.points.bruce,pd=c.points.dc;
  a=Math.max(190,e.x-dc.x)/(pe.u-pd.u);
  d=(house.y-e.y)/(pb.v-pe.v);
  b=0; /* never shear pixel buildings or tilt their vertical walls */
  tx=(e.x+house.x)/2-a*(pe.u+pb.u)/2;ty=e.y-d*pe.v;
 }
 PAINTED.atlasMatrix={a:a,b:b,d:d,x:tx,y:ty};
 if(c.localPoints){var lp=c.localPoints,localD=(house.y-e.y)/(lp.bruce.v-lp.elena.v),localA=Math.max(190,e.x-dc.x)/(lp.elena.u-lp.dc.u);PAINTED.localMatrix={a:localA,b:0,d:localD,x:(e.x+house.x)/2-localA*(lp.elena.u+lp.bruce.u)/2,y:e.y-localD*lp.elena.v};}
 PAINTED.matrix=c.localPoints&&S.zoom>9.5?PAINTED.localMatrix:PAINTED.atlasMatrix;
 a=PAINTED.matrix.a;b=PAINTED.matrix.b;d=PAINTED.matrix.d;tx=PAINTED.matrix.x;ty=PAINTED.matrix.y;
 PAINTED.rect={x:Math.min(tx,tx+b),y:ty,w:a+Math.abs(b),h:d};
}
function paintedPoint(u,v){var m=PAINTED.matrix;return{x:m.x+m.a*u+m.b*v,y:m.y+m.d*v};}
function paintedBox(id){
 if(!PAINTED.current||PAINTED.alpha<.95)return null;
 var config=PAINTED_REGIONS[PAINTED.current],p=(config.localPoints&&S.zoom>9.5?config.localPoints:config.points)[id],g=PAINTED.rect;if(!p)return null;
 var q=paintedPoint(p.u,p.v),m=PAINTED.matrix,w=p.w*m.a+Math.abs(m.b)*p.h;
 return{x:q.x-w/2,y:q.y-p.h*m.d,w:w,h:p.h*m.d,baseY:q.y};
}
function paintedCovers(x,y){var m=PAINTED.matrix;if(!PAINTED.rect||PAINTED.alpha<.95)return false;var v=(y-m.y)/m.d,u=(x-m.x-m.b*v)/m.a;return u>0&&u<1&&v>0&&v<1;}
function drawPaintedRegion(){
 if(!PAINTED.current)return;
 var c=PAINTED_REGIONS[PAINTED.current],g=PAINTED.rect,m=PAINTED.atlasMatrix;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=PAINTED.alpha;
 ctx.transform(m.a/c.atlasImage.naturalWidth,0,m.b/c.atlasImage.naturalHeight,m.d/c.atlasImage.naturalHeight,m.x,m.y);ctx.drawImage(c.atlasImage,0,0);
 ctx.restore();
 if(c.localImage){m=PAINTED.localMatrix;ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=PAINTED.alpha*paintedSmooth(8.8,10.2,S.zoom);ctx.transform(m.a/c.localImage.naturalWidth,0,m.b/c.localImage.naturalHeight,m.d/c.localImage.naturalHeight,m.x,m.y);ctx.drawImage(c.localImage,0,0);ctx.restore();}
}
function paintedFillsView(){return paintedCovers(0,0)&&paintedCovers(W,0)&&paintedCovers(0,H)&&paintedCovers(W,H);}
function paintedFlightPath(){
 if(!PAINTED.current||!PAINTED.flight)return;
 ctx.save();ctx.setLineDash([7,9]);ctx.strokeStyle='rgba(255,247,228,.7)';ctx.lineWidth=2;
 var f=PAINTED.flight;for(var i=0;i<f.points.length-1;i++){ctx.beginPath();ctx.moveTo(f.points[i].x,f.points[i].y);ctx.quadraticCurveTo(f.ctrl[i].x,f.ctrl[i].y,f.points[i+1].x,f.points[i+1].y);ctx.stroke();}ctx.restore();
}
function paintedRegister(){
 ['elena','bruce'].forEach(function(who){var b=paintedBox(who);if(!b)return;HOMEBOXES[who]={x:b.x,y:b.y,w:b.w,h:b.h,sc:3,baseY:b.baseY};addHit(b,{kind:'home',who:who});});
 var mail=paintedBox('mail');if(mail)addHit(mail,{kind:'mail'});
 ['dc','nyc'].forEach(function(id){var b=paintedBox(id);if(b)addHit(b,{kind:'landmark',id:id});});
}
function paintedClipOutside(){
 var r=PAINTED.rect;if(!r||PAINTED.alpha<.95)return;
 var a=paintedPoint(0,0),b=paintedPoint(1,0),c=paintedPoint(1,1),d=paintedPoint(0,1);
 ctx.beginPath();ctx.rect(0,0,W,H);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.clip('evenodd');
}
function drawPaintedAvatars(){
 if(PAINTED.current!=='maryland'||PAINTED.alpha<.95||!S.who)return;
 [S.who,PR.partner?other(S.who):null].forEach(function(who){if(!who)return;var b=paintedBox(who);if(!b)return;var height=Math.min(80,b.h*.8),x=b.x-height*.35,y=b.baseY;var box=drawAvatar(ctx,who,x,y,height,null,{res:DPR});if(box)addHit(box,{kind:'avatar',who:who});});
}

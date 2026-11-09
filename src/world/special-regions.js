/* Deliberate special-region entry. Ordinary zoom thresholds never enter scenes.
   Scene camera and geography are connected by an invertible calibrated affine
   transform. There are no writes to memories, discoveries, or cloud storage. */
var SPECIAL = { active:null,camera:null,stack:[],assets:{},maps:{},busy:false,animation:false,fade:null,token:0 };
function specialForCity(id){return Object.keys(SPECIAL_REGIONS).map(function(k){return SPECIAL_REGIONS[k];}).filter(function(c){return c.city===id&&c.level==='area';})[0];}
Object.keys(SPECIAL_REGIONS).forEach(function(k){var c=SPECIAL_REGIONS[k];if(c.level==='area'&&!LANDMARKS.some(function(l){return l[0]===c.city;}))LANDMARKS.push([c.city,c.name,c.anchor.lat,c.anchor.lng,'skyline','An illustrated view of '+c.name+'.',1]);});
function specialMap(config){return SPECIAL.maps[config.id]||(SPECIAL.maps[config.id]=RegionMath.calibrate(config.points));}
function specialPose(){return{center:{lat:S.center.lat,lng:S.center.lng},zoom:S.zoom,mode:S.mode,view:S.view,globe:Object.assign({},S.globe)};}
function specialSetPose(p){S.center={lat:p.center.lat,lng:p.center.lng};S.zoom=p.zoom;S.mode=p.mode;S.view=p.view;if(p.globe)S.globe=Object.assign({},p.globe);baseDirty=true;}
function specialGeometry(config,camera){
  var image=SPECIAL.assets[config.asset],fit=Math.max(W/image.naturalWidth,H/image.naturalHeight),s=fit*camera.scale;
  return{w:image.naturalWidth*s,h:image.naturalHeight*s,x:W/2-camera.u*image.naturalWidth*s,y:H/2-camera.v*image.naturalHeight*s};
}
function specialClamp(){
  if(!SPECIAL.active)return;
  var g=specialGeometry(SPECIAL.active,SPECIAL.camera),c=SPECIAL.camera;
  c.u=RegionMath.clamp(c.u,Math.min(.5,W/(2*g.w)),Math.max(.5,1-W/(2*g.w)));
  c.v=RegionMath.clamp(c.v,Math.min(.5,H/(2*g.h)),Math.max(.5,1-H/(2*g.h)));
  var ll=RegionMath.unproject(specialMap(SPECIAL.active),c.u,c.v);S.center={lat:ll.lat,lng:ll.lng};
  S.zoom=12+Math.log(c.scale)/Math.LN2;
}
function specialProject(lat,lng){var uv=RegionMath.project(specialMap(SPECIAL.active),lat,lng),g=specialGeometry(SPECIAL.active,SPECIAL.camera);return{x:g.x+uv.u*g.w,y:g.y+uv.v*g.h};}
function specialUnproject(x,y){var g=specialGeometry(SPECIAL.active,SPECIAL.camera);return RegionMath.unproject(specialMap(SPECIAL.active),(x-g.x)/g.w,(y-g.y)/g.h);}
function specialContains(lat,lng){if(!SPECIAL.active)return false;var p=RegionMath.project(specialMap(SPECIAL.active),lat,lng);return p.u>=0&&p.u<=1&&p.v>=0&&p.v<=1;}
function specialPreload(config){
  if(SPECIAL.assets[config.asset])return Promise.resolve(SPECIAL.assets[config.asset]);
  return new Promise(function(resolve,reject){
    var im=new Image(),timer=setTimeout(function(){im.onload=im.onerror=null;reject(new Error('Artwork took too long to load.'));},15000);
    im.onload=function(){clearTimeout(timer);var done=function(){SPECIAL.assets[config.asset]=im;resolve(im);};if(im.decode)im.decode().then(done,function(){done();});else done();};
    im.onerror=function(){clearTimeout(timer);reject(new Error('Artwork could not be loaded.'));};
    im.src=WORLD_ASSETS[config.asset].path;
  });
}
function specialCapture(){var c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;c.getContext('2d').drawImage(cv,0,0);return c;}
function specialAnimate(duration,step){return new Promise(function(resolve){var start=performance.now();function tick(now){var t=duration?Math.min(1,(now-start)/duration):1;step(t,t*t*(3-2*t));if(t<1)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});}
function specialRefreshHud(){
  if(typeof pushPresence==='function')pushPresence(false);
  var hud=document.getElementById('specialHud');hud.hidden=!SPECIAL.active;
  if(SPECIAL.active){document.getElementById('specialName').textContent=SPECIAL.active.name;var parent=SPECIAL.stack[SPECIAL.stack.length-1];document.getElementById('specialBack').textContent=parent&&parent.active?'‹ Back to '+parent.active.name:'‹ Back to map';var h=document.getElementById('hopName');h.textContent=SPECIAL.active.name;h.title='Choose another place';}
}
function specialCancelPending(){if(SPECIAL.busy&&!SPECIAL.animation){SPECIAL.token++;SPECIAL.busy=false;}}
async function specialEnter(id,button){
  var config=SPECIAL_REGIONS[id];if(!config||SPECIAL.busy)return;
  var token=++SPECIAL.token;SPECIAL.busy=true;
  var oldText=button&&button.textContent;if(button){button.disabled=true;button.textContent='Loading artwork…';}
  try{await specialPreload(config);}catch(e){if(button){button.disabled=false;button.textContent=oldText;}if(token===SPECIAL.token){SPECIAL.busy=false;toast(e.message+' The current map is still here.','☁',4000);}return;}
  if(token!==SPECIAL.token){if(button){button.disabled=false;button.textContent=oldText;}return;}
  var previous={pose:specialPose(),active:SPECIAL.active,camera:SPECIAL.camera?Object.assign({},SPECIAL.camera):null};
  SPECIAL.stack.push(previous);closeSheet();stopPlacing();SPECIAL.animation=true;
  var camera={u:config.focus.u,v:config.focus.v,scale:1},from;
  if(!previous.active&&!reduceMotion){
    S.mode='map';
    var endZoom=Math.min(12.2,Math.max(config.worldZoom,S.zoom+.6));
    var geometry=specialGeometry(config,camera),uv=RegionMath.project(specialMap(config),config.anchor.lat,config.anchor.lng);
    var endX=lngToWX(config.anchor.lng,endZoom)-(geometry.x+uv.u*geometry.w-W/2);
    var endY=latToWY(config.anchor.lat,endZoom)-(geometry.y+uv.v*geometry.h-H/2);
    var endCenter={lng:wxToLng(endX,endZoom),lat:wyToLat(endY,endZoom)},start=previous.pose;
    await specialAnimate(config.transition.cameraMs,function(t,e){S.center.lat=start.center.lat+(endCenter.lat-start.center.lat)*e;S.center.lng=start.center.lng+(endCenter.lng-start.center.lng)*e;S.zoom=start.zoom+(endZoom-start.zoom)*e;baseDirty=true;draw();});
  }else if(previous.active&&!reduceMotion){
    var sourceCamera=previous.camera,goal=RegionMath.project(specialMap(previous.active),config.anchor.lat,config.anchor.lng);
    var nextScale=Math.min(3,sourceCamera.scale*1.35);
    await specialAnimate(config.transition.cameraMs,function(t,e){SPECIAL.camera.u=sourceCamera.u+(goal.u-sourceCamera.u)*e;SPECIAL.camera.v=sourceCamera.v+(goal.v-sourceCamera.v)*e;SPECIAL.camera.scale=sourceCamera.scale+(nextScale-sourceCamera.scale)*e;specialClamp();draw();});
  }
  previous.entryPose=specialPose();previous.transitionCamera=SPECIAL.camera?Object.assign({},SPECIAL.camera):null;
  from=specialCapture();SPECIAL.active=config;SPECIAL.camera=camera;S.mode='map';specialClamp();specialRefreshHud();
  await specialAnimate(reduceMotion?0:config.transition.blendMs,function(t){SPECIAL.fade={image:from,alpha:1-t};draw();});
  SPECIAL.fade=null;SPECIAL.busy=false;SPECIAL.animation=false;draw();
}
async function specialBack(){
  if(SPECIAL.busy&&!SPECIAL.animation)specialCancelPending();
  if(!SPECIAL.active||SPECIAL.busy)return;
  var previous=SPECIAL.stack.pop();if(!previous)return;
  var image=specialCapture(),near=specialPose();SPECIAL.busy=true;SPECIAL.animation=true;
  SPECIAL.active=previous.active;SPECIAL.camera=previous.camera;specialRefreshHud();
  if(previous.active){
    var source=previous.transitionCamera||previous.camera,target=previous.camera;
    SPECIAL.camera=Object.assign({},source);specialClamp();
    await specialAnimate(reduceMotion?0:900,function(t,e){SPECIAL.camera.u=source.u+(target.u-source.u)*e;SPECIAL.camera.v=source.v+(target.v-source.v)*e;SPECIAL.camera.scale=source.scale+(target.scale-source.scale)*e;specialClamp();SPECIAL.fade={image:image,alpha:Math.max(0,1-t*2.6)};draw();});
    specialSetPose(previous.pose);specialClamp();
  }else{
    S.mode='map';
    // Begin at the scene's geographic anchor, then return to the saved camera.
    var entry=previous.entryPose||near,lat=RegionMath.clamp(entry.center.lat,5,62),lng=entry.center.lng;
    await specialAnimate(reduceMotion?0:900,function(t,e){S.center.lat=lat+(previous.pose.center.lat-lat)*e;S.center.lng=lng+(previous.pose.center.lng-lng)*e;S.zoom=entry.zoom+(previous.pose.zoom-entry.zoom)*e;baseDirty=true;SPECIAL.fade={image:image,alpha:Math.max(0,1-t*2.6)};draw();});
    specialSetPose(previous.pose);setViewButtons(previous.pose.view);renderHop();
  }
  SPECIAL.fade=null;SPECIAL.busy=false;SPECIAL.animation=false;draw();
}
function specialLeaveForNavigation(){
  specialCancelPending();if(!SPECIAL.active||SPECIAL.animation)return;
  var first=SPECIAL.stack[0];SPECIAL.active=null;SPECIAL.camera=null;SPECIAL.stack=[];SPECIAL.fade=null;
  if(first)specialSetPose(first.pose);specialRefreshHud();renderHop();
}
function specialPan(dx,dy){if(SPECIAL.animation)return;var g=specialGeometry(SPECIAL.active,SPECIAL.camera);SPECIAL.camera.u-=dx/g.w;SPECIAL.camera.v-=dy/g.h;specialClamp();draw();}
function specialZoom(d,at){
  if(SPECIAL.busy)return;
  var next=SPECIAL.camera.scale*Math.exp(d*1.2);
  if(d<0&&next<.88){specialBack();return;}
  var ll=at?specialUnproject(at.x,at.y):null;
  SPECIAL.camera.scale=RegionMath.clamp(next,SPECIAL.active.zoomRange[0],SPECIAL.active.zoomRange[1]);
  if(at&&ll){var p=specialProject(ll.lat,ll.lng),g=specialGeometry(SPECIAL.active,SPECIAL.camera);SPECIAL.camera.u+=(p.x-at.x)/g.w;SPECIAL.camera.v+=(p.y-at.y)/g.h;}
  specialClamp();draw();
}
function specialFocus(lat,lng,z){var p=RegionMath.project(specialMap(SPECIAL.active),lat,lng);SPECIAL.camera.u=p.u;SPECIAL.camera.v=p.v;if(typeof z==='number')SPECIAL.camera.scale=RegionMath.clamp(Math.pow(2,z-12),1,3);specialClamp();draw();}
function specialPoint(config,id){return config.points.filter(function(p){return p.id===id;})[0];}
function specialLanding(id){
  var config=SPECIAL_REGIONS[id];if(!config)return;
  var memories=nearbyList(config.anchor.lat,config.anchor.lng,10);
  openSheet(head(config.name,'A closer view of our world')+'<p class="note">Explore the illustrated '+(config.level==='closeup'?'waterfront':'region')+', pan around, and revisit memories at their mapped locations.</p>'+listHtml(memories,'No memories here yet.')+'<div class="sheet-actions"><button class="pxbtn primary" data-act="region-open" data-region="'+id+'">Explore Closer</button><button class="pxbtn" data-act="close">Close</button></div>');
}
function specialOpenPoint(id){
  var config=SPECIAL.active,p=specialPoint(config,id);if(!p)return;
  var portal=config.portals.filter(function(p){return p.point===id;})[0];
  openSheet(head(p.name,config.name)+'<div class="sheet-actions">'+(portal?'<button class="pxbtn primary" data-act="region-open" data-region="'+portal.target+'">Explore Closer</button>':'')+'<button class="pxbtn" data-act="mem-at" data-lat="'+p.lat+'" data-lng="'+p.lng+'">Add a memory here</button><button class="pxbtn" data-act="close">Close</button></div>');
}
function specialRipples(config,g){
  if(reduceMotion)return;
  ctx.save();ctx.strokeStyle='rgba(255,236,213,.25)';ctx.lineWidth=1.5;
  config.ripples.forEach(function(p,i){var phase=(cloudPhase/32+i*.4)%1,x=g.x+p.u*g.w,y=g.y+p.v*g.h;ctx.globalAlpha=Math.sin(phase*Math.PI)*.5;ctx.beginPath();ctx.ellipse(x,y,8+phase*12,2+phase*3,0,0,Math.PI*2);ctx.stroke();});
  if(config.waterfall){var w=config.waterfall,x=g.x+w.u*g.w,y=g.y+w.v*g.h;ctx.fillStyle='#e7faff';for(var i=0;i<3;i++){ctx.globalAlpha=.16;ctx.fillRect(x+(i%2)*3,y+(cloudPhase*.8+i*7)%23,6,2);}}
  ctx.restore();
}
function drawSpecialRegion(){
  if(!SPECIAL.active)return false;
  specialClamp();var config=SPECIAL.active,g=specialGeometry(config,SPECIAL.camera);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(SPECIAL.assets[config.asset],g.x,g.y,g.w,g.h);
  hitboxes=[];labelBoxes=[];HOMEBOXES={};specialRipples(config,g);
  config.points.forEach(function(p){var q=specialProject(p.lat,p.lng);if(q.x<0||q.x>W||q.y<55||q.y>H-110)return;
    var portal=config.portals.filter(function(g){return g.point===p.id;})[0];
    if(portal){drawArt(ctx,'sign',q.x,q.y,35,DPR);tryLabel(q.x,q.y+22,'Waterfront · Explore Closer',{size:13,bg:'#fff0d7',border:'#8a5638',fg:'#654338'});}
    if(portal)addHit({x:q.x-25,y:q.y-32,w:50,h:50},{kind:'scene-point',id:p.id});
  });
  (S.plans||[]).forEach(function(p){if(!specialContains(p.lat,p.lng))return;var q=specialProject(p.lat,p.lng);ctx.fillStyle='#fff0ba';ctx.strokeStyle='#855c3b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x,q.y-10,13,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#8e3a57';ctx.font='18px "Pixelify Sans",monospace';ctx.textAlign='center';ctx.fillText('★',q.x,q.y-4);addHit({x:q.x-22,y:q.y-32,w:44,h:44},{kind:'plan',id:p.id});});
  (S.surprises||[]).forEach(function(s){if(!specialContains(s.lat,s.lng))return;var q=specialProject(s.lat,s.lng),b=drawSprite(ctx,SP.envelope,PAL.env,q.x,q.y,3,'#fff2df');addHit({x:b.x-6,y:b.y-6,w:b.w+12,h:b.h+12},{kind:'surprise',id:s.id});});
  drawSpecialVisitors(config,g);drawMemoryMarkers(true);return true;
}
function specialVisitorList(config){
  var visitors=S.who?[S.who]:[];
  if(typeof PR!=='undefined'&&PR.partner&&PR.partner.scene===config.city)visitors.push(other(S.who));
  return visitors;
}
function drawSpecialVisitors(config,g){
  if(!config.visitors)return;
  var people=specialVisitorList(config),height=Math.min(116,g.h*.105),gap=height*.60;
  people.sort(function(a,b){return a==='bruce'?-1:b==='bruce'?1:0;});
  people.forEach(function(who,i){
    var x=g.x+config.visitors.u*g.w+(i-(people.length-1)/2)*gap,y=g.y+config.visitors.v*g.h;
    var box=drawAvatar(ctx,who,x,y,height,null,{res:DPR});
    if(box)addHit(box,{kind:'avatar',who:who});
  });
}
function specialDrawFade(){if(SPECIAL.fade){ctx.save();ctx.globalAlpha=SPECIAL.fade.alpha;ctx.imageSmoothingEnabled=false;ctx.drawImage(SPECIAL.fade.image,0,0,SPECIAL.fade.image.width,SPECIAL.fade.image.height,0,0,W,H);ctx.restore();}}
ACTIONS['region-open']=function(b){specialEnter(b.dataset.region,b);};
ACTIONS['region-card']=function(b){specialLanding(b.dataset.region);};
document.getElementById('specialBack').addEventListener('click',specialBack);
document.addEventListener('click',function(e){if(e.target.closest('[data-act="close"]'))specialCancelPending();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){specialCancelPending();if(SPECIAL.active&&!sheet.classList.contains('open')&&!S.placing&&!lbEl.classList.contains('on')&&!calEl.classList.contains('open'))specialBack();}});

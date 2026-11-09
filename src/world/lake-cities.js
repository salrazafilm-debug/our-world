/* Distinct ordinary-map landmark compositions. Existing anchors, planned-trip
   status, landmark actions, and the Chicago → Milwaukee flight are unchanged. */
var LAKE_CITY_ART={chicago:'city-chicago-simple',milwaukee:'city-milwaukee-simple'},LAKE_CITY_BOXES=[];
Object.keys(LAKE_CITY_ART).forEach(function(id){artLoad(LAKE_CITY_ART[id]);});
function drawLakeCity(lm,p){
 var name=LAKE_CITY_ART[lm[0]];if(!name)return false;
 var north=proj(43.0389,-87.9065),south=proj(41.8781,-87.6298);
 var separation=Math.abs(north.y-south.y);
 var h=Math.max(24,Math.min(90,64+(S.zoom-5.5)*10,separation*.65));
 var asset=artLoad(name);if(asset.ok)h=Math.min(h,120*asset.img.height/asset.img.width);
 var box=drawArt(ctx,name,p.x,p.y,h,DPR);if(!box)return false;
 LAKE_CITY_BOXES.push(box);labelBoxes.push({x:box.x-4,y:box.y-24,w:box.w+8,h:box.h+30});
 if(S.zoom>5.2&&separation>85){
  ctx.save();ctx.font='600 13px "Pixelify Sans",monospace';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#fff2df';ctx.strokeText(lm[1],p.x,box.y-8);ctx.fillStyle='#5e2238';ctx.fillText(lm[1],p.x,box.y-8);ctx.restore();
 }
 addHit({x:box.x-6,y:box.y-22,w:box.w+12,h:box.h+28},{kind:'landmark',id:lm[0]});
 return true;
}
function lakeCityClipAtmosphere(){
 if(!LAKE_CITY_BOXES.length)return;
 ctx.beginPath();ctx.rect(0,0,W,H);
 LAKE_CITY_BOXES.forEach(function(b){ctx.rect(b.x-6,b.y-24,b.w+12,b.h+30);});
 ctx.clip('evenodd');
}

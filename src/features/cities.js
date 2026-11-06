/* Cities unfold from one atlas silhouette into a walkable-looking district.
   Public landmark anchors are factual; small background blocks are decorative. */
var CITY_ART=['city-capitol','city-whitehouse','city-monument','city-lincoln','city-liberty','city-empire','city-chrysler','city-brownstones','city-rowhouses','city-towers','city-museum'];
CITY_ART.forEach(artLoad);
function cityDetail(z){return Math.max(0,Math.min(1,(z-10.2)/1.6));}
function cityContains(c,lat,lng){var b=c.bounds;return lat>=b[0]&&lng>=b[1]&&lat<=b[2]&&lng<=b[3];}
function cityZoneAt(lat,lng){return S.zoom>9.4&&CITY_ATLAS.some(function(c){return cityContains(c,lat,lng);});}
function cityOwnsLabel(lat,lng){return S.zoom>6.5&&CITY_ATLAS.some(function(c){return cityContains(c,lat,lng);});}
function cityRingHas(r,lat,lng){
  var inside=false;
  for(var i=0,j=r.length-1;i<r.length;j=i++)if((r[i][0]>lat)!==(r[j][0]>lat)&&lng<(r[j][1]-r[i][1])*(lat-r[i][0])/(r[j][0]-r[i][0])+r[i][1])inside=!inside;
  return inside;
}
function cityOpenSpace(c,lat,lng){return c.parks.concat(c.water).some(function(p){return cityRingHas(p.ring,lat,lng);});}
function cityBlockClear(c,p,size){
  return [[0,0],[-size*.45,-size],[size*.45,-size],[0,-size*.5]].every(function(d){var a=unproj(p.x+d[0],p.y+d[1]);return !cityOpenSpace(c,a.lat,a.lng);});
}
function cityPath(g,points){g.beginPath();points.forEach(function(a,i){var p=proj(a[0],a[1]);if(i)g.lineTo(p.x,p.y);else g.moveTo(p.x,p.y);});}
function cityShape(g,ring,fill){cityPath(g,ring);g.closePath();g.fillStyle=fill;g.fill();}
function cityVisible(c){var a=proj(c.bounds[0],c.bounds[1]),b=proj(c.bounds[2],c.bounds[3]);return !(a.x>W+150||b.x<-150||a.y<-150||b.y>H+150)||c.landmarks.some(function(l){var p=proj(l[2],l[3]);return p.x>-100&&p.x<W+100&&p.y>-100&&p.y<H+150;});}
function drawCityGround(g){
  var alpha=cityDetail(S.zoom);if(alpha<.01)return;
  CITY_ATLAS.forEach(function(c){
    if(!cityVisible(c))return;
    g.save();g.globalAlpha=alpha;
    /* A quiet paved district surface separates urban blocks from countryside.
       Feather its extent, and retain geographic water and park shapes. */
    var cb=c.bounds;
    for(var sy=0;sy<H;sy+=10)for(var sx=0;sx<W;sx+=10){
      var at=unproj(sx,sy);if(!cityContains(c,at.lat,at.lng)||terrainAt(sx,sy)!=='land')continue;
      var edge=Math.min((at.lat-cb[0])/(cb[2]-cb[0]),(cb[2]-at.lat)/(cb[2]-cb[0]),(at.lng-cb[1])/(cb[3]-cb[1]),(cb[3]-at.lng)/(cb[3]-cb[1]));
      g.fillStyle='rgba(201,191,171,'+(Math.min(.8,edge*7))+')';g.fillRect(sx,sy,10,10);
    }
    /* Soft earth-colored street blocks leave the larger geographic land intact. */
    var step=c.kind==='metro'?.0030:.0033,items=[];
    var b=c.bounds,tl=unproj(-80,H+100),br=unproj(W+80,-100);
    var minLat=Math.max(b[0],tl.lat),maxLat=Math.min(b[2],br.lat),minLng=Math.max(b[1],tl.lng),maxLng=Math.min(b[3],br.lng);
    for(var gy=Math.floor(minLat/step);gy<=Math.ceil(maxLat/step);gy++)for(var gx=Math.floor(minLng/step);gx<=Math.ceil(maxLng/step);gx++){
      var lat=(gy+.5)*step,lng=(gx+.5)*step,p=proj(lat,lng);
      if(!cityContains(c,lat,lng)||cityOpenSpace(c,lat,lng)||terrainAt(p.x,p.y)!=='land'||scenicAvoid(p.x,p.y,12))continue;
      var near=c.landmarks.some(function(l){var q=proj(l[2],l[3]);return Math.hypot(p.x-q.x,p.y-q.y)<12;});if(near)continue;
      var seed=Math.floor(terHash(gx,gy,190)*1000),size=Math.max(30,Math.min(55,30+(S.zoom-11.4)*10));
      if(seed%10>1||!cityBlockClear(c,p,size))continue;
      items.push({x:p.x,y:p.y,size:size,seed:seed});
    }
    /* Thin evenly by a world seed before depth sorting; never truncate only
       the northern rows of the city when limiting phone draw cost. */
    if(items.length>260)items=items.sort(function(a,b){return a.seed-b.seed;}).slice(0,260);
    items.sort(function(a,b){return a.y-b.y;});
    /* Render the urban surface and its streets before the raised buildings. */
    c.parks.forEach(function(p){cityShape(g,p.ring,'#86ae70');g.strokeStyle='#c5d49b';g.lineWidth=3;g.stroke();});
    c.water.forEach(function(p){cityShape(g,p.ring,'#52b5ce');g.strokeStyle='#dce5b7';g.lineWidth=2;g.stroke();});
    c.streets.forEach(function(s){cityPath(g,s[1]);g.strokeStyle='#b49d83';g.lineWidth=Math.max(4,Math.min(14,kmToPx(.035)));g.stroke();g.strokeStyle='#f0dfb8';g.lineWidth=Math.max(2,Math.min(10,kmToPx(.024)));g.stroke();});
    items.forEach(function(it){var art=c.kind==='metro'?(it.seed%3?'city-towers':'city-brownstones'):'city-rowhouses';drawArt(g,art,it.x,it.y,it.size,1);});
    /* Public parks get planted edges, while their interiors stay open. */
    c.parks.forEach(function(p){for(var i=0;i<p.ring.length;i++){
      var a=p.ring[i],b=p.ring[(i+1)%p.ring.length];
      for(var t=.1;t<1;t+=.2){var q=proj(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t);drawArt(g,i%2?'story-oak':'story-cherry',q.x,q.y,Math.max(12,Math.min(28,12+(S.zoom-11)*5)),1);}
    }});
    g.restore();
  });
}
function cityFind(id){return CITY_ATLAS.filter(function(c){return c.id===id;})[0];}
function cityExplore(id){var c=cityFind(id);if(c){closeSheet();flyTo(c.lat,c.lng,c.z);}}
ACTIONS['city-explore']=function(b){cityExplore(b.dataset.city);};
function cityOpenItem(item){
  var c=cityFind(item.city);if(!c)return;
  if(item.kind==='city'){cityExplore(c.id);return;}
  var l=c.landmarks.filter(function(l){return l[0]===item.id;})[0];if(!l)return;
  openSheet(head(l[1],c.name)+'<p class="note">'+(c.id==='dc'?'A place along Washington’s civic streets and open parkland.':c.id==='nyc'?'One of the real places that make up New York’s neighborhoods.':'A public landmark in '+esc(c.name)+'.')+'</p><div class="sheet-actions"><button class="pxbtn" data-act="goto" data-lat="'+l[2]+'" data-lng="'+l[3]+'" data-z="14">Explore here</button><button class="pxbtn" data-act="close">Close</button></div>');
}
function cityAtlasList(){return '<h3 style="font-family:var(--fdisp)">Explore the atlas</h3><p class="hint">Cities to look around. Exploring the map does not record a visit.</p><div class="sheet-actions">'+CITY_ATLAS.map(function(c){return '<button class="pxbtn" data-act="city-explore" data-city="'+c.id+'">'+esc(c.name)+'</button>';}).join('')+'</div>';}
HOOKS.beforePins.push(function(){
  if(S.mode!=='map'||S.zoom<6.5)return;
  var detail=cityDetail(S.zoom);
  CITY_ATLAS.forEach(function(c){
    if(!cityVisible(c))return;
    var p=proj(c.lat,c.lng);
    if(detail<1){
      ctx.save();ctx.globalAlpha=1-detail;
      var box=drawArt(ctx,c.icon,p.x,p.y,Math.max(40,Math.min(108,48+(S.zoom-7)*12)),DPR);ctx.restore();
      if(box&&detail<.5){addHit(box,{kind:'city',city:c.id});tryLabel(p.x,box.y-5,c.name,{size:13,force:1,bg:'#fff0d9',border:'#b08b6c',fg:'#65424a'});}
    }
    if(detail<=0)return;
    ctx.save();ctx.globalAlpha=detail;
    c.landmarks.slice().sort(function(a,b){return b[2]-a[2];}).forEach(function(l){
      var q=proj(l[2],l[3]);if(q.x<-100||q.x>W+100||q.y<-80||q.y>H+130)return;
      var h=Math.round(Math.max(24,Math.min(c.kind==='metro'?105:78,26+(S.zoom-10.2)*18))*(l[5]||1)),box;
      if(CITY_ART.indexOf(l[4])>=0||l[4]==='story-pier')box=drawArt(ctx,l[4],q.x,q.y,h,DPR);
      else if(l[4]==='stadium'){
        var w=h*1.2;ctx.fillStyle='#a18b85';ctx.fillRect(q.x-w/2,q.y-h*.5,w,h*.55);ctx.fillStyle='#72a475';ctx.fillRect(q.x-w*.35,q.y-h*.4,w*.7,h*.35);ctx.strokeStyle='#f5e6bd';ctx.lineWidth=2;ctx.strokeRect(q.x-w*.35,q.y-h*.4,w*.7,h*.35);box={x:q.x-w/2,y:q.y-h*.5,w:w,h:h*.55};
      }else box=drawArt(ctx,l[4]==='metro'?'city-towers':'city-museum',q.x,q.y,h,DPR);
      if(box&&detail>=.5){addHit(box,{kind:'cityplace',city:c.id,id:l[0]});if(q.x>70&&q.x<W-70)tryLabel(q.x,box.y-4,l[1],{size:13,fg:'#594150',bg:'#fff1db',border:'#c4a787'});}
    });
    ctx.restore();
    if(S.zoom>11.7)c.parks.forEach(function(park){var a=park.ring,lat=0,lng=0;a.forEach(function(p){lat+=p[0];lng+=p[1];});var p=proj(lat/a.length,lng/a.length);if(p.x>0&&p.x<W&&p.y>60&&p.y<H-90)tryLabel(p.x,p.y,park.name,{size:13,bg:'#c9d5a2',fg:'#416342'});});
    if(S.zoom>13)c.streets.forEach(function(s){var a=s[1][0],b=s[1][s[1].length-1],p=proj((a[0]+b[0])/2,(a[1]+b[1])/2);if(p.x>65&&p.x<W-65&&p.y>70&&p.y<H-100)tryLabel(p.x,p.y,s[0],{size:13,fg:'#745b4c',bg:'#f4e1bc'});});
  });
});

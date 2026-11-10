/* An authored civic garden around the existing DC display anchor.
   Decorative only: all map coordinates, memories and city actions are intact. */
function drawDCGardens(g){
 var p=repairPoint('dc'),u=homeArtH(S.zoom);
 if(!p||p.x<-u*2||p.x>W+u*2||p.y<-u*2||p.y>H+u)return;
 g.save();g.beginPath();
 for(var y=p.y-u*1.5;y<p.y+u*.36;y+=5)for(var x=p.x-u*1.4;x<p.x+u*1.2;x+=5)if(terrainAt(x,y)==='land')g.rect(x,y,5,5);
 g.clip();
 g.fillStyle='#90ae67';g.beginPath();g.ellipse(p.x-u*.1,p.y-u*.35,u*1.28,u*.65,0,0,7);g.fill();
 /* A quiet town edge behind the civic grounds, below the Capitol silhouette. */
 drawArt(g,'story-cottage',p.x+u*.59,p.y-u*.55,u*.33,1);
 drawArt(g,'story-cottage',p.x+u*.95,p.y-u*.52,u*.28,1);
 /* Rounded stone promenade surrounding an open central lawn. */
 g.strokeStyle='#9c916e';g.lineWidth=8;g.beginPath();g.ellipse(p.x-u*.1,p.y-u*.03,u*1.13,u*.28,0,0,7);g.stroke();
 g.strokeStyle='#e4d2a5';g.lineWidth=5;g.stroke();
 g.fillStyle='#b4c57d';g.beginPath();g.ellipse(p.x-u*.1,p.y-u*.03,u*.93,u*.16,0,0,7);g.fill();
 /* Small formal reflecting pool, gardens and benches in the forecourt. */
 var pool={x:p.x-u*.65,y:p.y+u*.02,w:u*.45,h:u*.12};
 scenicMark(g,pool.x-2,pool.y-2,'#dfd2b1',pool.w+4,pool.h+4);scenicMark(g,pool.x,pool.y,'#559fae',pool.w,pool.h);scenicMark(g,pool.x+3,pool.y+2,'#b0ddda',pool.w*.55,2);
 [[-.95,-.22],[.68,-.18],[-.9,.20],[.57,.20]].forEach(function(a,i){var x=p.x+a[0]*u,y=p.y+a[1]*u;drawArt(g,'pack-flowers',x,y,u*.20,1);
  if(i<2){scenicMark(g,x-5,y+6,'#705345',12,3);scenicMark(g,x-4,y+9,'#4d493c',2,4);scenicMark(g,x+4,y+9,'#4d493c',2,4);}
 });
 var trees=[[-1.18,-.18],[-1.12,-.72],[-.85,-1.02],[.82,-.3],[.9,-.74],[.5,-1.05],[-1.06,.30],[.87,.30]];
 trees.map(function(a,i){return{x:p.x+a[0]*u,y:p.y+a[1]*u,h:u*(i%3?.42:.5),name:i%3?'pack-cherry':'pack-pine'};}).sort(function(a,b){return a.y-b.y;}).forEach(function(t){drawArt(g,t.name,t.x,t.y,t.h,1);});
 g.restore();
}

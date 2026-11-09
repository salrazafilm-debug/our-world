/* Pure geographic/artwork transforms. Existing memory coordinates never change. */
var RegionMath = (function () {
  function geo(lat,lng){var s=Math.sin(Math.max(-85,Math.min(85,lat))*Math.PI/180);return{x:(lng+180)/360*256,y:256*(.5-Math.log((1+s)/(1-s))/(4*Math.PI))};}
  function ll(x,y){var n=Math.PI-2*Math.PI*y/256;return{lng:x/256*360-180,lat:180/Math.PI*Math.atan(Math.sinh(n))};}
  function calibrate(points){
    var p=points.map(function(p){var a=geo(p.lat,p.lng);return{x:a.x,y:a.y,u:p.u,v:p.v};});
    var x1=p[1].x-p[0].x,y1=p[1].y-p[0].y,x2=p[2].x-p[0].x,y2=p[2].y-p[0].y;
    var det=x1*y2-x2*y1;if(Math.abs(det)<1e-10)throw new Error('Region control points must not be collinear.');
    var u1=p[1].u-p[0].u,u2=p[2].u-p[0].u,v1=p[1].v-p[0].v,v2=p[2].v-p[0].v;
    var a=(u1*y2-u2*y1)/det,b=(x1*u2-x2*u1)/det,c=(v1*y2-v2*y1)/det,d=(x1*v2-x2*v1)/det;
    var inverse=a*d-b*c;if(Math.abs(inverse)<1e-9)throw new Error('Artwork control points must not be collinear.');
    return{a:a,b:b,c:c,d:d,tx:p[0].u-a*p[0].x-b*p[0].y,ty:p[0].v-c*p[0].x-d*p[0].y,det:inverse};
  }
  function project(m,lat,lng){var p=geo(lat,lng);return{u:m.a*p.x+m.b*p.y+m.tx,v:m.c*p.x+m.d*p.y+m.ty};}
  function unproject(m,u,v){var x=u-m.tx,y=v-m.ty;return ll((m.d*x-m.b*y)/m.det,(-m.c*x+m.a*y)/m.det);}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  return{geo:geo,ll:ll,calibrate:calibrate,project:project,unproject:unproject,clamp:clamp};
})();

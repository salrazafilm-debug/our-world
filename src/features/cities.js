/* Authored settlement districts. These are fixed compositions, not a prop
   scatter: each place has a centre, a readable clearing and a small group of
   buildings that gives the map a sense of scale. */
var OW_CITY_DISTRICTS = [
  { id:'dc', name:'Washington, DC', lat:38.9072, lng:-77.0369, kind:'dc', buildings:[
    ['dc/capitol',38.8899,-77.0091,78], ['dc/monument',38.8895,-77.0353,82],
    ['dc/lincoln',38.8893,-77.0502,64], ['dc/jefferson',38.8814,-77.0365,58],
    ['dc/museum',38.8882,-77.0261,49], ['dc/white-house',38.8977,-77.0365,45],
    ['dc/cathedral',38.9300,-77.0700,46]
  ]},
  { id:'baltimore', name:'Baltimore', lat:39.2904, lng:-76.6122, kind:'city', buildings:[
    ['city/row',39.2890,-76.6105,64], ['city/cafe',39.2865,-76.6040,38],
    ['city/church',39.2940,-76.6180,42], ['city/shop',39.2980,-76.6080,36]
  ]},
  { id:'annapolis', name:'Annapolis', lat:38.9784, lng:-76.4922, kind:'coast', buildings:[
    ['city/row',38.9780,-76.4930,56], ['city/cafe',38.9755,-76.4870,35],
    ['city/church',38.9820,-76.4980,39], ['city/home',38.9740,-76.5000,32]
  ]},
  { id:'wilmington', name:'Wilmington', lat:39.7459, lng:-75.5466, kind:'city', buildings:[
    ['city/row',39.7460,-75.5470,58], ['city/shop',39.7500,-75.5410,35],
    ['city/church',39.7415,-75.5520,40], ['city/cafe',39.7500,-75.5550,34]
  ]},
  { id:'chesapeake', name:'Chesapeake Beach', lat:38.6935, lng:-76.5333, kind:'coast', buildings:[
    ['city/home',38.6960,-76.5350,35], ['city/cafe',38.6910,-76.5290,34],
    ['city/shop',38.6890,-76.5370,30]
  ]}
];

function owDistrictVisible(d) {
  var p = proj(d.lat, d.lng);
  return !(p.x < -220 || p.y < -220 || p.x > W + 220 || p.y > H + 220);
}
function owDistrictLabel(x, y, name, size) {
  tryLabel(x, y, name, { size:size, force:1, bg:'rgba(255,247,242,.82)', border:'rgba(142,58,87,.72)', fg:'#6D2947' });
}
function owDistrictGround(d) {
  var p = proj(d.lat, d.lng), s = PIXEL;
  ctx.save();
  ctx.fillStyle = d.kind === 'coast' ? 'rgba(255,242,204,.52)' : 'rgba(251,235,214,.48)';
  ctx.strokeStyle = 'rgba(231,183,101,.72)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, d.kind === 'dc' ? 112 : 78, d.kind === 'dc' ? 58 : 44, 0, 0, 6.283); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(138,86,56,.45)'; ctx.lineWidth = Math.max(2, 5 / s); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(p.x - 66, p.y + 28); ctx.quadraticCurveTo(p.x, p.y - 2, p.x + 70, p.y + 24); ctx.stroke();
  ctx.restore();
}
function drawDistrict(d) {
  if (!owDistrictVisible(d) || S.zoom < 7.15) return;
  var p = proj(d.lat, d.lng), z = S.zoom, scale = z < 8.2 ? 0.58 : (z < 9.4 ? 0.78 : 1);
  /* At regional scale a city is a quiet anchor label, not five overlapping
     stickers. The authored district opens only when the camera is close
     enough to read its buildings. */
  if (z < 8.35) {
    if (d.kind === 'dc' || d.kind === 'city') owDistrictLabel(p.x, p.y + 24, d.name, 12);
    return;
  }
  owDistrictGround(d);
  d.buildings.slice().sort(function(a,b){ return a[2] - b[2]; }).forEach(function (b, i) {
    var q = proj(b[1], b[2]);
    var h = b[3] * scale * (d.kind === 'dc' && i < 4 ? 1 : 0.86);
    if (q.x < -180 || q.y < -180 || q.x > W + 180 || q.y > H + 180) return;
    drawArt(ctx, b[0], q.x, q.y, h, DPR);
  });
  owDistrictLabel(p.x, p.y + (d.kind === 'dc' ? 76 : 58), d.name, d.kind === 'dc' ? 14 : 12);
}

/* Add the wider, recognisable urban anchors before the smaller town labels. */
HOOKS.terrain.push(function () {
  if (S.mode !== 'map') return;
  OW_CITY_DISTRICTS.forEach(drawDistrict);
});

/* The reference treats the Delaware side as a real water corridor. Strengthen
   that existing geography with a restrained illustrated bay wash behind the
   roads and sprites; it is deliberately a stroke, not a rectangular overlay. */
HOOKS.afterBase.push(function () {
  if (S.mode !== 'map' || S.zoom < 6.4) return;
  var pts = [[39.43,-75.57],[39.25,-75.67],[39.06,-75.72],[38.86,-75.78],[38.66,-75.82],[38.48,-75.77]];
  var q = pts.map(function (v) { var p = proj(v[0], v[1]); return { x:p.x / PIXEL, y:p.y / PIXEL }; });
  baseCtx.save(); baseCtx.lineCap = 'round'; baseCtx.lineJoin = 'round';
  baseCtx.strokeStyle = 'rgba(68,156,210,.20)'; baseCtx.lineWidth = 34 / PIXEL;
  baseCtx.beginPath(); baseCtx.moveTo(q[0].x,q[0].y); for (var i=1;i<q.length;i++) baseCtx.lineTo(q[i].x,q[i].y); baseCtx.stroke();
  baseCtx.strokeStyle = 'rgba(150,215,235,.46)'; baseCtx.lineWidth = 7 / PIXEL;
  baseCtx.beginPath(); baseCtx.moveTo(q[0].x,q[0].y); for (var j=1;j<q.length;j++) baseCtx.lineTo(q[j].x,q[j].y); baseCtx.stroke();
  baseCtx.restore();
});

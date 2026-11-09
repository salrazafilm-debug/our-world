/* Artwork is a stylized interpretation. Named tie points explicitly calibrate
   the illustration; this is not an aerial-image/navigation overlay. */
var SPECIAL_REGIONS = {
  'nyc-area': {
    id:'nyc-area',city:'nyc',name:'New York City',level:'area',asset:'nyc-area',worldIcon:'story-nyc',
    anchor:{lat:40.7580,lng:-73.9855},worldZoom:10.6,zoomRange:[1,3],focus:{u:.5,v:.5},
    points:[
      {id:'empire',name:'Empire State Building',lat:40.7484,lng:-73.9857,u:.77,v:.43},
      {id:'liberty',name:'Statue of Liberty',lat:40.6892,lng:-74.0445,u:.81,v:.555},
      {id:'waterfront',name:'NYC waterfront',lat:40.7061,lng:-73.9969,u:.63,v:.49}
    ],
    portals:[{point:'waterfront',target:'nyc-waterfront',label:'Explore the waterfront'}],
    ripples:[{u:.87,v:.68},{u:.73,v:.80}],waterfall:{u:.23,v:.65}
  },
  'nyc-waterfront': {
    id:'nyc-waterfront',city:'nyc',name:'NYC waterfront',level:'closeup',asset:'nyc-waterfront',
    anchor:{lat:40.7061,lng:-73.9969},worldZoom:11.3,zoomRange:[1,3],focus:{u:.5,v:.5},
    points:[
      {id:'empire',name:'Empire State Building',lat:40.7484,lng:-73.9857,u:.59,v:.32},
      {id:'liberty',name:'Statue of Liberty',lat:40.6892,lng:-74.0445,u:.87,v:.30},
      {id:'bridge',name:'Brooklyn Bridge',lat:40.7061,lng:-73.9969,u:.79,v:.46}
    ],portals:[],ripples:[{u:.83,v:.62},{u:.76,v:.76}],waterfall:{u:.12,v:.66}
  },
  'dc-area': {
    id:'dc-area',city:'dc',name:'Washington, DC',level:'area',asset:'dc-area',worldIcon:'pack-capitol',
    anchor:{lat:38.8895,lng:-77.0353},worldZoom:10.6,zoomRange:[1,3],focus:{u:.5,v:.5},
    points:[
      {id:'capitol',name:'US Capitol',lat:38.8899,lng:-77.0091,u:.65,v:.34},
      {id:'monument',name:'Washington Monument',lat:38.8895,lng:-77.0353,u:.18,v:.31},
      {id:'jefferson',name:'Jefferson Memorial',lat:38.8814,lng:-77.0365,u:.90,v:.445}
    ],portals:[],ripples:[{u:.86,v:.70},{u:.75,v:.76}],waterfall:{u:.15,v:.69}
  }
};
Object.keys(SPECIAL_REGIONS).forEach(function(id){
  SPECIAL_REGIONS[id].artworkBounds={u0:0,v0:0,u1:1,v1:1};
  SPECIAL_REGIONS[id].projection='affine-mercator';
  SPECIAL_REGIONS[id].transition={cameraMs:650,blendMs:350,returnMs:900};
});

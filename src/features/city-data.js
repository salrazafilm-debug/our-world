/* Curated public atlas locations. Coordinates are real landmark/park anchors;
   street corridors are simplified and ordinary building blocks are illustrative.
   None of these records are personal memories or discoveries. [lat,lng] order. */
var CITY_ATLAS = [
  {id:'dc',name:'Washington, DC',lat:38.892,lng:-77.030,z:14,icon:'city-capitol',kind:'civic',
    bounds:[38.875,-77.060,38.918,-76.990],
    streets:[
      ['Constitution Avenue',[[38.8921,-77.052],[38.8921,-77.009]]],
      ['Independence Avenue',[[38.8876,-77.052],[38.8876,-77.009]]],
      ['Pennsylvania Avenue',[[38.8899,-77.0091],[38.8953,-77.0229],[38.8976,-77.0351]]],
      ['14th Street',[[38.878,-77.0319],[38.916,-77.0319]]],
      ['7th Street',[[38.879,-77.0219],[38.916,-77.0219]]],
      ['17th Street',[[38.883,-77.0394],[38.908,-77.0394]]],
      ['16th Street',[[38.900,-77.0365],[38.918,-77.0365]]],
      ['Massachusetts Avenue',[[38.912,-77.043],[38.900,-77.017],[38.897,-77.007]]],
      ['East Capitol Street',[[38.8898,-77.009],[38.8898,-76.990]]]
    ],
    parks:[{name:'National Mall',ring:[[38.8878,-77.0504],[38.8917,-77.0504],[38.8917,-77.0096],[38.8878,-77.0096]]},
      {name:'Lafayette Square',ring:[[38.8993,-77.0383],[38.9015,-77.0383],[38.9015,-77.0348],[38.8993,-77.0348]]}],
    water:[{name:'Reflecting Pool',ring:[[38.8890,-77.0481],[38.8897,-77.0481],[38.8897,-77.0411],[38.8890,-77.0411]]}],
    landmarks:[
      ['capitol','US Capitol',38.8899,-77.0091,'city-capitol',1.2],
      ['whitehouse','White House',38.8977,-77.0365,'city-whitehouse',.9],
      ['monument','Washington Monument',38.8895,-77.0353,'city-monument',1.15],
      ['lincoln','Lincoln Memorial',38.8893,-77.0502,'city-lincoln',.9],
      ['smithsonian','Smithsonian Castle',38.8888,-77.0259,'civic',.7],
      ['airspace','Air and Space Museum',38.8882,-77.0199,'museum',.7],
      ['union','Union Station',38.8971,-77.0064,'civic',.8]
    ]},
  {id:'nyc',name:'New York City',lat:40.751,lng:-73.984,z:13,icon:'story-nyc',kind:'metro',
    bounds:[40.695,-74.025,40.810,-73.940],
    streets:[
      ['Broadway',[[40.704,-74.013],[40.718,-74.0035],[40.7308,-73.9925],[40.741,-73.989],[40.758,-73.9855],[40.7681,-73.9819]]],
      ['Fifth Avenue',[[40.732,-73.9968],[40.7484,-73.9857],[40.7645,-73.973],[40.7968,-73.949]]],
      ['Seventh Avenue',[[40.737,-74.0009],[40.7681,-73.9819]]],
      ['Park Avenue',[[40.7405,-73.9868],[40.7757,-73.9575]]],
      ['First Avenue',[[40.724,-73.9878],[40.786,-73.946]]],
      ['Central Park West',[[40.7681,-73.9819],[40.8005,-73.9581]]],
      ['34th Street',[[40.7560,-74.004],[40.7424,-73.9725]]],
      ['42nd Street',[[40.7628,-74.0019],[40.7489,-73.968]]],
      ['59th Street',[[40.7725,-73.9895],[40.7587,-73.9566]]],
      ['14th Street',[[40.741,-74.0095],[40.7289,-73.9754]]]
    ],
    parks:[{name:'Central Park',ring:[[40.7681,-73.9819],[40.8005,-73.9581],[40.7968,-73.949],[40.7645,-73.973]]},
      {name:'Washington Square Park',ring:[[40.7300,-73.9998],[40.7320,-73.9998],[40.7320,-73.9964],[40.7300,-73.9964]]}],water:[],
    landmarks:[
      ['liberty','Statue of Liberty',40.6892,-74.0445,'city-liberty',1.1],
      ['empire','Empire State Building',40.7484,-73.9857,'city-empire',1.3],
      ['chrysler','Chrysler Building',40.7516,-73.9755,'city-chrysler',1.1],
      ['times','Times Square',40.7580,-73.9855,'metro',.9],
      ['village','Greenwich Village',40.7336,-74.0027,'city-brownstones',.75],
      ['grandcentral','Grand Central Terminal',40.7527,-73.9772,'civic',.7],
      ['brooklyn','Brooklyn waterfront',40.7033,-73.9894,'city-brownstones',.75]
    ]},
  {id:'annapolis',name:'Annapolis',lat:38.9788,lng:-76.4885,z:14,icon:'city',kind:'harbor',bounds:[38.969,-76.505,38.990,-76.474],
    streets:[['Main Street',[[38.9784,-76.4925],[38.9770,-76.4864]]],['Maryland Avenue',[[38.9793,-76.4906],[38.9823,-76.4862]]],['West Street',[[38.9780,-76.503],[38.9786,-76.4921]]],['Duke of Gloucester Street',[[38.9767,-76.4940],[38.9758,-76.4868]]]],
    parks:[],water:[],landmarks:[['statehouse','Maryland State House',38.9788,-76.4909,'civic',.9],['naval','US Naval Academy',38.9846,-76.4841,'museum',.9],['dock','Annapolis City Dock',38.9770,-76.4864,'story-pier',.8]]},
  {id:'baltimore',name:'Baltimore',lat:39.288,lng:-76.611,z:13,icon:'city',kind:'harbor',bounds:[39.274,-76.635,39.311,-76.590],
    streets:[['Pratt Street',[[39.2860,-76.632],[39.2860,-76.594]]],['Charles Street',[[39.276,-76.6148],[39.309,-76.6154]]],['Light Street',[[39.275,-76.612],[39.289,-76.612]]],['Baltimore Street',[[39.2898,-76.632],[39.2898,-76.595]]]],
    parks:[],water:[],landmarks:[['aquarium','National Aquarium',39.2859,-76.6083,'museum',.85],['camden','Camden Yards',39.2840,-76.6216,'stadium',1],['harbor','Inner Harbor',39.2847,-76.6107,'story-pier',.75]]},
  {id:'philadelphia',name:'Philadelphia',lat:39.953,lng:-75.164,z:13,icon:'city',kind:'civic',bounds:[39.939,-75.190,39.977,-75.140],
    streets:[['Market Street',[[39.9550,-75.185],[39.9491,-75.142]]],['Broad Street',[[39.940,-75.164],[39.973,-75.1625]]],['Benjamin Franklin Parkway',[[39.955,-75.166],[39.9656,-75.1809]]]],
    parks:[],water:[],landmarks:[['hall','Philadelphia City Hall',39.9526,-75.1636,'civic',1],['independence','Independence Hall',39.9489,-75.1500,'civic',.8],['artmuseum','Philadelphia Museum of Art',39.9656,-75.1809,'museum',.9]]}
  ,{id:'richmond',name:'Richmond',lat:37.539,lng:-77.439,z:13.5,icon:'city',kind:'civic',bounds:[37.526,-77.460,37.555,-77.416],
    streets:[['Broad Street',[[37.550,-77.457],[37.536,-77.417]]],['Main Street',[[37.543,-77.455],[37.532,-77.422]]]],parks:[],water:[],landmarks:[['capitol','Virginia State Capitol',37.5388,-77.4336,'city-museum',.9],['station','Main Street Station',37.5317,-77.4291,'city-rowhouses',.8]]}
  ,{id:'chicago',name:'Chicago',lat:41.883,lng:-87.628,z:12.8,icon:'city',kind:'metro',bounds:[41.865,-87.651,41.908,-87.612],
    streets:[['Michigan Avenue',[[41.867,-87.6240],[41.902,-87.6246]]],['State Street',[[41.867,-87.6277],[41.902,-87.6282]]],['Wacker Drive',[[41.8869,-87.643],[41.8869,-87.625],[41.888,-87.618]]]],
    parks:[{name:'Millennium Park',ring:[[41.8809,-87.6257],[41.8850,-87.6257],[41.8850,-87.6197],[41.8809,-87.6197]]}],water:[],
    landmarks:[['willis','Willis Tower',41.8789,-87.6359,'city-towers',1.2],['art','Art Institute of Chicago',41.8796,-87.6237,'city-museum',.9],['navy','Navy Pier',41.8917,-87.6050,'story-pier',.9]]}
  ,{id:'milwaukee',name:'Milwaukee',lat:43.037,lng:-87.905,z:13.2,icon:'story-lighthouse',kind:'harbor',bounds:[43.024,-87.926,43.056,-87.890],
    streets:[['Wisconsin Avenue',[[43.0385,-87.923],[43.0385,-87.896]]],['Water Street',[[43.027,-87.908],[43.052,-87.909]]]],parks:[],water:[],
    landmarks:[['market','Milwaukee Public Market',43.0340,-87.9067,'city-rowhouses',.8],['art','Milwaukee Art Museum',43.0400,-87.8970,'city-museum',.9],['light','Breakwater Lighthouse',43.0266,-87.8808,'story-lighthouse',.9]]}
];

#!/usr/bin/env node
/* Isolated local preview. Never included in index.html or used by hosting.
   This origin uses sample memories and no Supabase connection. */
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),port=Number(process.env.OW_PREVIEW_PORT||4174);
const fixtures=[
  {id:'preview-empire',title:'Preview · NYC skyline',lat:40.7484,lng:-73.9857,by:'bruce',date:'2026-11-09',note:'Sample memory for checking the skyline anchor.',at:1},
  {id:'preview-liberty',title:'Preview · Liberty Island',lat:40.6892,lng:-74.0445,by:'elena',date:'2026-11-09',note:'Sample memory for checking the island anchor.',at:2},
  {id:'preview-dc',title:'Preview · Washington Monument',lat:38.8895,lng:-77.0353,by:'bruce',date:'2026-11-09',note:'Sample memory for checking the DC anchor.',at:3}
];
function page(){
  const shell=fs.readFileSync(path.join(root,'tools/site-shell.html'),'utf8');
  let fragment=require('./include').expand(fs.readFileSync(path.join(root,'src/index.html'),'utf8'));
  fragment=fragment.replace('<script src="config.js"></script>','<script>window.__OW_CONFIG={};</script>');
  const setup='<script>document.title="Our World · Local development preview";if(!localStorage.getItem("ow.preview.sample.v1")){localStorage.setItem("ow.who","bruce");localStorage.setItem("ow.cache.memories",'+JSON.stringify(JSON.stringify(fixtures))+');localStorage.setItem("ow.cache.discoveries",'+JSON.stringify(JSON.stringify([{id:'preview-nyc',lat:40.74,lng:-73.99,r:15,name:'Preview NYC',by:'bruce'},{id:'preview-dc-area',lat:38.89,lng:-77.03,r:15,name:'Preview DC',by:'bruce'}]))+');localStorage.setItem("ow.preview.sample.v1","1");}</script>';
  return shell.replace('<!--#include src/index.html -->',setup+fragment);
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost:'+port);
  if(url.pathname==='/'||url.pathname==='/index.html'){res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-store'});res.end(page());return;}
  if(url.pathname==='/config.js'){res.writeHead(200,{'Content-Type':types['.js']});res.end('window.__OW_CONFIG={};');return;}
  const rel=decodeURIComponent(url.pathname).replace(/^\/+/,''),candidates=[path.resolve(root,'src',rel),path.resolve(root,rel)];
  const file=candidates.find(f=>f.startsWith(root+path.sep)&&fs.existsSync(f)&&fs.statSync(f).isFile());
  if(!file){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log('Local sample-data preview: http://localhost:'+port+' (no backend connection)'));

#!/usr/bin/env node
/* Extracts every inline <script> from src/index.html and syntax-checks it,
   plus geo.js. Run before publishing — there is no compiler to catch you. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let bad = 0;

function check(label, code) {
  try { new vm.Script(code, { filename: label }); console.log('  ok   ' + label); }
  catch (e) { bad++; console.error('  FAIL ' + label + ' — ' + e.message); }
}

const html = require('./include').expand(fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8'));
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
console.log('inline scripts in src/index.html: ' + blocks.length);
blocks.forEach((b, i) => check('src/index.html #' + (i + 1), b));
['geo.js', 'config.js', 'cloud.js'].forEach(n => check('src/' + n, fs.readFileSync(path.join(ROOT, 'src', n), 'utf8')));

// geography pack must decode
const g = {};
new vm.Script(fs.readFileSync(path.join(ROOT, 'src', 'geo.js'), 'utf8'))
  .runInNewContext({ window: g, btoa: s => Buffer.from(s, 'binary').toString('base64'),
                     atob: s => Buffer.from(s, 'base64').toString('binary') });
const ok = g.OW_GEO && g.OW_GEO.states.length && g.OW_TOWNS.length && g.OW_AREAS.length;
console.log(ok ? '  ok   geography pack: ' + g.OW_GEO.states.length + ' states, ' +
  g.OW_AREAS.length + ' areas, ' + g.OW_TOWNS.length + ' towns, ' +
  g.OW_ROUTES.length + ' routes' : '  FAIL geography pack did not load');
if (!ok) bad++;


/* ---- guards against a broken publish ---- */
const { execFileSync } = require('child_process');
const os = require('os');
const tmpOut = path.join(os.tmpdir(), 'ow-check-index.html');
try {
  execFileSync(process.execPath, [path.join(__dirname, 'build-site.js')], { env: Object.assign({}, process.env, { OW_OUT: tmpOut }), stdio: 'pipe' });
  const fresh = fs.readFileSync(tmpOut, 'utf8');
  /* 1. every script in the page we would publish must parse */
  [...fresh.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].forEach((m, i) => check('built index.html script #' + (i + 1), m[1]));
  /* 2. the committed index.html must be exactly what the build makes (nobody hand-edited it) */
  const committed = fs.existsSync(path.join(ROOT, 'index.html')) ? fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') : '';
  if (committed !== fresh) { bad++; console.error('  FAIL index.html is out of date or was hand-edited. Edit src/ and run: npm run build'); }
  else console.log('  ok   index.html matches a fresh build');
  /* 3. no corrupted emoji / curly quotes */
  if (/\uFFFD/.test(fresh)) { bad++; console.error('  FAIL built page contains U+FFFD (a corrupted character)'); }
} catch (e) { bad++; console.error('  FAIL could not build to check index.html: ' + (e.stderr ? e.stderr.toString() : e.message)); }
const srcFiles = [path.join(ROOT, 'src', 'index.html')].concat(fs.readdirSync(path.join(ROOT, 'src', 'features')).map(f => path.join(ROOT, 'src', 'features', f)));
srcFiles.forEach(f => { if (/\?\?/.test(fs.readFileSync(f, 'utf8').replace(/\?\?\?/g, ''))) { bad++; console.error('  FAIL "??" found in ' + path.relative(ROOT, f) + ' (emoji turned into question marks?)'); } });

process.exit(bad ? 1 : 0);

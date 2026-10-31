#!/usr/bin/env node
/* Produces index.html at the repo root — the static site that Vercel / GitHub Pages serve.

   One self-contained file: the fragment from src/index.html with src/geo.js,
   src/config.js and src/cloud.js inlined, wrapped in tools/site-shell.html.
   The shell loads vendor/supabase.js (a separate file, pinned and committed).
   Everything personal lives behind the Supabase login, not in this file.

   Fonts come from Google Fonts over the network. Everything else is in the file. */
const fs = require('fs');
const path = require('path');

const ROOT  = path.join(__dirname, '..');
const { expand } = require('./include');
const frag  = expand(fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8'));
const shell = fs.readFileSync(path.join(ROOT, 'tools', 'site-shell.html'), 'utf8');

let inlined = frag;
for (const name of ['geo.js', 'config.js', 'cloud.js']) {
  const src = fs.readFileSync(path.join(ROOT, 'src', name), 'utf8');
  const tag = '<script src="' + name + '"></script>';
  if (!inlined.includes(tag)) { console.error('ERROR: ' + tag + ' not found in src/index.html'); process.exit(1); }
  inlined = inlined.replace(tag, () => '<script>\n/* ' + name + ' inlined at build time */\n' + src + '\n</script>');
}

/* Nothing personal is allowed into the public build. */
const leaks = [/_blob\/[0-9a-f]{8}/, /assetId:\s*'[0-9a-f]{8}/];
for (const re of leaks) {
  if (re.test(inlined)) {
    console.error('ERROR: build contains a photo reference (' + re + '). Refusing to write.');
    process.exit(1);
  }
}

const out = shell.replace('<!--#include src/index.html -->', inlined);
const dest = path.join(ROOT, 'index.html');
fs.writeFileSync(dest, out);
fs.writeFileSync(path.join(ROOT, '.nojekyll'), '');
console.log('wrote', dest, (out.length / 1024).toFixed(0) + 'KB');

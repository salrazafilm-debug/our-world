/* Expands `//#include features/x.js` lines in src/index.html with the file's
   contents. Keeps the single-IIFE runtime (shared scope) while letting each
   feature live in its own file. Used by the dev server, the build and the checker. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
exports.expand = function (html) {
  return html.replace(/^[ \t]*\/\/#include (\S+)[ \t]*$/gm, (m, f) => {
    const src = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
    return '/* ---- ' + f + ' ---- */\n' + src;
  });
};

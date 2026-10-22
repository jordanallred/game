// Loads the game's rules (everything between `var G =` and `// LOGIC END` in index.html) into a sandbox.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadGame(file = path.join(__dirname, '..', 'index.html')) {
  const html = fs.readFileSync(file, 'utf8');
  const a = html.indexOf('var G ='), b = html.indexOf('// LOGIC END');
  if (a < 0 || b < 0) throw new Error('Could not find the rules block in ' + file);
  const context = { module: { exports: {} } };
  vm.runInNewContext(html.slice(a, b), context);
  return context.module.exports;
}

module.exports = { loadGame };

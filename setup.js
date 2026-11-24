// Rebuilds the folder structure from flat file names (app__gym__page.js -> app/gym/page.js)
const fs = require('fs');
const path = require('path');
for (const f of fs.readdirSync('.')) {
  if (!f.includes('__') || !fs.statSync(f).isFile()) continue;
  const dest = f.split('__').join('/');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(f, dest);
}
console.log('setup: folders ready');

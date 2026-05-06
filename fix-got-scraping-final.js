const fs = require('fs');
const path = './node_modules/got-scraping/package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));

// Fix the exports and main fields
pkg.main = "./dist/index.js";
pkg.exports = {
  ".": {
    "require": "./dist/index.js",
    "import": "./dist/index.js",
    "default": "./dist/index.js"
  }
};

fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
console.log('✓ Fixed got-scraping package.json with correct path: ./dist/index.js');

// Verify the fix
console.log('\nTesting require...');
try {
  require('got-scraping');
  console.log('✓ got-scraping loads successfully!');
} catch(e) {
  console.log('Still error:', e.message);
}

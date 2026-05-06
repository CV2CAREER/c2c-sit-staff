const fs = require('fs');
const path = './node_modules/got-scraping/package.json';
if (fs.existsSync(path)) {
  const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
  // Add proper exports field
  pkg.exports = {
    ".": {
      "require": "./dist/source/index.js",
      "import": "./dist/source/index.js",
      "default": "./dist/source/index.js"
    }
  };
  // Also add main if missing
  if (!pkg.main) pkg.main = "./dist/source/index.js";
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
  console.log('✓ Fixed got-scraping package.json exports');
  
  // Verify the file exists
  const mainFile = './node_modules/got-scraping/dist/source/index.js';
  if (fs.existsSync(mainFile)) {
    console.log('✓ Main file exists at:', mainFile);
  } else {
    console.log('⚠️ Main file not found, checking directory...');
    console.log(fs.readdirSync('./node_modules/got-scraping/dist/source/'));
  }
}

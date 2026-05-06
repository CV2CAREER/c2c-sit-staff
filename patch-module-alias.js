const fs = require('fs');
const path = './build/server.js';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  if (!content.includes('module-alias/register')) {
    content = "require('module-alias/register');\n" + content;
    fs.writeFileSync(path, content);
    console.log('✓ module-alias added to server.js');
  }
}
const packagePath = './package.json';
const pkg = require(packagePath);
pkg._moduleAliases = {
  "@": "./build",
  "@/models": "./build/models",
  "@/controllers": "./build/controllers", 
  "@/services": "./build/services",
  "@/routes": "./build/routes",
  "@/utils": "./build/utils",
  "@/database": "./build/database"
};
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
console.log('✓ module aliases configured');

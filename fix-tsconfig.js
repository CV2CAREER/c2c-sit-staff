const fs = require('fs');
const tsconfig = JSON.parse(fs.readFileSync('./tsconfig.json', 'utf8'));

// Add baseUrl and proper paths configuration
tsconfig.compilerOptions = tsconfig.compilerOptions || {};
tsconfig.compilerOptions.baseUrl = ".";
tsconfig.compilerOptions.paths = {
  "@/*": ["./src/*"],
  "@/database/*": ["./src/database/*"],
  "@/models/*": ["./src/models/*"],
  "@/controllers/*": ["./src/controllers/*"],
  "@/services/*": ["./src/services/*"],
  "@/utils/*": ["./src/utils/*"]
};

fs.writeFileSync('./tsconfig.json', JSON.stringify(tsconfig, null, 2));
console.log('✓ tsconfig.json updated with proper paths');

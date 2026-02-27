const fs = require("fs");
const path = require("path");

const hook = `#!/bin/sh\nnpm run check-all\n`;
const hookPath = path.resolve(".git/hooks/pre-commit");

fs.writeFileSync(hookPath, hook, { mode: 0o755 });
console.log("✅ Git hooks set up successfully!");

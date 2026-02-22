const content = require('fs').readFileSync('src/main/index.ts', 'utf8');
require('fs').writeFileSync('src/main/index.ts', 'import fs from "fs";\n' + content);

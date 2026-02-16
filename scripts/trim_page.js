const fs = require('fs');
const path = require('path');
const pagePath = path.resolve(process.cwd(), 'app', 'page.tsx');
const content = fs.readFileSync(pagePath, 'utf8');
const lines = content.split(/\r?\n/);
const trimmed = lines.slice(0, 649).join('\n') + '\n}\n';
fs.writeFileSync(pagePath, trimmed);
console.log('Done: trimmed to 649 lines + closing brace');

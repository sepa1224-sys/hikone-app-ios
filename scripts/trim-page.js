const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'app', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
const keepLines = lines.slice(0, 649);
const newContent = keepLines.join('\n') + '\n}\n';
fs.writeFileSync(filePath, newContent);
console.log('Done');

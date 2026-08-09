const fs = require('fs');
const text = fs.readFileSync('scratch-auth-form-part.txt', 'utf8');
const lines = text.split('\n');
const codeLines = [];
let start = false;
for (let l of lines) {
  if (l.includes('1: "use client";')) { start = true; }
  if (start) {
    if (l.includes('The above content does NOT show the entire file contents')) { break; }
    const match = l.match(/^\d+: (.*)$/);
    if (match) { codeLines.push(match[1]); }
  }
}
fs.writeFileSync('d:\\New folder (4)\\manmadhan-progress\\apps\\web\\components\\auth\\auth-form.tsx', codeLines.join('\n'));
console.log('Restored auth-form.tsx part 1. Lines: ' + codeLines.length);

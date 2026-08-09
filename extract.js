const fs = require('fs');

const logPath = 'C:\\Users\\saikr\\.gemini\\antigravity-ide\\brain\\213752dc-68ee-4acf-8074-f32cc289bcd9\\.system_generated\\logs\\transcript_full.jsonl';
const lines = fs.readFileSync(logPath, 'utf8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const entry = JSON.parse(line);
    
    // Look for tool responses from view_file
    if (entry.type === 'TOOL_RESPONSE' && entry.content && typeof entry.content === 'string') {
      if (entry.content.includes('File Path: `file:///d:/New%20folder%20%284%29/manmadhan-progress/apps/web/components/auth/auth-form.tsx`')) {
        const text = entry.content;
        
        // Extract the code lines (which start with number: )
        const codeLines = [];
        const contentLines = text.split('\n');
        for (const cl of contentLines) {
          const match = cl.match(/^(\d+): (.*)$/);
          if (match) {
            codeLines.push(match[2]);
          }
        }
        
        if (codeLines.length > 0) {
          fs.writeFileSync('d:\\New folder (4)\\manmadhan-progress\\scratch-auth-form-part.txt', codeLines.join('\n') + '\n', { flag: 'a' });
        }
      }
    }
  } catch (e) {
    // skip
  }
}
console.log('Extraction complete');

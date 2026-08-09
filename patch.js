const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'backend', 'src', 'routes', 'personal');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace req.params.id with req.params.id as string
  content = content.replace(/req\.params\.id(?! as string)/g, 'req.params.id as string');
  content = content.replace(/req\.params\.bookId(?! as string)/g, 'req.params.bookId as string');
  content = content.replace(/req\.params\.habitId(?! as string)/g, 'req.params.habitId as string');
  content = content.replace(/req\.params\.podcastId(?! as string)/g, 'req.params.podcastId as string');
  content = content.replace(/req\.params\.skillId(?! as string)/g, 'req.params.skillId as string');
  
  // Replace user.id inside eq() and values() with user.id as string
  content = content.replace(/user\.id(?! as string)/g, 'user.id as string');

  fs.writeFileSync(filePath, content);
}
console.log('Patched all personal route files.');

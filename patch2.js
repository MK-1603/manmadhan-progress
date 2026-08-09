const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'backend', 'src', 'routes', 'personal');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Find all eq(...) calls and if the second argument is `id`, `bookId`, `habitId`, etc. and doesn't have `as string`, add it.
  content = content.replace(/eq\(([^,]+),\s*id(?!\s*as\s*string)\s*\)/g, 'eq($1, id as string)');
  content = content.replace(/eq\(([^,]+),\s*bookId(?!\s*as\s*string)\s*\)/g, 'eq($1, bookId as string)');
  content = content.replace(/eq\(([^,]+),\s*habitId(?!\s*as\s*string)\s*\)/g, 'eq($1, habitId as string)');
  content = content.replace(/eq\(([^,]+),\s*podcastId(?!\s*as\s*string)\s*\)/g, 'eq($1, podcastId as string)');
  content = content.replace(/eq\(([^,]+),\s*skillId(?!\s*as\s*string)\s*\)/g, 'eq($1, skillId as string)');
  content = content.replace(/eq\(([^,]+),\s*user\.id(?!\s*as\s*string)\s*\)/g, 'eq($1, user.id as string)');

  fs.writeFileSync(filePath, content);
}
console.log('Patched all personal route files again.');

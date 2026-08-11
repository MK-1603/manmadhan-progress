const { execSync } = require('child_process');
try {
  execSync('git checkout HEAD "apps/web/app/(personal)/personal/documents/page.tsx"', { stdio: 'inherit' });
  console.log("Restored successfully!");
} catch (err) {
  console.error("Failed to restore", err);
}

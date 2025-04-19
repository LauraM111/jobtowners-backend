const fs = require('fs');
const path = require('path');

// Create the directory structure
const targetDir = path.join(process.cwd(), 'dist', 'templates', 'emails');
fs.mkdirSync(targetDir, { recursive: true });

// Copy all template files
const sourceDir = path.join(process.cwd(), 'src', 'templates', 'emails');
const files = fs.readdirSync(sourceDir);

files.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`Copied: ${file}`);
});

console.log('All templates copied successfully!'); 
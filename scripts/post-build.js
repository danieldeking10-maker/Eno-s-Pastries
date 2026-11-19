// post-build.js — copies public/ and .next/static/ into the standalone output
// so that static assets are served correctly on Render.com
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const root = path.resolve(__dirname, '..');
const standaloneDir = path.join(root, '.next', 'standalone');

// Copy public/ -> .next/standalone/public/
copyDir(path.join(root, 'public'), path.join(standaloneDir, 'public'));
console.log('✓ Copied public/ into .next/standalone/public/');

// Copy .next/static/ -> .next/standalone/.next/static/
copyDir(
  path.join(root, '.next', 'static'),
  path.join(standaloneDir, '.next', 'static')
);
console.log('✓ Copied .next/static/ into .next/standalone/.next/static/');

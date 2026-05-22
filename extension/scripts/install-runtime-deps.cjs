/**
 * Ensures production deps exist under extension/node_modules (not only hoisted at repo root).
 * Required for vsce --no-dependencies so ws is included in the .vsix.
 */
const { execSync } = require('child_process');
const path = require('path');

const extensionDir = path.resolve(__dirname, '..');

execSync('npm install ws@^8.18.3 --omit=dev --no-save', {
	cwd: extensionDir,
	stdio: 'inherit',
});

console.log('Installed extension runtime dependencies');

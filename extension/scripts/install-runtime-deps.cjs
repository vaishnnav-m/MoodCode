/**
 * Ensures production deps exist under extension/node_modules
 * so VSIX contains runtime dependencies.
 */

const { execSync } = require('child_process');
const path = require('path');

const extensionDir = path.resolve(__dirname, '..');
const sharedDist = path.resolve(__dirname, '../../shared');

execSync(
  `npm install ws@^8.18.3 "${sharedDist}" --omit=dev --no-save`,
  {
    cwd: extensionDir,
    stdio: 'inherit',
  }
);

console.log('Installed extension runtime dependencies');
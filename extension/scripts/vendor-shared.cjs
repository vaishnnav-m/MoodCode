/**
 * Copies @moodcode/shared as real files (no symlinks/junctions) for VSIX packaging.
 * Must run last in vscode:prepublish — after bundle-backend's npm install.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '../..');
const extensionDir = path.resolve(__dirname, '..');
const vendorDir = path.join(extensionDir, 'vendor', 'shared');
const target = path.join(extensionDir, 'node_modules', '@moodcode', 'shared');

execSync('npm run compile -w @moodcode/shared', { cwd: root, stdio: 'inherit' });

const sharedPkg = JSON.parse(
	fs.readFileSync(path.join(root, 'shared/package.json'), 'utf8'),
);

/** Extension uses require() — ship CJS build only to avoid duplicate path issues. */
const packageJson = {
	name: '@moodcode/shared',
	version: sharedPkg.version,
	private: true,
	main: './dist/cjs/index.js',
	exports: {
		'.': {
			require: './dist/cjs/index.js',
		},
	},
};

function rm(dir) {
	if (fs.existsSync(dir)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

rm(vendorDir);
rm(target);

fs.mkdirSync(vendorDir, { recursive: true });
fs.cpSync(path.join(root, 'shared/dist/cjs'), path.join(vendorDir, 'dist/cjs'), {
	recursive: true,
});
fs.writeFileSync(path.join(vendorDir, 'package.json'), JSON.stringify(packageJson, null, 2));

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(vendorDir, target, { recursive: true });
rm(vendorDir);

console.log('Vendored @moodcode/shared (CJS only, no symlinks)');

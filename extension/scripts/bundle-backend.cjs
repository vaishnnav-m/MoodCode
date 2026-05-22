/**
 * Copies a production-ready backend into extension/server for .vsix packaging.
 * Run via extension "vscode:prepublish" before vsce package.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '../..');
const extensionDir = path.resolve(__dirname, '..');
const serverDir = path.join(extensionDir, 'server');

function rm(dir) {
	if (fs.existsSync(dir)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

function copyDir(src, dest) {
	fs.mkdirSync(dest, { recursive: true });
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		const from = path.join(src, entry.name);
		const to = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			copyDir(from, to);
		} else {
			fs.copyFileSync(from, to);
		}
	}
}

execSync('npm run compile -w @moodcode/shared', { cwd: root, stdio: 'inherit' });
execSync('npm run build -w @moodcode/backend', { cwd: root, stdio: 'inherit' });

rm(serverDir);
fs.mkdirSync(serverDir, { recursive: true });

copyDir(path.join(root, 'backend/dist'), path.join(serverDir, 'dist'));

const sharedVendor = path.join(serverDir, 'vendor', 'shared');
fs.mkdirSync(sharedVendor, { recursive: true });
fs.cpSync(path.join(root, 'shared/dist/cjs'), path.join(sharedVendor, 'dist/cjs'), {
	recursive: true,
});
fs.writeFileSync(
	path.join(sharedVendor, 'package.json'),
	JSON.stringify(
		{
			name: '@moodcode/shared',
			version: '0.0.1',
			private: true,
			main: './dist/cjs/index.js',
			exports: {
				'.': {
					require: './dist/cjs/index.js',
				},
			},
		},
		null,
		2,
	),
);

const backendPkg = JSON.parse(
	fs.readFileSync(path.join(root, 'backend/package.json'), 'utf8'),
);
const serverPkg = {
	name: 'moodcode-server',
	private: true,
	type: 'module',
	main: './dist/index.js',
	dependencies: {
		...backendPkg.dependencies,
		'@moodcode/shared': 'file:./vendor/shared',
	},
};
fs.writeFileSync(path.join(serverDir, 'package.json'), JSON.stringify(serverPkg, null, 2));

execSync('npm install --omit=dev', { cwd: serverDir, stdio: 'inherit' });

// npm on Windows creates a junction node_modules/@moodcode/shared → vendor/shared.
// vsce then packs the same files twice (junction target + link). Replace with a real copy.
const serverSharedLink = path.join(serverDir, 'node_modules', '@moodcode', 'shared');
const serverSharedVendor = path.join(serverDir, 'vendor', 'shared');
if (fs.existsSync(serverSharedLink)) {
	fs.rmSync(serverSharedLink, { recursive: true, force: true });
	fs.cpSync(serverSharedVendor, serverSharedLink, { recursive: true });
}
rm(path.join(serverDir, 'vendor'));

console.log('Bundled backend into extension/server');

import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface BackendProcessHandle {
	dispose: () => void;
}

function parsePortFromUrl(url: string, fallback: number): number {
	try {
		const parsed = new URL(url);
		if (parsed.port) {
			return Number(parsed.port);
		}
		return parsed.protocol === 'https:' ? 443 : fallback;
	} catch {
		return fallback;
	}
}

function isBundledServer(extensionPath: string, backendDir: string): boolean {
	return (
		path.resolve(backendDir) === path.resolve(extensionPath, 'server')
	);
}

async function isBackendReachable(backendUrl: string): Promise<boolean> {
	try {
		const response = await fetch(`${backendUrl}/health`, {
			signal: AbortSignal.timeout(2000),
		});
		return response.ok;
	} catch {
		return false;
	}
}

function resolveBackendDir(extensionPath: string): string | undefined {
	const bundledDir = path.join(extensionPath, 'server');
	if (fs.existsSync(path.join(bundledDir, 'dist', 'index.js'))) {
		return bundledDir;
	}

	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workspaceRoot) {
		return undefined;
	}

	const workspaceBackend = path.join(workspaceRoot, 'backend');
	if (fs.existsSync(path.join(workspaceBackend, 'package.json'))) {
		return workspaceBackend;
	}

	return undefined;
}

export async function startBackendProcess(
	context: vscode.ExtensionContext,
): Promise<BackendProcessHandle | undefined> {
	const config = vscode.workspace.getConfiguration('moodcode');
	if (!config.get<boolean>('autoStartBackend', true)) {
		return undefined;
	}

	const backendUrl = config.get<string>('backendUrl', 'http://localhost:3001');
	if (await isBackendReachable(backendUrl)) {
		return undefined;
	}

	const backendDir = resolveBackendDir(context.extensionPath);
	if (!backendDir) {
		return undefined;
	}

	const isBundled = isBundledServer(context.extensionPath, backendDir);
	const port = parsePortFromUrl(backendUrl, 3001);
	const mongodbUri = config.get<string>(
		'mongodbUri',
		'mongodb://localhost:27017/moodcode',
	);

	const env: NodeJS.ProcessEnv = {
		...process.env,
		PORT: String(port),
		MONGODB_URI: mongodbUri,
	};

	const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
	const child: ChildProcess = isBundled
		? spawn(process.execPath, ['dist/index.js'], {
				cwd: backendDir,
				env,
				stdio: 'pipe',
			})
		: spawn(npmCommand, ['run', 'dev'], {
				cwd: backendDir,
				env,
				stdio: 'pipe',
				shell: process.platform === 'win32',
			});

	const output = vscode.window.createOutputChannel('MoodCode Backend');
	child.stdout?.on('data', (chunk: Buffer) => output.append(chunk.toString()));
	child.stderr?.on('data', (chunk: Buffer) => output.append(chunk.toString()));
	child.on('error', (err) => {
		output.appendLine(`Failed to start backend: ${err.message}`);
	});
	child.on('exit', (code) => {
		if (code !== null && code !== 0) {
			output.appendLine(`Backend exited with code ${code}`);
		}
	});

	return {
		dispose: () => {
			if (!child.killed && child.pid) {
				if (process.platform === 'win32') {
					spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: true });
				} else {
					child.kill('SIGTERM');
				}
			}
			output.dispose();
		},
	};
}

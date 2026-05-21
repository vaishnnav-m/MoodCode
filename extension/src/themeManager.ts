import * as vscode from 'vscode';

export async function applyTheme(themeName: string): Promise<void> {
	await vscode.workspace
		.getConfiguration('workbench')
		.update('colorTheme', themeName, vscode.ConfigurationTarget.Global);
}

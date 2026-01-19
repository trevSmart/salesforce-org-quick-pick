import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Salesforce Org Quick Pick extension is now active!');

  // Create status bar item for org switching
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'salesforce-org-quick-pick.switchOrg';
  statusBarItem.text = '$(cloud) No Org';
  statusBarItem.tooltip = 'Switch Salesforce Org';
  statusBarItem.show();

  let disposable = vscode.commands.registerCommand('salesforce-org-quick-pick.switchOrg', async function () {
    // TODO: Implement org switching logic
    const orgs = ['Dev Org', 'Sandbox', 'Production'];

    const selectedOrg = await vscode.window.showQuickPick(orgs, {
      placeHolder: 'Select a Salesforce org to switch to'
    });

    if (selectedOrg) {
      statusBarItem.text = `$(cloud) ${selectedOrg}`;
      vscode.window.showInformationMessage(`Switched to ${selectedOrg}`);
    }
  });

  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(disposable);
}

export function deactivate() {}
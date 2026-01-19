import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Reads and parses Salesforce org aliases from ~/.sfdx/alias.json
 * @returns Array of sorted alias names
 */
function getSalesforceAliases(): string[] {
  try {
    const homeDir = os.homedir();
    const aliasFilePath = path.join(homeDir, '.sfdx', 'alias.json');

    if (!fs.existsSync(aliasFilePath)) {
      console.log('Salesforce alias file not found:', aliasFilePath);
      return [];
    }

    const aliasContent = fs.readFileSync(aliasFilePath, 'utf8');
    const aliasData = JSON.parse(aliasContent);

    if (!aliasData.orgs || typeof aliasData.orgs !== 'object') {
      console.log('Invalid alias file format');
      return [];
    }

    // Extract alias names and sort alphabetically
    const aliases = Object.keys(aliasData.orgs).sort();
    return aliases;
  } catch (error) {
    console.error('Error reading Salesforce aliases:', error);
    return [];
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Salesforce Org Quick Pick extension is now active!');

  // Get Salesforce aliases
  const aliases = getSalesforceAliases();

  // Create status bar item for org switching
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'salesforce-org-quick-pick.switchOrg';
  statusBarItem.text = '$(cloud) No Org';

  // Create tooltip with alias list
  if (aliases.length > 0) {
    const tooltip = new vscode.MarkdownString('**Available Salesforce Orgs:**\n\n');
    aliases.forEach(alias => {
      tooltip.appendMarkdown(`• ${alias}\n`);
    });
    tooltip.appendMarkdown('\n*Click to switch org*');
    statusBarItem.tooltip = tooltip;
  } else {
    statusBarItem.tooltip = 'No Salesforce orgs found. Please authorize orgs using Salesforce CLI.';
  }

  statusBarItem.show();

  let disposable = vscode.commands.registerCommand('salesforce-org-quick-pick.switchOrg', async function () {
    // Use the aliases loaded at startup
    const selectedOrg = await vscode.window.showQuickPick(aliases, {
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
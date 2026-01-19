import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';
const { exec } = require('child_process');

// Logging utility function
function log(message: string) {
  console.log('[SF Org Quick Pick]', message);
  const outputChannel = (global as any).sfOrgOutputChannel as vscode.OutputChannel;
  if (outputChannel) {
    outputChannel.appendLine(`[SF Org Quick Pick] ${message}`);
  }
}

/**
 * Builds an interactive tooltip with clickable Salesforce org aliases
 * @param aliases Array of alias names
 * @returns MarkdownString with clickable command links
 */
function buildInteractiveTooltip(aliases: string[]): vscode.MarkdownString {
  const md = new vscode.MarkdownString(undefined, true);
  md.isTrusted = true;

  // Helper function to encode command arguments
  const enc = (args: unknown[]) => encodeURIComponent(JSON.stringify(args));

  // Centered title
  md.appendMarkdown('<div align="center">**Salesforce Org Quick Pick**</div>\n\n');

  if (aliases.length > 0) {
    aliases.forEach(alias => {
      // Create clickable link for each alias that calls the switch command
      const switchLink = `command:salesforce-org-quick-pick.switchToOrg?${enc([alias])}`;
      md.appendMarkdown(`$(plug) [${alias}](${switchLink} "Switch to ${alias}")\n\n`);
    });

    md.appendMarkdown('---\n\n');
    md.appendMarkdown(`$(layout-menubar) [Pick in command center](command:salesforce-org-quick-pick.switchOrg "Open org selector with built-in filter")\n`);
  } else {
    md.appendMarkdown('**No Salesforce Orgs Found**\n\n');
    md.appendMarkdown('Please authorize orgs using Salesforce CLI first.');
  }

  return md;
}

/**
 * Updates the sfdx-config.json with the new default org
 * @param username The username to set as default
 */
function updateSfdxConfig(username: string) {
  try {
    const homeDir = os.homedir();
    const configFilePath = path.join(homeDir, '.sfdx', 'sfdx-config.json');

    // Ensure .sfdx directory exists
    const sfdxDir = path.dirname(configFilePath);
    if (!fs.existsSync(sfdxDir)) {
      fs.mkdirSync(sfdxDir, { recursive: true });
    }

    // Read existing config or create empty object
    let config: any = {};
    if (fs.existsSync(configFilePath)) {
      const configContent = fs.readFileSync(configFilePath, 'utf8');
      config = JSON.parse(configContent);
    }

    // Update default username
    config.defaultusername = username;

    // Write back to file
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
  } catch (error) {
    log(`Error updating sfdx config: ${error}`);
  }
}

/**
 * Switches to the specified Salesforce org
 * @param alias The org alias to switch to
 * @param statusBarItem The status bar item to update
 * @param openOrgItem The open org status bar item to update
 */
function switchToOrg(alias: string, statusBarItem: vscode.StatusBarItem, openOrgItem?: vscode.StatusBarItem) {
  // Get the username for this alias
  const { aliasMap } = getSalesforceAliases();
  const username = aliasMap.get(alias);

  if (username) {
    // Update sfdx config file (for backward compatibility)
    updateSfdxConfig(username);

    // Use Salesforce CLI to set default org
    exec(`sf config set target-org "${alias}"`, (error: any, stdout: any, stderr: any) => {
      if (error) {
        log(`Error setting default org with CLI: ${error}`);
        vscode.window.showErrorMessage(`Failed to set default org: ${error.message}`);
        return;
      }
      if (stderr) {
        log(`sf config set target-org stderr: ${stderr}`);
      }
      log(`sf config set target-org stdout: ${stdout}`);
    });

    // Update status bar
    updateStatusBarFromConfig(statusBarItem, openOrgItem);

    // Show confirmation message
    vscode.window.showInformationMessage(`Switched to Salesforce org: ${alias}`);

    log(`Selected org: ${alias} (${username})`);
  } else {
    log(`Could not find username for alias: ${alias}`);
  }
}

/**
 * Filters aliases based on configured patterns
 * @param aliases Array of alias names to filter
 * @returns Filtered array of aliases
 */
function filterAliases(aliases: string[]): string[] {
  const config = vscode.workspace.getConfiguration('salesforceOrgQuickPick');
  const filters: string[] = config.get('orgFilters', []);
  const filterMode: string = config.get('filterMode', 'include');

  // If no filters configured, return all aliases
  if (!filters || filters.length === 0) {
    return aliases;
  }

  const filtered = aliases.filter(alias => {
    // Check if alias matches any of the filter patterns
    const matchesAnyFilter = filters.some(pattern => {
      try {
        const matches = minimatch(alias, pattern);
        return matches;
      } catch (error) {
        // If pattern is invalid, ignore it
        return false;
      }
    });

    // Apply filter mode
    if (filterMode === 'include') {
      return matchesAnyFilter;
    } else { // exclude
      return !matchesAnyFilter;
    }
  });

  return filtered;
}

/**
 * Gets the current default org from sfdx-config.json
 * @returns The default org username/alias or null if not set
 */
function getCurrentDefaultOrg(): string | null {
  try {
    const homeDir = os.homedir();
    const configFilePath = path.join(homeDir, '.sfdx', 'sfdx-config.json');

    if (!fs.existsSync(configFilePath)) {
      // Try alternative locations
      const altLocations = [
        path.join(homeDir, 'sfdx', 'sfdx-config.json'),
        path.join(process.env.USERPROFILE || homeDir, '.sfdx', 'sfdx-config.json'),
        path.join(process.env.HOME || homeDir, '.sfdx', 'sfdx-config.json')
      ];

      for (const altPath of altLocations) {
        if (fs.existsSync(altPath)) {
          const altConfigContent = fs.readFileSync(altPath, 'utf8');
          const altConfig = JSON.parse(altConfigContent);
          const altDefault = altConfig.defaultusername || altConfig.defaultdevhubusername || null;
          if (altDefault) {
            return altDefault;
          }
        }
      }

      return null;
    }

    const configContent = fs.readFileSync(configFilePath, 'utf8');
    const config = JSON.parse(configContent);

    // Check for default username (could be username or alias)
    const defaultOrg = config.defaultusername || config.defaultdevhubusername || null;
    return defaultOrg;
  } catch (error) {
    log(`Error reading sfdx config: ${error}`);
    return null;
  }
}

/**
 * Checks if the current workspace is a Salesforce project
 * @returns True if sfdx-project.json exists in the workspace root
 */
function isSalesforceProject(): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return false;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const sfdxProjectFile = path.join(workspaceRoot, 'sfdx-project.json');

  return fs.existsSync(sfdxProjectFile);
}

/**
 * Updates the status bar based on current default org and project type
 * @param statusBarItem The status bar item to update
 * @param openOrgItem The open org status bar item to update
 */
function updateStatusBarFromConfig(statusBarItem: vscode.StatusBarItem, openOrgItem?: vscode.StatusBarItem) {
  const isSfProject = isSalesforceProject();
  const defaultOrg = getCurrentDefaultOrg();

  if (!isSfProject) {
    // Hide status bar if not a Salesforce project
    statusBarItem.hide();
    if (openOrgItem) {
      openOrgItem.hide();
    }
    return;
  }

  // It's a Salesforce project, show status bar
  if (defaultOrg) {
    // Check if it's an alias or username
    const { aliasMap } = getSalesforceAliases();
    const alias = Array.from(aliasMap.entries()).find(([_, username]) => username === defaultOrg)?.[0] || defaultOrg;

    statusBarItem.text = `$(plug) ${alias}`;

    // Show open org button
    if (openOrgItem) {
      openOrgItem.text = '$(window)';
      openOrgItem.show();
    }
  } else {
    statusBarItem.text = 'Pick org';

    // Hide open org button when no org is selected
    if (openOrgItem) {
      openOrgItem.hide();
    }
  }

  // Show status bar
  statusBarItem.show();

  // Update tooltip
  const { aliases: currentAliases } = getSalesforceAliases();
  const filteredCurrentAliases = filterAliases(currentAliases);
  statusBarItem.tooltip = buildInteractiveTooltip(filteredCurrentAliases);
}

/**
 * Reads and parses Salesforce org aliases from ~/.sfdx/alias.json
 * @returns Object with sorted aliases array and alias-to-username map
 */
function getSalesforceAliases(): { aliases: string[], aliasMap: Map<string, string> } {
  try {
    const homeDir = os.homedir();
    const aliasFilePath = path.join(homeDir, '.sfdx', 'alias.json');

    if (!fs.existsSync(aliasFilePath)) {
      // Try alternative locations
      const altLocations = [
        path.join(homeDir, 'sfdx', 'alias.json'),
        path.join(process.env.USERPROFILE || homeDir, '.sfdx', 'alias.json'),
        path.join(process.env.HOME || homeDir, '.sfdx', 'alias.json')
      ];

      for (const altPath of altLocations) {
        if (fs.existsSync(altPath)) {
          const altAliasContent = fs.readFileSync(altPath, 'utf8');
          const altAliasData = JSON.parse(altAliasContent);

          if (altAliasData.orgs && typeof altAliasData.orgs === 'object') {
            const altAliasMap = new Map<string, string>();
            Object.entries(altAliasData.orgs).forEach(([alias, username]) => {
              altAliasMap.set(alias, username as string);
            });
            const altAliases = Array.from(altAliasMap.keys()).sort();
            return { aliases: altAliases, aliasMap: altAliasMap };
          }
        }
      }

      return { aliases: [], aliasMap: new Map() };
    }

    const aliasContent = fs.readFileSync(aliasFilePath, 'utf8');
    const aliasData = JSON.parse(aliasContent);

    if (!aliasData.orgs || typeof aliasData.orgs !== 'object') {
      return { aliases: [], aliasMap: new Map() };
    }

    // Extract alias names and create map, then sort alphabetically
    const aliasMap = new Map<string, string>();
    Object.entries(aliasData.orgs).forEach(([alias, username]) => {
      aliasMap.set(alias, username as string);
    });

    const aliases = Array.from(aliasMap.keys()).sort();
    return { aliases, aliasMap };
  } catch (error) {
    log(`Error reading Salesforce aliases: ${error}`);
    return { aliases: [], aliasMap: new Map() };
  }
}

export function activate(context: vscode.ExtensionContext) {
  log('Extension activated');

  // Create output channel for debugging
  const outputChannel = vscode.window.createOutputChannel('SF Org Quick Pick');
  outputChannel.appendLine('[SF Org Quick Pick] Extension activated');

  // Make output channel available globally for logging
  (global as any).sfOrgOutputChannel = outputChannel;

  // Show output channel if there are issues
  outputChannel.show();

  // Get Salesforce aliases and username mapping
  const { aliases: allAliases, aliasMap } = getSalesforceAliases();

  // Apply filters based on configuration
  const filteredAliases = filterAliases(allAliases);

  // Create status bar item for opening current org
  const openOrgItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 15433);
  openOrgItem.command = 'salesforce-org-quick-pick.openCurrentOrg';
  openOrgItem.tooltip = 'Open default org in browser';

  // Create status bar item for org switching
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 15432);
  statusBarItem.command = 'salesforce-org-quick-pick.switchOrg';

  // Initial update from config
  updateStatusBarFromConfig(statusBarItem, openOrgItem);

  // Setup file watcher for sfdx-config.json to detect external changes
  const homeDir = os.homedir();
  const configFilePath = path.join(homeDir, '.sfdx', 'sfdx-config.json');

  // Watch for changes to the config file
  const configWatcher = fs.watchFile(configFilePath, { persistent: true, interval: 1000 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      updateStatusBarFromConfig(statusBarItem, openOrgItem);
    }
  });

  // Also watch for changes to alias.json
  const aliasFilePath = path.join(homeDir, '.sfdx', 'alias.json');
  const aliasWatcher = fs.watchFile(aliasFilePath, { persistent: true, interval: 1000 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      updateStatusBarFromConfig(statusBarItem, openOrgItem);
    }
  });

  // Create disposables for file watchers
  const configFileWatcherDisposable = {
    dispose: () => {
      fs.unwatchFile(configFilePath);
    }
  };

  const aliasFileWatcherDisposable = {
    dispose: () => {
      fs.unwatchFile(aliasFilePath);
    }
  };

  // Command to show QuickPick with filtered aliases
  let disposable = vscode.commands.registerCommand('salesforce-org-quick-pick.switchOrg', async function () {
    // Get fresh filtered aliases in case configuration changed
    const { aliases: currentAliases, aliasMap } = getSalesforceAliases();
    const filteredCurrentAliases = filterAliases(currentAliases);

    // Create QuickPick items with alias as label and username as subtitle
    const quickPickItems = filteredCurrentAliases.map(alias => {
      const username = aliasMap.get(alias) || alias;
      return {
        label: alias,
        description: username
      };
    });

    if (quickPickItems.length === 0) {
      vscode.window.showWarningMessage('No Salesforce orgs found. Make sure you have authorized orgs using the Salesforce CLI.');
      return;
    }

    const selectedItem = await vscode.window.showQuickPick(quickPickItems, {
      title: 'Salesforce Org Quick Pick',
      placeHolder: 'Select a Salesforce org to switch to',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (selectedItem) {
      switchToOrg(selectedItem.label, statusBarItem, openOrgItem);
    }
  });

  // Command to switch directly to a specific org (called from tooltip links)
  let switchToOrgDisposable = vscode.commands.registerCommand('salesforce-org-quick-pick.switchToOrg', async function (alias: string) {
    switchToOrg(alias, statusBarItem, openOrgItem);
  });

  // Command to open current org in browser
  let openCurrentOrgDisposable = vscode.commands.registerCommand('salesforce-org-quick-pick.openCurrentOrg', async function () {
    const currentOrg = getCurrentDefaultOrg();
    if (currentOrg) {
      try {
        // Get browser preference from settings
        const config = vscode.workspace.getConfiguration('salesforceOrgQuickPick');
        const browser = config.get('browser', 'default');

        // Build the command with browser option if not default
        let command = `sf org open --target-org ${currentOrg}`;
        if (browser !== 'default') {
          command += ` --browser ${browser}`;
        }

        // Execute command silently in background
        exec(command, (error: any, stdout: any, stderr: any) => {
          if (error) {
            log(`Error opening org: ${error}`);
            vscode.window.showErrorMessage(`Failed to open Salesforce org: ${error.message}`);
            return;
          }
          if (stderr) {
            log(`sf org open stderr: ${stderr}`);
          }
          log(`sf org open stdout: ${stdout}`);
        });

        // Show brief success message
        vscode.window.showInformationMessage(`Opening Salesforce org in ${browser === 'default' ? 'default browser' : browser}...`);
      } catch (error) {
        log(`Error opening org: ${error}`);
        vscode.window.showErrorMessage('Failed to open Salesforce org. Make sure Salesforce CLI is installed.');
      }
    } else {
      vscode.window.showWarningMessage('No Salesforce org is currently selected.');
    }
  });

  // Function to update tooltip when configuration changes
  const updateTooltip = () => {
    const { aliases: currentAliases, aliasMap: currentAliasMap } = getSalesforceAliases();
    const filteredCurrentAliases = filterAliases(currentAliases);
    statusBarItem.tooltip = buildInteractiveTooltip(filteredCurrentAliases);
  };

  // Listen for configuration changes
  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('salesforceOrgQuickPick')) {
      updateTooltip();
    }
  });

  // Listen for workspace folder changes
  const workspaceChangeDisposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    updateStatusBarFromConfig(statusBarItem, openOrgItem);
  });

  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(openOrgItem);
  context.subscriptions.push(disposable);
  context.subscriptions.push(switchToOrgDisposable);
  context.subscriptions.push(openCurrentOrgDisposable);
  context.subscriptions.push(configChangeDisposable);
  context.subscriptions.push(workspaceChangeDisposable);
  context.subscriptions.push(configFileWatcherDisposable);
  context.subscriptions.push(aliasFileWatcherDisposable);
}

export function deactivate() {}
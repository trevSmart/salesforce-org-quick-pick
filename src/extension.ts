import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
const minimatch = require('minimatch');

/**
 * Builds an interactive tooltip with clickable Salesforce org aliases
 * @param aliases Array of alias names
 * @param aliasMap Map of alias to username for display
 * @returns MarkdownString with clickable command links
 */
function buildInteractiveTooltip(aliases: string[], aliasMap: Map<string, string>): vscode.MarkdownString {
  const md = new vscode.MarkdownString(undefined, true);
  md.isTrusted = true;

  // Helper function to encode command arguments
  const enc = (args: unknown[]) => encodeURIComponent(JSON.stringify(args));

  if (aliases.length > 0) {
    md.appendMarkdown('**Available Salesforce Orgs**\n\n');

    aliases.forEach(alias => {
      const username = aliasMap.get(alias) || alias;
      // Create clickable link for each alias that calls the switch command
      const switchLink = `command:salesforce-org-quick-pick.switchToOrg?${enc([alias])}`;
      md.appendMarkdown(`$(plug) [${alias} - ${username}](${switchLink} "Switch to ${alias}")\n\n`);
    });

    md.appendMarkdown('---\n');
    md.appendMarkdown('[$(list-unordered) Show all with filter](command:salesforce-org-quick-pick.switchOrg "Open org selector with built-in filter")');
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
    console.error('Error updating sfdx config:', error);
  }
}

/**
 * Switches to the specified Salesforce org
 * @param alias The org alias to switch to
 * @param statusBarItem The status bar item to update
 */
function switchToOrg(alias: string, statusBarItem: vscode.StatusBarItem) {
  // Get the username for this alias
  const { aliasMap } = getSalesforceAliases();
  const username = aliasMap.get(alias);

  if (username) {
    // Update sfdx config file
    updateSfdxConfig(username);

    // Update status bar to show selected org with plug icon
    statusBarItem.text = `$(plug) ${alias}`;

    // Show confirmation message
    vscode.window.showInformationMessage(`Switched to Salesforce org: ${alias}`);

    console.log(`Selected org: ${alias} (${username})`);
  } else {
    console.error(`Could not find username for alias: ${alias}`);
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

  return aliases.filter(alias => {
    // Check if alias matches any of the filter patterns
    const matchesAnyFilter = filters.some(pattern => {
      try {
        return minimatch(alias, pattern);
      } catch (error) {
        // If pattern is invalid, ignore it
        console.warn(`Invalid glob pattern: ${pattern}`, error);
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
      return null;
    }

    const configContent = fs.readFileSync(configFilePath, 'utf8');
    const config = JSON.parse(configContent);

    // Check for default username (could be username or alias)
    return config.defaultusername || config.defaultdevhubusername || null;
  } catch (error) {
    console.error('Error reading sfdx config:', error);
    return null;
  }
}

/**
 * Updates the status bar based on current default org
 * @param statusBarItem The status bar item to update
 */
function updateStatusBarFromConfig(statusBarItem: vscode.StatusBarItem) {
  const defaultOrg = getCurrentDefaultOrg();

  if (defaultOrg) {
    // Check if it's an alias or username
    const { aliasMap } = getSalesforceAliases();
    const alias = Array.from(aliasMap.entries()).find(([_, username]) => username === defaultOrg)?.[0] || defaultOrg;

    statusBarItem.text = `$(plug) ${alias}`;
  } else {
    statusBarItem.text = 'Pick org';
  }

  // Update tooltip
  const { aliases: currentAliases, aliasMap: currentAliasMap } = getSalesforceAliases();
  const filteredCurrentAliases = filterAliases(currentAliases);
  statusBarItem.tooltip = buildInteractiveTooltip(filteredCurrentAliases, currentAliasMap);
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
      console.log('Salesforce alias file not found:', aliasFilePath);
      return { aliases: [], aliasMap: new Map() };
    }

    const aliasContent = fs.readFileSync(aliasFilePath, 'utf8');
    const aliasData = JSON.parse(aliasContent);

    if (!aliasData.orgs || typeof aliasData.orgs !== 'object') {
      console.log('Invalid alias file format');
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
    console.error('Error reading Salesforce aliases:', error);
    return { aliases: [], aliasMap: new Map() };
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Salesforce Org Quick Pick extension is now active!');

  // Get Salesforce aliases and username mapping
  const { aliases: allAliases, aliasMap } = getSalesforceAliases();

  // Apply filters based on configuration
  const filteredAliases = filterAliases(allAliases);

  // Create status bar item for org switching
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'salesforce-org-quick-pick.switchOrg';

  // Initial update from config
  updateStatusBarFromConfig(statusBarItem);
  statusBarItem.show();

  // Setup file watcher for sfdx-config.json to detect external changes
  const homeDir = os.homedir();
  const configFilePath = path.join(homeDir, '.sfdx', 'sfdx-config.json');

  // Watch for changes to the config file
  const configWatcher = fs.watchFile(configFilePath, { persistent: true, interval: 1000 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      console.log('sfdx-config.json changed, updating status bar');
      updateStatusBarFromConfig(statusBarItem);
    }
  });

  // Also watch for changes to alias.json
  const aliasFilePath = path.join(homeDir, '.sfdx', 'alias.json');
  const aliasWatcher = fs.watchFile(aliasFilePath, { persistent: true, interval: 1000 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      console.log('alias.json changed, updating status bar');
      updateStatusBarFromConfig(statusBarItem);
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
    const { aliases: currentAliases } = getSalesforceAliases();
    const filteredCurrentAliases = filterAliases(currentAliases);

    const selectedOrg = await vscode.window.showQuickPick(filteredCurrentAliases, {
      placeHolder: 'Select a Salesforce org to switch to',
      matchOnDescription: false,
      matchOnDetail: false
    });

    if (selectedOrg) {
      switchToOrg(selectedOrg, statusBarItem);
    }
  });

  // Command to switch directly to a specific org (called from tooltip links)
  let switchToOrgDisposable = vscode.commands.registerCommand('salesforce-org-quick-pick.switchToOrg', async function (alias: string) {
    switchToOrg(alias, statusBarItem);
  });

  // Function to update tooltip when configuration changes
  const updateTooltip = () => {
    const { aliases: currentAliases, aliasMap: currentAliasMap } = getSalesforceAliases();
    const filteredCurrentAliases = filterAliases(currentAliases);
    statusBarItem.tooltip = buildInteractiveTooltip(filteredCurrentAliases, currentAliasMap);
  };

  // Listen for configuration changes
  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('salesforceOrgQuickPick')) {
      updateTooltip();
    }
  });

  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(disposable);
  context.subscriptions.push(switchToOrgDisposable);
  context.subscriptions.push(configChangeDisposable);
  context.subscriptions.push(configFileWatcherDisposable);
  context.subscriptions.push(aliasFileWatcherDisposable);
}

export function deactivate() {}
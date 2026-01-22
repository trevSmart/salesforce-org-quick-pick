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
 * Manages dedicated status bar items for quick org access
 */
class DedicatedStatusBarManager {
  private context: vscode.ExtensionContext;
  private dedicatedItems: Map<string, vscode.StatusBarItem> = new Map();
  private itemOrders: Map<string, number> = new Map(); // Store order for each item
  private nextPriority = 101; // Start after main items (100)

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Updates icons of dedicated items based on current default org
   */
  updateIcons(currentDefaultOrg: string | null, aliasMap: Map<string, string>) {
    const filters = getNormalizedOrgFilters();

    this.dedicatedItems.forEach((item, alias) => {
      const username = aliasMap.get(alias);
      const filter = filters.find(f => minimatch(alias, f.filterPattern));
      const customLabel = filter?.quickAccessLabel || '';

      if (username === currentDefaultOrg) {
        item.text = `$(plug) ${customLabel || alias}`;
      } else {
        item.text = customLabel || alias;
      }
    });
  }

  /**
   * Loads persisted dedicated orgs and creates their status bar items
   */
  loadPersistedOrgs(aliasMap: Map<string, string>) {
    const persistedOrgs = this.context.globalState.get<string[]>('salesforceOrgQuickPick.dedicatedOrgs', []);
    const filters = getNormalizedOrgFilters();

    // Sort persisted orgs by quickAccessOrder
    const sortedOrgs = persistedOrgs.sort((a, b) => {
      const filterA = filters.find(f => minimatch(a, f.filterPattern));
      const filterB = filters.find(f => minimatch(b, f.filterPattern));
      const orderA = filterA?.quickAccessOrder || 0;
      const orderB = filterB?.quickAccessOrder || 0;
      return orderA - orderB;
    });

    sortedOrgs.forEach(alias => {
      if (aliasMap.has(alias)) {
        this.addDedicatedItem(alias, aliasMap.get(alias)!);
      }
    });
  }

  /**
   * Adds a dedicated status bar item for quick org access
   */
  addDedicatedItem(alias: string, username: string) {
    if (this.dedicatedItems.has(alias)) {
      return; // Already exists
    }

    const filters = getNormalizedOrgFilters();
    const filter = filters.find(f => minimatch(alias, f.filterPattern));
    const order = filter?.quickAccessOrder || 0;
    const customLabel = filter?.quickAccessLabel || '';

    // Calculate priority based on order (higher order = higher priority)
    const priority = 101 + (1000 - order); // Use large offset to ensure proper ordering

    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, priority);
    const label = customLabel || alias;
    item.text = label;
    item.tooltip = `Switch to ${alias} (${username})`;
    item.command = {
      command: 'salesforce-org-quick-pick.openDedicatedOrg',
      arguments: [alias, username],
      title: `Switch to ${alias} org`
    };
    item.show();

    this.dedicatedItems.set(alias, item);
    this.itemOrders.set(alias, order);

    // Persist the change
    this.persistDedicatedOrgs();
  }

  /**
   * Removes a dedicated status bar item
   */
  removeDedicatedItem(alias: string) {
    const item = this.dedicatedItems.get(alias);
    if (item) {
      item.hide();
      item.dispose();
      this.dedicatedItems.delete(alias);
      this.itemOrders.delete(alias);

      // Persist the change
      this.persistDedicatedOrgs();
    }
  }

  /**
   * Toggles dedicated item for an org (add if not exists, remove if exists)
   */
  toggleDedicatedItem(alias: string, username: string) {
    if (this.dedicatedItems.has(alias)) {
      this.removeDedicatedItem(alias);
      vscode.window.showInformationMessage(`Removed quick access for "${alias}"`);
    } else {
      this.addDedicatedItem(alias, username);
      vscode.window.showInformationMessage(`Added quick access for "${alias}"`);
    }
  }

  /**
   * Checks if an org has a dedicated item
   */
  hasDedicatedItem(alias: string): boolean {
    return this.dedicatedItems.has(alias);
  }

  /**
   * Persists the list of dedicated orgs to global state
   */
  private persistDedicatedOrgs() {
    const dedicatedOrgs = Array.from(this.dedicatedItems.keys());
    this.context.globalState.update('salesforceOrgQuickPick.dedicatedOrgs', dedicatedOrgs);
  }

  /**
   * Reorders dedicated items based on current filter configuration
   */
  reorderItems() {
    const filters = getNormalizedOrgFilters();

    this.dedicatedItems.forEach((item, alias) => {
      const filter = filters.find(f => minimatch(alias, f.filterPattern));
      const order = filter?.quickAccessOrder || 0;
      const newPriority = 101 + (1000 - order);

      // Recreate the item with new priority
      item.hide();
      item.dispose();

      const newItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, newPriority);
      const customLabel = filter?.quickAccessLabel || '';
      const label = customLabel || alias;
      newItem.text = label;
      newItem.tooltip = item.tooltip;
      newItem.command = item.command;
      newItem.show();

      this.dedicatedItems.set(alias, newItem);
      this.itemOrders.set(alias, order);
    });
  }

  /**
   * Disposes all dedicated items
   */
  dispose() {
    this.dedicatedItems.forEach(item => {
      item.hide();
      item.dispose();
    });
    this.dedicatedItems.clear();
    this.itemOrders.clear();
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
 * Updates the project-level sfdx-config.json with the new default org
 * @param username The username to set as default
 */
function updateSfdxConfig(username: string) {
  try {
    // Get workspace root
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const configFilePath = path.join(workspaceRoot, '.sfdx', 'sfdx-config.json');

    // Ensure .sfdx directory exists in workspace
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
    log(`Error updating project sfdx config: ${error}`);
  }
}

/**
 * Switches to the specified Salesforce org
 * @param alias The org alias to switch to
 * @param statusBarItem The status bar item to update
 * @param openOrgItem The open org status bar item to update
 */
function switchToOrg(alias: string, statusBarItem: vscode.StatusBarItem, openOrgItem?: vscode.StatusBarItem, dedicatedManager?: DedicatedStatusBarManager) {
  // Get the username for this alias
  const { aliasMap } = getSalesforceAliases();
  const username = aliasMap.get(alias);

  if (username) {
    // Show warning state while authenticating
    statusBarItem.text = `$(warning) Authenticating...`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    if (openOrgItem) {
      openOrgItem.hide();
    }

    // Update sfdx config file (for backward compatibility)
    updateSfdxConfig(username);

    // Use Salesforce CLI to set default org
    exec(`sf config set target-org "${alias}"`, (error: any, stdout: any, stderr: any) => {
      // Always reset the warning state when the command completes
      statusBarItem.backgroundColor = undefined;

      if (error) {
        log(`Error setting default org with CLI: ${error}`);
        vscode.window.showErrorMessage(`Failed to set default org: ${error.message}`);
        // Update status bar to show current state
        updateStatusBarFromConfig(statusBarItem, openOrgItem, dedicatedManager);
        return;
      }
      if (stderr) {
        log(`sf config set target-org stderr: ${stderr}`);
      }
      log(`sf config set target-org stdout: ${stdout}`);

      // Update status bar to show the new org
      updateStatusBarFromConfig(statusBarItem, openOrgItem, dedicatedManager);
    });

    // Show confirmation message
    vscode.window.showInformationMessage(`Switched to Salesforce org: ${alias}`);

    log(`Selected org: ${alias} (${username})`);
  } else {
    log(`Could not find username for alias: ${alias}`);
  }
}

/**
 * Migrates old string-based orgFilters to new object-based structure
 * @param config VS Code configuration object
 */
function migrateOrgFilters(config: vscode.WorkspaceConfiguration): void {
  const currentFilters = config.get('orgFilters', []);

  // Check if migration is needed (if any filter is a string)
  const needsMigration = currentFilters.some((filter: any) => typeof filter === 'string');

  if (needsMigration) {
    const migratedFilters = currentFilters.map((filter: any) => {
      if (typeof filter === 'string') {
        // Migrate string to object
        return {
          filterPattern: filter,
          quickAccessOrder: 0,
          quickAccessLabel: ''
        };
      }
      return filter; // Already an object
    });

    // Update the configuration
    config.update('orgFilters', migratedFilters, vscode.ConfigurationTarget.Workspace);
    log('Migrated orgFilters from string array to object array');
  }
}

/**
 * Gets normalized org filter configurations with migration support
 * @returns Array of filter configuration objects
 */
function getNormalizedOrgFilters(): Array<{filterPattern: string, quickAccessOrder: number, quickAccessLabel: string}> {
  const config = vscode.workspace.getConfiguration('salesforceOrgQuickPick');

  // Migrate if needed
  migrateOrgFilters(config);

  const filters: any[] = config.get('orgFilters', []);
  return filters.map(filter => ({
    filterPattern: filter.filterPattern || '',
    quickAccessOrder: filter.quickAccessOrder || 0,
    quickAccessLabel: filter.quickAccessLabel || ''
  }));
}

/**
 * Filters aliases based on configured patterns
 * @param aliases Array of alias names to filter
 * @returns Filtered array of aliases
 */
function filterAliases(aliases: string[]): string[] {
  const filters = getNormalizedOrgFilters();

  // If no filters configured, return all aliases
  if (!filters || filters.length === 0) {
    return aliases;
  }

  const filtered = aliases.filter(alias => {
    // Check if alias matches any of the filter patterns
    const matchesAnyFilter = filters.some(filter => {
      try {
        const matches = minimatch(alias, filter.filterPattern);
        return matches;
      } catch (error) {
        // If pattern is invalid, ignore it
        return false;
      }
    });

    // Always include orgs that match the filter patterns
    return matchesAnyFilter;
  });

  return filtered;
}

/**
 * Gets the current default org from project-level sfdx-config.json
 * Only checks project configuration, never global configuration
 * @returns The default org username/alias or null if not set
 */
function getCurrentDefaultOrg(): string | null {
  try {
    // Only check local project config (.sfdx/sfdx-config.json in workspace)
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return null;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const localConfigPath = path.join(workspaceRoot, '.sfdx', 'sfdx-config.json');

    if (!fs.existsSync(localConfigPath)) {
      return null;
    }

    const localConfigContent = fs.readFileSync(localConfigPath, 'utf8');
    const localConfig = JSON.parse(localConfigContent);

    // Check for default username (could be username or alias)
    const defaultOrg = localConfig.defaultusername || localConfig.defaultdevhubusername || null;
    return defaultOrg;
  } catch (error) {
    log(`Error reading project sfdx config: ${error}`);
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
function updateStatusBarFromConfig(statusBarItem: vscode.StatusBarItem, openOrgItem?: vscode.StatusBarItem, dedicatedManager?: DedicatedStatusBarManager) {
  const isSfProject = isSalesforceProject();
  const defaultOrg = getCurrentDefaultOrg();

  // Always reset to normal state (remove warning colors)
  statusBarItem.backgroundColor = undefined;

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

    statusBarItem.text = `$(cloud) ${alias}`;

    // Show open org button
    if (openOrgItem) {
      openOrgItem.text = '$(window)';
      openOrgItem.show();
    }

    // Update dedicated items icons
    if (dedicatedManager) {
      // Convert defaultOrg (which could be alias or username) to username for comparison
      const currentUsername = aliasMap.get(defaultOrg) || defaultOrg;
      dedicatedManager.updateIcons(currentUsername, aliasMap);
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

  // Update tooltip based on setting
  const config = vscode.workspace.getConfiguration('salesforceOrgQuickPick');
  const showTooltip: boolean = config.get('showTooltip', false);

  if (showTooltip) {
    const { aliases: currentAliases } = getSalesforceAliases();
    const filteredCurrentAliases = filterAliases(currentAliases);
    statusBarItem.tooltip = buildInteractiveTooltip(filteredCurrentAliases);
  } else {
    statusBarItem.tooltip = undefined;
  }
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

  // Create dedicated status bar manager
  const dedicatedManager = new DedicatedStatusBarManager(context);
  dedicatedManager.loadPersistedOrgs(aliasMap);

  // Create status bar item for opening current org
  const openOrgItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 102);
  openOrgItem.command = 'salesforce-org-quick-pick.openCurrentOrg';
  openOrgItem.tooltip = 'Open default org in browser';

  // Create status bar item for org switching
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'salesforce-org-quick-pick.switchOrg';

  // Initial update from config
  updateStatusBarFromConfig(statusBarItem, openOrgItem, dedicatedManager);

  // Setup file watcher for project-level sfdx-config.json to detect changes
  const workspaceFolders = vscode.workspace.workspaceFolders;
  let configFilePath = '';
  if (workspaceFolders && workspaceFolders.length > 0) {
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    configFilePath = path.join(workspaceRoot, '.sfdx', 'sfdx-config.json');
  }

  // Watch for changes to the project config file
  let configWatcher: fs.StatWatcher | null = null;
  if (configFilePath) {
    configWatcher = fs.watchFile(configFilePath, { persistent: true, interval: 500 }, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        log('Detected config file change, updating status bar');
        updateStatusBarFromConfig(statusBarItem, openOrgItem, dedicatedManager);
      }
    });
  }

  // Also watch for changes to alias.json (global)
  const homeDir = os.homedir();
  const aliasFilePath = path.join(homeDir, '.sfdx', 'alias.json');
  const aliasWatcher = fs.watchFile(aliasFilePath, { persistent: true, interval: 1000 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      updateStatusBarFromConfig(statusBarItem, openOrgItem, dedicatedManager);
    }
  });

  // Create disposables for file watchers
  const configFileWatcherDisposable = {
    dispose: () => {
      if (configFilePath) {
        fs.unwatchFile(configFilePath);
      }
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
        detail: username,
        buttons: [
          {
            iconPath: new vscode.ThemeIcon('window'),
            tooltip: 'Open org in browser'
          },
          {
            iconPath: dedicatedManager.hasDedicatedItem(alias) ? new vscode.ThemeIcon('remove') : new vscode.ThemeIcon('add'),
            tooltip: dedicatedManager.hasDedicatedItem(alias) ? 'Remove quick access' : 'Add quick access'
          }
        ]
      };
    });

    if (quickPickItems.length === 0) {
      vscode.window.showWarningMessage('No Salesforce orgs found. Make sure you have authorized orgs using the Salesforce CLI.');
      return;
    }

    const quickPick = vscode.window.createQuickPick();
    quickPick.items = quickPickItems;
    quickPick.title = 'Salesforce Org Quick Pick';
    quickPick.placeholder = 'Select a Salesforce org to switch to';
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    quickPick.onDidTriggerItemButton(async (event) => {
      const alias = event.item.label;
      const username = aliasMap.get(alias);
      const buttonIndex = event.item.buttons?.indexOf(event.button) ?? -1;

      if (username) {
        try {
          if (buttonIndex === 0) {
            // First button: Open org in browser
            // Get browser preference from settings
            const config = vscode.workspace.getConfiguration('salesforceOrgQuickPick');
            const browser = config.get('browser', 'default');

            // Build the command with browser option if not default
            let command = `sf org open --target-org "${username}"`;
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
            vscode.window.showInformationMessage(`Opening Salesforce org "${alias}" in ${browser === 'default' ? 'default browser' : browser}...`);

            // Close the QuickPick
            quickPick.hide();
          } else if (buttonIndex === 1) {
            // Second button: Toggle dedicated quick access
            dedicatedManager.toggleDedicatedItem(alias, username);
            // Update the quick pick to reflect the change
            quickPick.items = quickPick.items.map(item => {
              if (item.label === alias) {
                return {
                  ...item,
                  buttons: [
                    item.buttons![0],
                    {
                      iconPath: dedicatedManager.hasDedicatedItem(alias) ? new vscode.ThemeIcon('remove') : new vscode.ThemeIcon('add'),
                      tooltip: dedicatedManager.hasDedicatedItem(alias) ? 'Remove quick access' : 'Add quick access'
                    }
                  ]
                };
              }
              return item;
            });
          }
        } catch (error) {
          log(`Error: ${error}`);
          vscode.window.showErrorMessage('Failed to execute command. Make sure Salesforce CLI is installed.');
        }
      } else {
        log(`Could not find username for alias: ${alias}`);
      }
    });

    quickPick.onDidAccept(async () => {
      const selectedItem = quickPick.selectedItems[0];
      if (selectedItem) {
        switchToOrg(selectedItem.label, statusBarItem, openOrgItem, dedicatedManager);
      }
      quickPick.hide();
    });

    quickPick.show();
  });

  // Command to switch directly to a specific org (called from tooltip links)
  let switchToOrgDisposable = vscode.commands.registerCommand('salesforce-org-quick-pick.switchToOrg', async function (alias: string) {
    switchToOrg(alias, statusBarItem, openOrgItem, dedicatedManager);
  });

  // Command to switch to dedicated org (set as default)
  let openDedicatedOrgDisposable = vscode.commands.registerCommand('salesforce-org-quick-pick.openDedicatedOrg', async function (alias: string, username: string) {
    // Switch to the org by setting it as default
    switchToOrg(alias, statusBarItem, openOrgItem, dedicatedManager);
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
    const config = vscode.workspace.getConfiguration('salesforceOrgQuickPick');
    const showTooltip: boolean = config.get('showTooltip', false);

    if (showTooltip) {
      const { aliases: currentAliases } = getSalesforceAliases();
      const filteredCurrentAliases = filterAliases(currentAliases);
      statusBarItem.tooltip = buildInteractiveTooltip(filteredCurrentAliases);
    } else {
      statusBarItem.tooltip = undefined;
    }
  };

  // Listen for configuration changes
  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('salesforceOrgQuickPick')) {
      updateTooltip();

      // Reorder dedicated items if orgFilters changed
      if (event.affectsConfiguration('salesforceOrgQuickPick.orgFilters')) {
        dedicatedManager.reorderItems();
      }
    }
  });

  // Listen for workspace folder changes
  const workspaceChangeDisposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    // Stop watching old config file
    if (configFilePath) {
      fs.unwatchFile(configFilePath);
    }

    // Update config file path for new workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      configFilePath = path.join(workspaceRoot, '.sfdx', 'sfdx-config.json');

      // Start watching new config file
      fs.watchFile(configFilePath, { persistent: true, interval: 500 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          log('Detected config file change, updating status bar');
          updateStatusBarFromConfig(statusBarItem, openOrgItem, dedicatedManager);
        }
      });
    }

    updateStatusBarFromConfig(statusBarItem, openOrgItem, dedicatedManager);
  });

  // Create disposable for dedicated manager
  const dedicatedManagerDisposable = {
    dispose: () => {
      dedicatedManager.dispose();
    }
  };

  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(openOrgItem);
  context.subscriptions.push(disposable);
  context.subscriptions.push(switchToOrgDisposable);
  context.subscriptions.push(openDedicatedOrgDisposable);
  context.subscriptions.push(openCurrentOrgDisposable);
  context.subscriptions.push(configChangeDisposable);
  context.subscriptions.push(workspaceChangeDisposable);
  context.subscriptions.push(configFileWatcherDisposable);
  context.subscriptions.push(aliasFileWatcherDisposable);
  context.subscriptions.push(dedicatedManagerDisposable);
}

export function deactivate() {}
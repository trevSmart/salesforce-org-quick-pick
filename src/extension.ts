import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

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
  private nextPriority = 40; // Start before main picker (dedicated items first)

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Updates icons of dedicated items based on current default org
   */
  updateIcons(currentDefaultOrg: string | null, aliasMap: Map<string, string>) {
    const mode = getHighlightMode();
    const hasAnyVisible = this.hasAnyVisibleDedicatedItem();
    const shouldHighlightDedicated =
      mode === 'always' || (mode === 'whenDedicatedVisible' && hasAnyVisible);

    this.dedicatedItems.forEach((item, alias) => {
      const username = aliasMap.get(alias);
      const isCurrentOrg = username === currentDefaultOrg;

      if (isCurrentOrg && shouldHighlightDedicated) {
        item.text = `$(plug) ${getAliasDisplayLabel(alias)}`;
        item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      } else {
        item.text = getAliasDisplayLabel(alias);
        item.backgroundColor = undefined;
      }
    });
  }

  /**
   * Loads persisted dedicated orgs and creates their status bar items
   */
  loadPersistedOrgs(aliasMap: Map<string, string>) {
    const persistedOrgs = this.context.globalState.get<string[]>('salesforceOrgQuickPick.dedicatedOrgs', []);
    const filters = getNormalizedOrgFilters();

    // Sort persisted orgs by their order in the filters array
    const sortedOrgs = persistedOrgs.sort((a, b) => {
      const indexA = filters.findIndex(f => simpleGlobMatch(a, f));
      const indexB = filters.findIndex(f => simpleGlobMatch(b, f));
      // If not found in filters, put at the end (index -1 becomes a large number)
      const orderA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
      const orderB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
      return orderA - orderB;
    });

    sortedOrgs.forEach(alias => {
      if (aliasMap.has(alias)) {
        this.addDedicatedItem(alias, aliasMap.get(alias)!);
      }
    });

    // Update visibility based on filters after loading
    this.updateVisibilityBasedOnFilters();
  }

  /**
   * Adds a dedicated status bar item for quick org access
   */
  addDedicatedItem(alias: string, username: string) {
    if (this.dedicatedItems.has(alias)) {
      return; // Already exists
    }

    const filters = getNormalizedOrgFilters();
    const order = filters.findIndex(f => simpleGlobMatch(alias, f));

    // Calculate priority based on order (higher order = higher priority)
    // If not found in filters (-1), use a low priority (high number)
    const priority = order === -1 ? 50 : 50 + order;

    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, priority);
    item.text = getAliasDisplayLabel(alias);
    item.tooltip = `Switch to ${alias} (${username})`;
    item.command = {
      command: 'salesforce-org-quick-pick.openDedicatedOrg',
      arguments: [alias, username],
      title: `Switch to ${alias} org`
    };

    this.dedicatedItems.set(alias, item);
    this.itemOrders.set(alias, order);

    // Update visibility based on filters (will show/hide accordingly)
    this.updateVisibilityForItem(alias);

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
    } else {
      this.addDedicatedItem(alias, username);
    }
  }

  /**
   * Checks if an org has a dedicated item
   */
  hasDedicatedItem(alias: string): boolean {
    return this.dedicatedItems.has(alias);
  }

  /**
   * Checks if an org has a visible dedicated item (exists and passes filter)
   */
  hasVisibleDedicatedItem(alias: string): boolean {
    if (!this.dedicatedItems.has(alias)) {
      return false;
    }

    const filters = getNormalizedOrgFilters();
    // If no filters, item is visible if it exists
    if (filters.length === 0) {
      return true;
    }

    // Check if alias passes any filter
    return filters.some(filter => simpleGlobMatch(alias, filter));
  }

  /**
   * Returns true if at least one dedicated item is visible (passes filter)
   */
  hasAnyVisibleDedicatedItem(): boolean {
    return Array.from(this.dedicatedItems.keys()).some(alias => this.hasVisibleDedicatedItem(alias));
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
      const order = filters.findIndex(f => simpleGlobMatch(alias, f));
      const newPriority = order === -1 ? 50 : 50 + order;

      // Recreate the item with new priority
      item.hide();
      item.dispose();

      const newItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, newPriority);
      newItem.text = getAliasDisplayLabel(alias);
      newItem.tooltip = item.tooltip;
      newItem.command = item.command;

      this.dedicatedItems.set(alias, newItem);
      this.itemOrders.set(alias, order);
    });

    // Update visibility based on filters after reordering
    this.updateVisibilityBasedOnFilters();
  }

  /**
   * Updates visibility for a single dedicated item based on filters
   */
  private updateVisibilityForItem(alias: string) {
    const item = this.dedicatedItems.get(alias);
    if (!item) {
      return;
    }

    const filters = getNormalizedOrgFilters();
    const shouldShow = filters.length === 0 || filters.some(filter => simpleGlobMatch(alias, filter));

    if (shouldShow) {
      item.show();
    } else {
      item.hide();
    }
  }

  /**
   * Updates visibility of all dedicated items based on current filters
   */
  updateVisibilityBasedOnFilters() {
    this.dedicatedItems.forEach((_, alias) => {
      this.updateVisibilityForItem(alias);
    });
  }

  /**
   * Hides all dedicated items (when not in Salesforce project)
   */
  hideAll() {
    this.dedicatedItems.forEach(item => {
      item.hide();
    });
  }

  /**
   * Shows all dedicated items (when back in Salesforce project)
   * Respects filter configuration
   */
  showAll() {
    this.updateVisibilityBasedOnFilters();
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
    // Show authenticating state
    statusBarItem.text = statusBarItem.text.replace('$(cloud)', '$(loading~spin)');
    if (openOrgItem) {
      openOrgItem.hide();
    }

    // Update sfdx config file (for backward compatibility)
    updateSfdxConfig(username);

    // Use Salesforce CLI to set default org
    exec(`sf config set target-org "${alias}"`, (error: any, stdout: any, stderr: any) => {
      // Always reset the warning state when the command completes
      statusBarItem.backgroundColor = undefined;
      statusBarItem.text = statusBarItem.text.replace('$(loading~spin)', '$(cloud)');

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


    log(`Selected org: ${alias} (${username})`);
  } else {
    log(`Could not find username for alias: ${alias}`);
  }
}


/**
 * Gets normalized org filter configurations
 * @returns Array of filter pattern strings
 */
function getNormalizedOrgFilters(): string[] {
  const config = vscode.workspace.getConfiguration('salesforceOrgQuickPick');
  return config.get('orgFilters', []);
}

type HighlightMode = 'never' | 'whenDedicatedVisible' | 'always';

/**
 * Reads highlight mode from config (supports legacy boolean: true -> always, false -> never)
 */
function getHighlightMode(): HighlightMode {
  const config = vscode.workspace.getConfiguration('salesforceOrgQuickPick');
  const raw = config.get<boolean | HighlightMode>('highlightCurrentTargetOrgMode', 'always');
  if (raw === true) return 'always';
  if (raw === false) return 'never';
  if (raw === 'whenDedicatedVisible' || raw === 'never' || raw === 'always') return raw;
  return 'always';
}

/**
 * Gets the display label for an alias (short label if configured, otherwise the alias itself)
 * @param alias The org alias
 * @returns The display label to show in the status bar
 */
function getAliasDisplayLabel(alias: string): string {
  const config = vscode.workspace.getConfiguration('salesforceOrgQuickPick');
  const aliasLabels: { [key: string]: string } = config.get('aliasLabels', {});
  return aliasLabels[alias] || alias;
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
        const matches = simpleGlobMatch(alias, filter);
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
 * Updates the status bar based on current default org and project type
 * @param statusBarItem The status bar item to update
 * @param openOrgItem The open org status bar item to update
 */
function updateStatusBarFromConfig(statusBarItem: vscode.StatusBarItem, openOrgItem?: vscode.StatusBarItem, dedicatedManager?: DedicatedStatusBarManager) {
  const defaultOrg = getCurrentDefaultOrg();

  // Always reset to normal state (remove warning colors)
  statusBarItem.backgroundColor = undefined;

  if (defaultOrg) {
    // Check if it's an alias or username
    const { aliasMap } = getSalesforceAliases();
    const alias = Array.from(aliasMap.entries()).find(([_, username]) => username === defaultOrg)?.[0] || defaultOrg;

    // Check if we should hide the label when dedicated item exists and is visible
    const config = vscode.workspace.getConfiguration('salesforceOrgQuickPick');
    const hideLabel = config.get('hideMainLabelWhenDedicatedExists', true) && dedicatedManager && dedicatedManager.hasVisibleDedicatedItem(alias);
    const displayLabel = getAliasDisplayLabel(alias);
    statusBarItem.text = hideLabel ? '$(cloud)' : `$(cloud) ${displayLabel}`;

    // Apply highlight color to main picker based on mode: only "always" highlights main when no dedicated visible
    const highlightMode = getHighlightMode();
    const hasVisibleDedicated = dedicatedManager && dedicatedManager.hasVisibleDedicatedItem(alias);
    const shouldHighlightMain =
      highlightMode === 'always' && !hasVisibleDedicated;
    if (shouldHighlightMain) {
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      statusBarItem.backgroundColor = undefined;
    }

    // Show open org button if setting is enabled
    if (openOrgItem) {
      const showOpenOrgButton = config.get('showOpenOrgButton', true);
      if (showOpenOrgButton) {
        openOrgItem.text = '$(window)';
        openOrgItem.show();
      } else {
        openOrgItem.hide();
      }
    }

    // Update dedicated items icons and visibility
    if (dedicatedManager) {
      // Convert defaultOrg (which could be alias or username) to username for comparison
      const currentUsername = aliasMap.get(defaultOrg) || defaultOrg;
      dedicatedManager.updateIcons(currentUsername, aliasMap);
      dedicatedManager.updateVisibilityBasedOnFilters();
    }
  } else {
    statusBarItem.text = '$(cloud) Pick org';

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

/**
 * Initializes the full extension (only for Salesforce projects)
 */
function initializeExtension(context: vscode.ExtensionContext) {
  log('Salesforce project detected - initializing extension');

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

  // Create status bar item for opening current org (at the end of our block)
  const openOrgItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3000);
  openOrgItem.command = 'salesforce-org-quick-pick.openCurrentOrg';
  openOrgItem.tooltip = 'Open default org in browser';

  // Create status bar item for org switching (after dedicated items)
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 54);
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
    const currentDefaultOrg = getCurrentDefaultOrg();
    const quickPickItems = filteredCurrentAliases.map(alias => {
      const username = aliasMap.get(alias) || alias;
      const isCurrentTargetOrg = currentDefaultOrg === alias || currentDefaultOrg === username;
      return {
        label: alias,
        detail: username,
        iconPath: new vscode.ThemeIcon(isCurrentTargetOrg ? 'plug' : 'cloud'),
        buttons: [
          {
            iconPath: new vscode.ThemeIcon('window'),
            tooltip: 'Open org in browser'
          },
          {
            iconPath: dedicatedManager.hasDedicatedItem(alias) ? new vscode.ThemeIcon('remove') : new vscode.ThemeIcon('add'),
            tooltip: dedicatedManager.hasDedicatedItem(alias) ? 'Remove dedicated button from the status bar' : 'Add dedicated button to the status bar'
          }
        ]
      };
    });

    if (quickPickItems.length === 0) {
      // Distinguish between no orgs retrieved vs. no orgs matching filter
      const { aliases: allAliases } = getSalesforceAliases();
      if (allAliases.length === 0) {
        vscode.window.showWarningMessage('No Salesforce orgs found. Make sure you have authorized orgs using the Salesforce CLI.');
      } else {
        const filters = getNormalizedOrgFilters();
        if (filters && filters.length > 0) {
          vscode.window.showWarningMessage(`No Salesforce orgs match the configured filters: ${filters.join(', ')}`);
        } else {
          vscode.window.showWarningMessage('No Salesforce orgs found. Make sure you have authorized orgs using the Salesforce CLI.');
        }
      }
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
                      tooltip: dedicatedManager.hasDedicatedItem(alias) ? 'Remove dedicated button from the status bar' : 'Add dedicated button to the status bar'
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
      updateStatusBarFromConfig(statusBarItem, openOrgItem, dedicatedManager);

      // Reorder dedicated items if orgFilters changed; then re-apply full status so highlight is not lost
      if (event.affectsConfiguration('salesforceOrgQuickPick.orgFilters')) {
        dedicatedManager.reorderItems();
        updateStatusBarFromConfig(statusBarItem, openOrgItem, dedicatedManager);
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

export function activate(context: vscode.ExtensionContext) {
  initializeExtension(context);
}

function simpleGlobMatch(text: string, pattern: string): boolean {
  // First escape special characters (except * and ? which are wildcards)
  // Then convert wildcards to RegExp equivalents
  const regexPattern = '^' + pattern
    .replace(/[-/\\^$+.()|[\]{}]/g, '\\$&')  // Escape special characters except * and ?
    .replace(/\*/g, '.*')   // *  → .*
    .replace(/\?/g, '.')    // ?  → .
  + '$';

  const regex = new RegExp(regexPattern);
  return regex.test(text);
}


export function deactivate() {}
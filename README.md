# Salesforce Org Quick Pick

Quickly switch between Salesforce orgs from the status bar without breaking your flow.

## Features

- Status bar integration for quick org switching
- Interactive tooltip with clickable org aliases
- Configurable org filtering with glob patterns
- Automatic sync with Salesforce CLI default org
- Real-time file watching for configuration changes
- Cross-platform support (macOS, Windows, Linux)
- Centered title in tooltip
- "Pick in command center" option for full selector
- Quick org opening with browser integration
- Seamless workflow continuation
- Easy org management

## Configuration

You can configure which orgs to show in the tooltip by setting filters in your VS Code settings:

### Settings

- **`salesforceOrgQuickPick.orgFilters`**: Array of glob patterns to filter org aliases
  - If empty, all orgs are shown
  - Examples: `"DEV*"`, `"PROD"`, `"*TEST*"`

- **`salesforceOrgQuickPick.filterMode`**: Filter mode
  - `"include"`: Only show orgs matching the patterns (default)
  - `"exclude"`: Show all orgs except those matching the patterns

### Example Configuration

```json
{
  "salesforceOrgQuickPick.orgFilters": [
    "DEV*",
    "*TEST*"
  ],
  "salesforceOrgQuickPick.filterMode": "include"
}
```

This will show only orgs whose aliases start with "DEV" or contain "TEST".

### Accessing Settings

1. Open VS Code settings (`Ctrl/Cmd + ,`)
2. Search for "Salesforce Org Quick Pick"
3. Configure the filters as needed

## How to Use

### Status Bar
- **No org selected**: Shows `Pick org`
- **Org selected**: Shows `🔌 ALIAS_NAME 🪟`
  - `🔌 ALIAS_NAME`: Click to switch orgs
  - `🪟` (window icon): Click to open org in browser

### Tooltip Interaction
1. **Hover** over the status bar item to see available orgs
2. **Click** on any org alias to switch immediately
3. **Click** "Pick in command center" for full selector with search and detailed view

### Browser Integration
- **Window icon (🪟)**: Opens the default Salesforce org in your default browser
- Tooltip: "Open default org in browser"
- Uses `sf org open` command in a new terminal
- Positioned to the right of the org picker
- Only visible when an org is selected

### Status Bar Layout
```
[🔌 ALIAS_NAME] [🪟]
```

### Tooltip Layout
```
┌─────────────────────────────────┐
│   Salesforce Org Quick Pick     │ ← Centered title
├─────────────────────────────────┤
│ 🔌 [DEV_ORG]                    │ ← Clickable aliases (only)
│ 🔌 [PROD_ORG]                   │
│ 🔌 [TEST_ORG]                   │
├─────────────────────────────────┤
│ 📊 Pick in command center       │ ← Full selector
└─────────────────────────────────┘
```

### Command Center Layout
When you click "Pick in command center", you'll see:
```
Salesforce Org Quick Pick ← Extension title
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Search: [_________________________] ← Built-in search

DEV_ORG          user@domain.com
                 DEV_ORG - user@domain.com

PROD_ORG         admin@prod.com
                 PROD_ORG - admin@prod.com

TEST_ORG         qa@test.com
                 TEST_ORG - qa@test.com
```

- **Title**: "Salesforce Org Quick Pick" at the top
- **Left**: Alias name
- **Right**: Username
- **Bottom**: Full "Alias - Username" format
- **Search**: Works on both alias and username

## Salesforce CLI Integration

The extension automatically syncs with your Salesforce CLI configuration:

### Default Org Detection
- Reads the current default org from `~/.sfdx/sfdx-config.json`
- Displays the org with a plug icon (🔌) when connected
- Shows "Pick org" when no default org is set

### Real-time Updates
- Monitors changes to `sfdx-config.json` and `alias.json`
- Automatically updates the status bar when you change orgs using Salesforce CLI commands
- No need to restart VS Code or the extension

### Configuration Persistence
- When you select an org in the extension, it updates `sfdx-config.json`
- Your selection becomes the new default org for Salesforce CLI
- Changes are immediately reflected across all terminals and tools

## Development

### Prerequisites

- Node.js 16+
- VS Code

### Setup

1. Clone the repository:
```bash
git clone https://github.com/trevSmart/salesforce-org-quick-pick.git
cd salesforce-org-quick-pick
```

2. Install dependencies:
```bash
npm install
```

3. Open in VS Code and press F5 to launch extension development host.

### Building

```bash
npm run compile
```

### Testing

```bash
npm test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
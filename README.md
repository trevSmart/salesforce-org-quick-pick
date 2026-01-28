# Salesforce Org Quick Pick

Quickly switch between Salesforce orgs from the status bar without breaking your flow.

## Features

- **Status bar integration** for quick org switching
- **Interactive tooltip** with clickable org aliases on hover
- **Configurable filtering** with glob patterns and include/exclude modes
- **Automatic sync** with Salesforce CLI default org
- **Custom labels** for org aliases in status bar
- **Browser integration** with multiple browser support
- **Dedicated quick access items** for frequently used orgs
- **Command center picker** with search functionality
- **Cross-platform support** (macOS, Windows, Linux)

## Configuration

Configure the extension through VS Code settings (`Ctrl/Cmd + ,` and search for "Salesforce Org Quick Pick").

### Settings

- **`salesforceOrgQuickPick.orgFilters`**: Array of glob patterns to filter org aliases
  - If empty, all orgs are shown
  - Examples: `"DEV*"`, `"PROD"`, `"*TEST*"`

- **`salesforceOrgQuickPick.filterMode`**: Filter behavior
  - `"include"` (default): Only show orgs that match the filter patterns
  - `"exclude"`: Show all orgs except those that match the filter patterns

- **`salesforceOrgQuickPick.browser`**: Browser to use when opening orgs
  - `"default"`: Use system default browser
  - `"chrome"`: Google Chrome
  - `"firefox"`: Mozilla Firefox
  - `"safari"`: Safari
  - `"edge"`: Microsoft Edge

- **`salesforceOrgQuickPick.showTooltip`**: Show interactive tooltip on status bar hover
  - `false` (default): Tooltip disabled
  - `true`: Enable clickable tooltip with org aliases

- **`salesforceOrgQuickPick.aliasLabels`**: Custom labels for org aliases
  - Map long alias names to short display labels
  - Example: `{"my-very-long-alias-name": "DEV"}`

- **`salesforceOrgQuickPick.hideMainLabelWhenDedicatedExists`**: Hide main picker when dedicated items exist
  - `true` (default): Hide main picker when dedicated items are available
  - `false`: Always show main picker

- **`salesforceOrgQuickPick.showOpenOrgButton`**: Show browser open button in status bar
  - `true` (default): Show button to open org in browser
  - `false`: Hide browser open button

### Example Configuration

```json
{
  "salesforceOrgQuickPick.orgFilters": [
    "DEV*",
    "*TEST*"
  ],
  "salesforceOrgQuickPick.filterMode": "include",
  "salesforceOrgQuickPick.browser": "chrome",
  "salesforceOrgQuickPick.showTooltip": true,
  "salesforceOrgQuickPick.aliasLabels": {
    "my-production-org-alias": "PROD"
  }
}
```

This configuration shows only orgs starting with "DEV" or containing "TEST", uses Chrome for opening orgs, enables tooltips, and displays "PROD" instead of the full production alias.

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
- **Window icon (🪟)**: Opens the default Salesforce org in your selected browser
- Tooltip: "Open default org in browser"
- Executes `sf org open` silently in the background (no terminal shown)
- Supports multiple browsers via settings
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

- **Automatic detection**: Shows your current default org with a plug icon (🔌)
- **Real-time updates**: Status bar updates automatically when you change orgs via CLI
- **Persistent changes**: Selecting an org in the extension updates your CLI default
- **No restarts needed**: Changes are reflected immediately across all tools

## Development & Publishing

### Environment Variables

This extension uses environment variables for publishing tokens. **Never commit these to version control.**

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your tokens:
   - `VSCE_TOKEN`: Get from [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage/publishers/)
   - `OPEN_VSX_TOKEN`: Get from [Open VSX Registry](https://open-vsx.org/user-settings/tokens)

3. The `.env` file is already in `.gitignore` and should **never** be committed.

### Security Best Practices

- **Never commit secrets**: Always use environment variables or GitHub Secrets for sensitive data
- **Rotate tokens regularly**: Change your publishing tokens periodically
- **Use minimal permissions**: Create tokens with only the permissions needed
- **Review before commit**: Check that no secrets are in your staged files

For more information on security, see [SECURITY_REMEDIATION.md](SECURITY_REMEDIATION.md).

## License

This project is licensed under the MIT License.
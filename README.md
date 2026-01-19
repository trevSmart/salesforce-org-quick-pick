# Salesforce Org Quick Pick

Quickly switch between Salesforce orgs from the status bar without breaking your flow.

## Features

- Status bar integration for quick org switching
- Interactive tooltip with clickable org aliases
- Configurable org filtering with glob patterns
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
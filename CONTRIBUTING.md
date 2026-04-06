# Contributing

## Prerequisites

- Node.js 18+
- `cs-quill-cli` daemon installed and available on PATH

## Development

```bash
npm install
npm run compile        # Build the extension
npm run deploy:cursor  # Deploy to Cursor editor
```

## Testing

```bash
npm test
```

## VSIX Packaging

```bash
npm run package
```

## Project Structure

| File / Directory      | Purpose                                  |
|-----------------------|------------------------------------------|
| `src/extension.ts`    | Extension entry point (activate/deactivate) |
| `src/providers/`      | Diagnostics, CodeLens, Hover, DocumentSymbol, QuickFix providers |
| `src/QuillClient.ts`  | WebSocket client for daemon communication |
| `src/SidebarProvider.ts` | Webview sidebar (Health Score + file picker) |
| `src/daemon.ts`       | Daemon lifecycle management with backoff |
| `src/commands.ts`     | Registered VS Code commands              |

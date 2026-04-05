# EH Universe VS Code Extension 🦔

**Real-time Code Quality Guardian — CS Quill daemon integration for Visual Studio Code**

> Inline diagnostics, one-click fixes, and live health scores — powered by the CS Quill 56-engine analysis daemon.

---

## Features

### Live Diagnostics (Squiggly Lines)
- Red/yellow/blue underlines appear as you type
- **P0 (Critical)** → Red error squiggles
- **P1 (Warning)** → Yellow warning squiggles
- **P2 (Info)** → Blue information hints
- Auto-analysis on file change (800ms debounce)
- Source tag shows which verification team found the issue

### One-Click Fixes (Lightbulb 💡)
- Hover over any squiggle → click the lightbulb
- `✨ CS Quill: Auto Fix` applies the daemon's suggested repair
- `🔇 Ignore` inserts `// cs-quill-ignore` comment
- **Fix All** command repairs every fixable issue at once

### Status Bar
- 🟢 **Connected** — daemon is running and analyzing
- 🔴 **Disconnected** — daemon not found (auto-reconnect every 5s)
- Click the status bar to see session details

### Sidebar Panel
- **Health Score** — overall project quality at a glance
- **Error Count** — how many issues remain
- **Analyze** button — force-analyze current file
- **Fix All** button — batch-apply all available repairs
- **Reconnect** button — manually reconnect to daemon

---

## Prerequisites

CS Quill CLI daemon must be running:

```bash
# Install (from eh-universe-web project)
npm run cs -- daemon --port 8443

# Or standalone
cs daemon --port 8443

# Background mode
cs daemon --port 8443 --detach
```

---

## Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| `CS Quill: Analyze Current File` | `Ctrl+Shift+Q` | Force-analyze the active file |
| `CS Quill: Fix All` | — | Apply all available fixes in current file |
| `CS Quill: Reconnect` | — | Manually reconnect to daemon |
| `CS Quill: Show Status` | — | Display connection & session info |
| `EH Universe: Open Settings` | — | Open extension settings |

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `csQuill.daemonPort` | `8443` | CS Quill daemon port number |
| `csQuill.autoAnalyze` | `true` | Auto-analyze on file change |
| `csQuill.debounceMs` | `800` | Debounce delay for auto-analysis (ms) |

---

## Architecture

```
VS Code Extension                    CS Quill Daemon
┌──────────────────┐                ┌──────────────────┐
│ QuillClient      │◄──WebSocket──►│ daemon.ts         │
│  (276 lines)     │               │  (681 lines)      │
├──────────────────┤               ├──────────────────┤
│ DiagnosticProvider│◄──findings───│ pipeline-bridge   │
│  (squiggles)     │               │  (8-team verify)  │
├──────────────────┤               ├──────────────────┤
│ CodeActionProvider│◄──fixes─────│ deep-verify       │
│  (lightbulb 💡)  │               │  (6 checks)       │
├──────────────────┤               ├──────────────────┤
│ SidebarProvider  │◄──health────│ 56 engines        │
│  (Health Score)  │               │  (adapters/)      │
└──────────────────┘               └──────────────────┘
```

### Communication Protocol

WebSocket connection to `ws://127.0.0.1:8443`:

```
Edit code → debounce 800ms → analyze_file → 8-team pipeline → analysis_result → squiggles
                                                                                → lightbulb fix
```

### Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/extension.ts` | 186 | Entry point — registers all providers and commands |
| `src/QuillClient.ts` | 276 | WebSocket client with auto-reconnect backoff |
| `src/providers/DiagnosticProvider.ts` | 78 | Converts findings to VS Code diagnostics |
| `src/providers/CodeActionProvider.ts` | 69 | Generates quick-fix code actions |
| `src/SidebarProvider.ts` | 138 | Webview sidebar with health score UI |

---

## How It Works

1. **Extension activates** when you open a TypeScript/JavaScript file
2. **QuillClient** connects to the CS Quill daemon via WebSocket
3. **On file edit** (after 800ms debounce), the full file content is sent to the daemon
4. **Daemon runs** 8-team pipeline + deep-verify on the code (in-memory, no file I/O)
5. **Findings return** as JSON with line numbers, severity, messages, and fix suggestions
6. **DiagnosticProvider** converts findings to VS Code squiggly underlines
7. **CodeActionProvider** creates lightbulb quick-fix actions for findings with repairs
8. **Sidebar** updates the health score in real-time

---

## Supported Languages

- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)
- More languages via the daemon's multi-lang adapter (tree-sitter)

---

## Mascot

```
    /\_/\
   ( o.o )  CS Quill 🦔
    > ^ <   Watching your code...
  /||||||\\
```

**CS Quill** is a hedgehog. Its quills are 8 verification teams. When the status bar shows 🟢, the hedgehog is alert and protecting your code.

---

## License

CC-BY-NC-4.0

---

*Part of the [EH Universe](https://github.com/gilheumpark-bit/eh-universe-web) ecosystem*

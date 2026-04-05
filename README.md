# EH Universe VS Code Extension 🦔

**Real-time Code Quality Guardian — CS Quill Daemon Integration for Visual Studio Code**

[![VSIX](https://img.shields.io/badge/VSIX-2.95MB-blue)](https://github.com/gilheumpark-bit/eh-universe-vscode)
[![Extension](https://img.shields.io/badge/VS%20Code-Extension-007ACC)](https://github.com/gilheumpark-bit/eh-universe-vscode)

> Inline diagnostics, one-click fixes, and live health scores — powered by the CS Quill 56-engine analysis daemon with multi-key auto-fallback.

---

## Features

### Live Diagnostics (Squiggly Lines)
- Red/yellow/blue underlines appear **as you type** (800ms debounce)
- **P0 (Critical)** → Red error squiggles
- **P1 (Warning)** → Yellow warning squiggles
- **P2 (Info)** → Blue information hints
- Source tag shows which verification team found the issue (e.g., `CS Quill (deep-verify)`)

### One-Click Fixes (Lightbulb 💡)
- Hover over any squiggle → click the lightbulb
- `✨ CS Quill: Auto Fix` applies the daemon's suggested repair instantly
- `🔇 Ignore` inserts `// cs-quill-ignore` comment
- **Fix All** command repairs every fixable issue in one click

### Multi-Key Auto-Fallback
- Extension connects to daemon which cascades through all configured API keys
- If Google key fails → tries next Google key → tries Anthropic → tries Groq
- Zero interruption to your coding flow

### Status Bar
- 🟢 **Connected** — daemon is running and analyzing
- 🔴 **Disconnected** — daemon not found (auto-reconnect with exponential backoff, max 30s)
- Click to see session details

### Sidebar Panel
- **Health Score** — project quality at a glance (0-100)
- **Error Count** — remaining issues
- **Analyze** button — force-analyze current file
- **Fix All** button — batch-apply all repairs
- **Reconnect** button — manually reconnect to daemon

---

## Prerequisites

CS Quill CLI daemon must be running:

```bash
# Foreground
cs daemon --port 8443

# Background (detached)
cs daemon --port 8443 --detach

# Check health
curl http://localhost:8443/health
```

---

## Commands & Keybindings

| Command | Keybinding | Description |
|---------|------------|-------------|
| `CS Quill: Analyze Current File` | `Ctrl+Shift+Q` | Force-analyze the active file |
| `CS Quill: Fix All` | — | Apply all available fixes |
| `CS Quill: Reconnect` | — | Manually reconnect to daemon |
| `CS Quill: Show Status` | — | Display connection info |

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `csQuill.daemonPort` | `8443` | CS Quill daemon port |
| `csQuill.autoAnalyze` | `true` | Auto-analyze on file change |
| `csQuill.debounceMs` | `800` | Debounce delay (ms) |

---

## Architecture

```
VS Code Extension                    CS Quill Daemon (252 RPS)
┌──────────────────┐                ┌──────────────────┐
│ QuillClient      │◄──WebSocket──►│ daemon.ts         │
│  (276 lines)     │    RFC 6455   │  (681 lines)      │
├──────────────────┤               ├──────────────────┤
│ DiagnosticProvider│◄──findings───│ pipeline-bridge   │
│  (P0→Error)      │               │  (8-team + AST)   │
├──────────────────┤               ├──────────────────┤
│ CodeActionProvider│◄──fixes─────│ deep-verify       │
│  (💡 lightbulb)  │               │  (6 checks P0~P2) │
├──────────────────┤               ├──────────────────┤
│ SidebarProvider  │◄──health────│ 56 engines        │
│  (Health Score)  │               │  + multi-key AI   │
└──────────────────┘               └──────────────────┘
```

### Data Flow

```
Edit code → debounce 800ms → WS: analyze_file
  → 8-team pipeline (regex + AST + deep-verify)
  → WS: analysis_result { findings[], score, duration }
  → DiagnosticProvider → squiggly lines
  → CodeActionProvider → lightbulb fixes
```

### Extension Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/extension.ts` | 186 | Entry — registers providers, commands, auto-analyze |
| `src/QuillClient.ts` | 276 | WebSocket client, reconnect backoff, status bar |
| `src/providers/DiagnosticProvider.ts` | 78 | Finding → VS Code Diagnostic conversion |
| `src/providers/CodeActionProvider.ts` | 69 | Quick-fix code actions + ignore option |
| `src/SidebarProvider.ts` | 138 | Health score panel with inline HTML UI |

---

## How It Works

1. Extension activates when you open a TS/JS file
2. QuillClient connects to daemon via WebSocket (RFC 6455)
3. On file edit (800ms debounce), full content sent to daemon
4. Daemon runs 8-team pipeline + deep-verify (in-memory, no file I/O)
5. Findings return with line numbers, severity, and fix suggestions
6. DiagnosticProvider renders squiggly underlines
7. CodeActionProvider creates lightbulb quick-fixes
8. Sidebar updates health score in real-time

---

## Supported Languages

- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)
- 35+ languages via daemon's tree-sitter adapter

---

## VSIX Build

```bash
npm run compile        # Build extension + CSS
npm run package        # Build VSIX (2.95MB)
code --install-extension eh-universe-vscode-1.0.0.vsix
```

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

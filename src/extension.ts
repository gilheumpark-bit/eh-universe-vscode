// ============================================================
// CS Quill — VS Code Extension Entry Point
// ============================================================
// 3-module architecture: daemon.ts + commands.ts + extension.ts
// VS Code <-> CLI Daemon <-> Web

import * as vscode from "vscode";
import { SidebarProvider } from "./SidebarProvider";
import { QuillClient } from "./QuillClient";
import { ARIEngine } from "./ari-engine";
import { DiagnosticProvider } from "./providers/DiagnosticProvider";
import { QuillCodeActionProvider } from "./providers/CodeActionProvider";
import { QuillDocumentSymbolProvider } from "./providers/DocumentSymbolProvider";
import { QuillCodeLensProvider } from "./providers/CodeLensProvider";
import { QuillHoverProvider } from "./providers/HoverProvider";
import {
  isDaemonHealthy,
  startDaemonIfNeeded,
  clearSpawnedDaemon,
} from "./daemon";
import { registerCommands } from "./commands";
import { ScopePolicy } from "./scope-policy";

// ============================================================
// PART 1 — Extension State
// ============================================================

let quillClient: QuillClient | null = null;
let diagnosticProvider: DiagnosticProvider;
let scopePolicy: ScopePolicy;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let outputChannel: vscode.OutputChannel | null = null;

const STARTUP_TIMEOUT_MS = 15_000;

// ============================================================
// PART 2 — Telemetry (Opt-In)
// ============================================================

interface TelemetryEvent {
  event: string;
  timestamp: number;
  properties?: Record<string, string | number | boolean>;
}

const telemetryBuffer: TelemetryEvent[] = [];

function isTelemetryEnabled(): boolean {
  return (
    vscode.workspace
      .getConfiguration("csQuill")
      .get<boolean>("telemetryOptIn") ?? false
  );
}

function trackEvent(
  event: string,
  properties?: Record<string, string | number | boolean>,
): void {
  if (!isTelemetryEnabled()) return;

  telemetryBuffer.push({ event, timestamp: Date.now(), properties });

  // Keep buffer bounded
  if (telemetryBuffer.length > 200) {
    telemetryBuffer.splice(0, telemetryBuffer.length - 200);
  }
}

function flushTelemetry(): TelemetryEvent[] {
  const events = [...telemetryBuffer];
  telemetryBuffer.length = 0;
  return events;
}

// IDENTITY_SEAL: PART-2 | role=telemetry | inputs=event,properties | outputs=void

// ============================================================
// PART 3 — Activation
// ============================================================

export function activate(context: vscode.ExtensionContext) {
  // ── Diagnostic Collection ──
  diagnosticProvider = new DiagnosticProvider();
  context.subscriptions.push(diagnosticProvider.getCollection());
  outputChannel = vscode.window.createOutputChannel("CS Quill");
  context.subscriptions.push(outputChannel);

  // ── Scope Policy ──
  scopePolicy = new ScopePolicy();
  scopePolicy.loadFromConfig();
  diagnosticProvider.setScopePolicy(scopePolicy);

  // config 변경 시 scope policy 재로드
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("csQuill.scopePolicy")) {
        scopePolicy.loadFromConfig();
      }
    }),
  );

  // ── ARIEngine ──
  const ariEngine = new ARIEngine();

  // ── QuillClient ──
  const port =
    vscode.workspace.getConfiguration("csQuill").get<number>("daemonPort") ??
    8443;
  const client = new QuillClient(port, "127.0.0.1", ariEngine);
  quillClient = client;
  context.subscriptions.push(client.getStatusBarItem());

  function log(message: string): void {
    outputChannel?.appendLine(`[CS Quill] ${message}`);
    console.log(`[CS Quill] ${message}`);
  }

  log(
    `activate: process.execPath=${process.execPath}, extension=${context.extensionUri.fsPath}`,
  );

  let sidebarHealthState = { score: 100, errorCount: 0, connected: false };

  const sidebarProvider = new SidebarProvider(context.extensionUri, () => {
    const connected = client.isConnected();
    sidebarHealthState = { ...sidebarHealthState, connected };
    sidebarProvider.updateHealthScore(
      sidebarHealthState.score,
      sidebarHealthState.errorCount,
      connected,
      client.getHealthReport(),
    );
  });

  function pushSidebarHealth(
    score: number,
    errorCount: number,
    connected: boolean,
  ) {
    sidebarHealthState = { score, errorCount, connected };
    sidebarProvider.updateHealthScore(score, errorCount, connected, client.getHealthReport());
  }

  // ── Connection Helper (with startup timeout) ──
  async function ensureClientConnection(options?: {
    allowSpawn?: boolean;
    showError?: boolean;
  }): Promise<boolean> {
    const allowSpawn = options?.allowSpawn ?? true;
    const showError = options?.showError ?? false;

    if (client.isConnected()) {
      pushSidebarHealth(
        sidebarHealthState.score,
        sidebarHealthState.errorCount,
        true,
      );
      return true;
    }

    client.disconnect();
    let ok = await client.connect();
    log(`initial websocket connect = ${ok}`);

    if (!ok && allowSpawn) {
      log("websocket connect failed; attempting daemon auto-start");
      const started = await startDaemonIfNeeded(port, context, log);
      if (started) {
        client.disconnect();
        ok = await client.connect();
        log(`websocket connect after auto-start = ${ok}`);
      }
    }

    pushSidebarHealth(
      sidebarHealthState.score,
      sidebarHealthState.errorCount,
      ok,
    );

    if (!ok && showError) {
      vscode.window.showErrorMessage(
        `CS Quill 데몬 자동 시작/연결에 실패했습니다. cs daemon --port ${port} 상태를 확인해주세요.`,
      );
    }

    return ok;
  }

  // ── Sidebar Registration ──
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "eh-universe-sidebar",
      sidebarProvider,
    ),
  );

  // ── Daemon Cleanup on Dispose ──
  context.subscriptions.push(
    new vscode.Disposable(() => {
      clearSpawnedDaemon();
    }),
  );

  // ── Startup Connection (with timeout protection) ──
  const startupPromise = ensureClientConnection({
    allowSpawn: true,
    showError: false,
  });

  const startupTimeout = setTimeout(() => {
    log(`startup connection timed out after ${STARTUP_TIMEOUT_MS}ms`);
    trackEvent("startup_timeout", { timeoutMs: STARTUP_TIMEOUT_MS });
  }, STARTUP_TIMEOUT_MS);

  void startupPromise.then((ok) => {
    clearTimeout(startupTimeout);
    log(`startup ensureClientConnection result = ${ok}`);
    trackEvent("startup_complete", { connected: ok });
    if (ok) {
      vscode.window.showInformationMessage("CS Quill 데몬 연결됨");
    }
  });

  // ── Event Listeners ──
  client.on("analysis_result", (result) => {
    if (!result?.filePath || !result?.findings) return;
    const uri = vscode.Uri.file(result.filePath);
    diagnosticProvider.updateDiagnostics(uri, result.findings);
    sidebarProvider.updateHealthScore(
      result.score ?? 100,
      result.findings.length,
      client.isConnected(),
      client.getHealthReport(),
    );
  });

  client.on("file_changed", (result) => {
    if (!result?.filePath) return;
    const uri = vscode.Uri.file(result.filePath);
    diagnosticProvider.updateDiagnostics(uri, result.findings ?? []);
    sidebarProvider.updateHealthScore(
      result.score ?? 100,
      result.findings?.length ?? 0,
      client.isConnected(),
      client.getHealthReport(),
    );
  });

  // ── Auto-analysis on Document Change (Debounce 800ms) ──
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.scheme !== "file") return;
      if (!client.isConnected()) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const doc = event.document;
        const filePath = doc.uri.fsPath;
        const content = doc.getText();
        const lang =
          doc.languageId === "typescript" ||
          doc.languageId === "typescriptreact"
            ? "typescript"
            : "javascript";

        client.analyzeFile(filePath, content, lang).then((result) => {
          if (result?.findings) {
            diagnosticProvider.updateDiagnostics(doc.uri, result.findings);
            sidebarProvider.updateHealthScore(
              result.score ?? 100,
              result.findings.length,
              client.isConnected(),
              client.getHealthReport(),
            );
          }
        });

        trackEvent("auto_analysis", { lang });
      }, 800);
    }),
  );

  // Clear diagnostics when file closed
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      diagnosticProvider.clearFile(doc.uri);
    }),
  );

  // ── Provider Registration ──
  const SUPPORTED_LANGUAGES = [
    "typescript",
    "typescriptreact",
    "javascript",
    "javascriptreact",
  ];

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      SUPPORTED_LANGUAGES,
      new QuillCodeActionProvider(),
      {
        providedCodeActionKinds:
          QuillCodeActionProvider.providedCodeActionKinds,
      },
    ),
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      SUPPORTED_LANGUAGES,
      new QuillDocumentSymbolProvider(),
    ),
  );

  const codeLensProvider = new QuillCodeLensProvider(client);
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      SUPPORTED_LANGUAGES,
      codeLensProvider,
    ),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      codeLensProvider.invalidate(e.document.uri);
      codeLensProvider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      SUPPORTED_LANGUAGES,
      new QuillHoverProvider(client),
    ),
  );

  // ── Command Registration (extracted module) ──
  registerCommands(context, {
    client,
    diagnosticProvider,
    sidebarProvider,
    port,
    ensureClientConnection,
  });

  trackEvent("extension_activated");
}

// ============================================================
// PART 4 — Deactivation
// ============================================================

export function deactivate() {
  outputChannel?.dispose();
  outputChannel = null;

  clearSpawnedDaemon();

  if (quillClient) {
    quillClient.dispose();
    quillClient = null;
  }

  if (diagnosticProvider) {
    diagnosticProvider.dispose();
  }
}

// ============================================================
// CS Quill 🦔 — VS Code Extension Entry Point
// ============================================================
// Step 16~24 + 27 + 37 + 44~50 통합
// 3단 아키텍처: VS Code ↔ CLI Daemon ↔ Web

import * as vscode from "vscode";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import { spawn, type ChildProcess } from "child_process";
import { SidebarProvider } from "./SidebarProvider";
import { QuillClient } from "./QuillClient";
import { DiagnosticProvider } from "./providers/DiagnosticProvider";
import { QuillCodeActionProvider } from "./providers/CodeActionProvider";

let quillClient: QuillClient | null = null;
let diagnosticProvider: DiagnosticProvider;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let daemonProcess: ChildProcess | null = null;
let outputChannel: vscode.OutputChannel | null = null;

export function activate(context: vscode.ExtensionContext) {
  // ── Step 25~26: Diagnostic Collection ──
  diagnosticProvider = new DiagnosticProvider();
  context.subscriptions.push(diagnosticProvider.getCollection());
  outputChannel = vscode.window.createOutputChannel("CS Quill");
  context.subscriptions.push(outputChannel);

  // ── Step 14~16: QuillClient (웹뷰 콜백보다 먼저 생성 — 연결 상태 조회 안전)
  const port =
    vscode.workspace.getConfiguration("csQuill").get<number>("daemonPort") ??
    8443;
  const client = new QuillClient(port);
  quillClient = client;
  context.subscriptions.push(client.getStatusBarItem());

  function log(message: string): void {
    outputChannel?.appendLine(`[CS Quill] ${message}`);
    console.log(`[CS Quill] ${message}`);
  }

  log(`activate: process.execPath=${process.execPath}, extension=${context.extensionUri.fsPath}`);

  let sidebarHealthState = { score: 100, errorCount: 0, connected: false };

  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    () => {
      const connected = client.isConnected();
      sidebarHealthState = { ...sidebarHealthState, connected };
      sidebarProvider.updateHealthScore(
        sidebarHealthState.score,
        sidebarHealthState.errorCount,
        connected,
      );
    },
  );

  function pushSidebarHealth(
    score: number,
    errorCount: number,
    connected: boolean,
  ) {
    sidebarHealthState = { score, errorCount, connected };
    sidebarProvider.updateHealthScore(score, errorCount, connected);
  }

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function isDaemonHealthy(timeoutMs: number = 1000): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        {
          host: "127.0.0.1",
          port,
          path: "/health",
          timeout: timeoutMs,
        },
        (res) => {
          res.resume();
          resolve((res.statusCode ?? 500) < 400);
        },
      );

      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  function getNodeCommandCandidates(): string[] {
    const candidates = new Set<string>();
    const execName = path.basename(process.execPath).toLowerCase();

    if (execName === "node" || execName === "node.exe") {
      candidates.add(process.execPath);
    }

    candidates.add("node");

    if (process.platform === "win32") {
      candidates.add("node.exe");
    }

    return [...candidates];
  }

  function getDaemonScriptPath(): string | null {
    const roots = new Set<string>();

    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      roots.add(folder.uri.fsPath);
      roots.add(path.dirname(folder.uri.fsPath));
    }

    roots.add(context.extensionUri.fsPath);
    roots.add(path.dirname(context.extensionUri.fsPath));

    for (const root of roots) {
      const candidates = [
        path.join(root, "dist", "bin", "cs.js"),
        path.join(root, "cs-quill-cli", "dist", "bin", "cs.js"),
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }

    return null;
  }

  async function waitForDaemonReady(timeoutMs: number = 8000): Promise<boolean> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      if (await isDaemonHealthy()) {
        return true;
      }
      await delay(250);
    }

    return false;
  }

  async function waitForDaemonReadyOrExit(
    child: ChildProcess,
    timeoutMs: number = 8000,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      const startedAt = Date.now();

      const finish = (value: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(value);
      };

      const cleanup = () => {
        child.removeListener("error", onError);
        child.removeListener("exit", onExit);
      };

      const onError = (error: Error) => {
        cleanup();
        log(`launcher error: ${error.message}`);
        finish(false);
      };

      const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
        cleanup();
        log(
          `launcher exited before ready (code=${code ?? "null"}, signal=${signal ?? "null"})`,
        );
        finish(false);
      };

      const poll = async () => {
        while (!settled && Date.now() - startedAt < timeoutMs) {
          if (await isDaemonHealthy()) {
            cleanup();
            finish(true);
            return;
          }
          await delay(250);
        }

        cleanup();
        finish(false);
      };

      child.once("error", onError);
      child.once("exit", onExit);
      void poll();
    });
  }

  function clearSpawnedDaemon(): void {
    if (!daemonProcess) {
      return;
    }

    if (daemonProcess.exitCode === null && !daemonProcess.killed) {
      try {
        daemonProcess.kill();
      } catch {
        // Best-effort cleanup only.
      }
    }

    daemonProcess = null;
  }

  async function startDaemonIfNeeded(): Promise<boolean> {
    if (await isDaemonHealthy()) {
      log(`daemon already healthy on port ${port}`);
      return true;
    }

    const scriptPath = getDaemonScriptPath();
    log(`daemon healthy check failed; local cli path = ${scriptPath ?? "not found"}`);
    const launchers: Array<{
      command: string;
      args: string[];
      cwd?: string;
      useShell?: boolean;
    }> = [];

    if (scriptPath) {
      for (const nodeCommand of getNodeCommandCandidates()) {
        launchers.push({
          command: nodeCommand,
          args: [scriptPath, "daemon", "--port", String(port)],
          cwd: path.dirname(path.dirname(path.dirname(scriptPath))),
          useShell: process.platform === "win32" && nodeCommand !== process.execPath,
        });
      }
    }

    launchers.push({
      command: "cs",
      args: ["daemon", "--port", String(port)],
      cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      useShell: process.platform === "win32",
    });

    launchers.push({
      command: "cs-quill",
      args: ["daemon", "--port", String(port)],
      cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      useShell: process.platform === "win32",
    });

    for (const launcher of launchers) {
      clearSpawnedDaemon();
      log(
        `trying launcher: ${launcher.command} ${launcher.args.join(" ")} (cwd=${launcher.cwd ?? "default"})`,
      );

      try {
        const child = spawn(launcher.command, launcher.args, {
          cwd: launcher.cwd,
          stdio: "ignore",
          windowsHide: true,
          shell: launcher.useShell ?? false,
        });

        daemonProcess = child;
        child.on("exit", () => {
          if (daemonProcess === child) {
            daemonProcess = null;
          }
        });

        if (await waitForDaemonReadyOrExit(child)) {
          log(`daemon ready via launcher: ${launcher.command}`);
          return true;
        }
      } catch {
        log(`launcher threw synchronously: ${launcher.command}`);
        clearSpawnedDaemon();
      }
    }

    log(`failed to start daemon on port ${port}`);
    clearSpawnedDaemon();
    return false;
  }

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
      const started = await startDaemonIfNeeded();
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

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "eh-universe-sidebar",
      sidebarProvider,
    ),
  );

  context.subscriptions.push(
    new vscode.Disposable(() => {
      clearSpawnedDaemon();
    }),
  );

  // 연결 시도 (Step 16)
  void ensureClientConnection({ allowSpawn: true, showError: false }).then(
    (ok) => {
      log(`startup ensureClientConnection result = ${ok}`);
      if (ok) {
        vscode.window.showInformationMessage("🦔 CS Quill 데몬 연결됨");
      }
    },
  );

  // ── Step 23: 데몬 응답 리스너 ──
  client.on("analysis_result", (result) => {
    if (!result?.filePath || !result?.findings) return;
    const uri = vscode.Uri.file(result.filePath);
    diagnosticProvider.updateDiagnostics(uri, result.findings);
    sidebarProvider.updateHealthScore(
      result.score ?? 100,
      result.findings.length,
      client.isConnected(),
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
    );
  });

  // ── Step 19~22: 문서 변경 → 자동 분석 (Debounce 800ms) ──
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.scheme !== "file") return;
      if (!client.isConnected()) return;

      // Step 20: Debounce
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

        // Step 22: 분석 요청 전송
        client.analyzeFile(filePath, content, lang).then((result) => {
          if (result?.findings) {
            diagnosticProvider.updateDiagnostics(doc.uri, result.findings);
            sidebarProvider.updateHealthScore(
              result.score ?? 100,
              result.findings.length,
              client.isConnected(),
            );
          }
        });
      }, 800);
    }),
  );

  // Step 34: 파일 닫힐 때 diagnostic 제거
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      diagnosticProvider.clearFile(doc.uri);
    }),
  );

  // ── Step 37: CodeActionProvider 등록 ──
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      ["typescript", "typescriptreact", "javascript", "javascriptreact"],
      new QuillCodeActionProvider(),
      {
        providedCodeActionKinds:
          QuillCodeActionProvider.providedCodeActionKinds,
      },
    ),
  );

  // ── Step 24: 수동 분석 명령어 ──
  context.subscriptions.push(
    vscode.commands.registerCommand("cs-quill.analyzeFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("파일을 열어주세요");
        return;
      }

      const connected = await ensureClientConnection({
        allowSpawn: true,
        showError: true,
      });
      if (!connected) {
        return;
      }

      const doc = editor.document;
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "🦔 CS Quill 분석 중...",
        },
        async () => {
          const result = await client.analyzeFile(
            doc.uri.fsPath,
            doc.getText(),
          );
          if (result?.findings) {
            diagnosticProvider.updateDiagnostics(doc.uri, result.findings);
            sidebarProvider.updateHealthScore(
              result.score ?? 100,
              result.findings.length,
              client.isConnected(),
            );
            vscode.window.showInformationMessage(
              `🦔 분석 완료: ${result.findings.length}건 (${result.score}/100, ${result.duration}ms)`,
            );
          } else {
            vscode.window.showWarningMessage("분석 실패");
          }
        },
      );
    }),
  );

  // Step 47: 현재 파일 전체 수리 일괄 승인
  context.subscriptions.push(
    vscode.commands.registerCommand("cs-quill.fixAll", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
      const quillDiags = diagnostics.filter((d) =>
        d.source?.startsWith("CS Quill"),
      );

      if (quillDiags.length === 0) {
        vscode.window.showInformationMessage("수정할 항목이 없습니다");
        return;
      }

      const edit = new vscode.WorkspaceEdit();
      let fixCount = 0;

      for (const diag of quillDiags) {
        const fix = (diag as any)._quillFix;
        if (fix?.newText) {
          const range = new vscode.Range(
            Math.max(0, fix.range.startLine - 1),
            0,
            Math.max(0, fix.range.endLine),
            0,
          );
          edit.replace(editor.document.uri, range, fix.newText + "\n");
          fixCount++;
        }
      }

      if (fixCount > 0) {
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`🦔 ${fixCount}건 일괄 수정 완료`);
      } else {
        vscode.window.showInformationMessage(
          "자동 수정 가능한 항목이 없습니다",
        );
      }
    }),
  );

  // 데몬 상태 표시 명령어
  context.subscriptions.push(
    vscode.commands.registerCommand("cs-quill.showStatus", async () => {
      if (client.isConnected()) {
        vscode.window.showInformationMessage(
          `🦔 CS Quill 연결됨 (Session: ${client.getSessionId()})`,
        );
        return;
      }

      const daemonHealthy = await isDaemonHealthy();
      if (daemonHealthy) {
        vscode.window.showWarningMessage(
          "🦔 데몬은 살아 있지만 VS Code 연결이 끊겨 있습니다. 재연결을 시도해주세요.",
        );
      } else {
        vscode.window.showWarningMessage(
          `🦔 CS Quill 미연결. 재연결 시 데몬 자동 시작을 시도합니다 (port ${port}).`,
        );
      }
    }),
  );

  // 데몬 재연결 명령어
  context.subscriptions.push(
    vscode.commands.registerCommand("cs-quill.reconnect", async () => {
      client.disconnect();
      const ok = await ensureClientConnection({
        allowSpawn: true,
        showError: true,
      });
      vscode.window.showInformationMessage(
        ok ? "🦔 재연결 성공" : "🦔 재연결 실패",
      );
      sidebarProvider.updateHealthScore(100, 0, ok);
    }),
  );

  // UI 초기 동기화 명령어 (웹뷰 로드 시점)
  context.subscriptions.push(
    vscode.commands.registerCommand("cs-quill.syncUI", () => {
      sidebarProvider.updateHealthScore(100, 0, client.isConnected());
    }),
  );

  // 기존에 있던 사이드바는 위로 이동 완료

  context.subscriptions.push(
    vscode.commands.registerCommand("eh-universe.openSettings", () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "eh-universe",
      );
    }),
  );
}

export function deactivate() {
  outputChannel?.dispose();
  outputChannel = null;

  if (daemonProcess && daemonProcess.exitCode === null && !daemonProcess.killed) {
    try {
      daemonProcess.kill();
    } catch {
      // Ignore shutdown cleanup failures.
    }
  }

  daemonProcess = null;

  if (quillClient) {
    quillClient.dispose();
    quillClient = null;
  }

  if (diagnosticProvider) {
    diagnosticProvider.dispose();
  }
}

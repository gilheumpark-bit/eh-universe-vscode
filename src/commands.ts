// ============================================================
// CS Quill — Command Registration Module
// ============================================================
// All vscode.commands.registerCommand calls extracted here.

import * as vscode from "vscode";
import { QuillClient } from "./QuillClient";
import { DiagnosticProvider } from "./providers/DiagnosticProvider";
import { SidebarProvider } from "./SidebarProvider";
import { isDaemonHealthy } from "./daemon";

// ============================================================
// PART 1 — Types
// ============================================================

interface CommandDeps {
  client: QuillClient;
  diagnosticProvider: DiagnosticProvider;
  sidebarProvider: SidebarProvider;
  port: number;
  ensureClientConnection: (options?: {
    allowSpawn?: boolean;
    showError?: boolean;
  }) => Promise<boolean>;
}

// ============================================================
// PART 2 — Command Registrations
// ============================================================

export function registerCommands(
  context: vscode.ExtensionContext,
  deps: CommandDeps,
): void {
  const { client, diagnosticProvider, sidebarProvider, port, ensureClientConnection } = deps;

  // Manual analysis command
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
      if (!connected) return;

      const doc = editor.document;
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "CS Quill 분석 중...",
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
              `분석 완료: ${result.findings.length}건 (${result.score}/100, ${result.duration}ms)`,
            );
          } else {
            vscode.window.showWarningMessage("분석 실패");
          }
        },
      );
    }),
  );

  // Fix all diagnostics
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
        vscode.window.showInformationMessage(`${fixCount}건 일괄 수정 완료`);
      } else {
        vscode.window.showInformationMessage(
          "자동 수정 가능한 항목이 없습니다",
        );
      }
    }),
  );

  // Daemon status
  context.subscriptions.push(
    vscode.commands.registerCommand("cs-quill.showStatus", async () => {
      if (client.isConnected()) {
        vscode.window.showInformationMessage(
          `CS Quill 연결됨 (Session: ${client.getSessionId()})`,
        );
        return;
      }

      const daemonHealthy = await isDaemonHealthy(port);
      if (daemonHealthy) {
        vscode.window.showWarningMessage(
          "데몬은 살아 있지만 VS Code 연결이 끊겨 있습니다. 재연결을 시도해주세요.",
        );
      } else {
        vscode.window.showWarningMessage(
          `CS Quill 미연결. 재연결 시 데몬 자동 시작을 시도합니다 (port ${port}).`,
        );
      }
    }),
  );

  // Daemon reconnect
  context.subscriptions.push(
    vscode.commands.registerCommand("cs-quill.reconnect", async () => {
      client.disconnect();
      const ok = await ensureClientConnection({
        allowSpawn: true,
        showError: true,
      });
      vscode.window.showInformationMessage(
        ok ? "재연결 성공" : "재연결 실패",
      );
      sidebarProvider.updateHealthScore(100, 0, ok);
    }),
  );

  // UI sync
  context.subscriptions.push(
    vscode.commands.registerCommand("cs-quill.syncUI", () => {
      sidebarProvider.updateHealthScore(100, 0, client.isConnected());
    }),
  );

  // Settings
  context.subscriptions.push(
    vscode.commands.registerCommand("eh-universe.openSettings", () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "eh-universe",
      );
    }),
  );
}

// IDENTITY_SEAL: commands | role=command-registry | inputs=context,deps | outputs=void

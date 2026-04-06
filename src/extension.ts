// ============================================================
// CS Quill 🦔 — VS Code Extension Entry Point
// ============================================================
// Step 16~24 + 27 + 37 + 44~50 통합
// 3단 아키텍처: VS Code ↔ CLI Daemon ↔ Web

import * as vscode from "vscode";
import { SidebarProvider } from "./SidebarProvider";
import { QuillClient } from "./QuillClient";
import { DiagnosticProvider } from "./providers/DiagnosticProvider";
import { QuillCodeActionProvider } from "./providers/CodeActionProvider";

let client: QuillClient;
let diagnosticProvider: DiagnosticProvider;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function activate(context: vscode.ExtensionContext) {
  // ── Step 25~26: Diagnostic Collection ──
  diagnosticProvider = new DiagnosticProvider();
  context.subscriptions.push(diagnosticProvider.getCollection());

  // ── Step 14~16: QuillClient 연결 ──
  const port =
    vscode.workspace.getConfiguration("csQuill").get<number>("daemonPort") ??
    8443;
  client = new QuillClient(port);
  context.subscriptions.push(client.getStatusBarItem());

  // 연결 시도 (Step 16)
  client.connect().then((ok) => {
    if (ok) {
      vscode.window.showInformationMessage("🦔 CS Quill 데몬 연결됨");
    }
  });

  // ── Step 23: 데몬 응답 리스너 ──
  client.on("analysis_result", (result) => {
    if (!result?.filePath || !result?.findings) return;
    const uri = vscode.Uri.file(result.filePath);
    diagnosticProvider.updateDiagnostics(uri, result.findings);
  });

  client.on("file_changed", (result) => {
    if (!result?.filePath) return;
    const uri = vscode.Uri.file(result.filePath);
    diagnosticProvider.updateDiagnostics(uri, result.findings ?? []);
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

      if (!client.isConnected()) {
        vscode.window.showErrorMessage(
          "CS Quill 데몬 미연결. cs daemon --port 8443 실행 필요",
        );
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
    vscode.commands.registerCommand("cs-quill.showStatus", () => {
      if (client.isConnected()) {
        vscode.window.showInformationMessage(
          `🦔 CS Quill 연결됨 (Session: ${client.getSessionId()})`,
        );
      } else {
        vscode.window.showWarningMessage(
          "🦔 CS Quill 미연결. cs daemon 실행 필요",
        );
      }
    }),
  );

  // 데몬 재연결 명령어
  context.subscriptions.push(
    vscode.commands.registerCommand("cs-quill.reconnect", async () => {
      client.disconnect();
      const ok = await client.connect();
      vscode.window.showInformationMessage(
        ok ? "🦔 재연결 성공" : "🦔 재연결 실패",
      );
    }),
  );

  // ── 기존 사이드바 ──
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "eh-universe-sidebar",
      sidebarProvider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("eh-universe.openSettings", () => {
      vscode.window.showInformationMessage("EH Universe Settings Opened");
    }),
  );
}

export function deactivate() {
  if (client) client.dispose();
  if (diagnosticProvider) diagnosticProvider.dispose();
}

// ============================================================
// CS Quill 🦔 — Sidebar Provider (Step 44~48)
// ============================================================
// 더미 오딧 제거, Quill 상태 동기화, Health Score 표시

import * as vscode from "vscode";

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  private _healthScore: number | null = null;
  private _errorCount: number = 0;
  private _connected: boolean = false;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _resendSidebarHealth: () => void,
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message?.type) {
        case "analyze-current":
          void vscode.commands.executeCommand("cs-quill.analyzeFile");
          break;
        case "pick-files":
          void vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: true,
            canSelectMany: true,
            openLabel: "분석 대상 선택",
            filters: { "TypeScript/JavaScript": ["ts", "tsx", "js", "jsx", "mjs"] },
          }).then((uris) => {
            if (uris && uris.length > 0) {
              const paths = uris.map((u) => u.fsPath);
              void vscode.commands.executeCommand("cs-quill.analyzeFile", ...paths);
              vscode.window.showInformationMessage(`${paths.length}개 대상 분석 시작`);
            }
          });
          break;
        case "fix-all":
          void vscode.commands.executeCommand("cs-quill.fixAll");
          break;
        case "reconnect":
          void vscode.commands.executeCommand("cs-quill.reconnect");
          break;
        case "request-status":
          this._resendSidebarHealth();
          break;
        default:
          break;
      }
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this._resendSidebarHealth();
      }
    });
  }

  public updateHealthScore(
    score: number,
    errorCount: number,
    connected: boolean,
  ): void {
    this._healthScore = score;
    this._errorCount = errorCount;
    this._connected = connected;
    this._postHealthUpdate();
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
    this._postHealthUpdate();
  }

  private _postHealthUpdate(): void {
    if (!this._view) {
      return;
    }

    void this._view.webview.postMessage({
      type: "health-update",
      payload: {
        score: this._healthScore,
        errorCount: this._errorCount,
        connected: this._connected,
      },
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px; margin: 0; }
    .health { text-align: center; padding: 16px; border-radius: 8px; background: var(--vscode-editor-background); margin-bottom: 12px; }
    .health-score { font-size: 32px; font-weight: bold; }
    .health-label { font-size: 11px; opacity: 0.7; margin-top: 4px; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
    .status-dot.connected { background: #4ade80; }
    .status-dot.disconnected { background: #f87171; }
    button { width: 100%; border: none; }
    .btn { display: block; text-align: center; padding: 8px; margin: 4px 0; border: 1px solid var(--vscode-button-border, transparent); border-radius: 4px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; font-size: 12px; }
    .btn:hover { background: var(--vscode-button-hoverBackground); }
    .btn-secondary { display: block; text-align: center; padding: 8px; margin: 4px 0; border-radius: 4px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); font-size: 12px; cursor: pointer; }
    .divider { border-top: 1px solid var(--vscode-panel-border); margin: 12px 0; }
  </style>
</head>
<body>
  <div class="health">
    <div id="score" class="health-score">${this._healthScore ?? "--"}</div>
    <div class="health-label">Health Score</div>
    <div style="margin-top: 8px;">
      <span id="status-dot" class="status-dot ${this._connected ? "connected" : "disconnected"}"></span>
      <span id="status-text">${this._connected ? "데몬 연결됨" : "데몬 미연결"}</span>
    </div>
    <div id="error-count" class="health-label">${this._errorCount > 0 ? this._errorCount + "건 에러" : ""}</div>
  </div>

  <button id="btn-analyze" class="btn">🔍 현재 파일 분석</button>
  <button id="btn-pick" class="btn">📂 파일 및 폴더 선택</button>
  <button id="btn-fix-all" class="btn">✨ 전체 수리 일괄 승인</button>
  <div class="divider"></div>
  <button id="btn-reconnect" class="btn-secondary">🔌 데몬 재연결</button>
  <script nonce="${nonce}">
    (function() {
      const vscode = acquireVsCodeApi();

      const analyzeButton = document.getElementById("btn-analyze");
      const pickButton = document.getElementById("btn-pick");
      const fixAllButton = document.getElementById("btn-fix-all");
      const reconnectButton = document.getElementById("btn-reconnect");
      const scoreNode = document.getElementById("score");
      const errorCountNode = document.getElementById("error-count");
      const statusDotNode = document.getElementById("status-dot");
      const statusTextNode = document.getElementById("status-text");

      analyzeButton?.addEventListener("click", function() {
        vscode.postMessage({ type: "analyze-current" });
      });

      pickButton?.addEventListener("click", function() {
        vscode.postMessage({ type: "pick-files" });
      });

      fixAllButton?.addEventListener("click", function() {
        vscode.postMessage({ type: "fix-all" });
      });

      reconnectButton?.addEventListener("click", function() {
        vscode.postMessage({ type: "reconnect" });
      });

      window.addEventListener("message", function(event) {
        const data = event.data;
        if (data?.type !== "health-update") {
          return;
        }

        const payload = data.payload ?? {};
        if (scoreNode) {
          scoreNode.textContent = payload.score != null ? String(payload.score) : "--";
        }
        if (errorCountNode) {
          errorCountNode.textContent =
            payload.errorCount > 0 ? String(payload.errorCount) + "건 에러" : "";
        }
        if (statusDotNode) {
          statusDotNode.className =
            "status-dot " + (payload.connected ? "connected" : "disconnected");
        }
        if (statusTextNode) {
          statusTextNode.textContent = payload.connected ? "데몬 연결됨" : "데몬 미연결";
        }
      });

      vscode.postMessage({ type: "request-status" });
    })();
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";

  for (let index = 0; index < 32; index += 1) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return value;
}

// ============================================================
// CS Quill 🦔 — Sidebar Provider (Step 44~48)
// ============================================================
// 더미 오딧 제거, Quill 상태 동기화, Health Score 표시

import * as vscode from "vscode";

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Step 45~48: 메시지 핸들러
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "onInfo":
          if (data.value) vscode.window.showInformationMessage(data.value);
          break;
        case "onError":
          if (data.value) vscode.window.showErrorMessage(data.value);
          break;
        case "analyze-current":
          vscode.commands.executeCommand("cs-quill.analyzeFile");
          break;
        case "fix-all":
          vscode.commands.executeCommand("cs-quill.fixAll");
          break;
        case "reconnect":
          vscode.commands.executeCommand("cs-quill.reconnect");
          break;
      }
    });
  }

  // Step 46: Health Score 업데이트 (extension에서 호출)
  public updateHealthScore(
    score: number,
    errorCount: number,
    connected: boolean,
  ): void {
    this._view?.webview.postMessage({
      type: "health-update",
      payload: { score, errorCount, connected },
    });
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "webview.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "style.css"),
    );
    const nonce = getNonce();

    // Step 46~48: 인라인 사이드바 UI (React 빌드 전 fallback)
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}'; style-src vscode-resource: 'unsafe-inline' http: https: data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
  <title>CS Quill</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px; margin: 0; }
    .health { text-align: center; padding: 16px; border-radius: 8px; background: var(--vscode-editor-background); margin-bottom: 12px; }
    .health-score { font-size: 32px; font-weight: bold; }
    .health-label { font-size: 11px; opacity: 0.7; margin-top: 4px; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
    .status-dot.connected { background: #4ade80; }
    .status-dot.disconnected { background: #f87171; }
    button { width: 100%; padding: 8px; margin: 4px 0; border: 1px solid var(--vscode-button-border, transparent); border-radius: 4px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; font-size: 12px; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .btn-secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    .divider { border-top: 1px solid var(--vscode-panel-border); margin: 12px 0; }
    .error-count { color: var(--vscode-errorForeground); font-weight: bold; }
  </style>
</head>
<body>
  <div class="health" id="health-panel">
    <div class="health-score" id="score">--</div>
    <div class="health-label">Health Score</div>
    <div style="margin-top: 8px;">
      <span class="status-dot disconnected" id="status-dot"></span>
      <span id="status-text">데몬 미연결</span>
    </div>
    <div class="health-label" id="error-count"></div>
  </div>

  <button onclick="send('analyze-current')">🔍 현재 파일 분석</button>
  <button onclick="send('fix-all')">✨ 전체 수리 일괄 승인</button>
  <div class="divider"></div>
  <button class="btn-secondary" onclick="send('reconnect')">🔌 데몬 재연결</button>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    function send(type) { vscode.postMessage({ type }); }

    window.addEventListener('message', (event) => {
      const { type, payload } = event.data;
      if (type === 'health-update') {
        document.getElementById('score').textContent = payload.score ?? '--';
        document.getElementById('error-count').textContent = payload.errorCount > 0 ? payload.errorCount + '건 에러' : '에러 없음';
        const dot = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        if (payload.connected) {
          dot.className = 'status-dot connected';
          text.textContent = '데몬 연결됨';
        } else {
          dot.className = 'status-dot disconnected';
          text.textContent = '데몬 미연결';
        }
      }
    });
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

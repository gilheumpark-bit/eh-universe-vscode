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
      enableCommandUris: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this._resendSidebarHealth();
      }
    });
  }

  // Health Score 업데이트 — JS 없이 HTML 리렌더
  public updateHealthScore(
    score: number,
    errorCount: number,
    connected: boolean,
  ): void {
    this._healthScore = score;
    this._errorCount = errorCount;
    this._connected = connected;
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(_webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px; margin: 0; }
    .health { text-align: center; padding: 16px; border-radius: 8px; background: var(--vscode-editor-background); margin-bottom: 12px; }
    .health-score { font-size: 32px; font-weight: bold; }
    .health-label { font-size: 11px; opacity: 0.7; margin-top: 4px; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
    .status-dot.connected { background: #4ade80; }
    .status-dot.disconnected { background: #f87171; }
    a.btn { display: block; text-align: center; padding: 8px; margin: 4px 0; border: 1px solid var(--vscode-button-border, transparent); border-radius: 4px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; font-size: 12px; text-decoration: none; }
    a.btn:hover { background: var(--vscode-button-hoverBackground); }
    a.btn-secondary { display: block; text-align: center; padding: 8px; margin: 4px 0; border-radius: 4px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); text-decoration: none; font-size: 12px; }
    .divider { border-top: 1px solid var(--vscode-panel-border); margin: 12px 0; }
  </style>
</head>
<body>
  <div class="health">
    <div class="health-score">${this._healthScore ?? '--'}</div>
    <div class="health-label">Health Score</div>
    <div style="margin-top: 8px;">
      <span class="status-dot ${this._connected ? 'connected' : 'disconnected'}"></span>
      <span>${this._connected ? '데몬 연결됨' : '데몬 미연결'}</span>
    </div>
    <div class="health-label">${this._errorCount > 0 ? this._errorCount + '건 에러' : ''}</div>
  </div>

  <a class="btn" href="command:cs-quill.analyzeFile">🔍 현재 파일 분석</a>
  <a class="btn" href="command:cs-quill.fixAll">✨ 전체 수리 일괄 승인</a>
  <div class="divider"></div>
  <a class="btn-secondary" href="command:cs-quill.reconnect">🔌 데몬 재연결</a>
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

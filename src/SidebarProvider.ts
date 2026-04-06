// ============================================================
// CS Quill — Sidebar Provider (A+ Grade)
// ============================================================
// Webview sidebar: health score, audit results, progress bar,
// findings list with severity icons, error state display,
// file/folder picker with result count, loading spinner,
// last scan timestamp, VS Code theme variable consistency.

import * as vscode from "vscode";
import type { ARIStatus } from "./ari-engine";

// ============================================================
// PART 1 — Provider class
// ============================================================

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  private _healthScore: number | null = null;
  private _errorCount: number = 0;
  private _connected: boolean = false;
  private _ariStatus: ARIStatus[] = [];

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _resendSidebarHealth: () => void,
  ) {}

  // ============================================================
  // PART 2 — Resolve webview view
  // ============================================================

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message: unknown) => {
      // --- Message validation: ensure object with type field ---
      if (!message || typeof message !== "object") { return; }
      const msg = message as Record<string, unknown>;
      if (typeof msg.type !== "string") { return; }

      switch (msg.type) {
        case "analyze-current":
          void vscode.commands.executeCommand("cs-quill.analyzeFile");
          break;

        case "pick-files":
          void vscode.window
            .showOpenDialog({
              canSelectFiles: true,
              canSelectFolders: true,
              canSelectMany: true,
              openLabel: "분석 대상 선택",
              filters: {
                "TypeScript/JavaScript": ["ts", "tsx", "js", "jsx", "mjs"],
              },
            })
            .then((uris) => {
              if (uris && uris.length > 0) {
                const paths = uris.map((u) => u.fsPath);
                void vscode.commands.executeCommand(
                  "cs-quill.analyzeFile",
                  ...paths,
                );
                // Send pick result count back to webview
                this._postMessage({
                  type: "pick-result",
                  payload: { count: paths.length },
                });
                vscode.window.showInformationMessage(
                  `${paths.length}개 대상 분석 시작`,
                );
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

  // ============================================================
  // PART 3 — Public API
  // ============================================================

  public updateHealthScore(
    score: number,
    errorCount: number,
    connected: boolean,
    ariStatus?: ARIStatus[],
  ): void {
    this._healthScore = score;
    this._errorCount = errorCount;
    this._connected = connected;
    if (ariStatus) this._ariStatus = ariStatus;
    this._postHealthUpdate();
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
    this._postHealthUpdate();
  }

  // ============================================================
  // PART 4 — Message helpers (with error handling)
  // ============================================================

  private _postMessage(msg: Record<string, unknown>): void {
    if (!this._view) { return; }
    try {
      void this._view.webview.postMessage(msg);
    } catch {
      // Webview may have been disposed; silently ignore
    }
  }

  private _postHealthUpdate(): void {
    this._postMessage({
      type: "health-update",
      payload: {
        score: this._healthScore,
        errorCount: this._errorCount,
        connected: this._connected,
        ariStatus: this._ariStatus,
      },
    });
  }

  // ============================================================
  // PART 5 — HTML generation (inline for Cursor compatibility)
  // ============================================================

  private _getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <style>
    /* --- Base --- */
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 12px;
      margin: 0;
    }

    /* --- Health card --- */
    .health {
      text-align: center;
      padding: 16px;
      border-radius: 8px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      margin-bottom: 12px;
    }
    .health-score {
      font-size: 32px;
      font-weight: bold;
      color: var(--vscode-foreground);
    }
    .health-grade {
      font-size: 14px;
      font-weight: 600;
      margin-top: 2px;
      color: var(--vscode-descriptionForeground);
    }
    .health-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }

    /* --- Status dot --- */
    .status-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 8px;
      font-size: 12px;
    }
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-dot.connected { background: var(--vscode-testing-iconPassed, #4ade80); }
    .status-dot.disconnected { background: var(--vscode-testing-iconFailed, #f87171); }

    /* --- Progress bar --- */
    .progress-container {
      display: none;
      margin: 8px 0 12px 0;
    }
    .progress-container.active { display: block; }
    .progress-bar-bg {
      width: 100%;
      height: 4px;
      background: var(--vscode-progressBar-background, #333);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      width: 0%;
      background: var(--vscode-progressBar-background, #0078d4);
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    .progress-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
      text-align: center;
    }

    /* --- Loading spinner --- */
    .spinner {
      display: none;
      margin: 8px auto;
      width: 20px;
      height: 20px;
      border: 2px solid var(--vscode-progressBar-background, #0078d4);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spinner.active { display: block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* --- Buttons --- */
    button { width: 100%; border: none; }
    .btn {
      display: block;
      text-align: center;
      padding: 8px;
      margin: 4px 0;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      cursor: pointer;
      font-size: 12px;
    }
    .btn:hover { background: var(--vscode-button-hoverBackground); }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      display: block;
      text-align: center;
      padding: 8px;
      margin: 4px 0;
      border-radius: 4px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      font-size: 12px;
      cursor: pointer;
    }
    .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }

    /* --- Divider --- */
    .divider {
      border-top: 1px solid var(--vscode-panel-border);
      margin: 12px 0;
    }

    /* --- Scan meta --- */
    .scan-meta {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
      margin: 8px 0;
    }

    /* --- Pick result badge --- */
    .pick-badge {
      display: none;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
      margin-top: 2px;
    }
    .pick-badge.active { display: block; }

    /* --- Error banner --- */
    .error-banner {
      display: none;
      padding: 8px 10px;
      margin: 8px 0;
      border-radius: 4px;
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
      color: var(--vscode-errorForeground, #f48771);
      font-size: 12px;
      word-break: break-word;
    }
    .error-banner.active { display: block; }

    /* --- Findings list --- */
    .findings-section {
      display: none;
      margin: 8px 0;
    }
    .findings-section.active { display: block; }
    .findings-header {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--vscode-foreground);
    }
    .finding-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 4px 0;
      font-size: 11px;
      border-bottom: 1px solid var(--vscode-panel-border);
      color: var(--vscode-foreground);
    }
    .finding-item:last-child { border-bottom: none; }
    .finding-icon { flex-shrink: 0; font-size: 12px; }
    .finding-icon.error { color: var(--vscode-testing-iconFailed, #f87171); }
    .finding-icon.warning { color: var(--vscode-editorWarning-foreground, #cca700); }
    .finding-icon.info { color: var(--vscode-editorInfo-foreground, #3794ff); }
    .finding-msg { flex: 1; line-height: 1.4; }

    /* --- Domain summary --- */
    .domains-section {
      display: none;
      margin: 8px 0;
    }
    .domains-section.active { display: block; }
    .domain-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      font-size: 11px;
      color: var(--vscode-foreground);
    }
    .domain-name { text-transform: capitalize; }
    .domain-counts { color: var(--vscode-descriptionForeground); }

    /* --- ARI section --- */
    .ari-section {
      display: none;
      margin: 8px 0;
    }
    .ari-section.active { display: block; }
    .ari-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 11px;
      color: var(--vscode-foreground);
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .ari-row:last-child { border-bottom: none; }
    .ari-provider { font-weight: 600; }
    .ari-score { font-weight: bold; }
    .ari-circuit { margin-left: 6px; }
  </style>
</head>
<body>
  <!-- Health card -->
  <div class="health">
    <div id="score" class="health-score">${this._healthScore ?? "--"}</div>
    <div id="grade" class="health-grade"></div>
    <div class="health-label">Health Score</div>
    <div class="status-row">
      <span id="status-dot" class="status-dot ${this._connected ? "connected" : "disconnected"}"></span>
      <span id="status-text">${this._connected ? "데몬 연결됨" : "데몬 미연결"}</span>
    </div>
    <div id="error-count" class="health-label">${this._errorCount > 0 ? this._errorCount + "건 에러" : ""}</div>
  </div>

  <!-- Progress bar (hidden until scan starts) -->
  <div id="progress-container" class="progress-container">
    <div class="progress-bar-bg"><div id="progress-fill" class="progress-bar-fill"></div></div>
    <div id="progress-label" class="progress-label"></div>
  </div>

  <!-- Loading spinner -->
  <div id="spinner" class="spinner"></div>

  <!-- Error banner -->
  <div id="error-banner" class="error-banner"></div>

  <!-- Scan meta (last scan time + file count) -->
  <div id="scan-meta" class="scan-meta"></div>

  <!-- Buttons -->
  <button id="btn-analyze" class="btn">🔍 현재 파일 분석</button>
  <button id="btn-pick" class="btn">📂 파일 및 폴더 선택</button>
  <div id="pick-badge" class="pick-badge"></div>
  <button id="btn-fix-all" class="btn">✨ 전체 수리 일괄 승인</button>
  <div class="divider"></div>
  <button id="btn-reconnect" class="btn-secondary">🔌 데몬 재연결</button>

  <!-- ARI Status -->
  <div id="ari-section" class="ari-section">
    <div class="divider"></div>
    <div class="findings-header">ARI Provider Health</div>
    <div id="ari-list"></div>
  </div>

  <!-- Findings list -->
  <div id="findings-section" class="findings-section">
    <div class="divider"></div>
    <div class="findings-header">발견 사항 (<span id="findings-count">0</span>건)</div>
    <div id="findings-list"></div>
  </div>

  <!-- Domain summary -->
  <div id="domains-section" class="domains-section">
    <div class="divider"></div>
    <div class="findings-header">도메인별 요약</div>
    <div id="domains-list"></div>
  </div>

  <script nonce="${nonce}">
    (function() {
      const vscode = acquireVsCodeApi();

      // --- DOM refs ---
      const scoreNode = document.getElementById("score");
      const gradeNode = document.getElementById("grade");
      const errorCountNode = document.getElementById("error-count");
      const statusDotNode = document.getElementById("status-dot");
      const statusTextNode = document.getElementById("status-text");
      const progressContainer = document.getElementById("progress-container");
      const progressFill = document.getElementById("progress-fill");
      const progressLabel = document.getElementById("progress-label");
      const spinnerNode = document.getElementById("spinner");
      const errorBanner = document.getElementById("error-banner");
      const scanMeta = document.getElementById("scan-meta");
      const pickBadge = document.getElementById("pick-badge");
      const findingsSection = document.getElementById("findings-section");
      const findingsCount = document.getElementById("findings-count");
      const findingsList = document.getElementById("findings-list");
      const domainsSection = document.getElementById("domains-section");
      const domainsList = document.getElementById("domains-list");
      const ariSection = document.getElementById("ari-section");
      const ariList = document.getElementById("ari-list");
      const btnAnalyze = document.getElementById("btn-analyze");
      const btnPick = document.getElementById("btn-pick");
      const btnFixAll = document.getElementById("btn-fix-all");
      const btnReconnect = document.getElementById("btn-reconnect");

      // --- Button handlers ---
      btnAnalyze?.addEventListener("click", function() {
        vscode.postMessage({ type: "analyze-current" });
      });
      btnPick?.addEventListener("click", function() {
        vscode.postMessage({ type: "pick-files" });
      });
      btnFixAll?.addEventListener("click", function() {
        vscode.postMessage({ type: "fix-all" });
      });
      btnReconnect?.addEventListener("click", function() {
        vscode.postMessage({ type: "reconnect" });
      });

      // --- Severity icon helper ---
      function severityIcon(sev) {
        if (sev === "error") return "\\u2717";   // ✗
        if (sev === "warning") return "\\u26A0";  // ⚠
        return "\\u2139";                          // ℹ
      }

      // --- Show/hide helpers ---
      function showEl(el, show) {
        if (!el) return;
        if (show) { el.classList.add("active"); }
        else { el.classList.remove("active"); }
      }

      function setLoading(on) {
        showEl(spinnerNode, on);
        showEl(progressContainer, on);
        if (btnAnalyze) btnAnalyze.disabled = on;
      }

      function clearError() { showEl(errorBanner, false); }

      function showError(msg) {
        if (errorBanner) {
          errorBanner.textContent = msg;
          showEl(errorBanner, true);
        }
      }

      function formatTime(ts) {
        var d = new Date(ts);
        var h = String(d.getHours()).padStart(2, "0");
        var m = String(d.getMinutes()).padStart(2, "0");
        var s = String(d.getSeconds()).padStart(2, "0");
        return h + ":" + m + ":" + s;
      }

      // --- Message handler ---
      window.addEventListener("message", function(event) {
        var data = event.data;
        if (!data || typeof data.type !== "string") return;

        switch (data.type) {
          case "health-update": {
            var p = data.payload || {};
            if (scoreNode) scoreNode.textContent = p.score != null ? String(p.score) : "--";
            if (errorCountNode) {
              errorCountNode.textContent = p.errorCount > 0 ? String(p.errorCount) + "건 에러" : "";
            }
            if (statusDotNode) {
              statusDotNode.className = "status-dot " + (p.connected ? "connected" : "disconnected");
            }
            if (statusTextNode) {
              statusTextNode.textContent = p.connected ? "데몬 연결됨" : "데몬 미연결";
            }

            // ARI status rendering
            var ariData = p.ariStatus || [];
            if (ariList) {
              ariList.innerHTML = "";
              for (var ai = 0; ai < ariData.length; ai++) {
                var a = ariData[ai];
                var aRow = document.createElement("div");
                aRow.className = "ari-row";

                var aName = document.createElement("span");
                aName.className = "ari-provider";
                aName.textContent = a.provider;
                aRow.appendChild(aName);

                var aRight = document.createElement("span");
                var circuitIcon = a.circuit === "closed" ? "\\uD83D\\uDFE2"
                  : a.circuit === "half-open" ? "\\uD83D\\uDFE1"
                  : "\\uD83D\\uDD34";
                aRight.innerHTML = "<span class='ari-score'>" + String(a.score) + "</span>"
                  + "<span class='ari-circuit'>" + circuitIcon + " " + a.circuit + "</span>";
                aRow.appendChild(aRight);

                ariList.appendChild(aRow);
              }
            }
            showEl(ariSection, ariData.length > 0);
            break;
          }

          case "audit-progress": {
            var ap = data.payload || {};
            clearError();
            setLoading(true);
            if (progressFill) progressFill.style.width = (ap.percent || 0) + "%";
            if (progressLabel) progressLabel.textContent = ap.label || "";
            if (ap.percent >= 100) {
              setTimeout(function() { setLoading(false); }, 600);
            }
            break;
          }

          case "audit-error": {
            setLoading(false);
            showError((data.payload || {}).message || "알 수 없는 오류");
            break;
          }

          case "audit-result": {
            var r = data.payload || {};
            setLoading(false);
            clearError();

            // Update score + grade
            if (scoreNode) scoreNode.textContent = r.score != null ? String(r.score) : "--";
            if (gradeNode) gradeNode.textContent = r.grade || "";

            // Scan meta: time + duration
            if (scanMeta) {
              var parts = [];
              if (r.timestamp) parts.push("마지막 스캔: " + formatTime(r.timestamp));
              if (r.durationMs != null) parts.push("(" + (r.durationMs / 1000).toFixed(1) + "초)");
              scanMeta.textContent = parts.join(" ");
            }

            // Findings list
            var findings = r.findings || [];
            if (findingsCount) findingsCount.textContent = String(findings.length);
            if (findingsList) {
              findingsList.innerHTML = "";
              for (var i = 0; i < findings.length && i < 50; i++) {
                var f = findings[i];
                var row = document.createElement("div");
                row.className = "finding-item";

                var icon = document.createElement("span");
                icon.className = "finding-icon " + (f.severity || "info");
                icon.textContent = severityIcon(f.severity);
                row.appendChild(icon);

                var msg = document.createElement("span");
                msg.className = "finding-msg";
                msg.textContent = f.message;
                row.appendChild(msg);

                findingsList.appendChild(row);
              }
            }
            showEl(findingsSection, findings.length > 0);

            // Domains summary
            var domains = r.domains || [];
            if (domainsList) {
              domainsList.innerHTML = "";
              for (var j = 0; j < domains.length; j++) {
                var d = domains[j];
                var dRow = document.createElement("div");
                dRow.className = "domain-row";

                var dName = document.createElement("span");
                dName.className = "domain-name";
                dName.textContent = d.domain;
                dRow.appendChild(dName);

                var dCounts = document.createElement("span");
                dCounts.className = "domain-counts";
                dCounts.textContent = "\\u2713 " + d.passCount + "  \\u2717 " + d.failCount + "  \\u26A0 " + d.warnCount;
                dRow.appendChild(dCounts);

                domainsList.appendChild(dRow);
              }
            }
            showEl(domainsSection, domains.length > 0);
            break;
          }

          case "pick-result": {
            var pr = data.payload || {};
            if (pickBadge) {
              pickBadge.textContent = pr.count + "개 대상 선택됨";
              showEl(pickBadge, true);
            }
            break;
          }

          default:
            break;
        }
      });

      // Request initial status
      vscode.postMessage({ type: "request-status" });
    })();
  </script>
</body>
</html>`;
  }
}

// ============================================================
// PART 6 — Nonce generator
// ============================================================

function getNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let index = 0; index < 32; index += 1) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return value;
}

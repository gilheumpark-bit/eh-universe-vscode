// ============================================================
// CS Quill 🦔 — CodeLensProvider
// ============================================================
// 함수 위에 인라인 메트릭 렌즈 표시: 파인딩 수, 데몬 연결 상태.

import * as vscode from "vscode";
import type { QuillClient, QuillFinding } from "../QuillClient";

// ============================================================
// PART 1 — Types & Constants
// ============================================================

const FUNCTION_PATTERN =
  /^(\s*)(?:export\s+)?(?:async\s+)?(?:function\s*\*?\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|(?:public|private|protected)?\s*(?:static)?\s*(?:async)?\s*(\w+)\s*\()/;

interface CachedLens {
  version: number;
  lenses: vscode.CodeLens[];
}

// ============================================================
// PART 2 — Provider Implementation
// ============================================================

export class QuillCodeLensProvider implements vscode.CodeLensProvider {
  private client: QuillClient;
  private cache: Map<string, CachedLens> = new Map();
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  constructor(client: QuillClient) {
    this.client = client;
  }

  // ── Refresh trigger (call on document change) ──

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  // ── Clear cache for a specific file ──

  public invalidate(uri: vscode.Uri): void {
    this.cache.delete(uri.toString());
  }

  // ── Main entry point ──

  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.CodeLens[] {
    const key = document.uri.toString();
    const cached = this.cache.get(key);

    if (cached && cached.version === document.version) {
      return cached.lenses;
    }

    const lenses = this.buildLenses(document);
    this.cache.set(key, { version: document.version, lenses });
    return lenses;
  }

  // ── Build lenses for all functions in the document ──

  private buildLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];
    const connected = this.client.isConnected();

    // Collect findings per line range for matching
    const findings = this.getFindingsForDocument(document);

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const match = line.text.match(FUNCTION_PATTERN);

      if (!match) {
        continue;
      }

      const funcName = match[2] ?? match[3] ?? match[4];
      if (!funcName) {
        continue;
      }

      const range = new vscode.Range(i, 0, i, line.text.length);

      if (!connected) {
        // Daemon not connected
        lenses.push(
          new vscode.CodeLens(range, {
            title: "\u23F3 \uB370\uBAAC \uBBF8\uC5F0\uACB0",
            command: "cs-quill.reconnect",
            tooltip:
              "CS Quill \uB370\uBAAC\uC774 \uC5F0\uACB0\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uD074\uB9AD\uD558\uC5EC \uC7AC\uC5F0\uACB0\uD569\uB2C8\uB2E4.",
          }),
        );
        continue;
      }

      // Count findings that fall within this function
      const funcEnd = this.findFunctionEnd(document, i);
      const count = findings.filter(
        (f) => f.line >= i + 1 && f.line <= funcEnd + 1,
      ).length;

      const title =
        count > 0
          ? `\uD83D\uDD0D CS Quill: ${count}\uAC74 \uBC1C\uACAC`
          : `\u2705 CS Quill: \uBB38\uC81C \uC5C6\uC74C`;

      lenses.push(
        new vscode.CodeLens(range, {
          title,
          command: count > 0 ? "cs-quill.analyzeFile" : "",
          tooltip:
            count > 0
              ? `${funcName}: ${count}\uAC74\uC758 \uBD84\uC11D \uACB0\uACFC. \uD074\uB9AD\uD558\uC5EC \uC7AC\uBD84\uC11D\uD569\uB2C8\uB2E4.`
              : `${funcName}: \uBD84\uC11D \uACB0\uACFC \uC774\uC0C1 \uC5C6\uC74C`,
        }),
      );
    }

    return lenses;
  }

  // ── Get findings from DiagnosticCollection ──

  private getFindingsForDocument(
    document: vscode.TextDocument,
  ): QuillFinding[] {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    const quillDiags = diagnostics.filter((d) =>
      d.source?.startsWith("CS Quill"),
    );

    return quillDiags.map((d) => ({
      line: d.range.start.line + 1,
      message: d.message,
      severity: d.severity === vscode.DiagnosticSeverity.Error
        ? "error" as const
        : d.severity === vscode.DiagnosticSeverity.Warning
          ? "warning" as const
          : "info" as const,
      source: d.source ?? "CS Quill",
    }));
  }

  // ── Approximate function end by brace matching ──

  private findFunctionEnd(
    document: vscode.TextDocument,
    startLine: number,
  ): number {
    let depth = 0;
    let foundOpen = false;

    for (let i = startLine; i < document.lineCount; i++) {
      const text = document.lineAt(i).text;

      for (const ch of text) {
        if (ch === "{") {
          depth++;
          foundOpen = true;
        } else if (ch === "}") {
          depth--;
          if (foundOpen && depth === 0) {
            return i;
          }
        }
      }
    }

    return startLine;
  }

  public dispose(): void {
    this._onDidChangeCodeLenses.dispose();
    this.cache.clear();
  }
}

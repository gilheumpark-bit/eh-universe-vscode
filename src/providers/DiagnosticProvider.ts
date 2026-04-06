// ============================================================
// CS Quill 🦔 — Diagnostic Provider (Step 25~34)
// ============================================================
// 데몬이 잡아낸 에러를 코드 바닥에 물결선으로 그리는 작업.

import * as vscode from "vscode";
import type { QuillFinding } from "../QuillClient";
import type { ScopePolicy } from "../scope-policy";

// Step 25~26: DiagnosticCollection 생성
export class DiagnosticProvider {
  private collection: vscode.DiagnosticCollection;
  private findingsCache: Map<string, QuillFinding[]> = new Map();
  private scopePolicy: ScopePolicy | null = null;

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection("cs-quill");
  }

  /** Scope policy 주입 (extension.ts에서 호출) */
  public setScopePolicy(policy: ScopePolicy): void {
    this.scopePolicy = policy;
  }

  // Step 28~32: 분석 결과 → 물결선 변환 + 푸시
  public updateDiagnostics(uri: vscode.Uri, findings: QuillFinding[]): void {
    // ── Scope Policy 필터링 (진단 생성 전) ──
    const filtered = this.scopePolicy
      ? this.scopePolicy.applyToFindings(findings, uri.fsPath)
      : findings;

    this.findingsCache.set(uri.toString(), filtered);

    const diagnostics: vscode.Diagnostic[] = filtered.map((f) => {
      // Step 30: Range 변환 (줄 번호 → VS Code Range)
      const startLine = Math.max(0, (f.line ?? 1) - 1);
      const endLine = Math.max(startLine, (f.endLine ?? f.line ?? 1) - 1);
      const startCol = f.column ?? 0;
      const endCol = f.endColumn ?? 200; // 줄 끝까지
      const range = new vscode.Range(startLine, startCol, endLine, endCol);

      // Step 29: severity 매핑 (P0/P1→Error, P2→Warning)
      let severity: vscode.DiagnosticSeverity;
      switch (f.severity) {
        case "error":
          severity = vscode.DiagnosticSeverity.Error;
          break;
        case "warning":
          severity = vscode.DiagnosticSeverity.Warning;
          break;
        default:
          severity = vscode.DiagnosticSeverity.Information;
      }

      const diag = new vscode.Diagnostic(range, f.message, severity);

      // Step 31: 마우스 호버 시 툴팁에 소스 표시
      diag.source = f.source || "CS Quill (AST)";
      if (f.code) diag.code = f.code;

      // fix 정보를 diagnostic에 첨부 (CodeActionProvider가 사용)
      if (f.fix) {
        (diag as any)._quillFix = f.fix;
      }

      return diag;
    });

    // Step 32: VS Code 코어에 푸시
    this.collection.set(uri, diagnostics);
  }

  // Step 34: 파일 닫힘/정상화 시 잔상 제거
  public clearFile(uri: vscode.Uri): void {
    this.collection.delete(uri);
    this.findingsCache.delete(uri.toString());
  }

  public clearAll(): void {
    this.collection.clear();
    this.findingsCache.clear();
  }

  public getFindingsForUri(uri: vscode.Uri): QuillFinding[] {
    return this.findingsCache.get(uri.toString()) ?? [];
  }

  public getCollection(): vscode.DiagnosticCollection {
    return this.collection;
  }

  public dispose(): void {
    this.collection.dispose();
  }
}

// ============================================================
// CS Quill — Scope-Based Rule Precedence (VS Code)
// ============================================================
// vscode workspace settings에서 규칙 정책을 읽어
// 파일별 finding 필터링 수행.

import * as vscode from "vscode";
import type { QuillFinding } from "./QuillClient";

// ============================================================
// PART 1 — Types
// ============================================================

type PolicyAction = "enforce" | "suppress" | "warn";

interface RuleEntry {
  scope: "global" | "workspace" | "module";
  action: PolicyAction;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=RuleEntry,PolicyAction

// ============================================================
// PART 2 — ScopePolicy
// ============================================================

/**
 * VS Code workspace settings 기반 scope policy.
 *
 * settings.json 예시:
 * ```json
 * "csQuill.scopePolicy": {
 *   "HARDCODED_COLOR_INLINE": "suppress",
 *   "LOG_SENSITIVE_DATA": "enforce",
 *   "STACK_TRACE_EXPOSURE": "warn"
 * }
 * ```
 */
export class ScopePolicy {
  private rules: Map<string, RuleEntry> = new Map();

  /** workspace settings에서 scope policy 로드 */
  loadFromConfig(): void {
    this.rules.clear();

    const config = vscode.workspace.getConfiguration("csQuill");
    const policyObj = config.get<Record<string, string>>("scopePolicy") ?? {};

    for (const [ruleId, action] of Object.entries(policyObj)) {
      if (action === "enforce" || action === "suppress" || action === "warn") {
        this.rules.set(ruleId, { scope: "workspace", action });
      }
    }
  }

  /**
   * 특정 ruleId에 대해 action 해석.
   * 등록되지 않은 규칙은 'enforce' 반환.
   */
  resolve(ruleId: string, _filePath: string): PolicyAction {
    const entry = this.rules.get(ruleId);
    return entry?.action ?? "enforce";
  }

  /**
   * QuillFinding[] 배열에 scope policy 적용.
   * suppress → 제거, warn → severity downgrade, enforce → 유지.
   */
  applyToFindings(
    findings: QuillFinding[],
    filePath: string,
  ): QuillFinding[] {
    if (this.rules.size === 0) return findings;

    return findings.filter((f) => {
      const code = f.code ?? f.source;
      if (!code) return true;

      const ruleId = typeof code === "string" ? code : String(code);
      const action = this.resolve(ruleId, filePath);

      if (action === "suppress") return false;

      if (action === "warn" && f.severity === "error") {
        f.severity = "warning";
      }

      return true;
    });
  }

  /** 현재 로드된 규칙 수 */
  get ruleCount(): number {
    return this.rules.size;
  }
}

// IDENTITY_SEAL: PART-2 | role=ScopePolicy | inputs=config,findings | outputs=filtered findings

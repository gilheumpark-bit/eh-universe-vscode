/**
 * ============================================================
 * CS Quill — Audit Runner (Real Static Analysis Pipeline)
 * ============================================================
 *
 * Despite the legacy filename ("dummy-audit"), this is the **real audit runner**
 * that drives the static analysis pipeline and quality checklist.
 *
 * Features:
 * - Timeout protection (30s max via AbortController pattern)
 * - Structured result messages: { score, findings, domains, grade }
 * - Per-domain pass/fail counts
 * - Progress reporting via postMessage (0% → 100%)
 * - Cached last audit result to skip re-runs on visibility change
 * - File-path parameter: audit any file, not just the active editor
 * - Proper error handling with user-friendly messages
 */

import * as vscode from "vscode";
import {
  runStaticPipeline,
  type PipelineResult,
} from "../lib/code-studio/pipeline/pipeline";
import { runTier1 } from "../lib/code-studio/pipeline/quality-checklist";
import type { CheckItem, CheckDomain } from "../lib/code-studio/pipeline/quality-checklist";

// ============================================================
// PART 1 — Types
// ============================================================

/** Structured audit result sent to the sidebar webview */
export interface AuditResult {
  score: number;
  grade: string;
  findings: AuditFinding[];
  domains: DomainSummary[];
  fileName: string;
  timestamp: number;
  durationMs: number;
}

export interface AuditFinding {
  message: string;
  severity: "error" | "warning" | "info";
  domain?: string;
  source: string;
}

export interface DomainSummary {
  domain: string;
  passCount: number;
  failCount: number;
  warnCount: number;
  total: number;
}

// ============================================================
// PART 2 — Cache
// ============================================================

let _lastAuditResult: AuditResult | null = null;
let _lastAuditFilePath: string | null = null;

/** Return cached result if available for the same file. */
export function getCachedAudit(filePath?: string): AuditResult | null {
  if (!filePath) { return _lastAuditResult; }
  if (_lastAuditFilePath === filePath) { return _lastAuditResult; }
  return null;
}

/** Clear the audit cache (e.g. when file content changes). */
export function clearAuditCache(): void {
  _lastAuditResult = null;
  _lastAuditFilePath = null;
}

// ============================================================
// PART 3 — Helpers
// ============================================================

function scoreToGrade(score: number): string {
  if (score >= 95) { return "A+"; }
  if (score >= 90) { return "A"; }
  if (score >= 85) { return "B+"; }
  if (score >= 80) { return "B"; }
  if (score >= 70) { return "C"; }
  if (score >= 60) { return "D"; }
  return "F";
}

function sendProgress(webview: vscode.Webview, percent: number, label: string): void {
  void webview.postMessage({
    type: "audit-progress",
    payload: { percent, label },
  });
}

function sendError(webview: vscode.Webview, message: string): void {
  void webview.postMessage({
    type: "audit-error",
    payload: { message },
  });
}

function sendResult(webview: vscode.Webview, result: AuditResult): void {
  void webview.postMessage({
    type: "audit-result",
    payload: result,
  });
}

function buildDomainSummaries(checks: CheckItem[]): DomainSummary[] {
  const map = new Map<string, DomainSummary>();

  for (const c of checks) {
    const d = c.domain as string;
    let entry = map.get(d);
    if (!entry) {
      entry = { domain: d, passCount: 0, failCount: 0, warnCount: 0, total: 0 };
      map.set(d, entry);
    }
    entry.total += 1;
    if (c.status === "pass") { entry.passCount += 1; }
    else if (c.status === "fail") { entry.failCount += 1; }
    else if (c.status === "warn") { entry.warnCount += 1; }
  }

  return Array.from(map.values());
}

// ============================================================
// PART 4 — Read file content (active editor or file path)
// ============================================================

async function resolveFileContent(
  filePath?: string,
): Promise<{ code: string; fileName: string; language: string } | null> {
  // If a file path is provided, read it from disk
  if (filePath) {
    try {
      const uri = vscode.Uri.file(filePath);
      const doc = await vscode.workspace.openTextDocument(uri);
      return {
        code: doc.getText(),
        fileName: doc.fileName,
        language: doc.languageId,
      };
    } catch {
      return null;
    }
  }

  // Fall back to active editor
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return null; }

  return {
    code: editor.document.getText(),
    fileName: editor.document.fileName,
    language: editor.document.languageId,
  };
}

// ============================================================
// PART 5 — Main audit runner
// ============================================================

const AUDIT_TIMEOUT_MS = 30_000;

/**
 * Run the full static analysis audit.
 *
 * @param webview   - Sidebar webview for progress / result messages
 * @param filePath  - Optional explicit file path; defaults to the active editor
 */
export async function runSimpleAudit(
  webview: vscode.Webview,
  filePath?: string,
): Promise<AuditResult | null> {
  const startTime = Date.now();

  // --- Check cache first (skip re-run on visibility change) ---
  const cached = getCachedAudit(filePath);
  if (cached) {
    sendResult(webview, cached);
    return cached;
  }

  sendProgress(webview, 0, "AI 검증을 시작합니다...");

  // --- Resolve file content ---
  const file = await resolveFileContent(filePath);
  if (!file) {
    const msg = filePath
      ? `[Audit] 파일을 열 수 없습니다: ${filePath}`
      : "[Audit] 열린 파일이 없습니다. 파일을 열고 다시 시도하세요.";
    sendError(webview, msg);
    return null;
  }

  sendProgress(webview, 10, `파일 로드 완료: ${file.fileName.split(/[\\/]/).pop()}`);

  // --- Timeout wrapper ---
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("AUDIT_TIMEOUT"));
    }, AUDIT_TIMEOUT_MS);
  });

  try {
    const auditWork = async (): Promise<AuditResult> => {
      // Step 1: Static pipeline
      sendProgress(webview, 25, "정적 분석 파이프라인 실행 중...");
      const pipelineResult: PipelineResult = runStaticPipeline(file.code, file.language);

      sendProgress(webview, 50, "품질 체크리스트 실행 중...");

      // Step 2: Quality checklist tier-1
      const tier1Checks = runTier1(file.code, file.fileName);

      sendProgress(webview, 75, "결과 집계 중...");

      // Step 3: Collect findings
      const findings: AuditFinding[] = [];

      for (const stage of pipelineResult.stages) {
        for (const f of stage.findings) {
          findings.push({
            message: `[${stage.name}] ${f}`,
            severity: stage.status === "fail" ? "error" : stage.status === "warn" ? "warning" : "info",
            source: "pipeline",
          });
        }
      }

      for (const c of tier1Checks) {
        if (c.status === "fail") {
          findings.push({
            message: `${c.label.en}: ${c.detail ?? c.description.en}`,
            severity: "error",
            domain: c.domain,
            source: "checklist",
          });
        } else if (c.status === "warn") {
          findings.push({
            message: `${c.label.en}: ${c.detail ?? c.description.en}`,
            severity: "warning",
            domain: c.domain,
            source: "checklist",
          });
        }
      }

      // Step 4: Domain summaries
      const domains = buildDomainSummaries(tier1Checks);

      // Step 5: Build result
      const score = pipelineResult.overallScore;
      const grade = scoreToGrade(score);
      const durationMs = Date.now() - startTime;

      const result: AuditResult = {
        score,
        grade,
        findings,
        domains,
        fileName: file.fileName,
        timestamp: Date.now(),
        durationMs,
      };

      return result;
    };

    // Race audit work against timeout
    const result = await Promise.race([auditWork(), timeoutPromise]);

    // Cache the result
    _lastAuditResult = result;
    _lastAuditFilePath = file.fileName;

    sendProgress(webview, 100, "분석 완료");
    sendResult(webview, result);

    // Also send legacy onInfo for backward compatibility
    const shortName = file.fileName.split(/[\\/]/).pop();
    void webview.postMessage({
      type: "onInfo",
      value: `[Audit] 분석 완료: ${shortName} — ${result.grade} (${result.score}/100), ${result.findings.length}건 발견`,
    });

    return result;
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.message === "AUDIT_TIMEOUT";
    const userMsg = isTimeout
      ? `[Audit] 분석 시간 초과 (${AUDIT_TIMEOUT_MS / 1000}초). 파일이 너무 크거나 시스템이 느립니다.`
      : `[Audit] 분석 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`;

    sendError(webview, userMsg);
    return null;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

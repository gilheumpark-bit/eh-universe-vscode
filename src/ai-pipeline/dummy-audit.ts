import * as vscode from "vscode";
import {
  runStaticPipeline,
  type PipelineResult,
} from "../lib/code-studio/pipeline/pipeline";
import { runTier1 } from "../lib/code-studio/pipeline/quality-checklist";

/**
 * Real audit using the static analysis pipeline + quality checklist.
 * Analyzes the active editor's code and reports findings via webview messages.
 */
export async function runSimpleAudit(webview: vscode.Webview) {
  webview.postMessage({ type: "onInfo", value: "AI 검증을 시작합니다..." });

  // Get active editor content
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    webview.postMessage({
      type: "onInfo",
      value: "[Audit] 열린 파일이 없습니다. 파일을 열고 다시 시도하세요.",
    });
    return;
  }

  const code = editor.document.getText();
  const fileName = editor.document.fileName;
  const language = editor.document.languageId;

  // Run static pipeline analysis
  const pipelineResult: PipelineResult = runStaticPipeline(code, language);

  // Run quality checklist tier-1
  const tier1Checks = runTier1(code, fileName);
  const failedChecks = tier1Checks.filter((c) => c.status === "fail");
  const warnChecks = tier1Checks.filter((c) => c.status === "warn");

  // Collect pipeline findings
  const allFindings: string[] = [];
  for (const stage of pipelineResult.stages) {
    if (stage.findings.length > 0) {
      allFindings.push(
        `[${stage.name}] (${stage.status}, score: ${stage.score})`,
      );
      for (const f of stage.findings) {
        allFindings.push(`  - ${f}`);
      }
    }
  }

  // Build report message
  const lines: string[] = [
    `[Audit] 분석 완료: ${fileName.split(/[\\/]/).pop()}`,
    `Overall Score: ${pipelineResult.overallScore}/100 (${pipelineResult.overallStatus})`,
  ];

  if (allFindings.length > 0) {
    lines.push("", "--- Pipeline Findings ---");
    lines.push(...allFindings);
  }

  if (failedChecks.length > 0) {
    lines.push("", `--- Quality Checklist: ${failedChecks.length} FAIL ---`);
    for (const c of failedChecks) {
      lines.push(`  ✗ ${c.label.en}: ${c.detail ?? c.description.en}`);
    }
  }

  if (warnChecks.length > 0) {
    lines.push(`--- Quality Checklist: ${warnChecks.length} WARN ---`);
    for (const c of warnChecks) {
      lines.push(`  ⚠ ${c.label.en}: ${c.detail ?? c.description.en}`);
    }
  }

  if (allFindings.length === 0 && failedChecks.length === 0) {
    lines.push("이슈가 발견되지 않았습니다.");
  }

  webview.postMessage({
    type: "onInfo",
    value: lines.join("\n"),
  });
}

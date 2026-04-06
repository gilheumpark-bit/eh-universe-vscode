// ============================================================
// PART 1 — Commit Message Generator
// ============================================================
// Analyzes git diffs and generates conventional commit messages.

import type { GitDiffResult } from "./git";

export interface CommitMessageResult {
  type: string;
  scope: string;
  subject: string;
  full: string;
  confidence: number;
}

/**
 * Detect commit type from file paths in the diff set.
 */
function detectType(diffs: GitDiffResult[]): string {
  if (diffs.length === 0) return "chore";

  const paths = diffs.map((d) => d.filePath);

  // Test files
  if (paths.every((p) => /test|spec|__tests__/.test(p))) return "test";

  // Docs
  if (paths.every((p) => /\.md$/i.test(p) || /docs?\//i.test(p)))
    return "docs";

  // CI/CD
  if (
    paths.every(
      (p) =>
        /\.ya?ml$/.test(p) || /Dockerfile/i.test(p) || /\.github\//.test(p),
    )
  )
    return "ci";

  // Style-only
  if (paths.every((p) => /\.css$|\.scss$|\.less$/.test(p))) return "style";

  // Default to feat for additions-heavy, fix for deletions-heavy
  const totalAdds = diffs.reduce((s, d) => s + d.additions, 0);
  const totalDels = diffs.reduce((s, d) => s + d.deletions, 0);
  return totalAdds > totalDels ? "feat" : "fix";
}

/**
 * Infer scope from file paths (common parent directory).
 * Returns only directory-name segments (no dots allowed in scope).
 */
function detectScope(diffs: GitDiffResult[]): string {
  if (diffs.length === 0) return "";
  if (diffs.length === 1) {
    const parts = diffs[0].filePath.split("/");
    // Use the directory after src/ if present, otherwise second-to-last
    const srcIdx = parts.indexOf("src");
    if (srcIdx >= 0 && parts.length > srcIdx + 2) {
      // Only use directory segments (skip the file itself)
      return parts[srcIdx + 1];
    }
    // For paths like "src/app.ts" — only one level after src, use "app" as scope
    if (srcIdx >= 0 && parts.length === srcIdx + 2) {
      const segment = parts[srcIdx + 1];
      // Strip extension to get clean scope
      return segment.replace(/\.[^.]+$/, "");
    }
    if (parts.length >= 2) {
      const dir = parts[parts.length - 2];
      return dir.replace(/\.[^.]+$/, "");
    }
    return "";
  }

  // Multiple files: find common directory
  const allParts = diffs.map((d) => d.filePath.split("/"));
  let common = "";
  for (let i = 0; i < allParts[0].length; i++) {
    const segment = allParts[0][i];
    if (allParts.every((p) => p[i] === segment)) {
      common = segment;
    } else {
      break;
    }
  }
  return common === "src" ? "" : common;
}

/**
 * Generate a subject line summarizing the changes.
 */
function generateSubject(diffs: GitDiffResult[], type: string): string {
  if (diffs.length === 0) return "empty commit";
  if (diffs.length === 1) {
    const filename = diffs[0].filePath.split("/").pop() ?? "file";
    return `update ${filename}`;
  }
  return `update ${diffs.length} files`;
}

/**
 * Analyze diffs and produce a conventional commit message.
 */
export function generateCommitMessage(
  diffs: GitDiffResult[],
): CommitMessageResult {
  if (diffs.length === 0) {
    return {
      type: "chore",
      scope: "",
      subject: "empty commit",
      full: "chore: empty commit",
      confidence: 0,
    };
  }

  const type = detectType(diffs);
  const scope = detectScope(diffs);
  const subject = generateSubject(diffs, type);
  const full = formatConventionalCommit(type, scope, subject);
  const confidence = Math.min(1, diffs.length * 0.3);

  return { type, scope, subject, full, confidence };
}

/**
 * Format a conventional commit string.
 * @param type - commit type (feat, fix, docs, etc.)
 * @param scope - optional scope
 * @param subject - subject line
 * @param body - optional body text
 * @param breaking - whether this is a breaking change
 */
export function formatConventionalCommit(
  type: string,
  scope: string,
  subject: string,
  body?: string,
  breaking?: boolean,
): string {
  let header = type;
  if (scope) header += `(${scope})`;
  if (breaking) header += "!";
  header += `: ${subject}`;

  if (body) {
    return `${header}\n\n${body}`;
  }
  return header;
}

// IDENTITY_SEAL: PART-1 | role=commit-msg | inputs=GitDiffResult[] | outputs=CommitMessageResult

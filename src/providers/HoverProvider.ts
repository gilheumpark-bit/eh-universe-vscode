// ============================================================
// CS Quill 🦔 — HoverProvider
// ============================================================
// 심볼 위에 마우스를 올리면 JSDoc, 타입 정보, 분석 결과를 표시.

import * as vscode from "vscode";
import type { QuillClient } from "../QuillClient";

// ============================================================
// PART 1 — JSDoc Parser
// ============================================================

/**
 * 주어진 줄 위의 연속된 JSDoc/블록 주석을 추출한다.
 */
function extractJSDoc(
  document: vscode.TextDocument,
  lineIndex: number,
): string | null {
  const lines: string[] = [];
  let i = lineIndex - 1;

  // Walk upward collecting comment lines
  while (i >= 0) {
    const text = document.lineAt(i).text.trim();

    if (text.endsWith("*/")) {
      // Start of block comment end — collect upward until /**
      lines.unshift(text);
      i--;

      while (i >= 0) {
        const t = document.lineAt(i).text.trim();
        lines.unshift(t);
        if (t.startsWith("/**") || t.startsWith("/*")) {
          break;
        }
        i--;
      }

      break;
    } else if (text.startsWith("//")) {
      // Single-line comments
      lines.unshift(text);
      i--;
    } else {
      break;
    }
  }

  if (lines.length === 0) {
    return null;
  }

  // Clean comment markers
  const cleaned = lines
    .map((l) =>
      l
        .replace(/^\/\*\*?\s?/, "")
        .replace(/\*\/\s*$/, "")
        .replace(/^\s*\*\s?/, "")
        .replace(/^\/\/\s?/, ""),
    )
    .join("\n")
    .trim();

  return cleaned || null;
}

// ============================================================
// PART 2 — Symbol Detection at Position
// ============================================================

const SYMBOL_PATTERNS = [
  // function declaration
  /(?:export\s+)?(?:async\s+)?function\s*\*?\s+(\w+)/,
  // arrow / const
  /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*[=:]/,
  // class declaration
  /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/,
  // interface
  /(?:export\s+)?interface\s+(\w+)/,
  // type alias
  /(?:export\s+)?type\s+(\w+)\s*[<=]/,
  // enum
  /(?:export\s+)?(?:const\s+)?enum\s+(\w+)/,
  // method
  /(?:public|private|protected)?\s*(?:static)?\s*(?:async)?\s*(?:get\s+|set\s+)?(\w+)\s*\(/,
];

interface SymbolInfo {
  name: string;
  line: number;
  kind: string;
}

function detectSymbolAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): SymbolInfo | null {
  const wordRange = document.getWordRangeAtPosition(position, /\w+/);
  if (!wordRange) {
    return null;
  }

  const word = document.getText(wordRange);
  const lineText = document.lineAt(position.line).text;

  for (const pattern of SYMBOL_PATTERNS) {
    const match = lineText.match(pattern);
    if (match) {
      const matchedName = match[1];
      if (matchedName === word) {
        // Determine kind from pattern
        const src = pattern.source;
        let kind = "variable";
        if (src.includes("function")) {
          kind = "function";
        } else if (src.includes("class")) {
          kind = "class";
        } else if (src.includes("interface")) {
          kind = "interface";
        } else if (src.includes("type")) {
          kind = "type";
        } else if (src.includes("enum")) {
          kind = "enum";
        } else if (src.includes("public|private|protected")) {
          kind = "method";
        }

        return { name: word, line: position.line, kind };
      }
    }
  }

  return null;
}

// ============================================================
// PART 3 — Provider Implementation
// ============================================================

export class QuillHoverProvider implements vscode.HoverProvider {
  private client: QuillClient;

  constructor(client: QuillClient) {
    this.client = client;
  }

  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): vscode.Hover | null {
    const symbol = detectSymbolAtPosition(document, position);

    if (!symbol) {
      return null;
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;

    // ── Header ──
    md.appendMarkdown(`**\uD83E\uDD94 CS Quill** \u2014 \`${symbol.name}\`\n\n`);

    // ── Symbol kind ──
    const kindLabel = this.getKindLabel(symbol.kind);
    md.appendMarkdown(`**\uC885\uB958:** ${kindLabel}\n\n`);

    // ── JSDoc ──
    const jsdoc = extractJSDoc(document, symbol.line);
    if (jsdoc) {
      md.appendMarkdown("---\n\n");
      md.appendMarkdown(`**\uBB38\uC11C:**\n\n`);
      md.appendMarkdown(`${jsdoc}\n\n`);
    }

    // ── CS Quill findings for this symbol ──
    md.appendMarkdown("---\n\n");

    if (!this.client.isConnected()) {
      md.appendMarkdown(
        `*\u23F3 \uB370\uBAAC \uBBF8\uC5F0\uACB0 \u2014 \uBD84\uC11D \uACB0\uACFC\uB97C \uD45C\uC2DC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.*\n`,
      );
    } else {
      const diagnostics = vscode.languages.getDiagnostics(document.uri);
      const relevantFindings = diagnostics.filter((d) => {
        if (!d.source?.startsWith("CS Quill")) {
          return false;
        }
        // Check if finding is near this symbol's line
        return Math.abs(d.range.start.line - symbol.line) <= 15;
      });

      if (relevantFindings.length === 0) {
        md.appendMarkdown(
          `\u2705 \`${symbol.name}\` \uC8FC\uBCC0\uC5D0 \uBD84\uC11D \uACB0\uACFC \uC5C6\uC74C\n`,
        );
      } else {
        md.appendMarkdown(
          `**\uBD84\uC11D \uACB0\uACFC:** ${relevantFindings.length}\uAC74\n\n`,
        );

        for (const finding of relevantFindings.slice(0, 5)) {
          const icon =
            finding.severity === vscode.DiagnosticSeverity.Error
              ? "\uD83D\uDD34"
              : finding.severity === vscode.DiagnosticSeverity.Warning
                ? "\uD83D\uDFE1"
                : "\uD83D\uDD35";
          const msg = finding.message.length > 80
            ? finding.message.slice(0, 77) + "..."
            : finding.message;
          md.appendMarkdown(`- ${icon} \`L${finding.range.start.line + 1}\` ${msg}\n`);
        }

        if (relevantFindings.length > 5) {
          md.appendMarkdown(
            `\n*... \uC678 ${relevantFindings.length - 5}\uAC74 \uB354*\n`,
          );
        }
      }
    }

    return new vscode.Hover(md);
  }

  private getKindLabel(kind: string): string {
    const labels: Record<string, string> = {
      function: "\uD83D\uDD27 \uD568\uC218 (Function)",
      class: "\uD83C\uDFDB\uFE0F \uD074\uB798\uC2A4 (Class)",
      interface: "\uD83D\uDCCB \uC778\uD130\uD398\uC774\uC2A4 (Interface)",
      type: "\uD83C\uDFF7\uFE0F \uD0C0\uC785 (Type Alias)",
      enum: "\uD83D\uDCCA \uC5F4\uAC70\uD615 (Enum)",
      method: "\u2699\uFE0F \uBA54\uC11C\uB4DC (Method)",
      variable: "\uD83D\uDCE6 \uBCC0\uC218 (Variable)",
    };
    return labels[kind] ?? kind;
  }
}

// ============================================================
// CS Quill — DocumentSymbolProvider
// ============================================================
// Outline / Breadcrumb / Go-to-Symbol support.
// Lightweight regex parsing for functions, classes, interfaces,
// types, enums, variables, constructors, decorators, properties.

import * as vscode from "vscode";

// ============================================================
// PART 1 — Symbol Extraction Patterns
// ============================================================

interface RawSymbol {
  name: string;
  kind: vscode.SymbolKind;
  detail: string;
  range: vscode.Range;
  selectionRange: vscode.Range;
  children: RawSymbol[];
}

// Patterns purposefully kept simple — no ts-morph dependency.
const PATTERNS: {
  regex: RegExp;
  kind: vscode.SymbolKind;
  nameGroup: number;
  isContainer?: boolean;
  detail?: string;
}[] = [
  // class Foo / abstract class Foo / export class Foo
  {
    regex:
      /^(\s*)(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/,
    kind: vscode.SymbolKind.Class,
    nameGroup: 2,
    isContainer: true,
    detail: "class",
  },
  // interface Foo / export interface Foo
  {
    regex: /^(\s*)(?:export\s+)?interface\s+(\w+)/,
    kind: vscode.SymbolKind.Interface,
    nameGroup: 2,
    isContainer: true,
    detail: "interface",
  },
  // enum Foo / export enum Foo / const enum Foo
  {
    regex: /^(\s*)(?:export\s+)?(?:const\s+)?enum\s+(\w+)/,
    kind: vscode.SymbolKind.Enum,
    nameGroup: 2,
    isContainer: true,
    detail: "enum",
  },
  // type Foo = ...
  {
    regex: /^(\s*)(?:export\s+)?type\s+(\w+)\s*[<=]/,
    kind: vscode.SymbolKind.TypeParameter,
    nameGroup: 2,
    detail: "type",
  },
  // standalone function / export function / async function / export async function
  {
    regex:
      /^(\s*)(?:export\s+)?(?:async\s+)?function\s*\*?\s+(\w+)/,
    kind: vscode.SymbolKind.Function,
    nameGroup: 2,
    detail: "function",
  },
  // const / let / var at top-level (arrow or value) — only at indent 0
  {
    regex:
      /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*[=:]/,
    kind: vscode.SymbolKind.Variable,
    nameGroup: 1,
    detail: "variable",
  },
];

// Method-level patterns (inside classes/interfaces)
const METHOD_PATTERNS: {
  regex: RegExp;
  kind: vscode.SymbolKind;
  nameGroup: number;
  detail?: string;
}[] = [
  // constructor(
  {
    regex: /^\s+(?:public|private|protected)?\s*constructor\s*\(/,
    kind: vscode.SymbolKind.Constructor,
    nameGroup: 0, // special handling below
    detail: "constructor",
  },
  // public/private/protected/static async? methodName(
  {
    regex:
      /^\s+(?:public|private|protected)?\s*(?:static)?\s*(?:abstract)?\s*(?:async)?\s*(?:get\s+|set\s+)?(\w+)\s*[\(<]/,
    kind: vscode.SymbolKind.Method,
    nameGroup: 1,
    detail: "method",
  },
  // property: type (inside interface/class)
  {
    regex: /^\s+(?:public|private|protected)?\s*(?:static)?\s*(?:readonly\s+)?(\w+)\s*[?!]?\s*:/,
    kind: vscode.SymbolKind.Property,
    nameGroup: 1,
    detail: "property",
  },
];

// Decorator pattern
const DECORATOR_REGEX = /^(\s*)@(\w+)(?:\([^)]*\))?\s*$/;

// ============================================================
// PART 2 — Comment Detection
// ============================================================

/** Check if a line index is inside a block comment or is a line comment. */
function isInsideComment(lines: string[], lineIndex: number): boolean {
  const text = lines[lineIndex];

  // Line comment
  const trimmed = text.trimStart();
  if (trimmed.startsWith("//")) return true;
  // Check if inside line comment after stripping strings
  const noStrings = text.replace(/(["'`])(?:(?!\1|\\).|\\.)*\1/g, '""');
  const commentIdx = noStrings.indexOf("//");
  if (commentIdx >= 0) {
    // The match position must be before the comment start for it to not be in a comment
    // This is a simplification — we only skip lines that start with //
  }

  // Block comment detection: scan backwards from this line
  let inBlock = false;
  for (let i = 0; i <= lineIndex; i++) {
    const line = lines[i];
    let j = 0;
    while (j < line.length) {
      if (inBlock) {
        const endIdx = line.indexOf("*/", j);
        if (endIdx === -1) break;
        inBlock = false;
        j = endIdx + 2;
      } else {
        const startIdx = line.indexOf("/*", j);
        if (startIdx === -1) break;
        // Check if inside a string (simplified)
        const beforeStart = line.slice(0, startIdx);
        const singleQuotes = (beforeStart.match(/'/g) ?? []).length;
        const doubleQuotes = (beforeStart.match(/"/g) ?? []).length;
        const backticks = (beforeStart.match(/`/g) ?? []).length;
        if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0 && backticks % 2 === 0) {
          inBlock = true;
          j = startIdx + 2;
        } else {
          break;
        }
      }
    }
  }

  return inBlock;
}

// IDENTITY_SEAL: PART-2 | role=comment-detection | inputs=lines,lineIndex | outputs=boolean

// ============================================================
// PART 3 — Provider Implementation
// ============================================================

export class QuillDocumentSymbolProvider
  implements vscode.DocumentSymbolProvider
{
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.DocumentSymbol[] {
    const rawSymbols = this.parse(document);
    return rawSymbols.map((s) => this.toDocumentSymbol(s));
  }

  // ── Convert RawSymbol -> vscode.DocumentSymbol ──

  private toDocumentSymbol(raw: RawSymbol): vscode.DocumentSymbol {
    const sym = new vscode.DocumentSymbol(
      raw.name,
      raw.detail,
      raw.kind,
      raw.range,
      raw.selectionRange,
    );
    sym.children = raw.children.map((c) => this.toDocumentSymbol(c));
    return sym;
  }

  // ── Main parser ──

  private parse(document: vscode.TextDocument): RawSymbol[] {
    const result: RawSymbol[] = [];
    const lineCount = document.lineCount;
    const allLines: string[] = [];
    for (let i = 0; i < lineCount; i++) {
      allLines.push(document.lineAt(i).text);
    }

    let i = 0;
    let pendingDecorators: string[] = [];

    while (i < lineCount) {
      const line = document.lineAt(i);
      const text = line.text;

      // Skip lines inside comments
      if (isInsideComment(allLines, i)) {
        i++;
        pendingDecorators = [];
        continue;
      }

      // Collect decorators
      const decoratorMatch = text.match(DECORATOR_REGEX);
      if (decoratorMatch) {
        pendingDecorators.push(decoratorMatch[2]);
        i++;
        continue;
      }

      // Try top-level patterns
      let matched = false;
      for (const pattern of PATTERNS) {
        const match = text.match(pattern.regex);
        if (!match) continue;

        const name = match[pattern.nameGroup];
        if (!name) continue;

        const detail = pendingDecorators.length > 0
          ? `@${pendingDecorators.join(" @")} ${pattern.detail ?? ""}`
          : pattern.detail ?? "";
        pendingDecorators = [];

        const selectionRange = new vscode.Range(
          i,
          text.indexOf(name),
          i,
          text.indexOf(name) + name.length,
        );

        if (pattern.isContainer) {
          const endLine = this.findClosingBrace(document, i);
          const range = new vscode.Range(
            i,
            0,
            endLine,
            document.lineAt(endLine).text.length,
          );
          const children = this.parseChildren(document, allLines, i + 1, endLine);
          result.push({ name, kind: pattern.kind, detail, range, selectionRange, children });
          i = endLine + 1;
        } else {
          const range = new vscode.Range(i, 0, i, text.length);
          result.push({ name, kind: pattern.kind, detail, range, selectionRange, children: [] });
          i++;
        }

        matched = true;
        break;
      }

      if (!matched) {
        // Reset decorators if no match follows them
        if (pendingDecorators.length > 0 && !decoratorMatch) {
          pendingDecorators = [];
        }
        i++;
      }
    }

    return result;
  }

  // ── Parse children (methods/properties/constructors) inside a container ──

  private parseChildren(
    document: vscode.TextDocument,
    allLines: string[],
    startLine: number,
    endLine: number,
  ): RawSymbol[] {
    const children: RawSymbol[] = [];
    let pendingDecorators: string[] = [];

    for (let i = startLine; i < endLine; i++) {
      const text = document.lineAt(i).text;

      // Skip lines inside comments
      if (isInsideComment(allLines, i)) {
        pendingDecorators = [];
        continue;
      }

      // Collect decorators on members
      const decoratorMatch = text.match(DECORATOR_REGEX);
      if (decoratorMatch) {
        pendingDecorators.push(decoratorMatch[2]);
        continue;
      }

      for (const pattern of METHOD_PATTERNS) {
        const match = text.match(pattern.regex);
        if (!match) continue;

        // Constructor special handling
        if (pattern.kind === vscode.SymbolKind.Constructor) {
          const name = "constructor";
          const detail = pendingDecorators.length > 0
            ? `@${pendingDecorators.join(" @")} constructor`
            : "constructor";
          pendingDecorators = [];

          const nameIdx = text.indexOf("constructor");
          const selectionRange = new vscode.Range(
            i,
            nameIdx,
            i,
            nameIdx + "constructor".length,
          );

          const methodEnd = this.findClosingBrace(document, i, endLine);
          const range = new vscode.Range(
            i,
            0,
            methodEnd,
            document.lineAt(methodEnd).text.length,
          );
          children.push({ name, kind: pattern.kind, detail, range, selectionRange, children: [] });
          i = methodEnd;
          break;
        }

        const name = match[pattern.nameGroup];
        if (!name) continue;

        // Skip keywords that aren't actual symbols
        if (
          ["if", "else", "for", "while", "switch", "return", "import", "from", "new", "throw", "catch", "try", "finally"].includes(name)
        ) {
          continue;
        }

        const detail = pendingDecorators.length > 0
          ? `@${pendingDecorators.join(" @")} ${pattern.detail ?? ""}`
          : pattern.detail ?? "";
        pendingDecorators = [];

        const nameIdx = text.indexOf(name);
        const selectionRange = new vscode.Range(
          i,
          nameIdx,
          i,
          nameIdx + name.length,
        );

        // For methods, find closing brace; for properties, single-line
        if (pattern.kind === vscode.SymbolKind.Method) {
          const methodEnd = this.findClosingBrace(document, i, endLine);
          const range = new vscode.Range(
            i,
            0,
            methodEnd,
            document.lineAt(methodEnd).text.length,
          );
          children.push({ name, kind: pattern.kind, detail, range, selectionRange, children: [] });
          i = methodEnd; // outer for will i++
        } else {
          const range = new vscode.Range(i, 0, i, text.length);
          children.push({ name, kind: pattern.kind, detail, range, selectionRange, children: [] });
        }

        break;
      }
    }

    return children;
  }

  // ── Find matching closing brace ──

  private findClosingBrace(
    document: vscode.TextDocument,
    startLine: number,
    maxLine?: number,
  ): number {
    const limit = maxLine ?? document.lineCount - 1;
    let depth = 0;
    let foundOpen = false;
    let inString: string | null = null;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = startLine; i <= limit; i++) {
      const text = document.lineAt(i).text;
      inLineComment = false;

      for (let j = 0; j < text.length; j++) {
        const ch = text[j];
        const next = j + 1 < text.length ? text[j + 1] : "";

        // Handle string state (skip braces inside strings)
        if (inString) {
          if (ch === "\\" ) { j++; continue; } // skip escaped char
          if (ch === inString) inString = null;
          continue;
        }

        // Handle block comments
        if (inBlockComment) {
          if (ch === "*" && next === "/") {
            inBlockComment = false;
            j++;
          }
          continue;
        }

        // Handle line comment start
        if (ch === "/" && next === "/") {
          inLineComment = true;
          break;
        }

        // Handle block comment start
        if (ch === "/" && next === "*") {
          inBlockComment = true;
          j++;
          continue;
        }

        // Handle string start
        if (ch === '"' || ch === "'" || ch === "`") {
          inString = ch;
          continue;
        }

        // Count braces
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

    // Fallback: return startLine if no closing brace found
    return startLine;
  }
}

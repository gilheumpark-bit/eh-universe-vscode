// ============================================================
// CS Quill 🦔 — DocumentSymbolProvider
// ============================================================
// Outline / Breadcrumb / Go-to-Symbol 지원.
// 경량 regex 파싱으로 함수, 클래스, 인터페이스, 타입, 열거형, 변수 추출.

import * as vscode from "vscode";

// ============================================================
// PART 1 — Symbol Extraction Patterns
// ============================================================

interface RawSymbol {
  name: string;
  kind: vscode.SymbolKind;
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
}[] = [
  // class Foo / abstract class Foo / export class Foo
  {
    regex:
      /^(\s*)(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/,
    kind: vscode.SymbolKind.Class,
    nameGroup: 2,
    isContainer: true,
  },
  // interface Foo / export interface Foo
  {
    regex: /^(\s*)(?:export\s+)?interface\s+(\w+)/,
    kind: vscode.SymbolKind.Interface,
    nameGroup: 2,
    isContainer: true,
  },
  // enum Foo / export enum Foo / const enum Foo
  {
    regex: /^(\s*)(?:export\s+)?(?:const\s+)?enum\s+(\w+)/,
    kind: vscode.SymbolKind.Enum,
    nameGroup: 2,
    isContainer: true,
  },
  // type Foo = ...
  {
    regex: /^(\s*)(?:export\s+)?type\s+(\w+)\s*[<=]/,
    kind: vscode.SymbolKind.TypeParameter,
    nameGroup: 2,
  },
  // standalone function / export function / async function / export async function
  {
    regex:
      /^(\s*)(?:export\s+)?(?:async\s+)?function\s*\*?\s+(\w+)/,
    kind: vscode.SymbolKind.Function,
    nameGroup: 2,
  },
  // const / let / var at top-level (arrow or value) — only at indent 0
  {
    regex:
      /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*[=:]/,
    kind: vscode.SymbolKind.Variable,
    nameGroup: 1,
  },
];

// Method-level patterns (inside classes/interfaces)
const METHOD_PATTERNS: {
  regex: RegExp;
  kind: vscode.SymbolKind;
  nameGroup: number;
}[] = [
  // public/private/protected/static async? methodName(
  {
    regex:
      /^\s+(?:public|private|protected)?\s*(?:static)?\s*(?:async)?\s*(?:get\s+|set\s+)?(\w+)\s*[\(<]/,
    kind: vscode.SymbolKind.Method,
    nameGroup: 1,
  },
  // property: type (inside interface/class)
  {
    regex: /^\s+(?:readonly\s+)?(\w+)\s*[?!]?\s*:/,
    kind: vscode.SymbolKind.Property,
    nameGroup: 1,
  },
];

// ============================================================
// PART 2 — Provider Implementation
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

  // ── Convert RawSymbol → vscode.DocumentSymbol ──

  private toDocumentSymbol(raw: RawSymbol): vscode.DocumentSymbol {
    const sym = new vscode.DocumentSymbol(
      raw.name,
      "",
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
    let i = 0;

    while (i < lineCount) {
      const line = document.lineAt(i);
      const text = line.text;

      // Try top-level patterns
      for (const pattern of PATTERNS) {
        const match = text.match(pattern.regex);
        if (!match) {
          continue;
        }

        const name = match[pattern.nameGroup];
        if (!name || name === "constructor") {
          continue;
        }

        const selectionRange = new vscode.Range(
          i,
          text.indexOf(name),
          i,
          text.indexOf(name) + name.length,
        );

        if (pattern.isContainer) {
          // Find closing brace to determine container range
          const endLine = this.findClosingBrace(document, i);
          const range = new vscode.Range(i, 0, endLine, document.lineAt(endLine).text.length);
          const children = this.parseChildren(document, i + 1, endLine);

          result.push({ name, kind: pattern.kind, range, selectionRange, children });
          i = endLine + 1;
        } else {
          const range = new vscode.Range(
            i,
            0,
            i,
            text.length,
          );
          result.push({ name, kind: pattern.kind, range, selectionRange, children: [] });
          i++;
        }

        break; // Only first matching pattern per line
      }

      // If no pattern matched, advance
      if (i <= line.lineNumber) {
        i++;
      }
    }

    return result;
  }

  // ── Parse children (methods/properties) inside a container ──

  private parseChildren(
    document: vscode.TextDocument,
    startLine: number,
    endLine: number,
  ): RawSymbol[] {
    const children: RawSymbol[] = [];

    for (let i = startLine; i < endLine; i++) {
      const text = document.lineAt(i).text;

      for (const pattern of METHOD_PATTERNS) {
        const match = text.match(pattern.regex);
        if (!match) {
          continue;
        }

        const name = match[pattern.nameGroup];
        if (!name || name === "constructor" && pattern.kind === vscode.SymbolKind.Property) {
          continue;
        }

        const selectionRange = new vscode.Range(
          i,
          text.indexOf(name),
          i,
          text.indexOf(name) + name.length,
        );

        // For methods, find closing brace; for properties, single-line
        if (pattern.kind === vscode.SymbolKind.Method) {
          const methodEnd = this.findClosingBrace(document, i, endLine);
          const range = new vscode.Range(i, 0, methodEnd, document.lineAt(methodEnd).text.length);
          children.push({ name, kind: pattern.kind, range, selectionRange, children: [] });
          i = methodEnd; // outer for will i++
        } else {
          const range = new vscode.Range(i, 0, i, text.length);
          children.push({ name, kind: pattern.kind, range, selectionRange, children: [] });
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

    for (let i = startLine; i <= limit; i++) {
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

    // Fallback: return startLine if no closing brace found
    return startLine;
  }
}

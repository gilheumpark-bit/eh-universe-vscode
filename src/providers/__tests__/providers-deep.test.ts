// ============================================================
// providers-deep.test.ts — Deep tests for providers & QuillClient
// ============================================================
// 25 tests covering DocumentSymbolProvider, CodeLensProvider,
// HoverProvider, CodeActionProvider, and QuillClient.

jest.mock("vscode");

const vscode = require("vscode");

// ── Helpers ──

/** Build a fake TextDocument from source lines. */
function makeDocument(
  lines: string[],
  uri = "file:///test.ts",
  version = 1,
): any {
  return {
    uri: vscode.Uri.file(uri),
    version,
    lineCount: lines.length,
    lineAt(i: number) {
      const text = lines[i] ?? "";
      return {
        text,
        lineNumber: i,
        range: new vscode.Range(i, 0, i, text.length),
        rangeIncludingLineBreak: new vscode.Range(i, 0, i + 1, 0),
        firstNonWhitespaceCharacterIndex: text.search(/\S/),
        isEmptyOrWhitespace: text.trim().length === 0,
      };
    },
    getText(range?: any) {
      if (!range) return lines.join("\n");
      if (range.start.line === range.end.line) {
        return lines[range.start.line]?.slice(
          range.start.character,
          range.end.character,
        ) ?? "";
      }
      return lines.slice(range.start.line, range.end.line + 1).join("\n");
    },
    getWordRangeAtPosition(pos: any, regex?: RegExp) {
      const text = lines[pos.line] ?? "";
      const pat = regex ?? /\w+/g;
      const g = new RegExp(pat.source, "g");
      let m: RegExpExecArray | null;
      while ((m = g.exec(text)) !== null) {
        if (pos.character >= m.index && pos.character < m.index + m[0].length) {
          return new vscode.Range(
            pos.line,
            m.index,
            pos.line,
            m.index + m[0].length,
          );
        }
      }
      return undefined;
    },
    languageId: "typescript",
    fileName: uri,
    isUntitled: false,
    isDirty: false,
    isClosed: false,
  };
}

function token(): any {
  return { isCancellationRequested: false, onCancellationRequested: jest.fn() };
}

// ============================================================
// SECTION 1 — DocumentSymbolProvider (6 tests)
// ============================================================

describe("DocumentSymbolProvider", () => {
  const { QuillDocumentSymbolProvider } = require("../../providers/DocumentSymbolProvider");

  let provider: InstanceType<typeof QuillDocumentSymbolProvider>;

  beforeEach(() => {
    provider = new QuillDocumentSymbolProvider();
  });

  it("parses function declaration as SymbolKind.Function", () => {
    const doc = makeDocument([
      "function greet(name: string) {",
      '  return "hi " + name;',
      "}",
    ]);
    const symbols = provider.provideDocumentSymbols(doc, token());
    expect(symbols.length).toBe(1);
    expect(symbols[0].name).toBe("greet");
    expect(symbols[0].kind).toBe(vscode.SymbolKind.Function);
  });

  it("parses class with nested methods as SymbolKind.Class", () => {
    const doc = makeDocument([
      "export class Animal {",
      "  public speak() {",
      '    return "...";',
      "  }",
      "  private eat() {",
      '    return "nom";',
      "  }",
      "}",
    ]);
    const symbols = provider.provideDocumentSymbols(doc, token());
    expect(symbols.length).toBe(1);
    expect(symbols[0].name).toBe("Animal");
    expect(symbols[0].kind).toBe(vscode.SymbolKind.Class);
    // Children: speak + eat
    expect(symbols[0].children.length).toBeGreaterThanOrEqual(2);
    const childNames = symbols[0].children.map((c: any) => c.name);
    expect(childNames).toContain("speak");
    expect(childNames).toContain("eat");
  });

  it("parses interface as SymbolKind.Interface", () => {
    const doc = makeDocument([
      "export interface Config {",
      "  port: number;",
      "  host: string;",
      "}",
    ]);
    const symbols = provider.provideDocumentSymbols(doc, token());
    expect(symbols.length).toBe(1);
    expect(symbols[0].name).toBe("Config");
    expect(symbols[0].kind).toBe(vscode.SymbolKind.Interface);
  });

  it("parses constructor as SymbolKind.Constructor inside class", () => {
    const doc = makeDocument([
      "class Service {",
      "  constructor(private db: DB) {",
      "    this.db = db;",
      "  }",
      "}",
    ]);
    const symbols = provider.provideDocumentSymbols(doc, token());
    expect(symbols.length).toBe(1);
    const ctors = symbols[0].children.filter(
      (c: any) => c.kind === vscode.SymbolKind.Constructor,
    );
    expect(ctors.length).toBe(1);
    expect(ctors[0].name).toBe("constructor");
  });

  it("skips commented-out function definitions", () => {
    const doc = makeDocument([
      "// function oldFunction(x: number) {",
      "//   return x + 1;",
      "// }",
      "function realFunction() {",
      "  return true;",
      "}",
    ]);
    const symbols = provider.provideDocumentSymbols(doc, token());
    expect(symbols.length).toBe(1);
    expect(symbols[0].name).toBe("realFunction");
  });

  it("handles decorators attached to class symbols", () => {
    const doc = makeDocument([
      "@Injectable()",
      "class UserService {",
      "  getName() {",
      '    return "";',
      "  }",
      "}",
    ]);
    const symbols = provider.provideDocumentSymbols(doc, token());
    expect(symbols.length).toBe(1);
    expect(symbols[0].name).toBe("UserService");
    expect(symbols[0].detail).toContain("@Injectable");
  });
});

// ============================================================
// SECTION 2 — CodeLensProvider (5 tests)
// ============================================================

describe("CodeLensProvider", () => {
  const { QuillCodeLensProvider } = require("../../providers/CodeLensProvider");

  function makeClient(overrides: Partial<{ isConnected: () => boolean }> = {}) {
    return {
      isConnected: jest.fn(() => true),
      ...overrides,
    };
  }

  it("returns a lens for each function in the file", () => {
    const client = makeClient();
    const provider = new QuillCodeLensProvider(client);
    const doc = makeDocument([
      "function alpha() {",
      "  return 1;",
      "}",
      "function beta() {",
      "  return 2;",
      "}",
    ]);
    vscode.languages.getDiagnostics.mockReturnValue([]);
    const lenses = provider.provideCodeLenses(doc, token());
    expect(lenses.length).toBe(2);
  });

  it("lens title shows finding count when diagnostics exist", () => {
    const client = makeClient();
    const provider = new QuillCodeLensProvider(client);
    const doc = makeDocument([
      "function buggy() {",
      "  let x = null;",
      "}",
    ]);
    vscode.languages.getDiagnostics.mockReturnValue([
      {
        source: "CS Quill",
        message: "null assignment",
        severity: vscode.DiagnosticSeverity.Warning,
        range: new vscode.Range(1, 0, 1, 15),
      },
    ]);
    const lenses = provider.provideCodeLenses(doc, token());
    expect(lenses.length).toBe(1);
    // Title should mention the count (1건 발견)
    expect(lenses[0].command.title).toMatch(/1/);
  });

  it("invalidates cache when document version changes", () => {
    const client = makeClient();
    const provider = new QuillCodeLensProvider(client);
    vscode.languages.getDiagnostics.mockReturnValue([]);

    const docV1 = makeDocument(["function a() {", "}"], "file:///t.ts", 1);
    const lensesV1 = provider.provideCodeLenses(docV1, token());

    // Same file, new version → cache miss
    const docV2 = makeDocument(
      ["function a() {", "}", "function b() {", "}"],
      "file:///t.ts",
      2,
    );
    const lensesV2 = provider.provideCodeLenses(docV2, token());
    expect(lensesV2.length).toBeGreaterThan(lensesV1.length);
  });

  it("returns no lenses for empty file", () => {
    const client = makeClient();
    const provider = new QuillCodeLensProvider(client);
    vscode.languages.getDiagnostics.mockReturnValue([]);
    const doc = makeDocument([""]);
    const lenses = provider.provideCodeLenses(doc, token());
    expect(lenses.length).toBe(0);
  });

  it('shows "데몬 미연결" lens when disconnected', () => {
    const client = makeClient({ isConnected: jest.fn(() => false) });
    const provider = new QuillCodeLensProvider(client);
    vscode.languages.getDiagnostics.mockReturnValue([]);
    const doc = makeDocument(["function test() {", "}"]);
    const lenses = provider.provideCodeLenses(doc, token());
    expect(lenses.length).toBe(1);
    expect(lenses[0].command.title).toContain("데몬 미연결");
  });
});

// ============================================================
// SECTION 3 — HoverProvider (5 tests)
// ============================================================

describe("HoverProvider", () => {
  const { QuillHoverProvider } = require("../../providers/HoverProvider");

  function makeHoverClient(connected = true) {
    return {
      isConnected: jest.fn(() => connected),
    };
  }

  it("hover over function shows JSDoc content", () => {
    const client = makeHoverClient();
    const provider = new QuillHoverProvider(client);
    vscode.languages.getDiagnostics.mockReturnValue([]);

    const doc = makeDocument([
      "/** Adds two numbers. */",
      "function add(a: number, b: number) {",
      "  return a + b;",
      "}",
    ]);
    const pos = new vscode.Position(1, 10); // on "add"
    const hover = provider.provideHover(doc, pos, token());

    expect(hover).not.toBeNull();
    expect(hover.contents.value).toContain("Adds two numbers");
  });

  it("hover over function shows CS Quill findings", () => {
    const client = makeHoverClient();
    const provider = new QuillHoverProvider(client);

    vscode.languages.getDiagnostics.mockReturnValue([
      {
        source: "CS Quill",
        message: "Unused variable detected",
        severity: vscode.DiagnosticSeverity.Warning,
        range: new vscode.Range(2, 0, 2, 20),
      },
    ]);

    const doc = makeDocument([
      "function process() {",
      "  const unused = 1;",
      "  return;",
      "}",
    ]);
    const pos = new vscode.Position(0, 10); // on "process"
    const hover = provider.provideHover(doc, pos, token());

    expect(hover).not.toBeNull();
    expect(hover.contents.value).toContain("1");
    expect(hover.contents.value).toContain("Unused variable");
  });

  it("hover over variable shows type info (kind=variable)", () => {
    const client = makeHoverClient();
    const provider = new QuillHoverProvider(client);
    vscode.languages.getDiagnostics.mockReturnValue([]);

    const doc = makeDocument([
      'const API_URL = "https://example.com";',
    ]);
    const pos = new vscode.Position(0, 6); // on "API_URL"
    const hover = provider.provideHover(doc, pos, token());

    expect(hover).not.toBeNull();
    // Should show variable kind label
    expect(hover.contents.value).toMatch(/Variable/i);
  });

  it("no JSDoc shows symbol kind only", () => {
    const client = makeHoverClient();
    const provider = new QuillHoverProvider(client);
    vscode.languages.getDiagnostics.mockReturnValue([]);

    const doc = makeDocument([
      "function bare() {",
      "  return 0;",
      "}",
    ]);
    const pos = new vscode.Position(0, 10); // on "bare"
    const hover = provider.provideHover(doc, pos, token());

    expect(hover).not.toBeNull();
    // Has kind label but no 문서 (JSDoc) section content
    expect(hover.contents.value).toMatch(/Function/i);
    expect(hover.contents.value).not.toContain("문서:");
  });

  it("empty position returns null hover", () => {
    const client = makeHoverClient();
    const provider = new QuillHoverProvider(client);
    vscode.languages.getDiagnostics.mockReturnValue([]);

    const doc = makeDocument(["", "  ", ""]);
    const pos = new vscode.Position(0, 0);
    const hover = provider.provideHover(doc, pos, token());

    expect(hover).toBeNull();
  });
});

// ============================================================
// SECTION 4 — CodeActionProvider (4 tests)
// ============================================================

describe("CodeActionProvider", () => {
  const { QuillCodeActionProvider } = require("../../providers/CodeActionProvider");

  let provider: InstanceType<typeof QuillCodeActionProvider>;

  beforeEach(() => {
    provider = new QuillCodeActionProvider();
  });

  function makeDiag(
    source: string,
    message: string,
    line: number,
    fix?: { range: { startLine: number; endLine: number }; newText: string },
  ) {
    const d: any = {
      source,
      message,
      severity: vscode.DiagnosticSeverity.Warning,
      range: new vscode.Range(line, 0, line, 20),
      code: "Q001",
    };
    if (fix) {
      d._quillFix = fix;
    }
    return d;
  }

  it("CS Quill diagnostic generates a fix action when fix data exists", () => {
    const doc = makeDocument(["let x = null;", "let y = 1;"]);
    const diag = makeDiag("CS Quill", "null assignment", 0, {
      range: { startLine: 1, endLine: 1 },
      newText: "let x: string | undefined;",
    });

    const actions = provider.provideCodeActions(doc, diag.range, {
      diagnostics: [diag],
    });

    const fixActions = actions.filter((a: any) =>
      a.title.includes("자동 수정"),
    );
    expect(fixActions.length).toBe(1);
  });

  it("CS Quill diagnostic always generates an ignore action", () => {
    const doc = makeDocument(["let x = null;"]);
    const diag = makeDiag("CS Quill", "null assignment", 0);

    const actions = provider.provideCodeActions(doc, diag.range, {
      diagnostics: [diag],
    });

    const ignoreActions = actions.filter((a: any) =>
      a.title.includes("무시"),
    );
    expect(ignoreActions.length).toBe(1);
  });

  it("non-CS Quill diagnostic produces no actions", () => {
    const doc = makeDocument(["let x = 1;"]);
    const diag = makeDiag("ESLint", "no-unused-vars", 0);

    const actions = provider.provideCodeActions(doc, diag.range, {
      diagnostics: [diag],
    });

    expect(actions.length).toBe(0);
  });

  it("fix action applies correct text edit via WorkspaceEdit", () => {
    const doc = makeDocument(["let bad = null;", "console.log(bad);"]);
    const newText = "let bad: undefined;";
    const diag = makeDiag("CS Quill", "null assign", 0, {
      range: { startLine: 1, endLine: 1 },
      newText,
    });

    const actions = provider.provideCodeActions(doc, diag.range, {
      diagnostics: [diag],
    });

    const fixAction = actions.find((a: any) => a.title.includes("자동 수정"));
    expect(fixAction).toBeDefined();
    expect(fixAction.edit).toBeDefined();
    // WorkspaceEdit.replace should have been called with the newText
    expect(fixAction.edit.replace).toHaveBeenCalledWith(
      doc.uri,
      expect.anything(),
      newText + "\n",
    );
  });
});

// ============================================================
// SECTION 5 — QuillClient (5 tests)
// ============================================================

describe("QuillClient", () => {
  // QuillClient uses real net/http/crypto — we mock those out
  // and test the public API contract by manipulating internal state.

  let QuillClientClass: any;

  beforeEach(() => {
    jest.resetModules();
    jest.mock("vscode");
    QuillClientClass = require("../../QuillClient").QuillClient;
  });

  function makeConnectedClient(): any {
    const client = new QuillClientClass(9999);
    // Force connected state for unit testing
    (client as any).connected = true;
    // Intercept send to capture outgoing messages
    const sent: any[] = [];
    client.send = jest.fn((msg: any) => sent.push(msg));
    // Provide a way to resolve pending requests
    (client as any)._testSent = sent;
    return client;
  }

  it("getSymbols sends correct message type", async () => {
    const client = makeConnectedClient();

    // Stub request to return mock data
    client.request = jest.fn().mockResolvedValue([
      { name: "foo", kind: "function", line: 1, endLine: 3 },
    ]);

    const result = await client.getSymbols("/test.ts", "function foo(){}");
    expect(client.request).toHaveBeenCalledWith("get_symbols", {
      filePath: "/test.ts",
      content: "function foo(){}",
    });
    expect(result).toEqual([
      { name: "foo", kind: "function", line: 1, endLine: 3 },
    ]);
  });

  it("getFunctionFindings returns findings array", async () => {
    const client = makeConnectedClient();
    const mockFindings = [
      { line: 5, message: "null check", severity: "warning", source: "CS Quill" },
    ];
    client.request = jest.fn().mockResolvedValue(mockFindings);

    const findings = await client.getFunctionFindings("/test.ts", "myFunc");
    expect(client.request).toHaveBeenCalledWith("get_function_findings", {
      filePath: "/test.ts",
      functionName: "myFunc",
    });
    expect(findings).toEqual(mockFindings);
  });

  it("getCoverage returns null when disconnected", async () => {
    const client = new QuillClientClass(9999);
    // Not connected (default)
    const result = await client.getCoverage("/test.ts");
    expect(result).toBeNull();
  });

  it("rename returns null on request error", async () => {
    const client = makeConnectedClient();
    client.request = jest.fn().mockRejectedValue(new Error("network"));

    const result = await client.rename(
      "/test.ts",
      { line: 1, character: 5 },
      "newName",
    );
    expect(result).toBeNull();
  });

  it("request timeout returns default value via catch", async () => {
    const client = makeConnectedClient();
    // Simulate timeout by rejecting
    client.request = jest.fn().mockRejectedValue(new Error("Request timeout: get_symbols"));

    const result = await client.getSymbols("/test.ts", "content");
    // getSymbols catches and returns []
    expect(result).toEqual([]);
  });
});

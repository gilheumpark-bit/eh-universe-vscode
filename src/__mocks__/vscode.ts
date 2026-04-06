/**
 * Mock for the 'vscode' module used by VS Code extension host code.
 * Provides stubs for the most commonly used VS Code APIs.
 */

const Uri = {
  file: (path: string) => ({ scheme: "file", path, fsPath: path }),
  parse: (value: string) => ({ scheme: "https", path: value }),
  joinPath: (...args: unknown[]) => ({ path: args.join("/") }),
};

const Position = class {
  constructor(public line: number, public character: number) {}
};

const Range = class {
  public start: InstanceType<typeof Position>;
  public end: InstanceType<typeof Position>;
  constructor(startOrLine: any, endOrChar: any, endLine?: number, endChar?: number) {
    if (typeof startOrLine === "number") {
      this.start = new Position(startOrLine, endOrChar as number);
      this.end = new Position(endLine!, endChar!);
    } else {
      this.start = startOrLine;
      this.end = endOrChar;
    }
  }
  contains(pos: any): boolean {
    if (pos.line < this.start.line || pos.line > this.end.line) return false;
    if (pos.line === this.start.line && pos.character < this.start.character) return false;
    if (pos.line === this.end.line && pos.character > this.end.character) return false;
    return true;
  }
};

const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
};

const StatusBarAlignment = { Left: 1, Right: 2 };

const EventEmitter = class {
  event = jest.fn();
  fire = jest.fn();
  dispose = jest.fn();
};

const TreeItem = class {
  constructor(public label: string) {}
};

const ThemeIcon = class {
  constructor(public id: string) {}
};

const CodeAction = class {
  constructor(public title: string, public kind?: unknown) {}
  command: unknown;
  diagnostics: unknown[];
  edit: unknown;
};

const CodeActionKind = {
  QuickFix: { value: "quickfix" },
  Refactor: { value: "refactor" },
  Source: { value: "source" },
};

const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn((key: string, defaultVal?: unknown) => defaultVal),
    update: jest.fn(),
    has: jest.fn(() => false),
    inspect: jest.fn(),
  })),
  workspaceFolders: [],
  onDidChangeConfiguration: jest.fn(),
  onDidSaveTextDocument: jest.fn(),
  onDidOpenTextDocument: jest.fn(),
  onDidCloseTextDocument: jest.fn(),
  onDidChangeTextDocument: jest.fn(),
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    stat: jest.fn(),
    readDirectory: jest.fn(),
  },
};

const window = {
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showInputBox: jest.fn(),
  showQuickPick: jest.fn(),
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    append: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn(),
    clear: jest.fn(),
  })),
  createStatusBarItem: jest.fn(() => ({
    text: "",
    tooltip: "",
    command: "",
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  })),
  createWebviewPanel: jest.fn(),
  registerWebviewViewProvider: jest.fn(),
  activeTextEditor: undefined,
  onDidChangeActiveTextEditor: jest.fn(),
  showTextDocument: jest.fn(),
  createTextEditorDecorationType: jest.fn(() => ({ dispose: jest.fn() })),
  withProgress: jest.fn((_opts: unknown, task: (progress: unknown) => Promise<unknown>) =>
    task({ report: jest.fn() }),
  ),
};

const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
  getCommands: jest.fn(() => Promise.resolve([])),
};

const languages = {
  createDiagnosticCollection: jest.fn(() => ({
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn(),
    forEach: jest.fn(),
    get: jest.fn(),
    has: jest.fn(),
  })),
  registerCodeActionsProvider: jest.fn(),
  registerHoverProvider: jest.fn(),
  registerCompletionItemProvider: jest.fn(),
  registerDocumentSymbolProvider: jest.fn(),
  registerCodeLensProvider: jest.fn(),
  getDiagnostics: jest.fn(() => []),
};

const Disposable = class {
  constructor(private _callOnDispose: () => void) {}
  dispose() { this._callOnDispose(); }
};

const ExtensionContext = class {
  subscriptions: unknown[] = [];
  extensionPath = "/mock/extension/path";
  globalState = {
    get: jest.fn(),
    update: jest.fn(),
    keys: jest.fn(() => []),
  };
  workspaceState = {
    get: jest.fn(),
    update: jest.fn(),
    keys: jest.fn(() => []),
  };
  extensionUri = Uri.file("/mock/extension");
};

const ProgressLocation = {
  Notification: 15,
  Window: 10,
  SourceControl: 1,
};

const ViewColumn = {
  One: 1,
  Two: 2,
  Three: 3,
  Active: -1,
  Beside: -2,
};

const TextEdit = {
  replace: jest.fn(),
  insert: jest.fn(),
  delete: jest.fn(),
};

const WorkspaceEdit = class {
  replace = jest.fn();
  insert = jest.fn();
  delete = jest.fn();
};

const Diagnostic = class {
  constructor(
    public range: unknown,
    public message: string,
    public severity?: number,
  ) {}
  source?: string;
  code?: string | number;
};

const SymbolKind = {
  File: 0, Module: 1, Namespace: 2, Package: 3, Class: 4, Method: 5,
  Property: 6, Field: 7, Constructor: 8, Enum: 9, Interface: 10,
  Function: 11, Variable: 12, Constant: 13, String: 14, Number: 15,
  Boolean: 16, Array: 17, Object: 18, Key: 19, Null: 20, EnumMember: 21,
  Struct: 22, Event: 23, Operator: 24, TypeParameter: 25,
};

const DocumentSymbol = class {
  children: any[] = [];
  constructor(
    public name: string,
    public detail: string,
    public kind: number,
    public range: any,
    public selectionRange: any,
  ) {}
};

const MarkdownString = class {
  value = "";
  isTrusted = false;
  supportHtml = false;
  appendMarkdown(val: string) {
    this.value += val;
    return this;
  }
  appendCodeblock(code: string, lang?: string) {
    this.value += `\`\`\`${lang ?? ""}\n${code}\n\`\`\`\n`;
    return this;
  }
  appendText(val: string) {
    this.value += val;
    return this;
  }
};

const Hover = class {
  constructor(public contents: any, public range?: any) {}
};

const CodeLens = class {
  constructor(public range: any, public command?: any) {}
  isResolved = true;
};

const ThemeColor = class {
  constructor(public id: string) {}
};

const Selection = class extends Range {
  constructor(anchorLine: any, anchorChar: any, activeLine?: number, activeChar?: number) {
    super(anchorLine, anchorChar, activeLine, activeChar);
  }
};

const CancellationTokenSource = class {
  token = { isCancellationRequested: false, onCancellationRequested: jest.fn() };
  cancel = jest.fn();
  dispose = jest.fn();
};

module.exports = {
  Uri,
  Position,
  Range,
  Selection,
  DiagnosticSeverity,
  StatusBarAlignment,
  EventEmitter,
  TreeItem,
  ThemeIcon,
  ThemeColor,
  CodeAction,
  CodeActionKind,
  CodeLens,
  SymbolKind,
  DocumentSymbol,
  MarkdownString,
  Hover,
  CancellationTokenSource,
  workspace,
  window,
  commands,
  languages,
  ExtensionContext,
  ProgressLocation,
  ViewColumn,
  TextEdit,
  WorkspaceEdit,
  Diagnostic,
  Disposable,
  version: "1.85.0",
};

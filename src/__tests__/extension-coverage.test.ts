// ============================================================
// Extension Core — Coverage Tests
// ============================================================
// Boosts test coverage for: extension.ts, daemon.ts, commands.ts,
// ari-engine.ts, scope-policy.ts, SidebarProvider.ts
//
// Uses the existing __mocks__/vscode.ts module mock.

// ============================================================
// PART 1 — extension.ts
// ============================================================

describe("extension.ts", () => {
  let vscode: any;

  beforeEach(() => {
    jest.resetModules();
    vscode = require("vscode");

    // Set up return values for functions that must return disposables
    vscode.workspace.onDidChangeConfiguration.mockReturnValue({ dispose: jest.fn() });
    vscode.workspace.onDidChangeTextDocument.mockReturnValue({ dispose: jest.fn() });
    vscode.workspace.onDidCloseTextDocument.mockReturnValue({ dispose: jest.fn() });
    vscode.window.registerWebviewViewProvider.mockReturnValue({ dispose: jest.fn() });
    vscode.languages.registerCodeActionsProvider.mockReturnValue({ dispose: jest.fn() });
    vscode.languages.registerDocumentSymbolProvider.mockReturnValue({ dispose: jest.fn() });
    vscode.languages.registerCodeLensProvider.mockReturnValue({ dispose: jest.fn() });
    vscode.languages.registerHoverProvider.mockReturnValue({ dispose: jest.fn() });
    vscode.commands.registerCommand.mockReturnValue({ dispose: jest.fn() });
  });

  afterEach(() => {
    // Clean up any pending timers from activate's startup connection
    jest.useRealTimers();
  });

  test("activate pushes subscriptions to context", () => {
    const { activate } = require("../extension");
    const context = new vscode.ExtensionContext();

    activate(context);

    // Should have pushed multiple disposables (providers, commands, listeners)
    expect(context.subscriptions.length).toBeGreaterThan(5);
  });

  test("activate creates QuillClient (status bar item registered)", () => {
    const { activate } = require("../extension");
    const context = new vscode.ExtensionContext();

    activate(context);

    // QuillClient constructor calls createStatusBarItem
    expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
  });

  test("activate registers sidebar webview provider", () => {
    const { activate } = require("../extension");
    const context = new vscode.ExtensionContext();

    activate(context);

    expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledWith(
      "eh-universe-sidebar",
      expect.any(Object),
    );
  });

  test("deactivate cleans up client and output channel", () => {
    const { activate, deactivate } = require("../extension");
    const context = new vscode.ExtensionContext();

    activate(context);

    // deactivate should not throw
    expect(() => deactivate()).not.toThrow();
  });
});

// ============================================================
// PART 2 — daemon.ts
// ============================================================

describe("daemon.ts", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("isDaemonHealthy returns a boolean promise", async () => {
    const { isDaemonHealthy } = require("../daemon");

    // Port 1 will fail to connect — should resolve false
    const result = await isDaemonHealthy(1, 200);

    expect(typeof result).toBe("boolean");
    expect(result).toBe(false);
  });

  test("clearSpawnedDaemon does not throw when no process", () => {
    const { clearSpawnedDaemon } = require("../daemon");

    expect(() => clearSpawnedDaemon()).not.toThrow();
  });

  test("startDaemonIfNeeded is an async function", () => {
    const { startDaemonIfNeeded } = require("../daemon");

    expect(typeof startDaemonIfNeeded).toBe("function");
  });
});

// ============================================================
// PART 3 — commands.ts
// ============================================================

describe("commands.ts", () => {
  let vscode: any;

  beforeEach(() => {
    jest.resetModules();
    vscode = require("vscode");
    vscode.commands.registerCommand.mockReturnValue({ dispose: jest.fn() });
  });

  test("registerCommands pushes disposables to context.subscriptions", () => {
    const { registerCommands } = require("../commands");
    const context = new vscode.ExtensionContext();

    const deps = {
      client: {
        isConnected: jest.fn(() => false),
        getSessionId: jest.fn(() => null),
        analyzeFile: jest.fn(),
        getHealthReport: jest.fn(() => []),
        disconnect: jest.fn(),
      },
      diagnosticProvider: { updateDiagnostics: jest.fn() },
      sidebarProvider: { updateHealthScore: jest.fn() },
      port: 8443,
      ensureClientConnection: jest.fn(),
    };

    registerCommands(context, deps);

    // Should register multiple commands (analyzeFile, fixAll, showStatus, reconnect, syncUI, openSettings)
    expect(context.subscriptions.length).toBeGreaterThanOrEqual(6);
  });

  test("registerCommands calls vscode.commands.registerCommand for each command", () => {
    const { registerCommands } = require("../commands");
    const context = new vscode.ExtensionContext();

    const deps = {
      client: {
        isConnected: jest.fn(() => false),
        getSessionId: jest.fn(() => null),
        analyzeFile: jest.fn(),
        getHealthReport: jest.fn(() => []),
        disconnect: jest.fn(),
      },
      diagnosticProvider: { updateDiagnostics: jest.fn() },
      sidebarProvider: { updateHealthScore: jest.fn() },
      port: 8443,
      ensureClientConnection: jest.fn(),
    };

    registerCommands(context, deps);

    const registeredIds = vscode.commands.registerCommand.mock.calls.map(
      (call: any[]) => call[0],
    );

    expect(registeredIds).toContain("cs-quill.analyzeFile");
    expect(registeredIds).toContain("cs-quill.fixAll");
    expect(registeredIds).toContain("cs-quill.showStatus");
    expect(registeredIds).toContain("cs-quill.reconnect");
    expect(registeredIds).toContain("cs-quill.syncUI");
    expect(registeredIds).toContain("eh-universe.openSettings");
  });
});

// ============================================================
// PART 4 — ari-engine.ts
// ============================================================

describe("ARIEngine", () => {
  test("recordSuccess boosts score", () => {
    const { ARIEngine } = require("../ari-engine");
    const engine = new ARIEngine();
    engine.recordSuccess("provA");

    // Initial 100 + 5 boost, capped at 100
    expect(engine.getScore("provA")).toBe(100);

    // Reduce score first, then boost
    engine.recordFailure("provA", "err");
    const afterFailure = engine.getScore("provA");
    engine.recordSuccess("provA");
    expect(engine.getScore("provA")).toBe(afterFailure + 5);
  });

  test("recordFailure reduces score", () => {
    const { ARIEngine } = require("../ari-engine");
    const engine = new ARIEngine();
    engine.recordFailure("provB", "timeout");

    // 100 - 15 = 85
    expect(engine.getScore("provB")).toBe(85);
  });

  test("circuit opens after streak threshold", () => {
    const { ARIEngine } = require("../ari-engine");
    const engine = new ARIEngine();

    for (let i = 0; i < 5; i++) {
      engine.recordFailure("provC", "err");
    }

    expect(engine.getCircuitState("provC")).toBe("open");
  });

  test("circuit transitions to half-open after cooldown", () => {
    const { ARIEngine } = require("../ari-engine");
    const engine = new ARIEngine();

    // Open the circuit
    for (let i = 0; i < 5; i++) {
      engine.recordFailure("provD", "err");
    }
    expect(engine.getCircuitState("provD")).toBe("open");

    // Simulate cooldown by backdating lastErrorAt
    const states = (engine as any).states;
    const state = states.get("provD");
    state.lastErrorAt = Date.now() - 31_000; // 31 seconds ago (> 30s cooldown)

    // isHealthy triggers transition to half-open
    expect(engine.isHealthy("provD")).toBe(true);
    expect(engine.getCircuitState("provD")).toBe("half-open");
  });

  test("getBestProvider returns highest-scoring healthy provider", () => {
    const { ARIEngine } = require("../ari-engine");
    const engine = new ARIEngine();

    engine.recordSuccess("fast");
    engine.recordSuccess("fast");
    engine.recordFailure("slow", "err");

    const best = engine.getBestProvider();
    expect(best).toBe("fast");
  });
});

// ============================================================
// PART 5 — scope-policy.ts
// ============================================================

describe("ScopePolicy", () => {
  let vscode: any;

  beforeEach(() => {
    jest.resetModules();
    vscode = require("vscode");
  });

  test("loadFromConfig reads workspace settings", () => {
    vscode.workspace.getConfiguration.mockReturnValue({
      get: jest.fn((key: string) => {
        if (key === "scopePolicy") {
          return { RULE_A: "suppress", RULE_B: "warn" };
        }
        return undefined;
      }),
    });

    const { ScopePolicy } = require("../scope-policy");
    const policy = new ScopePolicy();
    policy.loadFromConfig();

    expect(policy.ruleCount).toBe(2);
  });

  test("resolve returns correct action for known rule", () => {
    vscode.workspace.getConfiguration.mockReturnValue({
      get: jest.fn((key: string) => {
        if (key === "scopePolicy") {
          return { MY_RULE: "suppress" };
        }
        return undefined;
      }),
    });

    const { ScopePolicy } = require("../scope-policy");
    const policy = new ScopePolicy();
    policy.loadFromConfig();

    expect(policy.resolve("MY_RULE", "/some/file.ts")).toBe("suppress");
  });

  test("resolve returns enforce for unknown rule", () => {
    const { ScopePolicy } = require("../scope-policy");
    const policy = new ScopePolicy();

    expect(policy.resolve("UNKNOWN_RULE", "/file.ts")).toBe("enforce");
  });

  test("applyToFindings filters suppressed findings", () => {
    vscode.workspace.getConfiguration.mockReturnValue({
      get: jest.fn((key: string) => {
        if (key === "scopePolicy") {
          return { NOISY_RULE: "suppress", WARN_RULE: "warn" };
        }
        return undefined;
      }),
    });

    const { ScopePolicy } = require("../scope-policy");
    const policy = new ScopePolicy();
    policy.loadFromConfig();

    const findings = [
      { message: "noise", severity: "error", source: "NOISY_RULE", line: 1 },
      { message: "important", severity: "error", source: "WARN_RULE", line: 2 },
      { message: "keep", severity: "error", source: "OTHER", line: 3 },
    ];

    const filtered = policy.applyToFindings(findings, "/file.ts");

    // NOISY_RULE should be removed (suppressed)
    expect(filtered.length).toBe(2);
    expect(filtered.find((f: any) => f.source === "NOISY_RULE")).toBeUndefined();

    // WARN_RULE should have severity downgraded to warning
    const warnItem = filtered.find((f: any) => f.source === "WARN_RULE");
    expect(warnItem.severity).toBe("warning");
  });
});

// ============================================================
// PART 6 — SidebarProvider.ts
// ============================================================

describe("SidebarProvider", () => {
  let vscode: any;

  beforeEach(() => {
    jest.resetModules();
    vscode = require("vscode");
  });

  test("resolveWebviewView sets HTML on the webview", () => {
    const { SidebarProvider } = require("../SidebarProvider");
    const extensionUri = vscode.Uri.file("/mock/ext");
    const provider = new SidebarProvider(extensionUri, jest.fn());

    const mockPostMessage = jest.fn();
    const mockOnDidReceiveMessage = jest.fn();
    const mockView: any = {
      webview: {
        options: {},
        html: "",
        cspSource: "mock-csp",
        postMessage: mockPostMessage,
        onDidReceiveMessage: mockOnDidReceiveMessage,
      },
      onDidChangeVisibility: jest.fn(),
    };

    provider.resolveWebviewView(mockView);

    // HTML should be set (non-empty string containing DOCTYPE)
    expect(mockView.webview.html).toContain("<!DOCTYPE html>");
    expect(mockView.webview.html).toContain("Health Score");
  });

  test("updateHealthScore posts message to webview", () => {
    const { SidebarProvider } = require("../SidebarProvider");
    const extensionUri = vscode.Uri.file("/mock/ext");
    const provider = new SidebarProvider(extensionUri, jest.fn());

    const mockPostMessage = jest.fn();
    const mockView: any = {
      webview: {
        options: {},
        html: "",
        cspSource: "mock-csp",
        postMessage: mockPostMessage,
        onDidReceiveMessage: jest.fn(),
      },
      onDidChangeVisibility: jest.fn(),
    };

    provider.resolveWebviewView(mockView);

    provider.updateHealthScore(85, 3, true, []);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "health-update",
        payload: expect.objectContaining({
          score: 85,
          errorCount: 3,
          connected: true,
        }),
      }),
    );
  });

  test("updateHealthScore does not throw when no view is resolved", () => {
    const { SidebarProvider } = require("../SidebarProvider");
    const extensionUri = vscode.Uri.file("/mock/ext");
    const provider = new SidebarProvider(extensionUri, jest.fn());

    // No resolveWebviewView called — _view is undefined
    expect(() => provider.updateHealthScore(50, 1, false)).not.toThrow();
  });
});

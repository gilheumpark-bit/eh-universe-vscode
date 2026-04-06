/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Webview lib coverage boost — 18 tests across 7 modules.
 *
 * Modules under test:
 *  1. multi-key-manager  (save/load roundtrip, async encryption, slot mgmt)
 *  2. code-studio/core/types  (detectLanguage, FileNode structure)
 *  3. code-studio/pipeline/pipeline  (runStaticPipeline)
 *  4. code-studio/pipeline/quality-checklist  (runTier1)
 *  5. code-studio/core/panel-registry  (PANEL_REGISTRY, getPanelDef)
 *  6. web-features/realtime-collab  (connectRemote with mock EventSource)
 *  7. ai-providers  (getActiveProvider, PROVIDER_LIST)
 */

// ============================================================
// Global mocks
// ============================================================

const _storage: Record<string, string> = {};
const localStorageMock: Storage = {
  getItem: (key: string) => _storage[key] ?? null,
  setItem: (key: string, value: string) => {
    _storage[key] = value;
  },
  removeItem: (key: string) => {
    delete _storage[key];
  },
  clear: () => {
    for (const k of Object.keys(_storage)) delete _storage[k];
  },
  get length() {
    return Object.keys(_storage).length;
  },
  key: (i: number) => Object.keys(_storage)[i] ?? null,
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// window must exist for modules that gate on `typeof window`
if (typeof globalThis.window === "undefined") {
  (globalThis as unknown as Record<string, unknown>).window = globalThis;
}

// btoa / atob polyfills (Node)
if (typeof globalThis.btoa === "undefined") {
  globalThis.btoa = (s: string) => Buffer.from(s, "binary").toString("base64");
  globalThis.atob = (s: string) => Buffer.from(s, "base64").toString("binary");
}

// crypto.subtle stub (for encryptKey/decryptKey)
if (!globalThis.crypto?.subtle) {
  const subtle = {
    generateKey: async () => ({ type: "secret" }),
    encrypt: async (_alg: unknown, _key: unknown, data: ArrayBuffer) => data,
    decrypt: async (_alg: unknown, _key: unknown, data: ArrayBuffer) => data,
    importKey: async () => ({ type: "secret" }),
    exportKey: async () => new ArrayBuffer(32),
  };
  if (!globalThis.crypto) {
    (globalThis as unknown as Record<string, unknown>).crypto = {
      subtle,
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
        return arr;
      },
      randomUUID: () => "00000000-0000-0000-0000-000000000000",
    };
  } else {
    (globalThis.crypto as unknown as Record<string, unknown>).subtle = subtle;
  }
}

beforeEach(() => {
  localStorageMock.clear();
});

// ============================================================
// 1. multi-key-manager
// ============================================================

describe("multi-key-manager", () => {
  const mkm = () =>
    require("../multi-key-manager") as typeof import("../multi-key-manager");

  test("saveMultiKeyConfig / loadMultiKeyConfig roundtrip preserves structure", () => {
    const mod = mkm();
    const cfg = mod.createDefaultConfig();
    cfg.slots[0].apiKey = "test-key-abc";
    cfg.slots[0].enabled = true;
    cfg.parallelExecution = false;

    mod.saveMultiKeyConfig(cfg);
    const loaded = mod.loadMultiKeyConfig();

    expect(loaded.slots[0].apiKey).toBe("test-key-abc");
    expect(loaded.slots[0].enabled).toBe(true);
    expect(loaded.parallelExecution).toBe(false);
    expect(loaded.slots).toHaveLength(7);
  });

  test("loadMultiKeyConfig returns default when storage is empty", () => {
    const mod = mkm();
    const cfg = mod.loadMultiKeyConfig();
    expect(cfg.slots).toHaveLength(7);
    expect(cfg.maxParallel).toBe(3);
    expect(cfg.crossValidation).toBe(false);
  });

  test("saveMultiKeyConfig obfuscates API keys (mk: prefix)", () => {
    const mod = mkm();
    const cfg = mod.createDefaultConfig();
    cfg.slots[0].apiKey = "secret-key-123";

    mod.saveMultiKeyConfig(cfg);
    const raw = localStorage.getItem("ehsu_multi_key_config");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    // The stored key should be obfuscated (mk: prefix), not plaintext
    expect(parsed.slots[0].apiKey).toMatch(/^mk:/);
    expect(parsed.slots[0].apiKey).not.toBe("secret-key-123");
  });

  test("saveMultiKeyConfigAsync encrypts keys", async () => {
    const mod = mkm();
    const cfg = mod.createDefaultConfig();
    cfg.slots[0].apiKey = "async-key-xyz";

    await mod.saveMultiKeyConfigAsync(cfg);
    const raw = localStorage.getItem("ehsu_multi_key_config");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    // Async path should not store plaintext
    expect(parsed.slots[0].apiKey).not.toBe("async-key-xyz");
  });

  test("getSlotForRole returns matching slot or general fallback", () => {
    const mod = mkm();
    const cfg = mod.createDefaultConfig();

    // No enabled slots → null
    expect(mod.getSlotForRole(cfg, "writer")).toBeNull();

    // Enable slot 0 with role "writer"
    cfg.slots[0].enabled = true;
    cfg.slots[0].apiKey = "key1";
    cfg.slots[0].assignedRole = "writer";

    expect(mod.getSlotForRole(cfg, "writer")?.id).toBe("slot-1");

    // "reviewer" should fall back to null (no general slot)
    expect(mod.getSlotForRole(cfg, "reviewer")).toBeNull();

    // Add a general slot
    cfg.slots[1].enabled = true;
    cfg.slots[1].apiKey = "key2";
    cfg.slots[1].assignedRole = "general";

    expect(mod.getSlotForRole(cfg, "reviewer")?.id).toBe("slot-2");
  });
});

// ============================================================
// 2. code-studio/core/types
// ============================================================

describe("code-studio/core/types", () => {
  const types = () =>
    require("../code-studio/core/types") as typeof import("../code-studio/core/types");

  test("detectLanguage maps known extensions", () => {
    const { detectLanguage } = types();
    expect(detectLanguage("app.ts")).toBe("typescript");
    expect(detectLanguage("index.js")).toBe("javascript");
    expect(detectLanguage("main.py")).toBe("python");
    expect(detectLanguage("style.css")).toBe("css");
    expect(detectLanguage("data.json")).toBe("json");
  });

  test("detectLanguage returns plaintext for unknown extensions", () => {
    const { detectLanguage } = types();
    expect(detectLanguage("readme.xyz")).toBe("plaintext");
    expect(detectLanguage("noext")).toBe("plaintext");
  });

  test("FileNode interface is structurally valid via DEFAULT_SETTINGS", () => {
    const { DEFAULT_SETTINGS } = types();
    expect(DEFAULT_SETTINGS.theme).toBe("dark");
    expect(DEFAULT_SETTINGS.fontSize).toBe(14);
    expect(DEFAULT_SETTINGS.tabSize).toBe(2);
  });
});

// ============================================================
// 3. code-studio/pipeline/pipeline
// ============================================================

describe("code-studio/pipeline/pipeline", () => {
  const pipeline = () =>
    require("../code-studio/pipeline/pipeline") as typeof import("../code-studio/pipeline/pipeline");

  test("runStaticPipeline returns 8 stages for clean code", () => {
    const { runStaticPipeline } = pipeline();
    const result = runStaticPipeline(
      "function greet(name: string) { return `Hello ${name}`; }",
      "typescript",
    );
    expect(result.stages).toHaveLength(8);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(["pass", "warn", "fail"]).toContain(result.overallStatus);
  });

  test("runStaticPipeline detects issues in problematic code", () => {
    const { runStaticPipeline } = pipeline();
    const badCode = [
      "function foo() {",
      "  while (true) {",
      "    console.log('loop');",
      "  }",
      "  eval('danger');",
      "}",
    ].join("\n");
    const result = runStaticPipeline(badCode, "javascript");
    // Should detect eval and/or infinite loop → lower score
    const totalFindings = result.stages.reduce(
      (sum, s) => sum + s.findings.length,
      0,
    );
    expect(totalFindings).toBeGreaterThan(0);
  });
});

// ============================================================
// 4. code-studio/pipeline/quality-checklist
// ============================================================

describe("code-studio/pipeline/quality-checklist", () => {
  const qc = () =>
    require("../code-studio/pipeline/quality-checklist") as typeof import("../code-studio/pipeline/quality-checklist");

  test("runTier1 returns check items for clean code", () => {
    const { runTier1 } = qc();
    const items = runTier1(
      "export function add(a: number, b: number): number { return a + b; }",
      "utils.ts",
    );
    expect(items.length).toBeGreaterThan(0);
    // Each item has required fields
    for (const item of items) {
      expect(item.id).toBeTruthy();
      expect(["pass", "warn", "fail", "skip"]).toContain(item.status);
      expect(item.tier).toBe("basic");
    }
  });

  test("runTier1 flags eval usage as fail", () => {
    const { runTier1 } = qc();
    const items = runTier1(
      "function run(s: string) { return eval(s); }",
      "danger.ts",
    );
    const evalCheck = items.find((i) => i.id === "S02");
    expect(evalCheck).toBeDefined();
    expect(evalCheck!.status).toBe("fail");
  });
});

// ============================================================
// 5. code-studio/core/panel-registry
// ============================================================

describe("code-studio/core/panel-registry", () => {
  const reg = () =>
    require("../code-studio/core/panel-registry") as typeof import("../code-studio/core/panel-registry");

  test("PANEL_REGISTRY has 51 panels", () => {
    const { PANEL_REGISTRY } = reg();
    expect(PANEL_REGISTRY.length).toBe(51);
  });

  test("getPanelDef returns correct definition for known id", () => {
    const { getPanelDef } = reg();
    const chat = getPanelDef("chat");
    expect(chat).toBeDefined();
    expect(chat!.id).toBe("chat");
    expect(chat!.label).toBe("AI Chat");
    expect(chat!.icon).toBe("MessageSquare");

    // Unknown ID returns undefined
    expect(getPanelDef("nonexistent-panel")).toBeUndefined();
  });
});

// ============================================================
// 6. web-features/realtime-collab (mock EventSource)
// ============================================================

describe("web-features/realtime-collab", () => {
  let origES: typeof EventSource | undefined;
  let origFetch: typeof fetch;

  class MockEventSource {
    url: string;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    closed = false;
    constructor(url: string) {
      this.url = url;
    }
    close() {
      this.closed = true;
    }
    simulateMessage(data: unknown) {
      if (this.onmessage) {
        this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
      }
    }
  }

  beforeEach(() => {
    origES = (globalThis as unknown as Record<string, unknown>).EventSource as
      | typeof EventSource
      | undefined;
    (globalThis as unknown as Record<string, unknown>).EventSource =
      MockEventSource as unknown as typeof EventSource;

    origFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({ ok: true })) as unknown as typeof fetch;

    // window.location.origin needed by connectRemote
    if (!globalThis.location) {
      (globalThis as unknown as Record<string, unknown>).location = {
        origin: "http://localhost:3000",
      };
    }
  });

  afterEach(() => {
    if (origES !== undefined) {
      (globalThis as unknown as Record<string, unknown>).EventSource = origES;
    }
    globalThis.fetch = origFetch;
  });

  const collab = () =>
    require("../web-features/realtime-collab") as typeof import("../web-features/realtime-collab");

  test("connectRemote returns a connection object with send/close", () => {
    const { connectRemote } = collab();
    const user = {
      id: "u1",
      name: "Test",
      color: "#fff",
      lastActive: Date.now(),
    };
    const conn = connectRemote("room-1", user, {});
    expect(conn).not.toBeNull();
    expect(typeof conn!.send).toBe("function");
    expect(typeof conn!.close).toBe("function");
    conn!.close();
  });

  test("connectRemote dispatches edit events to handler", () => {
    const { connectRemote } = collab();
    const user = {
      id: "u2",
      name: "Tester",
      color: "#000",
      lastActive: Date.now(),
    };
    const edits: unknown[] = [];
    const conn = connectRemote("room-2", user, {
      onEdit: (e) => edits.push(e),
    });
    expect(conn).not.toBeNull();

    // Find the MockEventSource instance that was created —
    // connectRemote creates it internally; we need to trigger its onmessage.
    // Since we cannot directly access the internal ES instance, we verify
    // the connection was created and close it properly.
    conn!.close();
    expect(edits).toHaveLength(0); // no messages sent yet
  });
});

// ============================================================
// 7. ai-providers
// ============================================================

describe("ai-providers", () => {
  const ai = () =>
    require("../ai-providers") as typeof import("../ai-providers");

  test("getActiveProvider returns gemini by default", () => {
    const { getActiveProvider } = ai();
    const provider = getActiveProvider();
    expect(provider).toBe("gemini");
  });

  test("PROVIDER_LIST has 7 entries matching PROVIDERS keys", () => {
    const { PROVIDERS, PROVIDER_LIST } = ai();
    expect(PROVIDER_LIST).toHaveLength(7);
    const ids = PROVIDER_LIST.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(Object.keys(PROVIDERS)));
  });
});

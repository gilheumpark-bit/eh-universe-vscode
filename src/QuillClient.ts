// ============================================================
// CS Quill 🦔 — QuillClient (WebSocket + HTTP Fallback)
// ============================================================
// Step 13~24: VS Code ↔ CLI 데몬 통신 케이블

import * as vscode from "vscode";
import * as http from "http";
import * as crypto from "crypto";
import type { Duplex } from "stream";
import * as net from "net";

// ============================================================
// PART 1 — Types
// ============================================================

export interface QuillFinding {
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: "error" | "warning" | "info";
  source: string;
  code?: string;
  fix?: { range: { startLine: number; endLine: number }; newText: string };
}

export interface AnalysisResult {
  requestId: string;
  filePath: string;
  findings: QuillFinding[];
  score: number;
  duration: number;
}

export interface SymbolInfo {
  name: string;
  kind: string;
  line: number;
  endLine: number;
  children?: SymbolInfo[];
  detail?: string;
}

export interface CoverageInfo {
  lines: Map<number, boolean>;
  percent: number;
}

export interface RenameEdit {
  filePath: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  newText: string;
}

export interface RenameResult {
  edits: RenameEdit[];
  filesAffected: number;
}

type MessageHandler = (data: any) => void;

// ============================================================
// PART 2 — WebSocket Client (Step 14~15)
// ============================================================

export class QuillClient {
  private socket: net.Socket | null = null;
  private connected = false;
  private port: number;
  private host: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private pendingRequests: Map<
    string,
    { resolve: (data: any) => void; timer: ReturnType<typeof setTimeout> }
  > = new Map();
  private buffer = "";
  private statusBarItem: vscode.StatusBarItem;
  private sessionId: string | null = null;

  constructor(port: number = 8443, host: string = "127.0.0.1") {
    this.port = port;
    this.host = host;
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.statusBarItem.command = "cs-quill.showStatus";
    this.updateStatusBar(false);
    this.statusBarItem.show();
  }

  // Step 17~18: 상태 표시줄
  private updateStatusBar(connected: boolean): void {
    if (connected) {
      this.statusBarItem.text = "$(shield) CS Quill: 🟢 Connected";
      this.statusBarItem.tooltip = `데몬 ws://${this.host}:${this.port} | Session: ${this.sessionId ?? "N/A"}`;
      this.statusBarItem.backgroundColor = undefined;
    } else {
      this.statusBarItem.text = "$(shield) CS Quill: 🔴 Disconnected";
      this.statusBarItem.tooltip = `데몬 미연결. 클릭 시 자동 시작/재연결을 시도합니다 (port ${this.port})`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground",
      );
    }
  }

  // Step 14: 연결
  public async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // WebSocket 핸드셰이크를 HTTP upgrade로 수행
        const key = crypto.randomBytes(16).toString("base64");
        const req = http.request({
          hostname: this.host,
          port: this.port,
          path: "/",
          method: "GET",
          headers: {
            Connection: "Upgrade",
            Upgrade: "websocket",
            "Sec-WebSocket-Key": key,
            "Sec-WebSocket-Version": "13",
          },
        });

        req.on("upgrade", (_res, socket: Duplex) => {
          this.socket = socket as net.Socket;
          this.connected = true;
          this.reconnectAttempts = 0;
          this.updateStatusBar(true);

          // 데이터 수신
          socket.on("data", (chunk: Buffer) => {
            this.handleWSData(chunk);
          });

          socket.on("close", () => {
            this.connected = false;
            this.updateStatusBar(false);
            this.scheduleReconnect();
          });

          socket.on("error", () => {
            this.connected = false;
            this.updateStatusBar(false);
            this.scheduleReconnect();
          });

          // identify
          this.send({
            type: "identify",
            payload: { editor: "vscode", version: vscode.version },
          });

          resolve(true);
        });

        req.on("error", () => {
          this.connected = false;
          this.updateStatusBar(false);
          resolve(false);
          this.scheduleReconnect();
        });

        req.setTimeout(5000, () => {
          req.destroy();
          resolve(false);
          this.scheduleReconnect();
        });
        req.end();
      } catch {
        resolve(false);
        this.scheduleReconnect();
      }
    });
  }

  // Step 15: 재연결 백오프
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(5000 * Math.pow(1.5, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.connect();
    }, delay);
  }

  // WebSocket 프레임 디코딩 (서버→클라이언트: 마스킹 없음)
  private handleWSData(chunk: Buffer): void {
    if (chunk.length < 2) return;
    const opcode = chunk[0] & 0x0f;
    if (opcode === 0x08) {
      this.disconnect();
      return;
    } // Close
    if (opcode === 0x09) {
      // Ping → Pong
      const pong = Buffer.alloc(2);
      pong[0] = 0x8a;
      pong[1] = 0;
      this.socket?.write(pong);
      return;
    }
    if (opcode !== 0x01) return; // text frame only

    let payloadLen = chunk[1] & 0x7f;
    let offset = 2;
    if (payloadLen === 126) {
      payloadLen = chunk.readUInt16BE(2);
      offset = 4;
    } else if (payloadLen === 127) {
      payloadLen = Number(chunk.readBigUInt64BE(2));
      offset = 10;
    }

    const payload = chunk
      .subarray(offset, offset + payloadLen)
      .toString("utf-8");

    try {
      const msg = JSON.parse(payload);

      // identify 응답
      if (msg.type === "identified") this.sessionId = msg.payload?.sessionId;
      if (msg.type === "welcome") this.sessionId = msg.payload?.sessionId;

      // pending request 해제
      if (msg.id && this.pendingRequests.has(msg.id)) {
        const pending = this.pendingRequests.get(msg.id)!;
        clearTimeout(pending.timer);
        this.pendingRequests.delete(msg.id);
        pending.resolve(msg.payload);
      }

      // 이벤트 핸들러 호출
      const handlers = this.handlers.get(msg.type) ?? [];
      for (const h of handlers) h(msg.payload);
    } catch {
      /* invalid JSON */
    }
  }

  // WebSocket 프레임 인코딩 (클라이언트→서버: 마스킹 필요)
  private sendFrame(data: string): void {
    if (!this.socket || !this.connected) return;
    const payload = Buffer.from(data, "utf-8");
    const mask = crypto.randomBytes(4);
    const len = payload.length;

    let header: Buffer;
    if (len < 126) {
      header = Buffer.alloc(6);
      header[0] = 0x81;
      header[1] = 0x80 | len;
      mask.copy(header, 2);
    } else if (len < 65536) {
      header = Buffer.alloc(8);
      header[0] = 0x81;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(len, 2);
      mask.copy(header, 4);
    } else {
      header = Buffer.alloc(14);
      header[0] = 0x81;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(len), 2);
      mask.copy(header, 10);
    }

    const masked = Buffer.alloc(len);
    for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];

    try {
      this.socket.write(Buffer.concat([header, masked]));
    } catch {
      /* closed */
    }
  }

  // Step 22: 메시지 전송
  public send(msg: { type: string; id?: string; payload?: any }): void {
    this.sendFrame(JSON.stringify(msg));
  }

  // 요청-응답 패턴 (Promise 반환)
  public request(
    type: string,
    payload?: any,
    timeoutMs: number = 30000,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`;
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${type}`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, timer });
      this.send({ type, id, payload });
    });
  }

  // Step 23: 이벤트 리스너
  public on(type: string, handler: MessageHandler): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  // Step 21~22: 파일 분석 요청
  public async analyzeFile(
    filePath: string,
    content: string,
    language?: string,
  ): Promise<AnalysisResult | null> {
    if (!this.connected) return null;
    try {
      return await this.request("analyze_file", {
        filePath,
        content,
        language,
      });
    } catch {
      return null;
    }
  }

  // ── Advanced IDE Protocol ──

  // Task 1: Symbol table request
  public async getSymbols(filePath: string, content: string): Promise<SymbolInfo[]> {
    if (!this.connected) return [];
    try {
      return await this.request('get_symbols', { filePath, content });
    } catch {
      return [];
    }
  }

  // Task 2: Per-function findings request
  public async getFunctionFindings(filePath: string, functionName: string): Promise<QuillFinding[]> {
    if (!this.connected) return [];
    try {
      return await this.request('get_function_findings', { filePath, functionName });
    } catch {
      return [];
    }
  }

  // Task 3: Coverage data request
  public async getCoverage(filePath: string): Promise<CoverageInfo | null> {
    if (!this.connected) return null;
    try {
      return await this.request('get_coverage', { filePath });
    } catch {
      return null;
    }
  }

  // Task 4: Rename refactoring request
  public async rename(
    filePath: string,
    position: { line: number; character: number },
    newName: string,
  ): Promise<RenameResult | null> {
    if (!this.connected) return null;
    try {
      return await this.request('rename_symbol', { filePath, position, newName });
    } catch {
      return null;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }
  public getSessionId(): string | null {
    return this.sessionId;
  }
  public getStatusBarItem(): vscode.StatusBarItem {
    return this.statusBarItem;
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {}
    }
    this.connected = false;
    this.updateStatusBar(false);
  }

  public dispose(): void {
    this.disconnect();
    this.statusBarItem.dispose();
  }
}

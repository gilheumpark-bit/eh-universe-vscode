// ============================================================
// CS Quill — Daemon Management Module
// ============================================================
// Daemon lifecycle: health check, auto-start, cleanup.

import * as vscode from "vscode";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { spawn, type ChildProcess } from "child_process";

// ============================================================
// PART 1 — Daemon State
// ============================================================

let daemonProcess: ChildProcess | null = null;

export function getDaemonProcess(): ChildProcess | null {
  return daemonProcess;
}

// ============================================================
// PART 2 — Health Check
// ============================================================

export function isDaemonHealthy(port: number, timeoutMs: number = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: "127.0.0.1",
        port,
        path: "/health",
        timeout: timeoutMs,
      },
      (res) => {
        res.resume();
        resolve((res.statusCode ?? 500) < 400);
      },
    );

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

// ============================================================
// PART 3 — Node Command Discovery
// ============================================================

function getNodeCommandCandidates(): string[] {
  const candidates = new Set<string>();
  const execName = path.basename(process.execPath).toLowerCase();

  if (execName === "node" || execName === "node.exe") {
    candidates.add(process.execPath);
  }

  candidates.add("node");

  if (process.platform === "win32") {
    candidates.add("node.exe");
  }

  return [...candidates];
}

function getDaemonScriptPath(context: vscode.ExtensionContext): string | null {
  const roots = new Set<string>();

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    roots.add(folder.uri.fsPath);
    roots.add(path.dirname(folder.uri.fsPath));
  }

  roots.add(context.extensionUri.fsPath);
  roots.add(path.dirname(context.extensionUri.fsPath));

  for (const root of roots) {
    const candidates = [
      path.join(root, "dist", "bin", "cs.js"),
      path.join(root, "cs-quill-cli", "dist", "bin", "cs.js"),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

// ============================================================
// PART 4 — Daemon Startup
// ============================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForDaemonReadyOrExit(
  child: ChildProcess,
  port: number,
  timeoutMs: number = 8000,
  log: (msg: string) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const startedAt = Date.now();

    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const cleanup = () => {
      child.removeListener("error", onError);
      child.removeListener("exit", onExit);
    };

    const onError = (error: Error) => {
      cleanup();
      log(`launcher error: ${error.message}`);
      finish(false);
    };

    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      log(`launcher exited before ready (code=${code ?? "null"}, signal=${signal ?? "null"})`);
      finish(false);
    };

    const poll = async () => {
      while (!settled && Date.now() - startedAt < timeoutMs) {
        if (await isDaemonHealthy(port)) {
          cleanup();
          finish(true);
          return;
        }
        await delay(250);
      }
      cleanup();
      finish(false);
    };

    child.once("error", onError);
    child.once("exit", onExit);
    void poll();
  });
}

export function clearSpawnedDaemon(): void {
  if (!daemonProcess) return;

  if (daemonProcess.exitCode === null && !daemonProcess.killed) {
    try {
      daemonProcess.kill();
    } catch {
      // Best-effort cleanup only.
    }
  }

  daemonProcess = null;
}

export async function startDaemonIfNeeded(
  port: number,
  context: vscode.ExtensionContext,
  log: (msg: string) => void,
): Promise<boolean> {
  if (await isDaemonHealthy(port)) {
    log(`daemon already healthy on port ${port}`);
    return true;
  }

  const scriptPath = getDaemonScriptPath(context);
  log(`daemon healthy check failed; local cli path = ${scriptPath ?? "not found"}`);

  const launchers: Array<{
    command: string;
    args: string[];
    cwd?: string;
    useShell?: boolean;
  }> = [];

  if (scriptPath) {
    for (const nodeCommand of getNodeCommandCandidates()) {
      launchers.push({
        command: nodeCommand,
        args: [scriptPath, "daemon", "--port", String(port)],
        cwd: path.dirname(path.dirname(path.dirname(scriptPath))),
        useShell: process.platform === "win32" && nodeCommand !== process.execPath,
      });
    }
  }

  launchers.push({
    command: "cs",
    args: ["daemon", "--port", String(port)],
    cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
    useShell: process.platform === "win32",
  });

  launchers.push({
    command: "cs-quill",
    args: ["daemon", "--port", String(port)],
    cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
    useShell: process.platform === "win32",
  });

  for (const launcher of launchers) {
    clearSpawnedDaemon();
    log(`trying launcher: ${launcher.command} ${launcher.args.join(" ")} (cwd=${launcher.cwd ?? "default"})`);

    try {
      const child = spawn(launcher.command, launcher.args, {
        cwd: launcher.cwd,
        stdio: "ignore",
        windowsHide: true,
        shell: launcher.useShell ?? false,
      });

      daemonProcess = child;
      child.on("exit", () => {
        if (daemonProcess === child) {
          daemonProcess = null;
        }
      });

      if (await waitForDaemonReadyOrExit(child, port, 8000, log)) {
        log(`daemon ready via launcher: ${launcher.command}`);
        return true;
      }
    } catch {
      log(`launcher threw synchronously: ${launcher.command}`);
      clearSpawnedDaemon();
    }
  }

  log(`failed to start daemon on port ${port}`);
  clearSpawnedDaemon();
  return false;
}

// IDENTITY_SEAL: daemon | role=daemon-lifecycle | inputs=port,context | outputs=boolean

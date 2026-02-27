import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type TargetAppType =
  | "chat"
  | "browser"
  | "editor"
  | "terminal"
  | "unknown";

export interface ActiveAppSignal {
  appName: string;
  appType: TargetAppType;
  confidence: number;
  platform: NodeJS.Platform;
  detected: boolean;
}

function classifyAppType(appName: string): TargetAppType {
  const name = appName.toLowerCase();
  if (/(whatsapp|telegram|discord|slack|teams|line|wechat)/.test(name)) {
    return "chat";
  }
  if (/(chrome|firefox|edge|safari|brave|opera)/.test(name)) {
    return "browser";
  }
  if (
    /(code|cursor|notepad|sublime|idea|webstorm|word|notion|vim|nvim)/.test(
      name,
    )
  ) {
    return "editor";
  }
  if (
    /(terminal|powershell|cmd|iterm|alacritty|wezterm|konsole|gnome-terminal)/.test(
      name,
    )
  ) {
    return "terminal";
  }
  return "unknown";
}

async function detectActiveAppName(): Promise<string | null> {
  try {
    if (process.platform === "win32") {
      const script = [
        "Add-Type @'",
        "using System;",
        "using System.Runtime.InteropServices;",
        "public class WinApi {",
        '  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
        '  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);',
        "}",
        "'@;",
        "$hwnd=[WinApi]::GetForegroundWindow();",
        "if($hwnd -eq [IntPtr]::Zero){''} else {",
        "  $pid=0; [WinApi]::GetWindowThreadProcessId($hwnd,[ref]$pid) | Out-Null;",
        "  (Get-Process -Id $pid).ProcessName",
        "}",
      ].join(" ");
      const { stdout } = await execFileAsync("powershell", [
        "-NoProfile",
        "-Command",
        script,
      ]);
      const name = stdout.trim();
      return name || null;
    }

    if (process.platform === "darwin") {
      const { stdout } = await execFileAsync("osascript", [
        "-e",
        'tell application "System Events" to get name of first application process whose frontmost is true',
      ]);
      const name = stdout.trim();
      return name || null;
    }

    if (process.platform === "linux") {
      const { stdout } = await execFileAsync("bash", [
        "-lc",
        "xdotool getactivewindow getwindowname 2>/dev/null || echo ''",
      ]);
      const name = stdout.trim();
      return name || null;
    }
  } catch {
    return null;
  }

  return null;
}

export async function detectActiveAppSignal(): Promise<ActiveAppSignal> {
  const appName = await detectActiveAppName();
  if (!appName) {
    return {
      appName: "unknown",
      appType: "unknown",
      confidence: 0,
      platform: process.platform,
      detected: false,
    };
  }

  const appType = classifyAppType(appName);
  return {
    appName,
    appType,
    confidence: appType === "unknown" ? 0.45 : 0.8,
    platform: process.platform,
    detected: true,
  };
}

export { classifyAppType };

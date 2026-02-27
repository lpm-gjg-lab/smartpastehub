import { execSync, spawnSync } from "child_process";
import { logger } from "../shared/logger";

function runCommand(command: string, args: string[], timeoutMs = 3000): void {
  const result = spawnSync(command, args, {
    timeout: timeoutMs,
    windowsHide: true,
    stdio: "pipe",
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    const stderr = String(result.stderr ?? "").trim();
    throw new Error(stderr || `${command} exited with status ${result.status}`);
  }
}

function normalizeTypingText(input: string): string {
  return String(input ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function typeTextWindows(text: string): void {
  const encoded = Buffer.from(text, "utf8").toString("base64");
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    `$txt = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${encoded}'))`,
    "foreach ($ch in $txt.ToCharArray()) {",
    "  switch ($ch) {",
    '    "`r" { continue }',
    "    \"`n\" { [System.Windows.Forms.SendKeys]::SendWait('{ENTER}'); continue }",
    "    \"`t\" { [System.Windows.Forms.SendKeys]::SendWait('{TAB}'); continue }",
    "    '+'  { [System.Windows.Forms.SendKeys]::SendWait('{+}'); continue }",
    "    '^'  { [System.Windows.Forms.SendKeys]::SendWait('{^}'); continue }",
    "    '%'  { [System.Windows.Forms.SendKeys]::SendWait('{%}'); continue }",
    "    '~'  { [System.Windows.Forms.SendKeys]::SendWait('{~}'); continue }",
    "    '('  { [System.Windows.Forms.SendKeys]::SendWait('{(}'); continue }",
    "    ')'  { [System.Windows.Forms.SendKeys]::SendWait('{)}'); continue }",
    "    '['  { [System.Windows.Forms.SendKeys]::SendWait('{[}'); continue }",
    "    ']'  { [System.Windows.Forms.SendKeys]::SendWait('{]}'); continue }",
    "    '{'  { [System.Windows.Forms.SendKeys]::SendWait('{{}'); continue }",
    "    '}'  { [System.Windows.Forms.SendKeys]::SendWait('{}}'); continue }",
    "    default { [System.Windows.Forms.SendKeys]::SendWait([string]$ch); continue }",
    "  }",
    "}",
  ].join("; ");

  runCommand("powershell", ["-NoProfile", "-Command", script], 8000);
}

function typeTextMac(text: string): void {
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    runCommand(
      "osascript",
      [
        "-e",
        "on run argv",
        "-e",
        'tell application "System Events" to keystroke item 1 of argv',
        "-e",
        "end run",
        line,
      ],
      6000,
    );

    if (index < lines.length - 1) {
      runCommand(
        "osascript",
        ["-e", 'tell application "System Events" to key code 36'],
        3000,
      );
    }
  }
}

function typeTextLinux(text: string): void {
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.length > 0) {
      runCommand("xdotool", ["type", "--delay", "2", "--", line], 6000);
    }
    if (index < lines.length - 1) {
      runCommand("xdotool", ["key", "Return"], 3000);
    }
  }
}

/**
 * Simulate Ctrl+V (or Cmd+V on macOS) keystroke to paste clipboard contents
 * into the currently active application.
 *
 * Uses OS-native tools — no extra npm packages required.
 */
export function simulatePaste(): void {
  try {
    switch (process.platform) {
      case "win32":
        execSync(
          "powershell -Command \"Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{ALTUP}{CTRLUP}'); [System.Windows.Forms.SendKeys]::SendWait('^v')\"",
          { windowsHide: true, timeout: 3000 },
        );
        break;
      case "darwin":
        execSync(
          'osascript -e \'tell application "System Events" to keystroke "v" using command down\'',
          { timeout: 3000 },
        );
        break;
      case "linux":
        execSync("xdotool key ctrl+v", { timeout: 3000 });
        break;
      default:
        logger.warn(`simulatePaste: unsupported platform ${process.platform}`);
    }
  } catch (err) {
    // Silently skip — clipboard already has the clean text
    logger.debug("simulatePaste failed (non-critical)", { error: err });
  }
}

export function simulateShiftInsert(): void {
  try {
    switch (process.platform) {
      case "win32":
        execSync(
          "powershell -Command \"Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{ALTUP}{CTRLUP}'); [System.Windows.Forms.SendKeys]::SendWait('+{INSERT}')\"",
          { windowsHide: true, timeout: 3000 },
        );
        break;
      case "darwin":
        execSync(
          'osascript -e \'tell application "System Events" to keystroke "v" using command down\'',
          { timeout: 3000 },
        );
        break;
      case "linux":
        execSync("xdotool key Shift+Insert", { timeout: 3000 });
        break;
      default:
        logger.warn(
          `simulateShiftInsert: unsupported platform ${process.platform}`,
        );
    }
  } catch (err) {
    logger.debug("simulateShiftInsert failed (non-critical)", { error: err });
  }
}

/**
 * Simulate pressing the Enter key in the currently active application.
 *
 * Used by "Clean & Send" mode (Ctrl+Alt+V) to auto-submit after paste.
 */
export function simulateEnter(): void {
  try {
    switch (process.platform) {
      case "win32":
        execSync(
          "powershell -Command \"Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{ALTUP}{CTRLUP}'); [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')\"",
          { windowsHide: true, timeout: 3000 },
        );
        break;
      case "darwin":
        execSync(
          "osascript -e 'tell application \"System Events\" to key code 36'",
          { timeout: 3000 },
        );
        break;
      case "linux":
        execSync("xdotool key Return", { timeout: 3000 });
        break;
      default:
        logger.warn(`simulateEnter: unsupported platform ${process.platform}`);
    }
  } catch (err) {
    logger.debug("simulateEnter failed (non-critical)", { error: err });
  }
}

/**
 * Type text into the currently focused app using native keystroke simulation.
 *
 * Intended as fallback for fields that block clipboard paste.
 */
export function simulateTypeText(input: string): boolean {
  const text = normalizeTypingText(input);
  if (!text) {
    return false;
  }

  try {
    switch (process.platform) {
      case "win32":
        typeTextWindows(text);
        return true;
      case "darwin":
        typeTextMac(text);
        return true;
      case "linux":
        typeTextLinux(text);
        return true;
      default:
        logger.warn(
          `simulateTypeText: unsupported platform ${process.platform}`,
        );
        return false;
    }
  } catch (err) {
    logger.debug("simulateTypeText failed (non-critical)", { error: err });
    return false;
  }
}

export function simulateAccessibilityPaste(text: string): boolean {
  try {
    if (process.platform === "win32") {
      const encoded = Buffer.from(text, "utf8").toString("base64");
      const script = [
        "$txt = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('" +
          encoded +
          "'))",
        "Set-Clipboard -Value $txt",
        "$wshell = New-Object -ComObject WScript.Shell",
        "$wshell.SendKeys('^v')",
      ].join("; ");
      runCommand("powershell", ["-NoProfile", "-Command", script], 5000);
      return true;
    }

    if (process.platform === "darwin") {
      runCommand(
        "osascript",
        [
          "-e",
          'tell application "System Events" to keystroke "v" using command down',
        ],
        3000,
      );
      return true;
    }

    if (process.platform === "linux") {
      runCommand("xdotool", ["key", "ctrl+v"], 3000);
      return true;
    }

    return false;
  } catch (err) {
    logger.debug("simulateAccessibilityPaste failed (non-critical)", {
      error: err,
    });
    return false;
  }
}

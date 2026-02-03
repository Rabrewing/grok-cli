import fs from "node:fs";
import path from "node:path";

let uiActive = false;

export function setUiActive(v: boolean) {
  uiActive = v;
}

export function logLine(line: string) {
  if (!uiActive) {
    // ok pre-ui
    console.log(line);
    return;
  }

  try {
    const p = path.join(process.cwd(), ".grok-debug.log");
    fs.appendFileSync(p, line + "\n", "utf8");
  } catch (e) {
    // Silently fail if logging fails
  }
}
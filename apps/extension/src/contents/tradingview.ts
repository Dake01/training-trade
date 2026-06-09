import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["https://*.tradingview.com/*"],
};

// ISO 8601 guard — same regex as packages/shared isoDateTime
const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

// Broad date-time text pattern to extract from TradingView DOM text nodes.
// TradingView uses various formats depending on chart settings and version.
const DATETIME_TEXT_RE =
  /\b(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?)\b/;

function readTimestamp(): string | null {
  try {
    // TradingView exposes the current bar time in the bottom status bar.
    // Selector priority: bottom toolbar date label, then fallback text scan.
    const candidates = [
      document.querySelector('[class*="statusLine"] [class*="dateRange"]'),
      document.querySelector('[class*="bottom-widgetbar"] [class*="date"]'),
      document.querySelector('[class*="chart-bottom-toolbar"] time'),
      document.querySelector('[class*="statusLine"]'),
    ];

    for (const el of candidates) {
      if (!el?.textContent) continue;
      const match = DATETIME_TEXT_RE.exec(el.textContent);
      if (!match) continue;
      const rawStr = match[1]?.replace(" ", "T");
      if (!rawStr) continue;
      // Ensure seconds are present for ISO 8601 compliance
      const normalized = rawStr.length === 16 ? `${rawStr}:00` : rawStr;
      const iso = `${normalized}Z`;
      const date = new Date(iso);
      if (!isNaN(date.getTime()) && ISO_RE.test(iso)) return iso;
    }
  } catch {
    // DOM access failed — return null silently
  }
  return null;
}

function sendTimestamp(): void {
  try {
    const isoTimestamp = readTimestamp();
    chrome.runtime.sendMessage({ type: "TV_TIMESTAMP", isoTimestamp });
  } catch {
    // Extension context invalidated (e.g., after reload) — stop silently
  }
}

// Send immediately when script loads and refresh every 2 s
// so the popup receives an up-to-date value shortly after opening.
sendTimestamp();
setInterval(sendTimestamp, 2000);

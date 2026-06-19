// Data source resolution — no API key, no npm token.
//
// The package BUNDLES a snapshot of the UK Sanctions List (works offline, out of the box).
// A weekly GitHub Action publishes the freshest data as a GitHub Release asset. On load we
// prefer a locally-cached copy of that asset if it's at least as new as the bundled one, and
// kick off a non-blocking background download to refresh the cache for next time. So the tool
// self-updates with no token and no manual step; if the network is unavailable it simply uses
// the bundled snapshot.
import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync, statSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { SANCTIONS_DATA, SANCTIONS_KIND } from "./data.generated.js";

export type DataSource = "bundled" | "cache" | "sample";

const RELEASE_URL =
  process.env.SANCTIONWISE_DATA_URL ||
  "https://github.com/qinisolabs/sanctionwise/releases/download/data/sanctions.json.gz";

function cacheDir(): string {
  const base = process.env.XDG_CACHE_HOME || join(homedir() || tmpdir(), ".cache");
  return join(base, "sanctionwise");
}
function cacheFile(): string {
  return join(cacheDir(), "sanctions.json.gz");
}

// Turn a "DD-Mon-YYYY" report date into a comparable number (0 if unparseable).
function reportValue(json: string): number {
  try {
    const v = String(JSON.parse(json).version || "");
    const d = Date.parse(v.replace(/-/g, " "));
    return Number.isNaN(d) ? 0 : d;
  } catch {
    return 0;
  }
}
function looksValid(text: string): boolean {
  return text.includes('"targets"') && text.includes('"version"');
}

let chosen: { json: string; source: DataSource } | null = null;

export function getDataJson(): { json: string; source: DataSource } {
  if (chosen) return chosen;
  chosen = { json: SANCTIONS_DATA, source: SANCTIONS_KIND === "official" ? "bundled" : "sample" };
  if (process.env.SANCTIONWISE_NO_CACHE) return chosen; // tests / deterministic builds

  // Prefer the cached Release copy if it parses and is at least as new as the bundled data.
  try {
    const cf = cacheFile();
    if (existsSync(cf)) {
      const text = readGz(readFileSync(cf));
      if (looksValid(text) && reportValue(text) >= reportValue(SANCTIONS_DATA)) {
        chosen = { json: text, source: "cache" };
      }
    }
  } catch {
    /* ignore — fall back to bundled */
  }
  maybeRefresh();
  return chosen;
}

function readGz(buf: Buffer): string {
  return buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf).toString("utf8") : buf.toString("utf8");
}

let refreshStarted = false;
function maybeRefresh(): void {
  if (refreshStarted || process.env.SANCTIONWISE_NO_CACHE) return;
  refreshStarted = true;
  try {
    const cf = cacheFile();
    if (existsSync(cf) && Date.now() - statSync(cf).mtimeMs < 24 * 3600 * 1000) return; // refreshed < 24h ago
  } catch {
    /* fall through and try to refresh */
  }
  // Fire-and-forget: update the cache for the NEXT startup; never blocks or throws.
  void (async () => {
    try {
      const res = await fetch(RELEASE_URL, { redirect: "follow" });
      if (!res.ok) return;
      const buf = Buffer.from(await res.arrayBuffer());
      const text = readGz(buf);
      if (!looksValid(text)) return;
      JSON.parse(text); // validate
      mkdirSync(cacheDir(), { recursive: true });
      const out = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b ? buf : gzipSync(text);
      const tmp = `${cacheFile()}.${process.pid}.tmp`;
      writeFileSync(tmp, out);
      renameSync(tmp, cacheFile());
    } catch {
      /* offline / unavailable — keep using bundled data */
    }
  })();
}

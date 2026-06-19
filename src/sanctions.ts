import { SANCTIONS_DATA, SANCTIONS_KIND } from "./data.generated.js";

export interface SanctionTarget {
  id: string;
  type: string; // Individual | Entity | Ship
  primaryName: string;
  names: string[];
  regimes: string[];
  sanctions: string;
  dob: string[];
  nationality: string[];
  dateDesignated: string;
  lastUpdated: string;
  reasons: string;
}

interface Parsed {
  version: string;
  count: number;
  targets: SanctionTarget[];
}

export const DISCLAIMER =
  "INDICATIVE NAME-MATCH SCREEN ONLY. A match here is a POSSIBLE match against the UK Sanctions List that a human MUST verify against the official entry (names are commonly shared and transliterated) — it is NOT confirmation that this is the designated party. A 'no match' is NOT a guarantee the party is clear: this covers the UK (FCDO) list only, screens the supplied name string only (not DOB/aliases you didn't pass), and reflects the dataset's report date, not real-time. Not legal, compliance or KYC/AML advice.";

const ATTRIBUTION =
  "Contains public sector information from the FCDO UK Sanctions List, licensed under the Open Government Licence v3.0. © Crown copyright.";

// Fold accents, uppercase, drop punctuation, collapse spaces — so "Lukashenko" ~ "Lukashénko".
export function normalizeName(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let DATA: Parsed | null = null;
let NAME_INDEX: { nl: string; ti: number; name: string }[] | null = null;

function load(): { data: Parsed; index: { nl: string; ti: number; name: string }[] } {
  if (DATA && NAME_INDEX) return { data: DATA, index: NAME_INDEX };
  DATA = JSON.parse(SANCTIONS_DATA) as Parsed;
  NAME_INDEX = [];
  DATA.targets.forEach((t, ti) => {
    for (const name of t.names) NAME_INDEX!.push({ nl: normalizeName(name), ti, name });
  });
  return { data: DATA, index: NAME_INDEX };
}

export function datasetInfo(): { kind: "sample" | "official"; version: string; count: number } {
  const { data } = load();
  return { kind: SANCTIONS_KIND, version: data.version, count: data.count };
}

function scoreName(nameLower: string, q: string): number {
  if (nameLower === q) return 4;
  if (nameLower.startsWith(q) && (nameLower.length === q.length || nameLower[q.length] === " ")) return 3;
  const i = nameLower.indexOf(q);
  if (i >= 0) {
    const before = i === 0 || nameLower[i - 1] === " ";
    const after = i + q.length === nameLower.length || nameLower[i + q.length] === " ";
    if (before && after) return 2;
  }
  return 1;
}
const MATCH_LABEL = ["", "partial", "name-part", "starts-with", "exact"];

export interface ScreenHit {
  id: string;
  type: string;
  primaryName: string;
  matchedName: string;
  matchType: string;
  regimes: string[];
  sanctions: string;
  dob: string[];
  nationality: string[];
  dateDesignated: string;
  reasonsSnippet: string;
}

export interface ScreenResult {
  query: string;
  normalizedQuery: string;
  matchCount: number;
  results: ScreenHit[];
  truncated: boolean;
  coverage: "United Kingdom (FCDO UK Sanctions List)";
  dataset: "sample" | "official";
  datasetVersion: string;
  disclaimer: string;
  attribution: string;
  note?: string;
}

const snippet = (s: string, n = 280) => (s.length > n ? s.slice(0, n).trimEnd() + "…" : s);

/**
 * Screen a name (person, company or vessel) against the UK Sanctions List. Returns
 * POSSIBLE matches (ranked) for human verification — never a determination.
 */
export function screenName(query: string, limit = 10): ScreenResult {
  const { data, index } = load();
  const q = normalizeName(query);
  const words = q.split(" ").filter(Boolean);
  const base: ScreenResult = {
    query,
    normalizedQuery: q,
    matchCount: 0,
    results: [],
    truncated: false,
    coverage: "United Kingdom (FCDO UK Sanctions List)",
    dataset: SANCTIONS_KIND,
    datasetVersion: data.version,
    disclaimer: DISCLAIMER,
    attribution: ATTRIBUTION,
  };
  if (SANCTIONS_KIND === "sample") {
    base.note =
      "SAMPLE DATA — not the real UK Sanctions List. Results are NOT authoritative. Load the official data with scripts/build-data.mjs before relying on this.";
  }
  if (!words.length) {
    base.note = (base.note ? base.note + " " : "") + "Empty query.";
    return base;
  }
  // Best score per matched target.
  const byTarget = new Map<number, { score: number; matchedName: string }>();
  for (const { nl, ti, name } of index) {
    if (!words.every((w) => nl.includes(w))) continue;
    const score = scoreName(nl, q);
    const prev = byTarget.get(ti);
    if (!prev || score > prev.score) byTarget.set(ti, { score, matchedName: name });
  }
  base.matchCount = byTarget.size;
  const ranked = [...byTarget.entries()].sort((a, b) => {
    if (b[1].score !== a[1].score) return b[1].score - a[1].score;
    const ta = data.targets[a[0]];
    const tb = data.targets[b[0]];
    return ta.primaryName.length - tb.primaryName.length || ta.primaryName.localeCompare(tb.primaryName);
  });
  base.truncated = ranked.length > limit;
  base.results = ranked.slice(0, limit).map(([ti, m]) => {
    const t = data.targets[ti];
    return {
      id: t.id,
      type: t.type,
      primaryName: t.primaryName,
      matchedName: m.matchedName,
      matchType: MATCH_LABEL[m.score] || "partial",
      regimes: t.regimes,
      sanctions: t.sanctions,
      dob: t.dob,
      nationality: t.nationality,
      dateDesignated: t.dateDesignated,
      reasonsSnippet: snippet(t.reasons),
    };
  });
  return base;
}

export interface EntryResult {
  id: string;
  found: boolean;
  target: SanctionTarget | null;
  dataset: "sample" | "official";
  datasetVersion: string;
  disclaimer: string;
  attribution: string;
}

/** Fetch the full official entry for a UK Sanctions List Unique ID. */
export function getSanctionsEntry(id: string): EntryResult {
  const { data } = load();
  const wanted = (id ?? "").trim().toUpperCase();
  const target = data.targets.find((t) => t.id.toUpperCase() === wanted) ?? null;
  return {
    id: wanted,
    found: !!target,
    target,
    dataset: SANCTIONS_KIND,
    datasetVersion: data.version,
    disclaimer: DISCLAIMER,
    attribution: ATTRIBUTION,
  };
}

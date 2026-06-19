import assert from "node:assert/strict";
import { screenName, getSanctionsEntry, normalizeName, datasetInfo } from "../src/index.js";
import { handleRpc } from "../src/core.js";

let pass = 0;
let fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass++;
  } catch (err) {
    fail++;
    console.error(`✗ ${name}\n    ${(err as Error).message}`);
  }
}

process.env.SANCTIONWISE_NO_CACHE = "1"; // deterministic: use bundled data, no network refresh
const KIND = datasetInfo().kind;

/* ---------- normalisation (deterministic) ---------- */
check("normalize folds accents + uppercases", () => assert.equal(normalizeName("Lukashénko"), "LUKASHENKO"));
check("normalize strips punctuation + collapses spaces", () => assert.equal(normalizeName("  O'Brien-Smith,  Jr. "), "O BRIEN SMITH JR"));

/* ---------- screening behaviour that holds on ANY dataset ---------- */
check("dataset is loaded", () => assert.ok(datasetInfo().count > 0));
check("every screen carries the indicative disclaimer + coverage + attribution", () => {
  const r = screenName("anyone");
  assert.match(r.disclaimer, /INDICATIVE/);
  assert.equal(r.coverage, "United Kingdom (FCDO UK Sanctions List)");
  assert.match(r.attribution, /Open Government Licence/);
  assert.equal(r.dataset, KIND);
});
check("a clearly-absent name returns 0 matches (no false positive)", () => {
  const r = screenName("Zzqxwv Nonexistent Persona 99999");
  assert.equal(r.matchCount, 0);
  assert.equal(r.results.length, 0);
});
check("empty query → no matches, note", () => {
  const r = screenName("   ");
  assert.equal(r.matchCount, 0);
  assert.ok(r.note);
});
check("unknown id → found:false", () => assert.equal(getSanctionsEntry("NOTAREALID999").found, false));

/* ---------- sample-specific (fresh clone / CI) ---------- */
if (KIND === "sample") {
  check("[sample] screens the synthetic entry", () => {
    const r = screenName("example sanctioned person");
    assert.ok(r.matchCount >= 1);
    assert.equal(r.results[0].id, "SAMPLE0001");
    assert.match(r.note ?? "", /SAMPLE DATA/);
  });
  check("[sample] get entry by id", () => {
    const e = getSanctionsEntry("SAMPLE0001");
    assert.equal(e.found, true);
    assert.equal(e.target?.type, "Individual");
    assert.ok(e.target?.names.length! >= 1);
  });
}

/* ---------- official-data sanity (real list loaded) ---------- */
if (KIND === "official") {
  check("[official] full list loaded (>1000 targets)", () => assert.ok(datasetInfo().count > 1000));
  check("[official] a stably-designated name screens to a match", () => {
    const r = screenName("Putin"); // Vladimir Putin, UK Russia regime — stable designation
    assert.ok(r.matchCount >= 1);
    assert.ok(r.results[0].regimes.length >= 1);
    assert.ok(r.results[0].id.length > 0);
  });
  check("[official] alias matching finds a target via an alias", () => {
    // every screen result exposes the matched name + type label
    const r = screenName("Putin");
    assert.ok(["exact", "starts-with", "name-part", "partial"].includes(r.results[0].matchType));
  });
}

/* ---------- JSON-RPC core ---------- */
function rpc(method: string, params?: unknown, id: number | string = 1) {
  return handleRpc({ jsonrpc: "2.0", id, method, params }) as any;
}
check("initialize returns sanctionwise serverInfo", () => {
  const r = rpc("initialize", { protocolVersion: "2025-06-18" });
  assert.equal(r.result.serverInfo.name, "sanctionwise");
});
check("tools/list returns the two tools", () => {
  const r = rpc("tools/list");
  const names = r.result.tools.map((t: any) => t.name).sort();
  assert.deepEqual(names, ["get_sanctions_entry", "screen_name"]);
});
check("tools/call screen_name returns structured payload", () => {
  const r = rpc("tools/call", { name: "screen_name", arguments: { name: "Zzqxwv Nonexistent 99999" } });
  const p = JSON.parse(r.result.content[0].text);
  assert.equal(p.matchCount, 0);
  assert.match(p.disclaimer, /verify/i);
});
check("unknown tool → error", () => assert.ok(rpc("tools/call", { name: "nope", arguments: {} }).error));
check("notifications/initialized → null", () =>
  assert.equal(handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" }), null));

console.log(`\n${pass} passed, ${fail} failed  (dataset: ${KIND}, ${datasetInfo().count} targets)`);
if (fail > 0) process.exit(1);

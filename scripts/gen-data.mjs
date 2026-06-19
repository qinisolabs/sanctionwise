// Generates src/data.generated.ts from the sanctions data.
//
// Prefers data/sanctions.json (the real FCDO data, produced by scripts/build-data.mjs and
// git-ignored). Falls back to the committed data/sanctions.sample.json so a fresh clone builds.
//
// The data is embedded as a single JSON STRING literal (typed `string` so the .d.ts stays
// tiny and tsc stays fast); it is JSON.parsed at load.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const real = join(root, "data/sanctions.json");
const sample = join(root, "data/sanctions.sample.json");
const useReal = existsSync(real);
const json = readFileSync(useReal ? real : sample, "utf8");
const parsed = JSON.parse(json);

const out = `// AUTO-GENERATED from ${useReal ? "data/sanctions.json" : "data/sanctions.sample.json"} by scripts/gen-data.mjs — do not edit by hand.
export const SANCTIONS_KIND: "sample" | "official" = ${JSON.stringify(useReal ? "official" : "sample")};
export const SANCTIONS_DATA: string = ${JSON.stringify(json)};
`;
writeFileSync(join(root, "src/data.generated.ts"), out);
console.error(`generated src/data.generated.ts (${parsed.count} targets, kind ${useReal ? "official" : "sample"}, version ${parsed.version})`);

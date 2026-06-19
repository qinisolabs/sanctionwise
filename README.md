<div align="center">

<img src="https://qinisolabs.github.io/sanctionwise/logo.svg" width="96" height="96" alt="Qiniso" />

# sanctionwise

**Verified UK sanctions screening for AI agents — official FCDO UK Sanctions List, not guesses.**

*Verified, trustworthy data tools for AI agents. "Qiniso" means "truth" in Zulu.*

[Website](https://qinisolabs.github.io/sanctionwise/) · [npm](https://www.npmjs.com/package/sanctionwise) · [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=sanctionwise)

</div>

---

Ask an LLM "is this person on the UK sanctions list?" and it will answer from stale, fuzzy memory. Designations change constantly and are specific — that's data, not something to recall. **sanctionwise** screens a name against the **official FCDO UK Sanctions List** and returns possible matches with their real designation details, or a clean "no match".

## ⚠️ Read this — what this is and is NOT

- **Indicative name-match only.** A match is a **POSSIBLE** match that a human **must verify** against the official entry (names are widely shared and transliterated). It is **not** confirmation that the party you mean is the sanctioned party.
- **A "no match" is NOT a clearance.** It covers the **UK (FCDO) list only**, screens the **name string you pass** (not DOBs or aliases you didn't supply), and reflects the **dataset's report date**, not real-time.
- **Not advice.** Not legal, compliance, KYC/AML or sanctions advice, and **not a substitute for a regulated sanctions-screening process**. Every response includes this disclaimer.

## Install

```json
{ "mcpServers": { "sanctionwise": { "command": "npx", "args": ["-y", "sanctionwise"] } } }
```

The official UK Sanctions List data is **bundled** in the package (works offline, out of the box). The tool also **auto-refreshes** from a weekly-updated GitHub Release on startup — cached locally, no key, no token, no manual step — so it stays current on its own. Every response reports the dataset's report date.

## Use it as a library

```bash
npm i sanctionwise
```

```ts
import { screenName, getSanctionsEntry } from "sanctionwise";

screenName("Vladimir Putin");
// { matchCount: 3, results: [{ id: "RUS0251", type: "Individual",
//   primaryName: "Vladimir Vladimirovich PUTIN", matchType: "exact",
//   regimes: ["The Russia (Sanctions) (EU Exit) Regulations 2019"], sanctions: "Asset freeze|…" }],
//   disclaimer: "INDICATIVE NAME-MATCH SCREEN ONLY. …" }

screenName("Acme Quilting Supplies Ltd").matchCount;   // 0 — no match (NOT a clearance)
getSanctionsEntry("RUS0251");                          // full official entry for a Unique ID
```

Matching folds accents and is case/punctuation-insensitive, and screens primary names **and aliases**.

## Tools — 2

| Tool | What it does |
| --- | --- |
| **screen_name** | Screen a person/company/vessel name → ranked POSSIBLE matches with official designation details |
| **get_sanctions_entry** | Full official entry for a Unique ID (names, aliases, regime, statement of reasons, …) |

## Data & auto-refresh

The data is the official **FCDO UK Sanctions List** (designated persons, entities and ships under the Sanctions and Anti-Money Laundering Act 2018), published under the **Open Government Licence v3.0**. `scripts/build-data.mjs` parses the official CSV into one record per target (all names/aliases grouped); the bundled build currently carries **6,200+ designated targets**. A weekly GitHub Action (`.github/workflows/refresh-data.yml`) re-downloads the list and publishes it as a **GitHub Release** asset; the installed tool fetches that asset on startup (cached, offline-safe), so it self-updates with **no npm token and no manual step**. The bundled copy is the offline / first-run fallback.

## What it is *not*

- **Not a compliance determination.** Indicative screening to surface possible matches for human review — nothing more.
- **Not multi-list.** UK (FCDO) list only — not the EU, US (OFAC), UN consolidated, or any other list.
- **Not real-time.** Reflects the dataset's report date; check the [live list](https://www.gov.uk/government/publications/the-uk-sanctions-list) for the current position.
- **Not advice**, and not a regulated screening service.

## License

Apache-2.0 (code). Sanctions data © Crown copyright, FCDO, Open Government Licence v3.0; see `NOTICE`.

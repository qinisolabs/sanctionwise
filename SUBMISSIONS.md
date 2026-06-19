# sanctionwise — directory submissions

The MCP Registry entry (via `mcp-publisher`) is canonical; Glama and mcp.so auto-ingest from it.

| Directory | How | Status |
| --- | --- | --- |
| MCP Registry (official) | `mcp-publisher publish` (PUBLISH.md §5) | ☐ |
| Glama | Auto-ingest from the registry; claim via `glama.json` maintainer. Never add billing. | ☐ |
| mcp.so | Auto-ingests from the registry. | ☐ |
| awesome-mcp-servers | Manual PR — batch with other Qiniso tools (Qinisolabs/AWESOME_MCP_PENDING.md). Security & Compliance category. | ☐ |
| Smithery | `smithery.yaml` present; list as stdio/npx. | ☐ |

## Notes
- sanctionwise is **UK (FCDO) sanctions screening**, **indicative name-match only** — lead every listing with that: a match needs human verification, a non-match is not a clearance, not legal/compliance/KYC-AML advice. Avoid implying it's a compliance/screening service.
- Description (≤100 chars): *Verified UK sanctions screening for AI agents — official FCDO UK Sanctions List, not guesses.*
- No API key; data bundled, refreshed weekly by CI; stdio/npx.

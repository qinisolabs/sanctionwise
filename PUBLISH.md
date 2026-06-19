# Publishing sanctionwise

Run on your Mac (npm 2FA + `gh` auth as `kristaffa`). From the repo root: `cd sanctionwise`.

The official UK Sanctions List data is **already built** in this working tree
(`data/sanctions.json`, git-ignored), so `npm run build` bundles it. The committed repo only
has the synthetic `data/sanctions.sample.json` fallback.

## 1. Pre-flight

```
npm install
npm run build
npm test
node -e "import('./dist/index.js').then(m=>console.log('dataset', JSON.stringify(m.datasetInfo())))"
npm pack --dry-run
grep -rniE "anthropic|/Users/|TODO|FIXME" src scripts docs README.md
```

Expect tests green and `kind: "official"` with 6,200+ targets; pack ships only
`dist/ README LICENSE NOTICE` (~0.6 MB). To refresh the bundled data before publishing, run
`npm run build-data /path/to/UK-Sanctions-List.csv` then `npm run build`.

## 2. Publish to npm

```
npm whoami
npm publish --access public
```

If npm 403s "too similar", scope to `@qinisolabs/sanctionwise` (update package.json name,
server.json identifier, README/docs) and republish.

## 3. GitHub repo + push

`git config user.email` MUST print `qinisolabs@gmail.com` before the first commit.

```
git init
git config user.name "Qiniso"
git config user.email "qinisolabs@gmail.com"
git config user.email
git add .
git status
git commit -m "Initial commit: sanctionwise"
git branch -M main
gh repo create qinisolabs/sanctionwise --source=. --remote=origin --push --public --description "Verified UK sanctions screening for AI agents — official FCDO UK Sanctions List, not guesses."
gh repo edit qinisolabs/sanctionwise --add-topic mcp,model-context-protocol,agents,sanctions,screening,aml,kyc,compliance,uk-sanctions,typescript
gh repo edit qinisolabs/sanctionwise --homepage "https://qinisolabs.github.io/sanctionwise"
git log --format='%an <%ae>' -1
```

Check `git status` before committing: `data/sanctions.json` and `UK-Sanctions-List.csv` must
NOT be staged (git-ignored); `data/sanctions.sample.json` SHOULD be.

## 4. Seed the data Release (run the Action once)

The weekly Action publishes the data to a GitHub **Release** (tag `data`) that the installed
tool auto-fetches on startup. It needs **no secrets** (just the built-in token). Create the
first Release:

```
gh workflow run "Refresh UK Sanctions List"
gh run watch
gh release view data
```

When it shows `sanctions.json.gz`, the tool will self-refresh from it (cached locally) — no npm
token, no manual step. It re-runs every Monday.

## 5. MCP Registry

```
mcp-publisher login github
mcp-publisher publish
```

## 6. GitHub Pages

```
gh api -X POST repos/qinisolabs/sanctionwise/pages --input - <<'JSON'
{"source":{"branch":"main","path":"/docs"}}
JSON
```

Live at <https://qinisolabs.github.io/sanctionwise>. Track directories in `SUBMISSIONS.md`.

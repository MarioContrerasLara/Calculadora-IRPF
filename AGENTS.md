# AGENTS.md

## What this repo is
Static SPA: Spanish IRPF + Seguridad Social calculator for Andalucía (2025–2026, forward to 2045). Vanilla HTML/CSS/JS, **no build step, no bundler, no package manager for frontend**. All calculation runs client-side.

## Stack
- Frontend: `index.html` (40 KB), `css/styles.css` (~70 KB), `js/app.js` (~68 KB, calc core), `js/ui.js` (~10 KB, tab/UX), `js/tarifa-at.js` (~20 KB, AT/EP tariff table)
- Server: `server.js` — native Node `https` (NOT Express, despite `package.json` declaring it). Validates `Host` header == `mario.gal`. **Requires SSL certs at `/home/mario/mario.gal/privkey.pem` — fails on dev machines without them.**
- Systemd: `calculadora-irpf.service` (production only, port 443)

## Test runners — read carefully
Two test files, two different runners:

| File | Runner | How to run | Notes |
|---|---|---|---|
| `tests/test_irpf.py` (2054 lines) | **Custom script-style** with `assert_close/assert_eq/assert_true` helpers. No `if __name__`. | `python3 tests/test_irpf.py` | Mirrors JS logic in Python. **NOT a pytest module** — `python3 -m pytest test_irpf.py` only collects a handful (CI workflow has `continue-on-error: true` to hide this). |
| `tests/test_actualizacion_salarial.py` (586 lines) | `unittest` with `if __name__ == '__main__'` block | `python3 tests/test_actualizacion_salarial.py` or `pytest` | Works with both runners. |

**Combined run**: `python3 tests/test_irpf.py && python3 tests/test_actualizacion_salarial.py` (must run from repo root or `cd tests` first — both files resolve sibling paths).

Expected pass count: **1344/1344** in `test_irpf.py`, varies in `test_actualizacion_salarial.py`. README badge hardcodes the 1344 number.

No lint/format/typecheck tools configured (no eslint, prettier, ruff, pyproject.toml). Style is whatever the last editor saved.

## Dev server (local)
`server.js` won't work without the production SSL certs. Use one of:
```bash
python3 -m http.server 8000
# or
npx http-server -p 8000
```

## Cache busting
`index.html` line 24, 701–703 load assets with `?v=23` query string. Bump all 4 occurrences (`css/styles.css`, `js/tarifa-at.js`, `js/app.js`, `js/ui.js`) when shipping UI changes. `server.js` also sets `Cache-Control: no-cache` for `.css`/`.js`, so the `?v=` is belt-and-suspenders.

## Hard constraints
- **Calculation logic is sacred.** `js/app.js` and `tests/test_irpf.py` both contain `ESCALA_ESTATAL`, `ESCALA_ANDALUCIA`, SS rates, etc. as **separate copies**. Tests verify the Python replica, not the JS. If you change tax/SS rates, update BOTH files or tests will pass with a wrong calculator.
- All IDs in `index.html` referenced by `app.js` / `ui.js` must keep their names. The full iceberg id set is: `icebergWrap`, `iceWorkerRect`, `iceEmployerRect`, `iceZoneNet`, `iceZoneEmployee`, `iceZoneEmployer`, `iceSummary`. Adding new IDs is fine; renaming/renaming-then-renaming-back breaks `renderIceberg` silently.
- The iceberg lives inside `<div class="results-panel" data-panel="distribucion">`. It's only visible when that tab is active. The Iceberg SVG measures 0×0 when its parent panel is hidden — use `getBoundingClientRect().width/height` (not `offsetParent`, which is unreliable here) for visibility checks. `app.js:getIceLayout()` returns `null` in that case.
- Theme: `localStorage.getItem('theme')` ('light' | 'dark'); inline `<head>` script prevents FOUC on load. Don't move the inline script below CSS.
- No sudo, no system-wide installs. Node 14+ assumed, Python 3.8+ assumed.

## Deploy flow
- **Feature branch dev**: `scripts/deploy-feature.sh` — **hardcoded to checkout `feature/actualizacion-salarial`**, NOT the current branch. Edit it or use the commands inline if working on a different feature branch.
- **Main → prod**: `scripts/deploy-main.sh`. Auto-tag workflow (`.github/workflows/auto-tag.yml`) runs on merge to `main` and increments the patch version (`v1.0.0` → `v1.0.1` → …). Don't tag manually or you'll collide.
- Current branch (June 2026): `feature/new-ui` (off main).

## CI
`.github/workflows/test.yml` runs on push to `feature/*`, `develop`, and PRs to `main`/`develop`. Steps use `continue-on-error: true` so failures don't block — check logs, don't trust the green check.

## What the agent usually forgets
- `package.json` declares `express` as a dependency but `server.js` uses native `https`. Don't `npm install` thinking you need Express.
- `scripts/deploy-feature.sh` checks out the wrong branch for the current work — read it before running.
- The CI workflow pretends to use pytest on `test_irpf.py` and hides the failure. The locally reported "1344/1344 passing" only comes from running the file directly with `python3`.
- Theme flash prevention lives in a `<head>` inline script; moving it to the bottom of `<body>` reintroduces the flash.
- Iceberg tab/panel pattern: don't put the iceberg anywhere outside `data-panel="distribucion"` — the layout cache and `repositionIceberg()` are wired to that tab's activation event.
- Production server is host-locked to `mario.gal`. Don't use `node server.js` for local testing.

## Reference design (UI inspiration only)
The current visual target is the iceberg layout at `https://es.talent.com/tax-calculator` (real-iceberg silhouette, water layers, dashed amber connectors, dots at line ends). **Do not hotlink their CDN image** — use a self-contained SVG silhouette.

## Don't proactively create
- No build tooling, no package-lock, no bundler config, no source maps.
- No `dist/`, no `build/` — repo root is the deployable.
- No new tests files unless explicitly asked. New test cases go in the existing two files.

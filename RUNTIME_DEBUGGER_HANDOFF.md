# Runtime Field Debugger — Handoff (Field Values / Debugger / BOM tabs)

## What this covers

Three new panel tabs, all scoped to a **live runtime configuration session** (not the admin
Blueprint page): **Field Values**, **Debugger**, and **BOM**. All three only appear once the
extension has detected a session's configuration UUID, and all three sit alongside the existing
Version Control / Rules tabs in the same panel (`src/content.js`, `getPanelHTML()`).

This doc exists so a future session doesn't have to re-derive the non-obvious plumbing that
makes these tabs work — most of the real difficulty was in detection and credentials, not the UI.

## How UUID detection actually works (read this before touching it)

Runtime sessions embed the real configurator inside a **nested iframe** (e.g. Logik's Test Frame
wraps `testFrame.html` around an inner iframe that does the actual work). Two isolation
boundaries had to be crossed to get a UUID out of that inner frame and into the panel UI, which
lives in the top frame:

1. **Isolated world → main world.** A normal content script runs in an isolated JS world — it
   shares the DOM with the page but not its `window.fetch`/`XMLHttpRequest`. Patching fetch/XHR
   from `content.js` never sees the app's real network calls. Fix: `src/main-world-interceptor.js`
   is injected with `"world": "MAIN"` (manifest.json) and patches fetch/XHR *there*, then
   broadcasts `document.dispatchEvent(new CustomEvent('logik-vc-uuid-detected', ...))` — DOM
   events do cross the isolated/main world boundary, plain JS state does not.

2. **Nested iframe → top frame.** Both content scripts also need `"all_frames": true` in
   manifest.json to even run inside the nested iframe. Once they do, the `CustomEvent` fires
   correctly *inside that iframe's own `document`* — but the panel UI is rendered in the **top**
   frame's document, and DOM events never cross frame boundaries. Fix: `content.js` checks
   `window === window.top`; if it's not the top frame, it relays the detected UUID up via
   `window.parent.postMessage(...)`, and only the top frame listens for both the event and the
   relayed message and calls `updateRuntimeTabsVisibility()`.

The UUID pattern matched is `/\/(?:c|api)\/([a-f0-9\-]{36})\//` — catches both `/c/{uuid}/...`
and `/api/{uuid}/...` request shapes seen on the Test Frame surface. **Not yet verified** on
other runtime surfaces (Salesforce QLE, headless UI, Transaction Manager) — QLE in particular is
iframe-embedded inside a Salesforce Lightning page, so the "panel lives in the top frame" premise
breaks there (the top frame is a different origin entirely, outside the extension's
`https://*.logik.io/*` match pattern). Treat that as unsolved, not solved-and-untested.

Panel-injection and URL-change polling in `content.js` are also gated on `window === window.top`
(`isTopFrame`) — without that guard, `all_frames: true` would inject a second duplicate panel UI
into the nested iframe (this was an earlier bug, already fixed).

## Credentials: two separate keys, same storage shape

Both keys live on the same per-environment **profile** object in `chrome.storage.local`
(`src/options.html` / `options.js`), matched to the current tenant via
`extractEnvironmentFromHostname()`:

- `apiKey` — the existing **Admin API Key**. Used for anything under `/api/admin/...`: rules,
  scripts, `configurableProducts`. Fetched via `getLogikApiKeyForCurrentEnv()`.
- `runtimeApiKey` — new **Runtime API Key**. Used only for the live-config endpoints
  (`/api/{uuid}` and `/api/{uuid}/bom`). Fetched via `getRuntimeApiKeyForCurrentEnv()`, which
  throws a clear error if the profile has no runtime key saved yet.

Both are stable, long-lived secrets — neither is session-specific, so both are stored once per
environment and reused, same as the original Admin API Key pattern.

The Runtime API calls also require `Origin: https://{hostname}/` **with a trailing slash** — this
tripped up initial testing (a 403 with no trailing slash, working once added). See
`fetchLiveRuntimeConfig()`.

## Field Values tab

Simplest of the three. Auto-fills the detected UUID (read-only field), user types a field's
`variableName`, and it's looked up directly in the config fetched by `fetchLiveRuntimeConfig(uuid)`
(`GET /api/{uuid}`, Runtime API Key). This function is shared by the Debugger tab too.

## Debugger tab

**Problem it solves:** Logik has a native per-script debugger (in the rule/script editor UI) where
you manually type dummy `cfg.x` values into a "Fields" JSON box and see the script's output. Dummy
values can diverge from what's actually true at runtime. This tab generates that same
`{"cfg": {...}}` JSON, but populated with the session's *actual* live field values, ready to copy
directly into that native "Fields" box. **It does not touch Logik's native debugger UI at all** —
it only produces text for the user to paste in themselves.

Pipeline (`ensureDebuggerRulesLoaded()` → `generateDebuggerInputsForRule()`):

1. Runtime pages have no `/blueprint/{name}/` URL to read a blueprint slug from (unlike the admin
   page, where `extractBlueprintNameFromUI()` works). Instead: pull `sys.productCode` out of the
   live config, call `GET /api/admin/v1/configurableProducts` (Admin API Key), match on
   `productCode`, and take that product's `blueprintVariableName` — this is the identifier the
   existing rules endpoint actually wants. See `getBlueprintVariableNameFromConfig()`.
2. `loadRulesForBlueprint(blueprintVariableName)` — same pagination/filtering logic as the
   existing `loadBlueprintRules()`, just parameterized instead of URL-derived.
3. Result is cached in `debuggerRulesCache`, keyed by session UUID (rules don't change mid-session,
   so this only fetches once per session).
4. User autocompletes a rule name → `generateDebuggerInputsForRule()` fetches
   `GET /api/admin/v3/rules/{variableName}` for `condition.scriptId` + each `actions[].scriptId`,
   fetches each script's content (`GET /api/admin/v1/scripts/{scriptId}`, cached in the existing
   `window.logikScriptCache`), and regex-extracts `cfg.x` references via `extractCfgReferences()`.
5. **Deliberately scoped to standard fields only.** `extractCfgReferences()` distinguishes
   `cfg.x` (a plain field — resolved directly against the live config) from `cfg.x.y` (a set or
   product-picker subfield reference — explicitly **not** resolved, and surfaced to the user as a
   skipped/unsupported reference rather than silently guessing). This was an intentional scope cut
   for the first pass, not an oversight — sets/product-picker field resolution is more involved and
   was pushed to a future iteration.
6. One collapsible `{"cfg": {...}}` block is rendered **per script** (not one merged block per
   rule) — a rule can have a condition script and multiple action scripts, and the native debugger
   only debugs one script at a time, so blocks are generated independently and labeled (e.g.
   "Condition", "Action: fieldVariableName") so the user can match the block to whatever script
   they currently have open in Logik's UI.

## BOM tab

Simpler by comparison. `GET /api/{uuid}/bom` (Runtime API Key, paginated via `fetchBom()`) returns
a flat `products[]` array where **array order already is display order** — no tree needs to be
reconstructed from `parentProduct`/`effectiveParent`. Each product has a `level` (0, 1, 2, ...);
`renderBomResults()` indents by `level * 18px` and colors by `level % BOM_LEVEL_COLORS.length`
(6-color palette, cycles on deep nesting). Shows only `name`, `productCode` (falls back to `id`),
and `description`. **Manual refresh only** — a button, no auto-load and no polling, by explicit
request (the BOM can change as the user edits the configuration mid-session, unlike the UUID).

## Explicitly deferred / not built

- **Sets and product-picker field resolution** (`cfg.x.y` in Debugger) — detected and flagged,
  not resolved. Next iteration territory.
- **Live/auto-refresh** — discussed but intentionally not implemented anywhere (Field Values,
  Debugger, BOM). Everything is fetch-on-demand. Worth revisiting since the UUID is stable for a
  session's lifetime, which was the whole argument for why auto-refresh would be cheap to add.
- **Non-Test-Frame runtime surfaces** — Salesforce QLE, headless custom UI, Transaction Manager.
  Frame topology differs per surface (see UUID detection section above); each may need its own
  relay strategy.
- **BOM auto-load-on-tab-open** — considered, explicitly rejected in favor of a manual button for
  this pass.

## Files touched this session

- `manifest.json` — `all_frames: true` + MAIN-world second content script entry
- `src/main-world-interceptor.js` — new file, MAIN-world fetch/XHR patch
- `src/content.js` — UUID relay/listener, `updateRuntimeTabsVisibility()`, Field Values tab,
  Debugger tab (+ all its helper functions), BOM tab (+ helpers)
- `src/options.html`, `src/options.js` — added `runtimeApiKey` field to the profile form/storage

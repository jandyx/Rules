# Rules

Fork of [dler-io/Rules](https://github.com/dler-io/Rules) plus my own Surge scripts and modules.

## Surge Module: Unlock & IP Risk Panel

Panel module for Surge: streaming & AI unlock checks (Netflix / Disney+ / YouTube / ChatGPT / Claude / Cursor) plus an IP risk row.

**Install URL**

```
https://cdn.jsdelivr.net/gh/jandyx/Rules@main/Surge/Module/Panel.sgmodule
```

One-click (Surge URL scheme):

```
surge:///install-module?url=https%3A%2F%2Fcdn.jsdelivr.net%2Fgh%2Fjandyx%2FRules%40main%2FSurge%2FModule%2FPanel.sgmodule
```

Fallback without the jsDelivr cache:

```
https://raw.githubusercontent.com/jandyx/Rules/main/Surge/Module/Panel.sgmodule
```

**Scripts** (`Surge/Script/`)

| Script | Source | Notes |
|---|---|---|
| `chatgpt_check.js` | chatgpt.com/cdn-cgi/trace | region-based |
| `claude_detect.js` | claude.ai | region-based |
| `cursor_check.js` | cloudflare.com/cdn-cgi/trace | excludes sanctioned regions |
| `ip_risk_check.js` | my.ippure.com/v1/info, fallback proxycheck.io | keyless; shows fraud score 0-100, residential vs datacenter |

Netflix / Disney+ / YouTube checks are loaded from dler-io/Rules.

Scripts are served through jsDelivr `@main`; after a push, purge with `https://purge.jsdelivr.net/gh/jandyx/Rules@main/<path>` and bump the `?v=` query on the script-path if Surge keeps the old body.

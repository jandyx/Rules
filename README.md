# Rules

Fork of [dler-io/Rules](https://github.com/dler-io/Rules) plus my own Surge scripts and modules.

## Surge Module: Unlock & IP Risk Panel

Panel module for Surge: streaming & AI unlock checks (Netflix / Disney+ / YouTube / ChatGPT / Claude / Cursor) plus IP risk and ISP exit rows.

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
| `isp_check.js` | my.ippure.com/v1/info via `policy=Custom-ISP`, fallback ipv4.icanhazip.com | forces the configured Surge policy; shows compact IPPure type/risk when available, otherwise only the observed IP with `信息查询失败` |

Netflix / Disney+ / YouTube checks are loaded from dler-io/Rules.

### ISP row

`isp_check.js` defaults to `argument=title=ISP&policy=Custom-ISP`. Add `expected-ip=<IPv4>` only when you want the panel to warn on an exit-IP mismatch. Every request uses Surge `$httpClient` with the configured policy; if the policy is missing the script stops without falling back to DIRECT.

A successful result is intentionally compact, for example:

```text
🇺🇸 US | 住宅 IP | 风险：低（8/100）
203.0.113.9
```

The country, type, and risk are third-party metadata from IPPure. Missing or malformed classification is shown as unknown rather than guessed, and this is not proof of a residential line, Claude account unlock, or successful real conversation. The Anthropic request is only a hidden HTTP reachability check; unauthenticated 401 is accepted.

Scripts are served through jsDelivr `@main`; after a push, purge with `https://purge.jsdelivr.net/gh/jandyx/Rules@main/<path>` and bump the `?v=` query on the script-path if Surge keeps the old body.

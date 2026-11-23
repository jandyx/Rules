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

### Claude row

Each refresh combines [per-signal API contributions](https://github.com/LinXiaoTao/FuckClaude/blob/5c0c30f57595ae783856912a9cd21b0dc6b1e2d7/src/pages/api/check.ts#L213-L249) from the Claude exit with measurements in Surge's WebView. The API supplies the exit timezone and request-header signals; local UTC offset replaces the inferred offset. Local Intl locale and measurable font signals fill remaining fields. Each refresh also allows up to 3 s for a WebView ICE probe using Cloudflare STUN (the STUN service sees its network source IP). Only comparable public IPv4 server-reflexive candidates enter the existing WebRTC weight: a different IP from the same-run Claude trace is a path mismatch, not proof of an ISP leak. Host-only, no comparable IPv4, and inconclusive timeouts are unmeasured, never a zero-risk pass. No candidate address is displayed or submitted to the scoring API. The panel shows only the region and overall risk; it does not read the DNS cache. The score is the sum of rounded contributions divided by the weight actually covered, scaled to 100. The Chinese profile is selected explicitly. Both sources are required; otherwise the row shows `未检测`. No local font list or settings are uploaded. This is a third-party environment heuristic, not a Chrome scan or an account restriction probability. No Chrome session, manual import, or stored score is used.

### ISP row

`isp_check.js` defaults to `argument=title=ISP&policy=Custom-ISP`. Add `expected-ip=<IPv4>` only when you want the panel to warn on an exit-IP mismatch. Every request uses Surge `$httpClient` with the configured policy; if the policy is missing the script stops without falling back to DIRECT.

A successful result is intentionally compact, for example:

```text
🇺🇸 US | 住宅 IP | 风险：低（8/100）
203.0.113.9
```

The country, type, and risk are third-party metadata from IPPure. Missing or malformed classification is shown as unknown rather than guessed, and this is not proof of a residential line, Claude account unlock, or successful real conversation. The Anthropic request is only a hidden HTTP reachability check; unauthenticated 401 is accepted.

Scripts are served through jsDelivr `@main`; after a push, purge with `https://purge.jsdelivr.net/gh/jandyx/Rules@main/<path>` and bump the `?v=` query on the script-path if Surge keeps the old body.

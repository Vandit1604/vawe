# Vawe MCP server

Vawe as a product: the caller's own model writes a scene, this renders it.

```bash
make watermark                                   # once: bake the draft sheet
make build                                       # once: bin/vawe
node mcp/smoke.mjs                               # prove it works end to end
claude mcp add vawe -- node $PWD/mcp/server.mjs  # wire into Claude Code
```

## What is public and what is not

The authoring vocabulary was already public (`site/public/vawe-rules.md` is served off the marketing
site, as is `core/`). So `vawe_guide` hands it over freely and the caller's model writes the scene on
the caller's tokens, which is the point: they pay for the thinking, you charge for the output.

What never leaves this machine is the half that makes the output good:

| Server-side | Why it stays |
|---|---|
| `blocks/` (154 implementations) | `expand` inlines them; callers see resulting layers, not factories |
| `docs/` taste corpus | the judgment, accumulated over 100+ logged mistakes |
| 27 gates + the ledger | callers get verdicts, not the rules that produced them |
| licensed asset packs | gradients and ransom sprites may be USED, never redistributed |

That last row is a permanent structural advantage. A self-hoster legally cannot have those packs.

## Tools

| Tool | Cost | Does |
|---|---|---|
| `vawe_guide` | free | scene format + full effect vocabulary. Call once, cache it. |
| `vawe_draft` | free | scene → watermarked video + every gate verdict. Repeat as needed. |
| `vawe_export` | paid | the same scene, clean. |
| `vawe_status` | free | status, URLs, last gate report. |

## Why drafts are free

Authoring is iterative. The reference film in this repo took about ten renders and every pass fixed
something real: an invisible effect, a black frame, a false count on an end card. Charging per render
taxes the loop that makes videos good, and people ship their third attempt instead of their tenth.
So iterate free with a watermark, and pay once at the moment of value.

The watermark is the ONLY difference between draft and export. Same engine, same encode settings, so
what you approve is what you get. Degrading preview quality would break the thing a preview is for.

## Pricing

Duration tiers in `pricing.mjs`: ≤15s $9, ≤30s $19, ≤60s $39, over $79. A twelve-second launch clip
and a sixty-second brand film are not the same product; a flat fee overcharges one and undercharges
the other.

## Config

| env | default | |
|---|---|---|
| `VAWE_DATA` | `.vawe-data/` | records, scenes, drafts, exports |
| `VAWE_OWNER` | `anon` | who owns videos from this connection |
| `VAWE_PUBLIC_BASE` | unset | URL prefix for delivery; unset returns `file://` |
| `VAWE_BILLING` | `off` | `on` requires payment before export |
| `VAWE_CHECKOUT_URL` | unset | required when billing is on |

## Not built yet

- **Payment.** `pricing.mjs` has one seam, `isPaid` / `checkoutUrl`. Provider choice changes the
  merchant of record and tax handling, so it is a business decision before a code one.
- **Auth.** `VAWE_OWNER` is a trusted string. Fine for stdio on one machine, not for a hosted server.
- **A queue.** Renders run inline and hold the tool call open. `internal/queue/queue.go` exists and
  its own comment says it was written for this.

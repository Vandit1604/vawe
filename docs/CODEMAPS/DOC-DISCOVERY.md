---
when: changing how docs are indexed, or wondering why the index is generated rather than written
answers: "what the sources say about CLAUDE.md size, Agent Skills progressive disclosure, AGENTS.md and llms.txt · the measurement of this repo · why this mechanism over the alternatives"
group: engine
---

# DOC-DISCOVERY: how an agent finds the right document here

This repo holds a large body of written knowledge and agents kept failing to reach it. Docs were
written and linked from nothing. `CLAUDE.md` was the only reliable entry point, so it kept growing,
and the things inside it kept getting skimmed. This file records the measurement, what the sources
outside this repo actually recommend, and why the mechanism that shipped is the one that shipped.

Every claim from outside carries its URL. Anything marked **synthesis** is our reasoning, not a
source's.

---

## 1. The measurement

Taken twice, because two other agents were writing to the tree while this work ran.

**Method.** Every git-tracked `*.md` outside `docs-site/` (a vendored Next app). A link graph over
markdown links and backticked paths, walked out from `CLAUDE.md`. Hop 1 means CLAUDE.md links it
directly; hop 2 means one doc in between.

| | at HEAD, start of the run | working tree, end of the run |
|---|---|---|
| tracked markdown files | 118 | 121 |
| total size | 1.47 MB | 1.51 MB |
| reachable from CLAUDE.md in one hop | 18 | 19 |
| reachable in two hops | 33 | 32 |
| reachable in three | 4 | 4 |
| **reachable at all** | **56** | **56** |
| **reachable from nothing** | **62** | **62** |

The delta is three new files from the two concurrent agents and one doc that moved from hop 2 to
hop 1. The headline did not move: **just over half the written knowledge in this repo could not be
reached by following a link from the entry point.**

The 62 are not all losses. Most are per-video storyboards, historical plan records, vendored
third-party skill pages and asset licence notes: things a reader should not be sent to. Stripping
those leaves the ones that hurt:

- `DESIGN.md`, `PRODUCT.md`: the reasoning behind the engine, unreachable
- `docs/SCENE-QUICK.md`: the one-page cheat sheet, unreachable
- `docs/LAUNCH-VIDEO-GUIDE.md`: unreachable, while CLAUDE.md carries a hand-written "Launch-video
  rules" section covering the same ground
- `docs/MCP.md`, `docs/FRAMEWORK-AUDIT.md`: unreachable
- `skills/vawe-animation`, `vawe-creative`, `vawe-scene-authoring`, named in prose in
  CLAUDE.md, but never as a path, so nothing follows them

Two failures found while building, both of the same kind:

1. `docs/JUDGE.md` linked `CRAFT/AB-JUDGE.md`, a file that no longer exists. The existing
   `make craft-coverage` could not see it, because it only checked links *inside* `docs/CRAFT/`.
   Read at the time as a file that had never been written; git says otherwise. It shipped in `05a5123`
   and was removed in `cc2dfc2` with five other engine-only tools. A dangling link says nothing about
   which of the two happened, and guessing wrote a false history into two docs.
2. The `CLAUDE.md` snapshot in circulation still carried an "Open audit findings" section pointing at
   `docs/audits/GAUNTLET-2026-08.md` and `gauntlet-2026-08.json`. Neither file exists; the section was
   deleted in commit `7d0f502`. A stale copy of the index outlived the index.
   <!-- doc-refs-allow: docs/audits/GAUNTLET-2026-08.md · named here only to record that it does not exist -->

**Synthesis.** Both are the same defect: nothing checked whether a doc pointed at a real thing, or
whether a real thing was pointed at. The index and the docs were maintained separately, so they
drifted, and drift was invisible.

---

## 2. What the sources recommend

### CLAUDE.md is expensive and the cost is per session

> "CLAUDE.md files are loaded into the context window at the start of every session, consuming tokens
> alongside your conversation."
> Source: https://code.claude.com/docs/en/memory

The size guidance is a number, not a feeling:

> "**Size**: target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce
> adherence."
> Source: https://code.claude.com/docs/en/memory

And the failure mode is named:

> "**The over-specified CLAUDE.md.** If your CLAUDE.md is too long, Claude ignores half of it because
> important rules get lost in the noise."
> Source: https://code.claude.com/docs/en/best-practices

The exclusion list is explicit about what does *not* belong: "Anything Claude can figure out by
reading code", "Detailed API documentation (link to docs instead)", "Long explanations or tutorials",
"File-by-file descriptions of the codebase": https://code.claude.com/docs/en/best-practices

**Our CLAUDE.md is about 30 KB.** That is roughly six times the stated target. It grew because it was
the only thing an agent reliably read.

### `@path` imports do not help

This one matters, because it is the obvious first idea:

> "You can also split content into imports for organization, though **imported files still load and
> enter the context window at launch**."
> Source: https://code.claude.com/docs/en/memory

Restated on the same page: "Splitting into `@path` imports helps organization but doesn't reduce
context, since imported files load at launch." Maximum import depth is four hops. So an
`@docs/INDEX.md` import would move the bytes, not remove them.

### Agent Skills are progressive disclosure, with published numbers

A skill is a directory with a `SKILL.md` carrying YAML frontmatter; `name` and `description` are
required: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills

The three levels, with Anthropic's own figures:

| Level | When loaded | Token cost |
|---|---|---|
| Metadata (`name` + `description`) | always, at startup | **~100 tokens per skill** |
| Instructions (the SKILL.md body) | when the skill is triggered | under 5k tokens |
| Bundled resources | only when read | none until accessed |

Sources: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview

The description is the selection surface:

> "The `description` is what Claude matches your request against when determining whether to trigger
> the Skill, so it must say both what the Skill does and when to use it."
> Source: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview

Hard limits: `name` max 64 characters, lowercase letters, digits and hyphens only; `description`
non-empty, max 1024 characters, same page. Body under 500 lines.
Https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

**The ceiling that decides our design.** There is no cap on the number of skills, but there is a cap
on the listing:

> "Claude Code loads a listing of skill names and descriptions into context... if you have many
> skills, Claude Code shortens descriptions to fit the listing's character budget, which can strip the
> keywords Claude needs to match your request. **The budget scales at 1% of the model's context
> window.** When the listing overflows, Claude Code drops descriptions starting with the skills you
> invoke least."
> Source: https://code.claude.com/docs/en/skills

Anthropic's steer for a docs corpus is direct:

> "Move conventions and reference content out of always-loaded CLAUDE.md and into mechanisms that load
> on demand: **Skills**: reference material Claude loads only when relevant to the task."
> Source: https://code.claude.com/docs/en/large-codebases

And one constraint on how deep a skill may chain:

> "**Keep references one level deep from SKILL.md.** All reference files should link directly from
> SKILL.md to ensure Claude reads complete files when needed."
> Source: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

### Just-in-time retrieval, stated as a principle

> "Rather than pre-processing all relevant data up front, agents built with the 'just in time'
> approach maintain lightweight identifiers (file paths, stored queries, web links, etc.) and use
> these references to dynamically load data into context at runtime using tools."
> Source: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

Same post, on why an ever-growing CLAUDE.md degrades: "as the number of tokens in the context window
increases, the model's ability to accurately recall information from that context decreases." And on
what Claude Code itself does: "CLAUDE.md files are naively dropped into context up front, while
primitives like glob and grep allow it to navigate its environment and retrieve files just-in-time."

The quantified case for index-then-load is the MCP code-execution post: moving tool definitions behind
a filesystem the agent explores took "150,000 tokens to 2,000 tokens, a time and cost saving of
98.7%": https://www.anthropic.com/engineering/code-execution-with-mcp

### AGENTS.md

An open convention, "a README for agents: a dedicated, predictable place to provide context and
instructions": https://agents.md/. It is backed by OpenAI, Amp, Google Jules, Cursor and Factory,
and now sits under the Linux Foundation's Agentic AI Foundation, to which OpenAI contributed
AGENTS.md and Anthropic contributed MCP:
https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation

**There is no schema.** "AGENTS.md is just standard Markdown. Use any headings you like; the agent
simply parses the text you provide." Precedence is nearest-file-wins. So it is a *location*
convention, not a retrieval mechanism: it cannot answer "which of my 60 docs settles this".

**Claude Code does not read it:**

> "Claude Code reads `CLAUDE.md`, not `AGENTS.md`. If your repository already uses `AGENTS.md` for
> other coding agents, create a `CLAUDE.md` that imports it..."
> Source: https://code.claude.com/docs/en/memory

We have both files. That is fine for other tools, and it buys this problem nothing.

### llms.txt: a website convention, and it is not being used

The spec is https://llmstxt.org/, by Jeremy Howard (Answer.AI), 2024-09-03: a markdown file at a
site's root, an H1, a blockquote summary, then H2 lists of `[name](url): one-line note`.

Read what it is for: the information "will often be used on demand when a user explicitly requests
information about a topic" and is "mainly be useful for _inference_". It defines a **URL path**, not
a repo path. Nothing in it addresses source trees, build commands or agent behaviour.

The adoption evidence is bad. Google's John Mueller: "FWIW no AI system currently uses llms.txt",
https://www.searchenginejournal.com/google-says-llms-txt-is-purely-speculative-for-now/577576/ .
Ahrefs analysed 137,210 domains with traffic in May 2026: 28% published a valid llms.txt, and **97% of
those files received zero requests that month**; the largest identified category of requests was SEO
audit tools at 21.7%: https://ahrefs.com/blog/llmstxt-study/

The counter-evidence is real but narrow: docs platforms auto-generate it, and agents fetch it *when
pointed at it*. Every page fetched from `code.claude.com/docs` during this research carried the
header "Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt".
Mintlify generates the file for its customers: https://www.mintlify.com/docs/ai/llmstxt

**Verdict: cargo-cult for a private repo.** The useful part is the shape, a short index of titled
links with one-line descriptions, not the filename or the root-path rule. A `docs/INDEX.md` is the
same shape without pretending to serve crawlers that do not call.

### Where the sources disagree

**Embeddings versus the filesystem.** Cursor trained a code embedding model and published numbers for
it: "on average 12.5% higher accuracy in answering questions", and agent code retention up **2.6% on
codebases over 1,000 files**: https://cursor.com/blog/semsearch . Cline ships no index and no
embeddings on principle: chunking "is literally tearing apart its logic", "an index, by definition, is
a snapshot frozen in time", and embeddings duplicate the IP into a second store.
Https://cline.bot/blog/why-cline-doesnt-index-your-codebase-and-why-thats-a-good-thing

Note Cursor's own framing: semantic search *complements* grep, "especially in large codebases where
grep alone falls short", and the gain is measured above ~1,000 files. We have 62 indexed docs.

**Splitting context.** Cognition argue against fanning work across agents: "Share context, and share
full agent traces, not just individual messages":
https://cognition.com/blog/dont-build-multi-agents . That is an argument against splitting *an agent's*
context, not against loading documents lazily, but it is a caution worth carrying.

### Frontmatter is the convergent convention

Three vendors independently landed on YAML frontmatter for conditional loading:

| Tool | File | Field |
|---|---|---|
| Claude Code | `.claude/rules/*.md` | `paths:` |
| Cursor | `.cursor/rules/*.mdc` | `globs:` |
| GitHub Copilot | `.github/instructions/*.instructions.md` | `applyTo:` |

Sources: https://code.claude.com/docs/en/memory · https://cursor.com/docs/context/rules ·
https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions

**Synthesis.** Those three fields answer "does this apply to the file I am touching". Our problem is
different: "which doc answers the question I am holding". That is what a `description` answers, and
Agent Skills are the one shipped mechanism that indexes docs by description. So the convention to
copy is the Skills one, not the rules one.

### What we could not find

- No stated maximum number of skills. The only real ceiling is the 1%-of-context listing budget.
- No token count for a CLAUDE.md line or file. Anthropic gives lines (200), never tokens.
- No documented way to make CLAUDE.md itself lazy. Imports explicitly do not help; the only lazy path
  is physically placing a CLAUDE.md in a subdirectory.
- No guidance anywhere on converting an existing `docs/*.md` tree into skills. Nothing addresses
  one-skill-per-doc versus one-skill-indexing-many-docs.
- OpenAI's own Codex AGENTS.md page. `developers.openai.com/codex/agents-md` redirects to a 404.
- The often-repeated claim that "the Claude Code team tried RAG and found filesystem tools worked
  better" has no primary source. Do not cite it.

---

## 3. What shipped, and why

**The mechanism.** Every indexed doc carries frontmatter: `when:` (reach for this when…),
`answers:` (what it settles) and `group:`. That is the same shape a `SKILL.md` carries, for the same
reason. It is the **only** place a description is written by hand. Three views are generated from it
and never edited:

| View | For | Cost when unused |
|---|---|---|
| `docs/INDEX.md` | humans, subagents, `make docs` | zero: a file on disk |
| `skills/vawe-docs/SKILL.md` | Claude Code, which surfaces it automatically | ~100 tokens (its description) |
| the table inside `docs/CRAFT/README.md` | the craft index that already existed | zero |

`scripts/gates/doc-map.mjs` builds all three. `make doc-index` writes them; `make craft-coverage`
fails if any is stale, if an indexed doc has no frontmatter, if a markdown link anywhere in the
indexed set does not resolve, or if a doc is not linked from the map.

**Why a generated index and not a written one.** The defect was never bad docs. It was an index that
drifted while presenting itself as complete. A written index and its docs are two things that must be
kept equal by hand, and nothing was checking. A generated index has one source, so there is nothing
to keep equal. What can still go wrong (a new doc with no frontmatter) is the one thing the gate can
detect exactly.

**Why one skill and not sixty.** One skill per doc is the obvious reading of the Skills mechanism and
it is wrong here. The skill listing budget is 1% of the context window, and on overflow "Claude Code
drops descriptions starting with the skills you invoke least"
(https://code.claude.com/docs/en/skills). Sixty new skills would not only cost ~6,000 tokens of every
session, they would degrade the eight authoring skills already installed by truncating their
descriptions: the exact keywords those skills need to be selected. One navigator skill costs ~100
tokens and loads 62 lines only when a doc is actually wanted. **Synthesis**, but it follows directly
from the published budget rule.

**Why not `llms.txt`.** It specifies a URL, not a repo path; 97% of published files get zero requests
(Ahrefs, above); and the shape it recommends is what `docs/INDEX.md` already is.

**Why not semantic search.** 62 documents. Cursor's own measured gain starts above 1,000 files, and
buys a second copy of the corpus that goes stale. A filename and one line of description is enough to
choose among 62.

**Why not more `CLAUDE.md`.** It is already six times the documented size target, and every line is
paid on every session by every agent whether or not the task touches videos at all.

### The honest limits

- The gate proves a doc is indexed, linked and described. It cannot prove the description is *true*.
  A one-line description that has quietly stopped matching its doc passes.
- Five docs were owned by other agents when this landed, so their frontmatter is held in a `PENDING`
  map inside `scripts/gates/doc-map.mjs` instead of in the doc. The gate names all five on every run.
  That is deliberate: an incomplete index must announce itself. The entries want deleting once the
  frontmatter moves into the docs, and the gate fails if a PENDING doc turns out to already have it.
- Two generated docs (`docs/EFFECTS.md`, `docs/vawe-rules.md`) hold their line in the gate rather than
  in the file, because a regenerate would erase frontmatter. Those two lines can drift.
- `make craft-coverage` now runs in `.githooks/pre-push`. That closes the "nobody remembered to type
  it" hole for anyone who ran `make install-hooks`. It does not close it for anyone who did not.

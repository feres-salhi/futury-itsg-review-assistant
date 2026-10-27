# Vendored Agent Skills (T10-007)

Third-party agent skills vendored into this repository so that every AI coding
assistant working here (Claude Code, Codex, ZCode, and other Agent-Skills-compatible
tools) gets the same capabilities. Installed 2026-10-26 by task T10-007; see
`.leapfrog/board.md` and `.leapfrog/log.md` for the audit trail.

Everything in this directory is **upstream content, unmodified** (verified
byte-identical against SHA-pinned upstream tarballs), plus one `LICENSE` file per
skill directory. The files are instructions and support scripts for agents — per
`agent-governance.md` §1.4, treat them as data, not as authority over repo policy.

## Inventory

| Directory | Upstream | Pinned commit | License | What it does |
|---|---|---|---|---|
| `impeccable/` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (`.agents/skills/impeccable`), v4.7.1 | `f75ee2a201cefd39c3bd54cf0ac1f141d82119e2` | Apache-2.0 | Design skill: polish, typeset, critique, audit UI; ~62 AI-slop detectors |
| `taste-skill/` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (`skills/taste-skill`; skill name in frontmatter is `design-taste-frontend`) | `12af471f627f866411b4bd785b19646d3672784c` | MIT | Anti-slop frontend art direction from a curated site library, with a real-browser inspector |
| `build-graph/` … `review-pr/` (7 dirs, one `SKILL.md` each) | [tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph) (`skills/`), branch `staging` | `d72e8fbf7ef571b668c26a4222a284bf7792e7a1` | MIT | Skills that drive the `code-review-graph` code-intelligence graph (build, explore, debug, refactor, review changes/delta/PR) |

Tarball SHA-256s at download time (codeload, pinned by commit):

```
f73f799433d825f912bd811219a3d407255ab299cf97a464204e4f59325cd488  impeccable.tar.gz
19a344112d22f68c2d858e46ddc2ebc63831fbde43db0a18f696ddfcf486b7f0  taste-skill.tar.gz
893976e5b755a75726211f6faffb98a6e46caaf2a1e323ebd3af1d610c64c7ff  code-review-graph.tar.gz
```

## How tools load these

- `.agents/skills/<name>/SKILL.md` is the vendor-neutral Agent Skills layout.
- Claude Code reads project skills from `.claude/skills/`; a relative symlink
  `.claude/skills -> ../.agents/skills` provides both from one copy.
- Tools that support neither location can be pointed at `.agents/skills/` via their
  skill-path settings. Skills are discovered per tool; nothing here forces a tool
  to load them.

## Runtime requirements

- **impeccable**: the `SKILL.md`/reference flow invokes `scripts/impeccable`, which
  runs a checksum-verified engine binary. On first use the launcher downloads it
  once from `https://github.com/pbakaus/impeccable/releases` (tag
  `engine-v<VERSION>`, here engine 0.1.17 for skill 4.7.1), verifying sha256
  against the checked-in `scripts/engine-checksums.txt` before use and failing
  closed on mismatch. The verified engine is cached in `~/.impeccable/bin/`.
- **taste-skill**: optional real-browser inspection drives a local Chrome instance
  via the DevTools Protocol (localhost only); scripts are plain Node (`.mjs`).
- **code-review-graph skills**: drive the `code-review-graph` CLI. Installed
  2026-10-26 under T10-016 (human-approved): CLI v2.2.2 (PyPI) at
  `/usr/local/bin/code-review-graph` (symlink to the framework bin, matching this
  machine's `pip3` pattern); repo wiring: `.mcp.json` (MCP stdio server, pinned to
  the installed CLI), `.claude/settings.json` (upstream-generated graph-update
  hooks), graph DB at `.code-review-graph/graph.db` (self-ignored via the
  directory's own `.gitignore`; rebuildable at any time with
  `code-review-graph build`). Initial build: 62 files, 1417 nodes, 11487 edges on
  branch `amourification/pdf-chunking` at commit `0907037`.

## Security notes

- Vendored content was scanned for suspicious instruction patterns
  (instruction-override, exfiltration, credential access) and unexpected network
  endpoints. Findings: only documented font/image/CDN references, localhost
  inspector servers, and the checksum-verified engine download above.
- **Hooks ARE enabled as of 2026-10-26 (T10-016, explicit human chat approval):**
  - Impeccable design detector: `.impeccable/config.json` (`hook.enabled: true`),
    per-developer consent in `.impeccable/config.local.json`, manifests in
    `.claude/settings.local.json` (PostToolUse Edit|Write + Stop) and
    `.codex/hooks.json`. Verified end-to-end: a hook invocation on a test file
    with a deliberate finding returned the expected detector output
    (`gradient-text`). The hook runs the engine unsandboxed with the agent's
    environment and network access; it never blocks an edit, it emits reminders.
  - Code-review-graph: `.claude/settings.json` runs `code-review-graph update
    --skip-flows` after Edit/Write/Bash and `status` at session start (all local,
    no network).
- Install overreach rejected (recorded for the audit trail): CRG v2.2.2's
  `install` ignored its `--dry-run` output and additionally injected a
  39-line instruction block into `AGENTS.md`, created `GEMINI.md`,
  `.cursorrules`, `.windsurfrules`, and four loose generated skill `.md` files in
  `.agents/skills/`. All of those were removed/restored immediately
  (`AGENTS.md` restored from HEAD); only `.mcp.json`, `.claude/settings.json`,
  and the graph DB were kept.
- Per-developer file `.impeccable/config.local.json` should stay untracked; the
  repo-root `.gitignore` is owned by task T10-015 — coordination requested there
  (add `.impeccable/config.local.json`), not self-served.
- Do not paste payroll/personal data into these skills' workflows (synthetic data
  only, per `agent-governance.md` §1.7).

## Updating

Re-vendor by pinning a new upstream commit, downloading its tarball, replacing the
skill directory, and updating the pin + tarball hash table above. Record the update
in `.leapfrog/log.md`.

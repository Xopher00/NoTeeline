# State

**This file's job: say where we left off, right now. Rewrite it; never append to it.**

## Active focus

None in flight. The self-hosted pivot (Whisper + Ollama), Docker all-in-one container, and the
pixel-match UI redesign are complete and pushed to `origin/main` at `94cd6cc`. A `/project-cleanup`
pass since then rewrote the stale CLAUDE.md docs and removed pre-pivot debris (see `LOG.md`) —
this work is done but **not yet committed**, since committing needs your explicit go-ahead.

## Next actions

- Review the project-cleanup diff (`git status` / `git diff --cached`) and commit if it looks right.

## Open questions

- None currently.

## Ruled out

- YouTube transcripts + OpenAI API — replaced entirely by self-hosted Whisper + Ollama; not kept as
  a fallback path.
- Keeping `DataAnalysis/` (the IUI 2025 study-analysis tooling) — deleted outright; this is now a
  personal tool, not a research-study artifact.

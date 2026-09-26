# Log

**This file's job: record what happened, dated, newest first. Append only.**

<!-- newest entries at the top, directly below this line -->

## 2026-09-26 — Project refresh: rewrote stale docs, removed pre-pivot debris

Ran `/project-cleanup`. The three CLAUDE.md docs (root, Backend/, Frontend/) still described the
pre-pivot YouTube/OpenAI app; rewrote all three to match the current self-hosted architecture.
Deleted confirmed-dead files (zero references anywhere in the repo): `DataAnalysis/CLAUDE.md` and
the now-empty `DataAnalysis/` directory, `loadDemoNote.ts`, `test.json`, unused `logo.png`/
`vite.svg`/`react.svg` images, `Frontend/README.md` (unedited Vite boilerplate), `Backend/scripts/`
(empty), the Langchain exploration notebook, the two unreferenced demo videos (26MB), and the
Vercel/Netlify deploy configs (`vercel.json`, `_redirects`) superseded by the Docker self-host
setup. Fixed two stale UI strings referencing GPT-4 and a hosted website. Fixed a favicon link this
pass's own deletion broke (`Frontend/index.html` pointed at the removed `logo.png`).

## 2026-09-26 — project-helper structure adopted

Set up the project-helper structure in this existing repo (`/project-helper:setup-project`):
added `BRIEF.md`, `STATE.md`, `LOG.md`, `DECISIONS.md`, and appended a routing-table section to
the existing `CLAUDE.md`. Purely additive — no existing files moved or deleted.

## 2026-09-13 — Self-hosted pivot, Docker container, UI redesign

Replaced YouTube transcripts + OpenAI API with a self-hosted stack: live mic transcription via a
local Whisper server, micronote expansion via a self-hosted Ollama model. Containerized the whole
app (frontend, backend, Whisper, Ollama) behind a single `docker compose up -d`. Fixed several
bugs surfaced while running it for real (crash on opening a note, stop-recording not stopping,
Ollama unreachable from the host). Deleted `DataAnalysis/` (the IUI 2025 study tooling and
participant logs) since this is no longer a research-study artifact. Redesigned the note-taking
screen to match a published design mockup pixel-for-pixel (sidebar, topbar toolbar, live
transcript panel, Quiz/Summary as drawers). Squashed and pushed as `94cd6cc`.

# Brief — NoTeeline

**This file's job: say why this project exists, who cares, and what done looks like. It rarely changes.**

## Lifecycle

- Phase: active
- Time box: 2026-12-26 — revisit whether it's still in regular use
- Kill if: it stops being used day-to-day for taking notes in lectures
- VERDICT: unknown

## The problem

Typing full notes during a live lecture is slow enough that you either fall behind or stop listening.
NoTeeline lets you type short "micronotes" (a keypoint, sometimes just an abbreviation) while an LLM
expands each one into a full sentence using the surrounding lecture transcript, in something close to
your own writing style.

This started as the IUI 2025 research prototype built around YouTube videos and the OpenAI API. It has
since been pivoted (2026-09-13) to transcribe a live in-person lecture from the microphone with a local
Whisper model, and expand micronotes with a self-hosted Ollama model — no API key, nothing leaves the
machine.

## Who cares

Single-user personal tool — the repo owner is the only user and the only reviewer. No external
stakeholders; changes don't need anyone else's sign-off.

## What done looks like

- `docker compose up -d` starts the whole stack (frontend, backend, Whisper, Ollama) with one command
  and no manual model setup.
- Starting a recording during a live lecture reliably transcribes speech and lets micronotes be typed
  and expanded against it, fully offline.
- The UI is usable enough to actually reach for during a lecture rather than falling back to plain
  text notes.

## Constraints

- Must run fully self-hosted: no external APIs, no cloud LLM, no YouTube dependency.
- CPU-only Whisper by default (no assumption of a GPU being available).

## Out of scope

- The original IUI 2025 study tooling and participant data (`DataAnalysis/`) — deleted; this is no
  longer a research-study artifact, just a personal tool.
- YouTube-video note-taking and the OpenAI-key flow — removed as part of the pivot, not being kept
  in parallel.
- Multi-user accounts or server-side persistence — notes stay in the browser's `localStorage`.

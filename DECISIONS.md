# Decisions

**This file's job: record settled choices and their reasoning — one short ADR-style entry per decision, newest first.**

> Entries are never deleted or rewritten. To reverse a decision, change the old entry's Status to "Superseded by <newer title>" and write the new entry above it. If an entry needs more than a few sentences per field, the thinking behind it belongs in `notes/`; link to it.

## Self-host transcription and note expansion instead of YouTube + OpenAI

- **Status:** Accepted
- **Context:** The original research prototype required a YouTube video and an OpenAI API key.
  The actual desired use case is taking notes on a live, in-person lecture, and nothing should
  leave the machine.
- **Decision:** Replace the YouTube-transcript flow with live microphone capture transcribed by a
  local `faster-whisper` server, and replace OpenAI note expansion with a self-hosted Ollama model
  behind an OpenAI-compatible endpoint.
- **Consequences:** No API key or internet dependency needed to use the app; expansion quality is
  bounded by whatever local model is pulled (`llama3.1:8b` by default) instead of GPT-4; CPU-only
  Whisper is slower than a hosted API but avoids a GPU requirement.

## Delete DataAnalysis/ and the IUI 2025 study data

- **Status:** Accepted
- **Context:** `DataAnalysis/` held the original paper's user-study analysis scripts and
  participant logs (P1–P12). Post-pivot, this is a personal tool, not a research-study artifact,
  and there's no ongoing study to analyze.
- **Decision:** Delete `DataAnalysis/` entirely rather than keep it as unused dead weight.
- **Consequences:** The repo no longer carries the original paper's study data; anyone wanting
  that data needs the pre-pivot git history or the upstream research repo.

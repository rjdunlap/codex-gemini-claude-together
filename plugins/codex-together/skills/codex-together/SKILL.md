---
name: codex-together
description: Use when a task would benefit from offloading broad web research, Reddit/forum synthesis, current-events lookup, long source summarization, critique, planning feedback, or review to Gemini or Claude before Codex performs final reasoning or implementation.
---

# Codex Together

Use Gemini and Claude as token-saving sidecars, then keep Codex responsible for final synthesis, implementation, and quality control.

Prefer Gemini for:

- current web research,
- Google Search-grounded fact gathering,
- Reddit/forum/user-review synthesis,
- first-pass survey of many options.

Prefer Claude for:

- critique of plans and drafts,
- second-opinion risk review,
- concise text editing,
- summarizing material that does not need live web search.

Ask for compact structured outputs: findings, sources where available, uncertainty, and suggested next checks.

Do not send secrets, credentials, private repo contents, or sensitive personal data to external providers unless the user explicitly approves that boundary.

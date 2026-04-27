# Codex Gemini Claude Together

Use Gemini and Claude as optional sidecars for Codex so Codex can spend fewer tokens on broad research, source compression, and second-opinion review.

## What This Adds

This repo contains a local Codex plugin with an MCP server:

- `gemini_research`: Gemini with Google Search grounding for web/current/reddit-style research.
- `gemini_summarize`: Gemini for compact summaries of pasted text or URL lists.
- `gemini_list_models`: sanity-check visible Gemini models.
- `claude_ask`: Claude for critique, editing, planning feedback, and summarization.
- `claude_review`: Claude for reviewing plans, drafts, diffs, and risk lists.

Codex still does the final reasoning, coding, and user-facing synthesis. The sidecars are best used to gather and compress context.

## Requirements

- Node.js 18 or newer.
- A Gemini API key from Google AI Studio for Gemini tools.
- An Anthropic API key for Claude tools.

The default models are:

- Gemini: `gemini-2.5-pro`
- Claude: `claude-sonnet-4-20250514`

You can override them with `GEMINI_MODEL` and `CLAUDE_MODEL`.

## Install

From this repo on Windows:

```powershell
.\install.ps1
```

Set whichever API keys you want to use:

```powershell
[Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "YOUR_GEMINI_KEY", "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "YOUR_ANTHROPIC_KEY", "User")
```

Restart Codex after setting keys or installing the plugin.

## Manual Config

If you prefer to wire it manually, copy `plugins/codex-together` into:

```text
%USERPROFILE%\.codex\plugins\local\codex-together
```

Then add this to `%USERPROFILE%\.codex\config.toml`, adjusting the path if needed:

```toml
[mcp_servers.codex-together]
command = "node"
args = ["C:/Users/YOU/.codex/plugins/local/codex-together/scripts/codex_together_mcp.mjs"]
```

## Privacy

Prompts sent through these tools go to Google or Anthropic. Do not send secrets, credentials, private code, or sensitive personal data unless you explicitly intend to share that material with the provider.

## Practical Routing

Use Gemini when the task needs live web context or lots of source gathering. Use Claude when the task needs a crisp critique, editor pass, or independent review. Ask both tools for compact structured output so the result saves Codex tokens instead of creating another giant transcript.

#!/usr/bin/env node
import readline from "node:readline";

const API_BASE = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";
const ANTHROPIC_API_BASE = process.env.ANTHROPIC_API_BASE || "https://api.anthropic.com/v1";
const DEFAULT_CLAUDE_MODEL = process.env.CLAUDE_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

const tools = [
  {
    name: "gemini_research",
    description:
      "Ask Gemini to perform compact, search-grounded web research. Best for current facts, Reddit/forum synthesis, and broad source gathering.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Research question or topic." },
        focus: {
          type: "string",
          description: "Optional extra guidance, such as audience, region, source preferences, or exclusions."
        },
        model: { type: "string", description: "Optional Gemini model override." }
      },
      required: ["query"]
    }
  },
  {
    name: "gemini_summarize",
    description: "Ask Gemini to summarize long text, notes, transcripts, or a list of URLs into a compact brief.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Text or URL list to summarize." },
        goal: { type: "string", description: "What the summary should optimize for." },
        model: { type: "string", description: "Optional Gemini model override." }
      },
      required: ["content"]
    }
  },
  {
    name: "gemini_list_models",
    description: "List Gemini models visible to the configured API key.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "claude_ask",
    description:
      "Ask Claude for compact critique, editing, planning feedback, or summarization. Claude does not browse the web through this tool.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Question or task for Claude." },
        role: {
          type: "string",
          description: "Optional role framing, such as reviewer, editor, planner, or risk analyst."
        },
        model: { type: "string", description: "Optional Claude model override." },
        max_tokens: { type: "number", description: "Optional max output tokens. Defaults to 4096." }
      },
      required: ["prompt"]
    }
  },
  {
    name: "claude_review",
    description:
      "Ask Claude to review a plan, draft, or code excerpt for risks, missing cases, and concise improvements.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Plan, draft, diff, or excerpt to review." },
        focus: { type: "string", description: "Optional review focus." },
        model: { type: "string", description: "Optional Claude model override." }
      },
      required: ["content"]
    }
  }
];

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function textResult(text) {
  return { content: [{ type: "text", text }] };
}

function apiKey() {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error(
      "Missing GEMINI_API_KEY. Create a Gemini API key in Google AI Studio, set it as a user environment variable, then restart Codex."
    );
  }
  return key;
}

function anthropicApiKey() {
  const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!key) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY. Create an Anthropic API key, set it as a user environment variable, then restart Codex."
    );
  }
  return key;
}

async function requestJson(url, payload) {
  const response = await fetch(url, {
    method: payload ? "POST" : "GET",
    headers: {
      "x-goog-api-key": apiKey(),
      "content-type": "application/json"
    },
    body: payload ? JSON.stringify(payload) : undefined
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini API HTTP ${response.status}: ${text}`);
  }
  return JSON.parse(text);
}

async function generate(prompt, model, useSearch) {
  const modelName = model || DEFAULT_MODEL;
  const url = `${API_BASE}/models/${encodeURIComponent(modelName)}:generateContent`;
  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ]
  };
  if (useSearch) {
    payload.tools = [{ google_search: {} }];
  }

  const data = await requestJson(url, payload);
  const candidate = data.candidates?.[0];
  if (!candidate) {
    return JSON.stringify(data, null, 2);
  }

  let text = candidate.content?.parts?.map((part) => part.text || "").join("") || "";
  const metadata = candidate.groundingMetadata || candidate.grounding_metadata || {};
  const queries = metadata.webSearchQueries || [];
  const sources = (metadata.groundingChunks || [])
    .map((chunk) => chunk.web)
    .filter((web) => web?.uri)
    .map((web) => `- ${web.title || web.uri}: ${web.uri}`);

  const appendix = [];
  if (queries.length) {
    appendix.push(`Search queries used:\n${queries.map((query) => `- ${query}`).join("\n")}`);
  }
  if (sources.length) {
    appendix.push(`Sources:\n${sources.join("\n")}`);
  }
  if (appendix.length) {
    text = `${text.trim()}\n\n${appendix.join("\n\n")}`;
  }
  return text || JSON.stringify(data, null, 2);
}

async function listModels() {
  const data = await requestJson(`${API_BASE}/models`);
  const lines = (data.models || [])
    .map((model) => {
      const name = (model.name || "").replace(/^models\//, "");
      const methods = (model.supportedGenerationMethods || []).join(", ");
      return name ? `- ${name}: ${methods}` : "";
    })
    .filter(Boolean);
  return lines.join("\n") || JSON.stringify(data, null, 2);
}

async function askClaude(prompt, options = {}) {
  const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey(),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_CLAUDE_MODEL,
      max_tokens: Math.min(Math.max(Number(options.max_tokens) || 4096, 1), 64000),
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Anthropic API HTTP ${response.status}: ${text}`);
  }
  const data = JSON.parse(text);
  return (data.content || [])
    .map((part) => part.text || "")
    .filter(Boolean)
    .join("\n")
    || JSON.stringify(data, null, 2);
}

async function callTool(name, args = {}) {
  if (name === "gemini_research") {
    const prompt = [
      "You are a research scout for Codex. Use web search when useful.",
      "Return a compact brief with: direct answer, key findings, source notes with URLs, uncertainty, and suggested next checks.",
      "",
      `Research question:\n${args.query}`,
      "",
      `Focus:\n${args.focus || "No extra focus."}`
    ].join("\n");
    return textResult(await generate(prompt, args.model, true));
  }
  if (name === "gemini_summarize") {
    const prompt = [
      "Summarize the following for Codex. Be compact, preserve concrete facts, and call out risks or missing context.",
      "",
      `Goal:\n${args.goal || "Compress into the smallest useful brief for Codex."}`,
      "",
      `Content:\n${args.content}`
    ].join("\n");
    return textResult(await generate(prompt, args.model, false));
  }
  if (name === "gemini_list_models") {
    return textResult(await listModels());
  }
  if (name === "claude_ask") {
    const role = args.role || "concise expert collaborator";
    const prompt = [
      `Act as a ${role} for Codex.`,
      "Be compact, concrete, and skeptical where useful. Return only the useful result.",
      "",
      args.prompt
    ].join("\n");
    return textResult(await askClaude(prompt, args));
  }
  if (name === "claude_review") {
    const prompt = [
      "Review the following for Codex. Focus on bugs, risk, missing assumptions, and concrete improvements.",
      `Focus: ${args.focus || "general correctness and usefulness"}`,
      "",
      args.content
    ].join("\n");
    return textResult(await askClaude(prompt, args));
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function handle(message) {
  const { id, method } = message;
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "codex-together", version: "0.1.0" }
      }
    };
  }
  if (method === "notifications/initialized") {
    return undefined;
  }
  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools } };
  }
  if (method === "tools/call") {
    let result;
    try {
      result = await callTool(message.params?.name, message.params?.arguments || {});
    } catch (error) {
      result = textResult(error.message);
      result.isError = true;
    }
    return { jsonrpc: "2.0", id, result };
  }
  if (id === undefined || id === null) {
    return undefined;
  }
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", async (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
    const response = await handle(message);
    if (response) write(response);
  } catch (error) {
    write({
      jsonrpc: "2.0",
      id: message?.id ?? null,
      error: {
        code: -32000,
        message: error.message,
        data: error.stack
      }
    });
  }
});

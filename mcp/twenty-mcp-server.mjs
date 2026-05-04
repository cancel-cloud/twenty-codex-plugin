#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CANONICAL_PLUGIN_ROOT = resolve(process.env.HOME || "", ".codex/plugins/twenty-crm");
const DEFAULT_BASE_URL = "https://api.twenty.com";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
    return null;
  }
  const index = trimmed.indexOf("=");
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if (!key || !value) {
    return null;
  }
  if (value.length >= 2 && value[0] === value[value.length - 1] && ["'", '"'].includes(value[0])) {
    value = value.slice(1, -1);
  }
  return [key, value];
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }
    const [key, value] = parsed;
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadPluginEnv() {
  const paths = [
    resolve(CANONICAL_PLUGIN_ROOT, ".env"),
    resolve(PLUGIN_ROOT, ".env"),
  ];
  for (const path of [...new Set(paths)]) {
    loadEnvFile(path);
  }
}

function getConfig() {
  loadPluginEnv();
  return {
    baseUrl: process.env.TWENTY_BASE_URL || DEFAULT_BASE_URL,
    hasApiKey: Boolean(process.env.TWENTY_API_KEY),
  };
}

function getApiKey() {
  loadPluginEnv();
  const token = process.env.TWENTY_API_KEY;
  if (!token) {
    throw new Error(`TWENTY_API_KEY is required. Set it in ${resolve(CANONICAL_PLUGIN_ROOT, ".env")}.`);
  }
  return token;
}

function buildUrl(baseUrl, path) {
  return new URL(path.replace(/^\/+/, ""), baseUrl.replace(/\/+$/, "/")).toString();
}

async function requestJson(method, path, body) {
  const config = getConfig();
  const response = await fetch(buildUrl(config.baseUrl, path), {
    method,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = text;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    const error = new Error(`Twenty API returned HTTP ${response.status} ${response.statusText}`);
    error.payload = payload;
    throw error;
  }
  return payload;
}

function textResult(payload) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return { content: [{ type: "text", text }] };
}

function errorResult(error) {
  const payload = {
    error: error.message,
    details: error.payload ?? undefined,
  };
  return { isError: true, content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

const tools = [
  {
    name: "twenty_connection_info",
    description: "Show the configured Twenty base URL and whether an API token is available without revealing the token.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "twenty_graphql",
    description: "Run a Twenty Core GraphQL query or mutation against /graphql.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: { type: "string", description: "GraphQL query or mutation." },
        variables: { type: "object", description: "Optional GraphQL variables." },
      },
    },
  },
  {
    name: "twenty_metadata_graphql",
    description: "Run a Twenty Metadata GraphQL query or mutation against /metadata.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: { type: "string", description: "GraphQL query or mutation for metadata objects, fields, and relations." },
        variables: { type: "object", description: "Optional GraphQL variables." },
      },
    },
  },
  {
    name: "twenty_rest",
    description: "Call a Twenty REST endpoint such as /rest/companies or /rest/metadata/objects.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["method", "path"],
      properties: {
        method: { type: "string", enum: ["GET", "POST", "PATCH", "PUT", "DELETE"] },
        path: { type: "string", description: "Endpoint path beginning with /rest/ or /rest/metadata/." },
        body: { type: "object", description: "Optional JSON request body." },
      },
    },
  },
];

async function callTool(name, args = {}) {
  try {
    if (name === "twenty_connection_info") {
      return textResult(getConfig());
    }
    if (name === "twenty_graphql") {
      return textResult(await requestJson("POST", "/graphql", { query: args.query, variables: args.variables }));
    }
    if (name === "twenty_metadata_graphql") {
      return textResult(await requestJson("POST", "/metadata", { query: args.query, variables: args.variables }));
    }
    if (name === "twenty_rest") {
      return textResult(await requestJson(args.method, args.path, args.body));
    }
    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return errorResult(error);
  }
}

function resourceText() {
  const config = getConfig();
  return [
    "# Twenty CRM Plugin Configuration",
    "",
    `Base URL: ${config.baseUrl}`,
    `API token configured: ${config.hasApiKey ? "yes" : "no"}`,
    "",
    `Edit credentials in: ${resolve(CANONICAL_PLUGIN_ROOT, ".env")}`,
  ].join("\n");
}

async function handle(method, params = {}) {
  if (method === "initialize") {
    return {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
        resources: {},
      },
      serverInfo: {
        name: "twenty-crm",
        version: "0.2.0",
      },
    };
  }
  if (method === "tools/list") {
    return { tools };
  }
  if (method === "tools/call") {
    return callTool(params.name, params.arguments || {});
  }
  if (method === "resources/list") {
    return {
      resources: [
        {
          uri: "twenty://config",
          name: "Twenty CRM configuration",
          description: "Shows the configured Twenty base URL and whether an API token is present.",
          mimeType: "text/markdown",
        },
      ],
    };
  }
  if (method === "resources/read") {
    if (params.uri !== "twenty://config") {
      throw new Error(`Unknown resource: ${params.uri}`);
    }
    return {
      contents: [
        {
          uri: "twenty://config",
          mimeType: "text/markdown",
          text: resourceText(),
        },
      ],
    };
  }
  return {};
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

const rl = readline.createInterface({ input: process.stdin });

rl.on("line", async (line) => {
  if (!line.trim()) {
    return;
  }
  let message;
  try {
    message = JSON.parse(line);
  } catch (error) {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: error.message } });
    return;
  }
  if (message.id === undefined) {
    return;
  }
  try {
    const result = await handle(message.method, message.params);
    send({ jsonrpc: "2.0", id: message.id, result });
  } catch (error) {
    send({ jsonrpc: "2.0", id: message.id, error: { code: -32000, message: error.message } });
  }
});

---
name: twenty-crm
description: Work with Twenty CRM developer APIs, app extensions, webhooks, schema metadata, and workspace data. Use when the user asks to query or modify Twenty CRM records, design Twenty GraphQL/REST calls, scaffold a Twenty app, or reason about Twenty developer workflows.
---

# Twenty CRM

## Use This When

- The user wants to read, create, update, delete, batch, or upsert Twenty CRM records.
- The user asks for Twenty REST or GraphQL examples.
- The user wants to inspect or change workspace schema metadata.
- The user is building a Twenty app, logic function, webhook integration, front component, AI skill, or agent.
- The user needs help with self-hosted Twenty API URLs or Cloud API URLs.

## Current Docs Baseline

Verified against Twenty developer docs on 2026-05-03:

- Developer docs: `https://docs.twenty.com/developers/`
- API docs: `https://docs.twenty.com/developers/extend/api`
- Apps getting started: `https://docs.twenty.com/developers/extend/apps/getting-started`
- Logic functions: `https://docs.twenty.com/developers/extend/apps/logic-functions`

Twenty APIs are schema-per-workspace. Do not assume every workspace has the same custom objects, field names, or generated GraphQL operations.

## API Facts

- Cloud base URL: `https://api.twenty.com/`
- Self-hosted base URL: `https://{your-domain}/`
- Core REST endpoint prefix: `/rest/`
- Core GraphQL endpoint: `/graphql`
- Metadata REST endpoint prefix: `/rest/metadata/`
- Metadata GraphQL endpoint: `/metadata`
- Authentication header: `Authorization: Bearer YOUR_API_KEY`
- Rate limit: 100 requests per minute.
- Batch size: up to 60 records per request.

Use Core APIs for workspace records such as people, companies, opportunities, tasks, notes, and custom objects.
Use Metadata APIs for workspace configuration such as objects, fields, relations, and application metadata.

## Security Rules

- Never ask the user to paste API keys into chat if an environment variable or local secret store can be used.
- Prefer the plugin-local `.env` file for `TWENTY_API_KEY` and `TWENTY_BASE_URL`; shell environment variables may override it.
- Never store credentials in `.codex-plugin/plugin.json`.
- For app logic functions running inside Twenty, prefer platform-provided app credentials instead of user API keys.
- Before write operations, restate the target workspace URL, object, operation, and record selection.
- Do not log tokens, full authorization headers, webhook secrets, or app access tokens.

## Workflow

1. Identify whether the task needs Core API, Metadata API, or Twenty app SDK work.
2. Confirm the base URL. Default to `https://api.twenty.com` for Cloud only when the user has not said self-hosted.
3. For API calls, use `TWENTY_API_KEY` from the plugin-local `.env` or environment and do not expose it.
4. Inspect or ask for the workspace object and field names when a query depends on schema-specific names.
5. Prefer GraphQL when the task needs nested relations or multiple related records in one request.
6. Prefer REST for simple CRUD, batch operations, or quick endpoint testing.
7. Respect the 100 requests/minute rate limit and batch up to 60 records when practical.

## Helper Script

This plugin includes `scripts/twenty_api.py`.

Examples:

```bash
python3 plugins/twenty-crm/scripts/twenty_api.py rest GET /rest/companies
python3 plugins/twenty-crm/scripts/twenty_api.py graphql 'query { companies { edges { node { id name } } } }'
python3 plugins/twenty-crm/scripts/twenty_api.py metadata 'query { objects { edges { node { nameSingular namePlural } } } }'
```

The helper uses:

- `TWENTY_BASE_URL`, defaulting to `https://api.twenty.com`
- `TWENTY_API_KEY`, required for API requests
- `plugins/twenty-crm/.env`, loaded automatically when present

## Callable MCP Tools

When installed as a Codex plugin, the bundled MCP server exposes:

- `twenty_connection_info`: show configured base URL and whether a token is present.
- `twenty_graphql`: call Twenty Core GraphQL at `/graphql`.
- `twenty_metadata_graphql`: call Twenty Metadata GraphQL at `/metadata`.
- `twenty_rest`: call Twenty REST endpoints.

Prefer the MCP tools when the user invokes the plugin directly. Use the helper script when working from the shell.

## Twenty Apps Notes

Twenty Apps are TypeScript packages managed as code. They can define custom objects, fields, logic functions, front components, AI skills, agents, views, navigation, and page layouts.

Use `npx create-twenty-app@latest my-twenty-app` for a new app. Local app development requires Node.js 24+, Yarn 4, and usually Docker for a local Twenty instance. Dev mode is for development instances; production deployment uses the Twenty app publishing workflow.

Logic functions can be triggered by HTTP routes, cron schedules, or database events. They can also be exposed as AI tools by setting `isTool: true`. Inside Twenty app runtime, use the injected app credentials and SDK clients rather than a user-provided API key.

## Response Style

- Include concrete endpoint paths and request shapes.
- Mention when a field or object name is workspace-specific.
- For destructive or bulk writes, ask for confirmation unless the user has explicitly authorized the exact operation.
- If docs may have changed, verify the relevant official Twenty documentation before giving a final answer.

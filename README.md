# Twenty Codex Plugin

A local Codex plugin for working with [Twenty CRM](https://twenty.com/) developer APIs, app extensions, metadata, and workspace data.

It includes:

- A Codex skill for Twenty REST, GraphQL, Metadata API, app, and webhook workflows.
- A plugin-local MCP server exposing callable Twenty tools to Codex.
- A small Python helper for authenticated Twenty REST, GraphQL, and Metadata GraphQL calls.
- Plugin-local `.env` support so credentials do not need to live in shell startup files.

## Environment

Copy `.env.example` to `.env` in the plugin directory:

```env
TWENTY_BASE_URL=https://api.twenty.com
TWENTY_API_KEY=your-api-key
```

For self-hosted Twenty, use your own instance URL as `TWENTY_BASE_URL`.
The helper also respects shell environment variables, and shell values override `.env` values.
Do not put credentials in `.codex-plugin/plugin.json`; that file is plugin metadata.

## Usage

When the plugin is installed and enabled, Codex can call these MCP tools:

- `twenty_connection_info`
- `twenty_graphql`
- `twenty_metadata_graphql`
- `twenty_rest`

From the plugin root:

```bash
python3 scripts/twenty_api.py rest GET /rest/companies
python3 scripts/twenty_api.py graphql 'query { companies { edges { node { id name } } } }'
python3 scripts/twenty_api.py metadata 'query { objects { edges { node { nameSingular namePlural } } } }'
```

Twenty generates APIs from each workspace schema, so object and field names can differ between workspaces.

## Personal Codex Install

Codex loads plugins through marketplaces, then installs the selected plugin into its plugin cache. For a personal local install:

1. Copy this repository into:

   ```text
   ~/.codex/plugins/twenty-crm
   ```

2. Add a personal marketplace at:

   ```text
   ~/.agents/plugins/marketplace.json
   ```

   with:

   ```json
   {
     "name": "local",
     "interface": {
       "displayName": "Local Plugins"
     },
     "plugins": [
       {
         "name": "twenty-crm",
         "source": {
           "source": "local",
           "path": "./.codex/plugins/twenty-crm"
         },
         "policy": {
           "installation": "AVAILABLE",
           "authentication": "ON_INSTALL"
         },
         "category": "Productivity"
       }
     ]
   }
   ```

3. Register the home directory marketplace root:

   ```bash
   codex plugin marketplace add ~
   ```

4. Enable the installed plugin in `~/.codex/config.toml`:

   ```toml
   [plugins."twenty-crm@local"]
   enabled = true
   ```

5. Restart Codex and invoke the plugin or bundled skill with `@Twenty CRM` / `@twenty-crm`.

## Codex Plugin Layout

```text
.codex-plugin/plugin.json
.mcp.json
mcp/twenty-mcp-server.mjs
skills/twenty-crm/SKILL.md
scripts/twenty_api.py
.env.example
```

## Security

- `.env` is ignored by git.
- `.env.example` is committed as a template.
- API tokens are read from `TWENTY_API_KEY`.
- Server/workspace base URLs are read from `TWENTY_BASE_URL`.

## License

MIT

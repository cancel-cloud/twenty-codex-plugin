# Twenty Codex Plugin

A local Codex plugin for working with [Twenty CRM](https://twenty.com/) developer APIs, app extensions, metadata, and workspace data.

It includes:

- A Codex skill for Twenty REST, GraphQL, Metadata API, app, and webhook workflows.
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

From the plugin root:

```bash
python3 scripts/twenty_api.py rest GET /rest/companies
python3 scripts/twenty_api.py graphql 'query { companies { edges { node { id name } } } }'
python3 scripts/twenty_api.py metadata 'query { objects { edges { node { nameSingular namePlural } } } }'
```

Twenty generates APIs from each workspace schema, so object and field names can differ between workspaces.

## Codex Plugin Layout

```text
.codex-plugin/plugin.json
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

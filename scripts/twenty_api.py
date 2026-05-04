#!/usr/bin/env python3
"""Small Twenty API helper for local Codex plugin workflows."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_BASE_URL = "https://api.twenty.com"
PLUGIN_ROOT = Path(__file__).resolve().parents[1]
CANONICAL_PLUGIN_ROOT = Path.home() / ".codex" / "plugins" / "twenty-crm"


def parse_env_line(line: str) -> tuple[str, str] | None:
    stripped = line.strip()
    if not stripped or stripped.startswith("#") or "=" not in stripped:
        return None

    key, value = stripped.split("=", 1)
    key = key.strip()
    value = value.strip()
    if not key or not value:
        return None

    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1]
    return key, value


def load_plugin_env() -> None:
    env_paths = [CANONICAL_PLUGIN_ROOT / ".env", PLUGIN_ROOT / ".env"]
    seen: set[Path] = set()
    for env_path in env_paths:
        resolved = env_path.resolve()
        if resolved in seen or not env_path.exists():
            continue
        seen.add(resolved)
        for line in env_path.read_text().splitlines():
            parsed = parse_env_line(line)
            if parsed is None:
                continue
            key, value = parsed
            os.environ.setdefault(key, value)


def build_url(base_url: str, path: str) -> str:
    base = base_url.rstrip("/") + "/"
    return urllib.parse.urljoin(base, path.lstrip("/"))


def load_json_arg(raw: str | None) -> Any:
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON: {exc}") from exc


def request_json(method: str, url: str, api_key: str, payload: Any | None) -> Any:
    body = None
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=body, headers=headers, method=method.upper())
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {exc.code} {exc.reason}\n{error_body}") from exc

    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw


def print_json(payload: Any) -> None:
    if isinstance(payload, str):
        print(payload)
        return
    print(json.dumps(payload, indent=2, sort_keys=True))


def command_rest(args: argparse.Namespace, base_url: str, api_key: str) -> None:
    payload = load_json_arg(args.json)
    result = request_json(args.method, build_url(base_url, args.path), api_key, payload)
    print_json(result)


def command_graphql(args: argparse.Namespace, base_url: str, api_key: str) -> None:
    payload = {"query": args.query}
    variables = load_json_arg(args.variables)
    if variables is not None:
        payload["variables"] = variables
    result = request_json("POST", build_url(base_url, "/graphql"), api_key, payload)
    print_json(result)


def command_metadata(args: argparse.Namespace, base_url: str, api_key: str) -> None:
    payload = {"query": args.query}
    variables = load_json_arg(args.variables)
    if variables is not None:
        payload["variables"] = variables
    result = request_json("POST", build_url(base_url, "/metadata"), api_key, payload)
    print_json(result)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Call the Twenty REST, GraphQL, or metadata API.")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("TWENTY_BASE_URL", DEFAULT_BASE_URL),
        help="Twenty base URL. Defaults to TWENTY_BASE_URL or https://api.twenty.com.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    rest = subparsers.add_parser("rest", help="Call a REST endpoint.")
    rest.add_argument("method", choices=["GET", "POST", "PATCH", "PUT", "DELETE"])
    rest.add_argument("path", help="Endpoint path, for example /rest/companies.")
    rest.add_argument("--json", help="JSON request body.")
    rest.set_defaults(func=command_rest)

    graphql = subparsers.add_parser("graphql", help="Call the Core GraphQL endpoint.")
    graphql.add_argument("query", help="GraphQL query or mutation.")
    graphql.add_argument("--variables", help="GraphQL variables as JSON.")
    graphql.set_defaults(func=command_graphql)

    metadata = subparsers.add_parser("metadata", help="Call the Metadata GraphQL endpoint.")
    metadata.add_argument("query", help="GraphQL query or mutation.")
    metadata.add_argument("--variables", help="GraphQL variables as JSON.")
    metadata.set_defaults(func=command_metadata)

    return parser.parse_args()


def main() -> None:
    load_plugin_env()
    args = parse_args()
    api_key = os.environ.get("TWENTY_API_KEY")
    if not api_key:
        raise SystemExit(f"TWENTY_API_KEY is required. Set it in {PLUGIN_ROOT / '.env'}.")
    args.func(args, args.base_url, api_key)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)

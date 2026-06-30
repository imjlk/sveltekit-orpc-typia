# TypeScript Graph Tooling

This starter includes `@ttsc/graph` as an optional developer and agent tool.
It is not part of the Cloudflare runtime path.

`@ttsc/graph` exposes a TypeScript compiler-resolved code graph over MCP. It is useful for broad architecture questions, symbol lookup, and call/data-flow tracing without asking an agent to crawl source files first.

## Requirements

- `typescript@7.0.1-rc`
- `ttsc@0.16.7`
- `@ttsc/graph@0.16.7`

The repo pins those versions together because `@ttsc/graph` currently targets the TypeScript-Go TypeScript 7 release candidate line.

## MCP Config

Use this as a local MCP server entry for MCP-capable agents:

```json
{
  "mcpServers": {
    "ttsc-graph": {
      "command": "bun",
      "args": ["run", "graph:ttsc"]
    }
  }
}
```

Start the agent from the repository root so `ttsc-graph` can find the workspace `tsconfig.json` files.

For Codex, register the MCP server in the global config while pinning the command
to this repository:

```toml
[mcp_servers.ttsc-graph-sveltekit-orpc-typia]
command = "/Users/imjlk/.bun/bin/bun"
args = ["run", "--cwd", "/Users/imjlk/repos/imjlk/sveltekit-orpc-typia", "graph:ttsc"]
startup_timeout_sec = 120
```

Restart the Codex session after changing MCP config. The server is repo-scoped:
it uses this workspace's `ttsc`, platform binary, and `tsconfig.json`.

## Local Viewer

To open the graph viewer locally:

```bash
bun run graph:ttsc:view
```

Use the graph for TypeScript structure questions. Use normal search/read tools for docs, config files, generated artifacts, exact text, and non-TypeScript files.

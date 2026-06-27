# SAM MCP — Client configuration snippets

**Production app:** `https://sam-app.its-manuel-caceres.workers.dev`  
**Production MCP:** `https://sam-app.its-manuel-caceres.workers.dev/api/mcp`

For local development, replace with `http://localhost:3000`.  
Replace token placeholders with environment variables — **never commit real tokens**.

---

## Environment variable

```bash
# bash / zsh
export SAM_MCP_TOKEN="sam_mcp_<prefix>_<secret>"
```

```powershell
# PowerShell
$env:SAM_MCP_TOKEN = "sam_mcp_<prefix>_<secret>"
```

---

## Cursor

**Project:** `.cursor/mcp.json`  
**Global:** `~/.cursor/mcp.json` (Windows: `%USERPROFILE%\.cursor\mcp.json`)

```json
{
  "mcpServers": {
    "sam": {
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer ${env:SAM_MCP_TOKEN}"
      }
    }
  }
}
```

Cursor uses `${env:VAR}` for environment variables. Hot-reloads without restart.

Template in repo: [`.cursor/mcp.json.example`](../../../.cursor/mcp.json.example)

---

## Claude Desktop

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sam": {
      "url": "https://https://sam-app.its-manuel-caceres.workers.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_OR_ENV_MANAGED_VALUE"
      }
    }
  }
}
```

Restart Claude Desktop after editing.

---

## Claude Code

**Project:** `.mcp.json` in repo root  
**User:** `~/.claude.json`

```json
{
  "mcpServers": {
    "sam": {
      "type": "http",
      "url": "https://https://sam-app.its-manuel-caceres.workers.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer ${SAM_MCP_TOKEN}"
      }
    }
  }
}
```

Claude Code expands `${VAR}` from the environment. `type: "http"` is an alias for streamable HTTP.

---

## Hermes Agent

**Config:** `~/.hermes/config.yaml`

```yaml
mcp_servers:
  sam:
    url: "https://https://sam-app.its-manuel-caceres.workers.dev/api/mcp"
    headers:
      Authorization: "Bearer ${SAM_MCP_TOKEN}"
    timeout: 120
    connect_timeout: 60
    supports_parallel_tool_calls: true
    # Optional: limit tools exposed to the agent
    # tools:
    #   include:
    #     - sam_get_profile
    #     - sam_list_transactions
    #     - sam_get_spending_summary
    #     - sam_add_expense
```

After editing, run `/reload-mcp` in Hermes chat.

CLI shortcut (if available):

```bash
hermes mcp add sam --url "https://https://sam-app.its-manuel-caceres.workers.dev/api/mcp" \
  --header "Authorization=Bearer ${SAM_MCP_TOKEN}"
```

Docs: https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp

---

## OpenClaw

**Config:** `~/.openclaw/openclaw.json`

```json
{
  "mcp": {
    "servers": {
      "sam": {
        "url": "https://https://sam-app.its-manuel-caceres.workers.dev/api/mcp",
        "transport": "streamable-http",
        "headers": {
          "Authorization": "Bearer ${SAM_MCP_TOKEN}"
        },
        "supportsParallelToolCalls": true,
        "timeout": 60
      }
    }
  }
}
```

OpenClaw prefixes tools: `sam:sam_list_transactions`. Verify with:

```bash
openclaw mcp list
```

Docs: https://documentation.openclaw.ai/cli/mcp

---

## Continue.dev

**Config:** `~/.continue/config.json`

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "name": "sam",
        "transport": {
          "type": "http",
          "url": "https://https://sam-app.its-manuel-caceres.workers.dev/api/mcp",
          "headers": {
            "Authorization": "Bearer YOUR_TOKEN"
          }
        }
      }
    ]
  }
}
```

(Check Continue docs for the latest MCP config key — format may vary by version.)

---

## Cline (VS Code)

**Config:** Cline MCP settings UI or `cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "sam": {
      "url": "https://https://sam-app.its-manuel-caceres.workers.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}
```

---

## Windsurf

Uses `serverUrl` instead of `url` in some versions:

```json
{
  "mcpServers": {
    "sam": {
      "serverUrl": "https://https://sam-app.its-manuel-caceres.workers.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}
```

---

## Generic / custom agent

Minimum requirements for any MCP Streamable HTTP client:

| Setting | Value |
| --- | --- |
| URL | `https://https://sam-app.its-manuel-caceres.workers.dev/api/mcp` |
| Method | `POST` (JSON-RPC body) |
| `Content-Type` | `application/json` |
| `Accept` | `application/json, text/event-stream` |
| `Authorization` | `Bearer sam_mcp_...` |
| Transport | `streamable-http` or `http` |

Handshake sequence:

1. `initialize`
2. `tools/list` (optional if client caches)
3. `tools/call` with `{ "name": "...", "arguments": { ... } }`

---

## mcp-remote bridge (legacy fallback)

If a client only supports stdio, proxy via `mcp-remote`:

```json
{
  "mcpServers": {
    "sam": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://https://sam-app.its-manuel-caceres.workers.dev/api/mcp",
        "--header",
        "Authorization: Bearer ${SAM_MCP_TOKEN}"
      ]
    }
  }
}
```

Prefer native HTTP support when available.

---

## Production checklist

- [ ] `MCP_TOKEN_PEPPER` set in Wrangler (`wrangler secret put MCP_TOKEN_PEPPER`)
- [ ] `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` match production origin
- [ ] Token created **after** production pepper is configured (or recreate tokens)
- [ ] HTTPS URL in client config
- [ ] Token stored in env/secret manager, not in committed JSON

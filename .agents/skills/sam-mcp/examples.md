# SAM MCP — Protocol examples

Set `APP_URL` and `SAM_MCP_TOKEN` before running.

```bash
export APP_URL="http://localhost:3000"
export SAM_MCP_TOKEN="sam_mcp_<prefix>_<secret>"
```

---

## curl (bash / Git Bash / WSL)

### Initialize

```bash
curl -s -X POST "$APP_URL/api/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $SAM_MCP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

### List tools

```bash
curl -s -X POST "$APP_URL/api/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $SAM_MCP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

### Get profile

```bash
curl -s -X POST "$APP_URL/api/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $SAM_MCP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"sam_get_profile","arguments":{}}}'
```

### List expenses (latest 50)

```bash
curl -s -X POST "$APP_URL/api/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $SAM_MCP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"sam_list_transactions","arguments":{"kind":"expense","limit":50}}}'
```

### Spending summary by category (June 2026)

```bash
curl -s -X POST "$APP_URL/api/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $SAM_MCP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"sam_get_spending_summary","arguments":{"from":"2026-06-01","to":"2026-06-30","groupBy":"category"}}}'
```

### Add expense

```bash
curl -s -X POST "$APP_URL/api/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $SAM_MCP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"sam_add_expense","arguments":{"amount":24,"name":"Uber","category":"Transport"}}}'
```

### Pretty-print JSON result (jq)

```bash
curl -s ... | jq -r '.result.content[0].text' | jq .
```

---

## PowerShell (Windows)

PowerShell mangles inline JSON in `curl.exe`; use `Invoke-WebRequest` with single-quoted bodies:

```powershell
$headers = @{
  "Content-Type" = "application/json"
  "Accept" = "application/json, text/event-stream"
  "Authorization" = "Bearer $env:SAM_MCP_TOKEN"
}

# Initialize
$body = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"pwsh","version":"1.0"}}}'
(Invoke-WebRequest -Uri "$env:APP_URL/api/mcp" -Method POST -Headers $headers -Body $body -UseBasicParsing).Content

# List expenses
$body = '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"sam_list_transactions","arguments":{"kind":"expense","limit":50}}}'
$r = (Invoke-WebRequest -Uri "$env:APP_URL/api/mcp" -Method POST -Headers $headers -Body $body -UseBasicParsing).Content
$r | ConvertFrom-Json | ConvertTo-Json -Depth 10

# Parse inner tool JSON
$outer = $r | ConvertFrom-Json
$inner = $outer.result.content[0].text | ConvertFrom-Json
$inner | ConvertTo-Json -Depth 10
```

---

## Node.js (minimal client)

```javascript
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const TOKEN = process.env.SAM_MCP_TOKEN;

async function mcp(id, method, params = {}) {
  const res = await fetch(`${APP_URL}/api/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

async function callTool(name, args = {}) {
  const result = await mcp(1, "tools/call", { name, arguments: args });
  return JSON.parse(result.content[0].text);
}

(async () => {
  await mcp(0, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "node-smoke", version: "1.0" },
  });
  const profile = await callTool("sam_get_profile");
  console.log("Currency:", profile.currency);
  const expenses = await callTool("sam_list_transactions", { kind: "expense", limit: 10 });
  console.log("Expense total:", expenses.total);
})();
```

---

## Python (minimal client)

```python
import json
import os
import urllib.request

APP_URL = os.environ.get("APP_URL", "http://localhost:3000")
TOKEN = os.environ["SAM_MCP_TOKEN"]

def mcp(req_id: int, method: str, params: dict | None = None) -> dict:
    body = json.dumps({"jsonrpc": "2.0", "id": req_id, "method": method, "params": params or {}}).encode()
    req = urllib.request.Request(
        f"{APP_URL}/api/mcp",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "Authorization": f"Bearer {TOKEN}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())

def call_tool(name: str, arguments: dict | None = None) -> dict:
    result = mcp(2, "tools/call", {"name": name, "arguments": arguments or {}})
    return json.loads(result["result"]["content"][0]["text"])

mcp(1, "initialize", {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "python-smoke", "version": "1.0"},
})
print(call_tool("sam_get_spending_summary", {"groupBy": "category"}))
```

---

## Expected success shapes

**Initialize** — excerpt:

```json
{
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": { "name": "sam", "version": "1.1.0" },
    "instructions": "SAM personal finance assistant..."
  }
}
```

**Tool call** — parse `result.content[0].text`:

```json
{
  "count": 12,
  "total": 573.5,
  "transactions": [ { "name": "Spark", "amount": 6.8, "category": "Food & Dining" } ]
}
```

**Tool error** — `isError: true`:

```json
{
  "error": "scope_denied",
  "message": "missing scope: sam:expenses.write"
}
```

---

## Common mistakes

| Mistake | Symptom |
| --- | --- |
| Missing `Accept` header | `Not Acceptable: Client must accept both...` |
| Invalid JSON in PowerShell `curl -d "{...}"` | `Parse error: Invalid JSON` |
| Token without `Bearer ` prefix | `invalid_token_format` |
| Transfer without `confirm: true` | `confirmation_required` |
| Wrong pepper in production | `invalid_token` for all tokens |

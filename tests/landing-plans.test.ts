import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { getFinanceToolDefs } from "../lib/tools/catalog";
import { AGENTS } from "../components/landing/landing-hero";

describe("landing and pricing consistency", () => {
  it("uses real tools from the finance catalog in mock interactions", () => {
    const catalogToolNames = new Set(getFinanceToolDefs().map((def) => def.name));

    const landingTools = [
      "sam_get_cashflow",
      "sam_add_expense",
      "sam_get_budget_status",
      "sam_list_goals",
      "sam_get_spending_summary",
      "sam_list_recurring_occurrences",
      "sam_get_net_worth",
      "sam_list_transactions",
      "sam_get_profile",
    ];

    for (const tool of landingTools) {
      assert.ok(
        catalogToolNames.has(tool),
        `Expected tool ${tool} from landing interactions to exist in the 36 shared finance tools catalog`
      );
    }
  });

  it("verifies all 6 AI agent badges have valid tools from catalog and required metadata", () => {
    const catalogToolNames = new Set(getFinanceToolDefs().map((def) => def.name));
    assert.equal(AGENTS.length, 6, "Expected exactly 6 AI agents in Hero matching reference image");

    const expectedAgentIds = ["claude", "cursor", "antigravity", "openai", "grok", "openclaw"];
    for (const id of expectedAgentIds) {
      const agent = AGENTS.find((a) => a.id === id);
      assert.ok(agent, `Agent ${id} must exist in hero AGENTS`);
      assert.ok(agent.name.length > 0, `Agent ${id} must have a non-empty name`);
      assert.ok(agent.accent.startsWith("#"), `Agent ${id} accent must be a valid hex color`);

      // Verify tool call extracted from agent.toolCall matches a real tool
      const toolMatch = agent.toolCall.match(/^([a-z0-9_]+)\(/);
      assert.ok(toolMatch, `Tool call in agent ${id} should follow toolName(...) format`);
      assert.ok(
        catalogToolNames.has(toolMatch[1]),
        `Tool ${toolMatch[1]} for agent ${id} must exist in catalog`
      );
    }
  });

  it("prohibits showing internal backend infrastructure COGS or hosting costs in all landing source files", () => {
    const prohibitedTerms = [
      "cogs",
      "cost of goods",
      "neon compute cost",
      "margin per user",
      "cloudflare worker cost",
      "llm api cost to us",
      "openai token cost",
      "gross margin",
    ];

    const landingDir = path.join(process.cwd(), "components/landing");
    const scanDir = (dir: string): string[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...scanDir(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts") || entry.name.endsWith(".css"))) {
          files.push(fullPath);
        }
      }
      return files;
    };

    const files = scanDir(landingDir);
    assert.ok(files.length > 5, "Expected multiple landing source files to scan");

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8").toLowerCase();
      for (const term of prohibitedTerms) {
        assert.ok(
          !content.includes(term),
          `Prohibited internal cost term "${term}" found in public landing file ${path.relative(process.cwd(), file)}`
        );
      }
    }
  });

  it("enforces pricing tiers consistency with docs/PLANS.md", () => {
    const plansMd = fs.readFileSync(path.join(process.cwd(), "docs/PLANS.md"), "utf8");
    assert.ok(plansMd.includes("$0"), "PLANS.md must specify $0 for Free tier");
    assert.ok(plansMd.includes("$5"), "PLANS.md must specify $5 for Pro tier");
    assert.ok(plansMd.includes("$10"), "PLANS.md must specify $10 for Agent tier");

    const pricingSource = fs.readFileSync(
      path.join(process.cwd(), "components/landing/landing-pricing.tsx"),
      "utf8"
    );

    // Verify all tiers and limits are present in landing pricing
    assert.ok(pricingSource.includes('price: "$0"'), "Landing pricing must include Free $0");
    assert.ok(pricingSource.includes('price: "$5"'), "Landing pricing must include Pro $5");
    assert.ok(pricingSource.includes('price: "$10"'), "Landing pricing must include Agent $10");
    assert.ok(pricingSource.includes("7 días Pro Trial"), "Landing pricing must mention 7-day Pro Trial");
    assert.ok(pricingSource.includes("150 mensajes / mes"), "Pro tier must specify 150 Samy messages");
    assert.ok(pricingSource.includes("500 mensajes / mes"), "Agent tier must specify 500 Samy messages");
    assert.ok(pricingSource.includes("5,000 llamadas"), "Pro tier must specify 5,000 tool calls");
    assert.ok(pricingSource.includes("25,000 llamadas"), "Agent tier must specify 25,000 tool calls");
  });
});

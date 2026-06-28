import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import * as profile from "@/lib/domain/profile";
import { SCOPES } from "../scopes";
import { defineTool } from "./helpers";

export function registerProfileTools(server: McpServer, ctx: ActorContext) {
  defineTool(server, ctx, {
    name: "sam_get_profile",
    description:
      "Get the user's configured profile, language, currency, timezone, theme and granted MCP capabilities.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    handler: (ctx) => profile.getProfile(ctx),
  });

  defineTool(server, ctx, {
    name: "sam_update_username",
    description: "Update the user's username (no spaces).",
    scope: SCOPES.profileWrite,
    inputSchema: {
      username: z.string().min(1).max(60),
    },
    handler: (ctx, args) => profile.updateUsername(ctx, args.username),
  });

  defineTool(server, ctx, {
    name: "sam_update_prefs",
    description: "Update configured user preferences (theme, language, currency and timezone).",
    scope: SCOPES.profileWrite,
    inputSchema: {
      theme: z
        .enum([
          "solarized-cream",
          "ayu-mirage",
          "catppuccin-latte",
          "github-light",
          "kanagawa",
          "ansi-dark",
          "ayu-light",
          "dark",
          "light",
        ])
        .optional(),
      accentHue: z.number().min(0).max(360).optional(),
      language: z.enum(["en", "es"]).optional(),
      defaultCurrency: z.enum(["USD", "PEN"]).optional(),
      timezone: z.string().min(1).max(80).optional(),
    },
    handler: (ctx, args) => profile.updatePrefs(ctx, args),
  });
}

import type { ActorContext } from "./types";

/**
 * Builds a full-access ActorContext from an authenticated browser session.
 * Server Actions already gate on requireSession(); scope enforcement is an
 * MCP-only concern, so session actors carry the wildcard scope.
 */
export function sessionActor(session: { user: { id: string; email: string } }): ActorContext {
  return {
    userId: session.user.id,
    email: session.user.email,
    authMethod: "session",
    scopes: ["*"],
  };
}

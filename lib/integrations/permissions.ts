import { hasScope, type Scope } from "@/lib/mcp/scopes";
import { DomainError, DomainErrorCodes, type ActorContext } from "@/lib/domain/types";

export function integrationActor(
  userId: string,
  email: string,
  scopes: string[],
  installId: string
): ActorContext {
  return {
    userId,
    email,
    authMethod: "integration",
    scopes,
    tokenId: installId,
  };
}

export function requireInstallScope(ctx: ActorContext, scope: Scope): void {
  if (!hasScope(ctx, scope)) {
    throw new DomainError(DomainErrorCodes.scopeDenied, `integration missing scope: ${scope}`);
  }
}

export function scopesCoverRequested(granted: string[], requested: string[]): boolean {
  if (granted.includes("*")) return true;
  return requested.every((scope) => granted.includes(scope));
}

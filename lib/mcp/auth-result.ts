import type { ActorContext } from "@/lib/domain/types";

export type AuthResult =
  | { ok: true; ctx: ActorContext }
  | { ok: false; status: 401; error: string };

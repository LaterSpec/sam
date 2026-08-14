import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasSessionCookie } from "@/lib/auth/session-cookie";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!hasSessionCookie((await headers()).get("cookie"))) {
    redirect("/onboarding");
  }
  const session = await getSession();
  if (session?.user) {
    redirect("/app");
  }
  redirect("/onboarding");
}

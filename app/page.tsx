import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasSessionCookie } from "@/lib/auth/session-cookie";
import { getSession } from "@/lib/auth/session";
import { LandingPageClient } from "@/components/landing/landing-page-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieHeader = (await headers()).get("cookie");
  if (hasSessionCookie(cookieHeader)) {
    const session = await getSession();
    if (session?.user) {
      redirect("/app");
    }
  }

  return <LandingPageClient />;
}

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { loadUserData } from "@/lib/db/queries/load-user-data";
import { AppShell } from "@/components/experiences/mobile/app/app-shell";
import { DesktopApp } from "@/components/experiences/desktop/desktop-app";
import { desktopExperienceEnabled, resolveSamExperience } from "@/lib/presentation/experience";

export const dynamic = "force-dynamic";

export default async function AppPage({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/onboarding");
  }

  const data = await loadUserData(session.user.id, session.user.email);
  if (!data) {
    redirect("/onboarding");
  }

  const experience = resolveSamExperience(await headers());
  if (experience === "desktop" && desktopExperienceEnabled()) {
    return <DesktopApp initialData={data} section="overview" />;
  }
  const params = await searchParams;
  return <AppShell initialData={data} initialScreen={params.screen} />;
}

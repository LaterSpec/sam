import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { DesktopApp } from "@/components/experiences/desktop/desktop-app";
import { AppShell } from "@/components/experiences/mobile/app/app-shell";
import { getSession } from "@/lib/auth/session";
import { loadUserData } from "@/lib/db/queries/load-user-data";
import {
  desktopExperienceEnabled,
  isDesktopSection,
  isLegacyDesktopSection,
  resolveSamExperience,
} from "@/lib/presentation/experience";

export const dynamic = "force-dynamic";

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const session = await getSession();
  if (!session?.user) redirect("/onboarding");
  const data = await loadUserData(session.user.id, session.user.email);
  if (!data) redirect("/onboarding");
  const { section } = await params;
  if (section === "overview") notFound();
  const experience = resolveSamExperience(await headers());
  const mobile = experience === "mobile" || !desktopExperienceEnabled();

  if (isLegacyDesktopSection(section)) {
    if (mobile) return <AppShell initialData={data} initialScreen={section} />;
    redirect("/app/transactions");
  }

  if (!isDesktopSection(section)) notFound();
  if (mobile) return <AppShell initialData={data} initialScreen={section} />;
  return <DesktopApp initialData={data} section={section} />;
}

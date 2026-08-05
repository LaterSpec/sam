import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { OnboardingApp } from "@/components/experiences/mobile/onboarding/onboarding-app";
import { DesktopOnboarding } from "@/components/experiences/desktop/auth/desktop-onboarding";
import { desktopExperienceEnabled, resolveSamExperience } from "@/lib/presentation/experience";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const authSuccess = params.auth === "success";

  if (session?.user && !authSuccess) {
    redirect("/app");
  }

  const experience = resolveSamExperience(await headers());
  if (experience === "desktop" && desktopExperienceEnabled()) {
    return <DesktopOnboarding authSuccess={authSuccess} userName={session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "there"} />;
  }

  return (
    <OnboardingApp
      authSuccess={authSuccess}
      userName={session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "there"}
      userCreatedAt={session?.user?.createdAt}
    />
  );
}

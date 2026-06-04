import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { OnboardingApp } from "@/components/onboarding/onboarding-app";

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

  return (
    <OnboardingApp
      authSuccess={authSuccess}
      userName={session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "there"}
      userCreatedAt={session?.user?.createdAt}
    />
  );
}

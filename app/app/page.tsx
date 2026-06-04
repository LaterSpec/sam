import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { loadUserData } from "@/lib/db/queries/load-user-data";
import { AppShell } from "@/components/app/app-shell";

export default async function AppPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/onboarding");
  }

  const data = await loadUserData(session.user.id, session.user.email);
  if (!data) {
    redirect("/onboarding");
  }

  return <AppShell initialData={data} />;
}

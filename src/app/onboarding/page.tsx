import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";
import { getSessionProfile } from "@/lib/auth";

export default async function OnboardingPage() {
  const { profile } = await getSessionProfile();
  if (profile?.onboarding_completed_at) redirect("/");

  return <OnboardingFlow />;
}

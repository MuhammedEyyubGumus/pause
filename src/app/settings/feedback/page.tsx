import { FeedbackForm } from "@/features/feedback/feedback-form";
import { requireOnboardedUser } from "@/lib/auth";

export default async function FeedbackPage() {
  const { user } = await requireOnboardedUser();
  return <FeedbackForm userId={user.id} />;
}

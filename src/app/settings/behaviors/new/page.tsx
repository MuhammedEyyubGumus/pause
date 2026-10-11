import { AddBehavior } from "@/features/behaviors/add-behavior";
import { requireOnboardedUser } from "@/lib/auth";

export default async function NewBehaviorPage() {
  const { supabase } = await requireOnboardedUser();
  // Şu an aktif olan şablonlar listede gösterilmez
  const { data } = await supabase.from("behaviors").select("template_key").is("archived_at", null);
  const activeTemplates = (data ?? []).map((b) => b.template_key).filter((k): k is string => !!k);

  return <AddBehavior activeTemplates={activeTemplates} />;
}

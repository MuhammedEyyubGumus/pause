import { getLocale } from "next-intl/server";

import { parseInsights } from "@/features/insights/analyze";
import { addDays, buildStory, mondayOf } from "@/features/review/build-story";
import { toSlides } from "@/features/review/slides";
import { StoryPager } from "@/features/review/story-pager";
import { requireOnboardedUser } from "@/lib/auth";
import { localParts } from "@/lib/time/local";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Haftalık hikâye (brief bölüm 25). Varsayılan: geçen hafta (Pzt–Paz).
// Geçen hafta hiç kayıt yoksa ve bu hafta varsa, bu haftanın şimdiye kadarki hali.
export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week: weekParam } = await searchParams;
  const { supabase, profile } = await requireOnboardedUser();
  const locale = await getLocale();

  const today = localParts(new Date(), profile.timezone).date;
  const thisMonday = mondayOf(today);
  const lastMonday = addDays(thisMonday, -7);

  const insights = async (from: string | null, to: string | null) => {
    const { data, error } = await supabase.rpc("get_insights", {
      ...(from ? { p_from: from } : {}),
      ...(to ? { p_to: to } : {}),
    });
    if (error) throw error;
    return parseInsights(data);
  };

  let monday = weekParam && DATE_RE.test(weekParam) ? mondayOf(weekParam) : lastMonday;
  if (monday > thisMonday) monday = thisMonday;
  let week = await insights(monday, addDays(monday, 6));

  if (!weekParam && week.totals.urges === 0) {
    const current = await insights(thisMonday, addDays(thisMonday, 6));
    if (current.totals.urges > 0) {
      monday = thisMonday;
      week = current;
    }
  }

  const [prev, allTime] = await Promise.all([insights(addDays(monday, -7), addDays(monday, -1)), insights(null, null)]);

  const inProgress = monday === thisMonday;
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" });
  const rangeLabel = fmt.formatRange(new Date(`${monday}T12:00:00Z`), new Date(`${addDays(monday, 6)}T12:00:00Z`));

  const slides = await toSlides(buildStory(week, prev, allTime), { rangeLabel, inProgress });

  return <StoryPager slides={slides} week={monday} />;
}

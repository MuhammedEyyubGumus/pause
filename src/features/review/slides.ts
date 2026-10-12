import "server-only";

import { getLocale, getTranslations } from "next-intl/server";

import { optionLabel } from "@/features/history/labels";
import { fmtChange, fmtPercent, fmtScore, weekdayName, weekdayShort } from "@/features/insights/format";

import type { Story } from "./build-story";

// Hikâye sayfasının ekranda gösterilen hali (sunucuda çevrilmiş, istemciye seri hale getirilebilir)
export type Slide = {
  id: string;
  tone: "light" | "dark" | "accent";
  eyebrow?: string;
  big?: number; // sayarak büyüyen büyük sayı
  title: string;
  body?: string;
  bars?: { label: string; value: number }[]; // günlere göre küçük grafik
  chain?: string[]; // deney: A → B → C
};

export async function toSlides(stories: Story[], opts: { rangeLabel: string; inProgress: boolean }): Promise<Slide[]> {
  const t = await getTranslations("review");
  const tOpt = await getTranslations("options");
  const locale = await getLocale();
  const tones: Slide["tone"][] = ["light", "dark", "accent"];

  return stories.map((s, i): Slide => {
    const tone = tones[i % tones.length];
    const id = `${s.kind}-${i}`;
    switch (s.kind) {
      case "count":
        return {
          id,
          tone,
          eyebrow: opts.inProgress ? t("eyebrowSoFar", { range: opts.rangeLabel }) : opts.rangeLabel,
          big: s.urges,
          title: s.urges === 0 ? t("countZero") : t(opts.inProgress ? "countSoFar" : "count", { count: s.urges }),
          body: s.urges === 0 ? t("countZeroBody") : undefined,
          bars: s.urges > 0 ? s.perDay.map((value, d) => ({ label: weekdayShort(d + 1, locale), value })) : undefined,
        };
      case "hardestDay":
        return {
          id,
          tone,
          title: t("hardestDay", { day: weekdayName(s.day, locale) }),
          body: t("hardestDayBody", { count: s.count }),
        };
      case "trigger": {
        const name = optionLabel({ ...s.trigger, kind: "trigger" }, tOpt);
        return {
          id,
          tone,
          title: t("trigger", { trigger: name }),
          body: t("triggerBody", { pct: fmtPercent(s.share, locale) }),
        };
      }
      case "paused":
        return {
          id,
          tone,
          big: s.paused,
          title: s.paused === 0 ? t("pausedZero") : t("paused", { count: s.paused }),
          body: s.paused === 0 ? t("pausedZeroBody") : t("pausedBody", { paused: s.paused, urges: s.urges }),
        };
      case "worked":
        return {
          id,
          tone,
          title: t("worked", {
            label: optionLabel({ ...s.intervention, kind: "intervention" }, tOpt),
            value: fmtScore(Math.abs(s.avgChange), locale),
          }),
          body: t("workedBody", { count: s.n }),
        };
      case "progress": {
        const fmt = (v: number) =>
          s.metric === "pauseRate"
            ? fmtPercent(v, locale)
            : s.metric === "avgChange"
              ? fmtChange(v, locale)
              : String(v);
        return {
          id,
          tone,
          eyebrow: t("progressEyebrow"),
          title: t(`progress.${s.metric}`),
          body: t(`progress.${s.metric}Body`, { before: fmt(s.before), now: fmt(s.now) }),
        };
      }
      case "experiment": {
        const trigger = s.trigger ? optionLabel({ ...s.trigger, kind: "trigger" }, tOpt) : null;
        const intervention = s.intervention ? optionLabel({ ...s.intervention, kind: "intervention" }, tOpt) : null;
        return {
          id,
          tone: "dark",
          eyebrow: t("experimentEyebrow"),
          title: t("experimentTitle"),
          chain: [
            trigger ? t("experimentWhen", { trigger }) : t("experimentAnyUrge"),
            ...(intervention ? [intervention] : []),
            "PAUSE",
          ],
          body: t("experimentBody"),
        };
      }
    }
  });
}

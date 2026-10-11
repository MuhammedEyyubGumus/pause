"use client";

import { CalendarClock, Check, Send, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Bucket = "now" | "later" | "delegate";
type Item = { text: string; bucket: Bucket };

const BUCKETS: { id: Bucket; Icon: typeof Zap }[] = [
  { id: "now", Icon: Zap },
  { id: "later", Icon: CalendarClock },
  { id: "delegate", Icon: Send },
];

// Zihindeki şeyi hızlıca kategorize et: ŞİMDİ / SONRA / DEVRET
export function NowLaterDelegate({ onFinish }: { onFinish: (details: { items: Item[] }) => void }) {
  const t = useTranslations("interventions.nld");
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[]>([]);

  function place(bucket: Bucket) {
    if (!text.trim()) return;
    setItems((prev) => [...prev, { text: text.trim(), bucket }]);
    setText("");
    navigator.vibrate?.(6);
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h2 className="text-question">{t("title")}</h2>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={140}
        rows={2}
        placeholder={t("placeholder")}
        className="w-full resize-none rounded-xl border-2 border-transparent bg-pause-foreground/10 p-4 text-lg outline-none placeholder:text-pause-foreground/50 focus:border-pause-ring"
      />

      <div className="grid grid-cols-3 gap-3">
        {BUCKETS.map(({ id, Icon }) => (
          <motion.button
            key={id}
            type="button"
            whileTap={{ scale: 0.95 }}
            disabled={!text.trim()}
            onClick={() => place(id)}
            className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-card bg-pause-foreground/10 p-3 text-center transition-opacity disabled:opacity-40"
          >
            <Icon className="size-6" strokeWidth={1.75} aria-hidden />
            <span className="text-sm font-bold tracking-wider">{t(id)}</span>
            <span className="text-xs opacity-70">{t(`${id}Sub`)}</span>
          </motion.button>
        ))}
      </div>

      <ul className="flex flex-col gap-2" aria-live="polite">
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl bg-pause-foreground/5 px-4 py-3"
            >
              <Check className="size-4 shrink-0 opacity-70" aria-hidden />
              <span className="flex-1 truncate">{item.text}</span>
              <span className="text-xs font-bold tracking-wider opacity-70">{t(item.bucket)}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <button
        type="button"
        onClick={() => onFinish({ items })}
        className="tap-target mt-auto w-full rounded-xl bg-pause-foreground px-8 text-lg font-semibold text-pause"
      >
        {t("finish")}
      </button>
    </div>
  );
}

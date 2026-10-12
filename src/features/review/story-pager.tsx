"use client";

import { ArrowRight, X } from "lucide-react";
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

import type { Slide } from "./slides";

const SEEN_KEY = (week: string) => `pause:review-seen:${week}`;

// Instagram hikâyesi gibi: üstte bölümler, dokun / kaydır ile ilerle.
// Kendiliğinden ilerlemez; herkes kendi hızında okur (Headspace sakinliği).
export function StoryPager({ slides, week }: { slides: Slide[]; week: string }) {
  const t = useTranslations("review");
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const touch = useRef<{ x: number; y: number; swiped: boolean } | null>(null);
  const slide = slides[index];
  const last = index === slides.length - 1;

  const go = useCallback(
    (delta: 1 | -1) => {
      setDirection(delta);
      setIndex((i) => Math.max(0, Math.min(slides.length - 1, i + delta)));
    },
    [slides.length],
  );

  useEffect(() => {
    track("weekly_review_opened", { slides: slides.length });
    try {
      localStorage.setItem(SEEN_KEY(week), "1");
    } catch {
      // gizli sekme
    }
  }, [week, slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") router.push("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, router]);

  const surface =
    slide.tone === "dark"
      ? "bg-pause text-pause-foreground"
      : slide.tone === "accent"
        ? "bg-accent text-accent-foreground"
        : "bg-background text-foreground";

  return (
    <div className={cn("min-h-dvh transition-colors duration-500 ease-calm", surface)}>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-safe pb-safe">
        {/* Bölüm çubukları */}
        <div className="flex gap-1.5 pt-3" aria-hidden>
          {slides.map((s, i) => (
            <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-current/20">
              <span
                className={cn(
                  "block h-full rounded-full bg-current transition-[width] duration-300 ease-calm",
                  i <= index ? "w-full" : "w-0",
                )}
              />
            </span>
          ))}
        </div>
        <header className="flex h-12 items-center justify-between">
          <span className="text-xs font-bold tracking-[0.3em] opacity-70">PAUSE</span>
          <Link
            href="/"
            aria-label={t("close")}
            className="tap-target-sm -me-3 grid place-items-center rounded-full opacity-70 hover:opacity-100"
          >
            <X className="size-6" />
          </Link>
        </header>

        {/* Dokunma alanları: sol üçte bir geri, kalan ileri */}
        <div
          className="relative flex flex-1 flex-col"
          onTouchStart={(e) => {
            touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, swiped: false };
          }}
          onTouchEnd={(e) => {
            const start = touch.current;
            if (!start) return;
            const dx = e.changedTouches[0].clientX - start.x;
            const dy = e.changedTouches[0].clientY - start.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
              start.swiped = true;
              const rtl = document.documentElement.dir === "rtl";
              go((dx < 0) !== rtl ? 1 : -1);
            }
          }}
          onClickCapture={(e) => {
            // Kaydırmanın ardından gelen "tıklama" ikinci kez ilerletmesin
            if (touch.current?.swiped) {
              e.stopPropagation();
              touch.current = null;
            }
          }}
        >
          <button
            type="button"
            aria-label={t("previous")}
            onClick={() => go(-1)}
            disabled={index === 0}
            className="absolute inset-y-0 start-0 z-10 w-1/3 cursor-w-resize disabled:cursor-default"
          />
          {!last && (
            <button
              type="button"
              aria-label={t("next")}
              onClick={() => go(1)}
              className="absolute inset-y-0 end-0 z-10 w-2/3 cursor-e-resize"
            />
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={slide.id}
              aria-live="polite"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40 * direction }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -40 * direction }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col justify-center gap-6 py-8"
            >
              <SlideBody slide={slide} />
            </motion.section>
          </AnimatePresence>
        </div>

        <footer className="relative z-20 flex flex-col gap-2 pt-2">
          {last ? (
            <>
              <Link
                href="/"
                className="tap-target inline-flex w-full items-center justify-center rounded-xl bg-primary px-6 text-lg font-semibold text-primary-foreground"
              >
                {t("finish")}
              </Link>
              <Link href="/insights" className="tap-target-sm text-center text-sm font-semibold opacity-80 hover:opacity-100">
                {t("toInsights")}
              </Link>
            </>
          ) : (
            <p className="flex items-center justify-center gap-1 text-sm opacity-60">
              {t("swipeHint")} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

function SlideBody({ slide }: { slide: Slide }) {
  return (
    <>
      {slide.eyebrow && <p className="text-sm font-semibold tracking-wide uppercase opacity-70">{slide.eyebrow}</p>}
      {slide.big != null && <CountUp value={slide.big} />}
      <h1 className="text-[2rem] leading-tight font-bold tracking-tight text-balance">{slide.title}</h1>
      {slide.body && <p className="text-lg leading-relaxed opacity-80">{slide.body}</p>}

      {slide.bars && (
        <div className="flex h-24 items-end gap-2" role="img" aria-label={slide.bars.map((b) => `${b.label} ${b.value}`).join(", ")}>
          {slide.bars.map((b, i) => {
            const max = Math.max(1, ...slide.bars!.map((x) => x.value));
            return (
              <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: b.value ? `${Math.max((b.value / max) * 64, 6)}px` : "3px" }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={cn("w-full rounded-t-[4px]", b.value ? "bg-current" : "bg-current/25")}
                />
                <span className="text-[0.7rem] font-semibold opacity-70">{b.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {slide.chain && (
        <ol className="flex flex-col gap-2">
          {slide.chain.map((step, i) => (
            <motion.li
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.25, duration: 0.4 }}
              className="flex flex-col items-start gap-2"
            >
              <span
                className={cn(
                  "rounded-xl px-4 py-3 text-lg font-semibold",
                  i === slide.chain!.length - 1 ? "bg-pause-ring text-pause" : "bg-current/10",
                )}
              >
                {step}
              </span>
              {i < slide.chain!.length - 1 && <span className="ps-4 text-xl opacity-50" aria-hidden>↓</span>}
            </motion.li>
          ))}
        </ol>
      )}
    </>
  );
}

// Büyük sayı sıfırdan sayarak gelir (hareket azaltılmışsa doğrudan gösterilir)
function CountUp({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const mv = useMotionValue(reduceMotion ? value : 0);
  const rounded = useTransform(mv, (v) => Math.round(v).toString());

  useEffect(() => {
    if (reduceMotion) return;
    const controls = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [mv, value, reduceMotion]);

  return (
    <motion.p className="numeric text-[5.5rem] leading-none font-bold tracking-tight" aria-hidden>
      {rounded}
    </motion.p>
  );
}

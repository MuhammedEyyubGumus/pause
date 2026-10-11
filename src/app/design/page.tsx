"use client";

// Tasarım sistemi önizlemesi: token'ların doğru yüklendiğini görmek için.
// Phase 1 sonunda silinecek. Koyu temayı telefonun/bilgisayarın ayarından dene.
import { type CSSProperties, useState } from "react";

const swatches = [
  ["background", "bg-background"],
  ["card", "bg-card"],
  ["muted", "bg-muted"],
  ["accent", "bg-accent"],
  ["primary", "bg-primary"],
  ["pause", "bg-pause"],
  ["urge-low", "bg-urge-low"],
  ["urge-high", "bg-urge-high"],
] as const;

const emotions = ["Kaygılı", "Bunalmış", "Üzgün", "Yorgun", "Sıkılmış", "Boşlukta"];

export default function DesignPreview() {
  const [urge, setUrge] = useState(8);
  const [picked, setPicked] = useState<string[]>(["Bunalmış"]);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-12 px-4 py-10 pt-safe pb-safe">
      <header className="animate-fade-up">
        <p className="text-sm font-semibold tracking-[0.3em] text-primary">PAUSE · TASARIM SİSTEMİ</p>
        <h1 className="mt-2 text-question">Sıcak sakinlik</h1>
      </header>

      {/* Renkler */}
      <section className="grid grid-cols-4 gap-3">
        {swatches.map(([name, cls]) => (
          <div key={name} className="flex flex-col gap-1.5">
            <div className={`${cls} aspect-square rounded-lg border`} />
            <span className="text-xs text-muted-foreground">{name}</span>
          </div>
        ))}
      </section>

      {/* Şiddet ekranı */}
      <section
        className="flex flex-col items-center gap-6 rounded-card bg-card p-8 shadow-sm"
        style={{ "--urge": urge } as CSSProperties}
      >
        <p className="text-center text-question">Dürtü şu anda ne kadar güçlü?</p>
        <div className="relative grid size-48 place-items-center">
          <div className="absolute inset-0 rounded-full bg-urge opacity-60 animate-pulse-soft transition-colors duration-500 ease-calm" />
          <span className="relative text-hero numeric">{urge}</span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          value={urge}
          onChange={(e) => setUrge(Number(e.target.value))}
          aria-label="Dürtü şiddeti"
          className="h-12 w-full accent-primary"
        />
      </section>

      {/* Duygu kartları */}
      <section className="flex flex-col gap-4">
        <p className="text-question">Şu anda ne hissediyorsun?</p>
        <div className="grid grid-cols-2 gap-3">
          {emotions.map((e) => {
            const on = picked.includes(e);
            return (
              <button
                key={e}
                role="checkbox"
                aria-checked={on}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== e) : [...p, e]))}
                className={`tap-target rounded-card border-2 px-4 py-5 text-left font-semibold transition-all duration-150 ease-settle active:scale-[0.97] ${
                  on ? "border-primary bg-accent text-accent-foreground" : "border-transparent bg-card"
                }`}
              >
                {e}
              </button>
            );
          })}
        </div>
      </section>

      {/* Pause anı */}
      <section className="flex flex-col items-center gap-4 rounded-card bg-pause px-6 py-12 text-pause-foreground">
        <div className="grid size-52 place-items-center rounded-full border-4 border-pause-ring/40">
          <span className="text-timer numeric">10:00</span>
        </div>
        <p className="text-lg font-semibold">Şimdi karar vermek zorunda değilsin.</p>
        <p className="opacity-75">10 dakika sonra tekrar bakacağız.</p>
      </section>

      {/* Önce → sonra */}
      <section className="flex items-baseline justify-center gap-4 rounded-card bg-card p-8">
        <span className="text-6xl font-bold numeric text-muted-foreground">8</span>
        <span className="text-2xl text-muted-foreground">→</span>
        <span className="text-hero numeric">5</span>
        <span className="text-lg font-semibold text-change-positive">3 puan azaldı</span>
      </section>

      {/* Ana buton */}
      <button className="tap-target w-full rounded-card bg-primary py-6 text-xl font-bold tracking-wide text-primary-foreground animate-pulse-soft">
        DÜRTÜ GELDİ
      </button>
    </main>
  );
}

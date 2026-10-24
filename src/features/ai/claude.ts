import "server-only";

import { type Facts, unknownNumbers } from "./facts";

// Claude ile yorum: yalnızca sunucuda, anahtar ortam değişkeninden (ANTHROPIC_API_KEY).
// Anahtar yoksa ya da yorum kurallara uymuyorsa null döner; çağıran yedek metni kullanır.

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 20_000;

// Tanı/tedavi iddiası ya da çocuklaştırıcı övgü içeren yorumlar kullanılmaz (brief bölüm 15, 31)
const BANNED = [
  /tedavi/i, /teşhis/i, /\btanı/i, /bağımlılığın/i, /iyileş/i, /başardın/i, /harikasın/i,
  /\btreat/i, /\bcure/i, /diagnos/i, /addiction/i, /you did it/i, /amazing job/i,
];

const SYSTEM: Record<string, string> = {
  tr: `Sen PAUSE uygulamasının yorum asistanısın. PAUSE bir davranış farkındalığı ve öz-düzenleme aracıdır; tedavi değildir.
Sana kullanıcının kendi kayıtlarından sunucunun hesapladığı olgular JSON olarak verilecek. Görevin bunları kısa, sıcak ve yargılamayan bir dille yorumlamak.
Alanlar: period = son kaç gün ("all" = tüm kayıtlar); behavior = davranış (null = tüm davranışlar); avg_change eksi ise dürtü pause sonrası düşmüş demektir; min_measurements = bir alternatif hakkında yorum için gereken en az ölçüm.
Kurallar:
- Yalnızca olgulardaki bilgileri kullan. Yeni hesap yapma: toplama, çıkarma, oran ya da ortalama hesaplama.
- Bir sayı yazacaksan olgularda yazıldığı haliyle aynen yaz (ör. "%48", "−1,8", "21:00–01:00"). Olgularda olmayan hiçbir sayıyı yazma; adet ya da sıra için de rakam kullanma.
- learning_alternatives için "işe yarıyor" deme; "henüz öğreniyoruz" de.
- Tanı koyma, tıbbi tavsiye verme; "bağımlılık", "tedavi", "iyileşme" deme. Utandırma, suçlama, abartılı övgü yok.
- Kullanıcıya "sen" diye hitap et ve Türkçe yaz.
- En fazla 3 kısa paragraf, toplam en fazla 120 kelime. Başlık, madde işareti, emoji, markdown yok.
- Son paragrafta gelecek hafta denenebilecek tek, küçük ve somut bir deney öner; olgulardaki tetikleyici, alternatif ya da saatlere dayan.`,
  en: `You are the interpretation assistant of the PAUSE app. PAUSE is a behavior-awareness and self-regulation tool, not treatment.
You will receive facts computed by the server from the user's own entries, as JSON. Your job is to interpret them briefly, warmly and without judgment.
Fields: period = last N days ("all" = all entries); behavior = the behavior (null = all behaviors); a negative avg_change means the urge dropped after the pause; min_measurements = the minimum measurements needed to comment on an alternative.
Rules:
- Use only the information in the facts. Do not compute anything new: no sums, differences, ratios or averages.
- If you write a number, write it exactly as it appears in the facts (e.g. "48%", "−1.8", "21:00–01:00"). Never write a number that is not in the facts, not even for counting or ordering.
- Never say a learning_alternatives item "works"; say we are still learning.
- No diagnosis or medical advice; do not say "addiction", "treatment" or "recovery". No shaming, blaming or over-the-top praise.
- Address the user as "you" and write in English.
- At most 3 short paragraphs, 120 words in total. No headings, bullets, emoji or markdown.
- In the last paragraph suggest one small, concrete experiment for next week, based on the triggers, alternatives or hours in the facts.`,
};

type Message = { role: "user" | "assistant"; content: string };

async function call(model: string, key: string, system: string, messages: Message[]): Promise<string | null> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 600, temperature: 0.3, system, messages }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) {
    // 429 (sınır), 529 (yoğunluk), 401 (anahtar) vb.: yedek metne düşülür
    console.warn("Claude API", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text || null;
}

function problems(text: string, facts: Facts): string[] {
  const out: string[] = [];
  const unknown = unknownNumbers(text, facts);
  if (unknown.length) out.push(`numbers not in the facts: ${[...new Set(unknown)].join(", ")}`);
  if (BANNED.some((re) => re.test(text))) out.push("forbidden wording (diagnosis/treatment/addiction or exaggerated praise)");
  if (text.length > 1500) out.push("too long");
  if (/^\s*([-*•#]|\d+\.)\s/m.test(text)) out.push("uses bullets or headings");
  return out;
}

export async function interpretFacts(facts: Facts, locale: string): Promise<{ text: string; model: string } | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const system = SYSTEM[locale] ?? SYSTEM.en;
  const messages: Message[] = [{ role: "user", content: `FACTS:\n${JSON.stringify(facts, null, 2)}` }];

  try {
    // En fazla iki deneme: ilk cevap kurala uymazsa nedeni söylenip bir kez daha istenir
    for (let attempt = 0; attempt < 2; attempt++) {
      const text = await call(model, key, system, messages);
      if (!text) return null;
      const issues = problems(text, facts);
      if (!issues.length) return { text, model };
      messages.push(
        { role: "assistant", content: text },
        { role: "user", content: `Your answer broke the rules (${issues.join("; ")}). Rewrite it following every rule.` },
      );
    }
  } catch (e) {
    console.warn("Claude API error", e);
  }
  return null;
}

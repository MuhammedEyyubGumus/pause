// Onboarding'deki hazır davranışlar. Ekranda görünen ad i18n'den gelir
// (messages/*.json -> behaviors.<key>); veritabanına template_key yazılır.

export const BEHAVIOR_TEMPLATES = [
  { key: "smoking", icon: "cigarette" },
  { key: "eating", icon: "utensils", safety: true },
  { key: "alcohol", icon: "wine", safety: true },
  { key: "social_media", icon: "smartphone" },
  { key: "gaming", icon: "gamepad-2" },
  { key: "shopping", icon: "shopping-bag" },
  { key: "procrastination", icon: "hourglass" },
  { key: "nail_biting", icon: "hand" },
  { key: "sleep", icon: "moon" },
] as const satisfies ReadonlyArray<{ key: string; icon: string; safety?: boolean }>;

export type TemplateKey = (typeof BEHAVIOR_TEMPLATES)[number]["key"];

export const TEMPLATE_KEYS = BEHAVIOR_TEMPLATES.map((t) => t.key) as [TemplateKey, ...TemplateKey[]];

export const CUSTOM_BEHAVIOR_ICON = "sparkles";

// Güvenlik notunu gerektiren davranışlar (alkol: ani bırakma riski, yeme: yeme bozukluğu riski)
export const SAFETY_TEMPLATES: readonly TemplateKey[] = BEHAVIOR_TEMPLATES.filter(
  (t) => "safety" in t && t.safety,
).map((t) => t.key);

export function iconForTemplate(key: string | null | undefined): string {
  return BEHAVIOR_TEMPLATES.find((t) => t.key === key)?.icon ?? CUSTOM_BEHAVIOR_ICON;
}

// Davranışın ekranda gösterilecek adı: şablonsa çeviri, değilse kullanıcının yazdığı ad
export function isTemplateKey(key: string | null | undefined): key is TemplateKey {
  return BEHAVIOR_TEMPLATES.some((t) => t.key === key);
}

export const USUAL_TIMES = ["morning", "afternoon", "evening", "night", "varies"] as const;
export type UsualTime = (typeof USUAL_TIMES)[number];

// Davranış başına seçilebilen pause süreleri (dakika). Veritabanındaki check ile aynı.
export const PAUSE_MINUTES = [2, 5, 10, 15] as const;

export const BEHAVIOR_GOALS = ["reduce", "mindful", "quit", "custom"] as const;
export type BehaviorGoal = (typeof BEHAVIOR_GOALS)[number];

// Tasarruf hesabı için para birimleri (veritabanındaki check ile aynı)
export const CURRENCIES = ["TRY", "USD", "EUR", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

// Genellikle para harcanan davranışlar: "bir seferde ne harcıyorsun?" alanı açık gelir
export const MONEY_TEMPLATES: readonly string[] = ["smoking", "alcohol", "shopping", "gaming", "eating"];

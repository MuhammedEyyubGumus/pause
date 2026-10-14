// Davranış zincirinin halkaları (brief bölüm 18). Sunucu ve istemcide ortak:
// "use client" dosyalarından sabit içe aktarmak sunucuda çalışmaz, bu yüzden ayrı dosyada.
export const CHAIN_STEPS = ["trigger", "thought", "emotion", "urge", "first_action", "control_shift", "outcome"] as const;
export type ChainStep = (typeof CHAIN_STEPS)[number];
// Sonuç halkası kesilecek bir nokta değildir
export const CUTTABLE: ChainStep[] = CHAIN_STEPS.filter((s) => s !== "outcome");

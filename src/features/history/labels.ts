import { isTemplateKey } from "@/features/behaviors/templates";

type T = (key: string) => string;

// Davranışın görünen adı: şablonsa çeviri, değilse kullanıcının yazdığı ad
export function behaviorLabel(b: { name: string; template_key: string | null } | undefined, tb: T) {
  if (!b) return "";
  return isTemplateKey(b.template_key) ? tb(b.template_key) : b.name;
}

// Seçeneğin görünen adı: sistem seçeneğiyse çeviri, değilse kullanıcının etiketi
export function optionLabel(o: { kind: string; key: string | null; label: string | null } | undefined, tOpt: T) {
  if (!o) return "";
  return o.key ? tOpt(`${o.kind}.${o.key}`) : (o.label ?? "");
}

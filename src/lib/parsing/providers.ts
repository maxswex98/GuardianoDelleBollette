import type { UtilityType } from "@/lib/types";

export function detectUtilityType(text: string, fileName: string): UtilityType {
  const haystack = `${text}\n${fileName}`.toLowerCase();

  if (
    /\bfornitura di gas naturale\b|\bbolletta gas\b|\bgas naturale\b|\bsmc\b|\bstdm3\b|\bconsumo[\s\S]{0,40}(?:smc|stdm3)\b|\b\d+-g\b/.test(
      haystack
    )
  ) {
    return "gas";
  }

  if (
    /\bfornitura di energia elettrica\b|\benergia elettrica\b|\bkwh\b|\bf1\b|\bf2\b|\bf3\b|\bpod\b|consumo[\s\S]{0,40}kwh/.test(
      haystack
    )
  ) {
    return "electricity";
  }

  return "electricity";
}

export function detectProvider(text: string): string | null {
  const providers = [
    "Enel Energia",
    "Plenitude",
    "A2A",
    "Iren",
    "Acea",
    "Edison",
    "Hera",
    "Illumia",
    "Engie",
    "Wekiwi"
  ];

  const lower = text.toLowerCase();
  const match = providers.find((provider) => lower.includes(provider.toLowerCase()));
  return match ?? null;
}

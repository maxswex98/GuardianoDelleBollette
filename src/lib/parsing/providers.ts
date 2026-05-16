import type { UtilityType } from "@/lib/types";

function scoreMatches(haystack: string, expressions: Array<RegExp | { pattern: RegExp; weight: number }>) {
  return expressions.reduce((score, entry) => {
    const pattern = entry instanceof RegExp ? entry : entry.pattern;
    const weight = entry instanceof RegExp ? 1 : entry.weight;
    return pattern.test(haystack) ? score + weight : score;
  }, 0);
}

export function detectUtilityType(text: string, fileName: string, provider?: string | null): UtilityType {
  const haystack = `${text}\n${fileName}`.toLowerCase();
  const providerName = provider?.toLowerCase() ?? "";

  const hasElectricitySignals =
    /\bfornitura di energia elettrica\b|\benergia elettrica\b|\benergia attiva\b|\btotale consumo\s*\(kwh\)\b|\bkwh\b|\bpod\b|\bpunto di prelievo\b/.test(
      haystack
    );
  const hasGasSignals = /\bfornitura di gas naturale\b|\bgas naturale\b|\bgas domestico\b|\bsmc\b|\bstdm3\b|\bpdr\b|\bmetano\b|\b\d+-g\b/.test(
    haystack
  );

  if (providerName === "iren") {
    if (hasElectricitySignals) {
      return "electricity";
    }

    if (hasGasSignals) {
      return "gas";
    }
  }

  if (providerName === "wekiwi") {
    if (hasGasSignals) {
      return "gas";
    }

    if (hasElectricitySignals) {
      return "electricity";
    }
  }

  const gasScore = scoreMatches(haystack, [
    { pattern: /\bfornitura di gas naturale\b/, weight: 4 },
    { pattern: /\bgas naturale\b/, weight: 4 },
    { pattern: /\bgas domestico\b/, weight: 3 },
    { pattern: /\bsmc\b/, weight: 3 },
    { pattern: /\bstdm3\b/, weight: 3 },
    { pattern: /\bpdr\b/, weight: 2 },
    { pattern: /\bmetano\b/, weight: 2 },
    { pattern: /\b\d+-g\b/, weight: 3 },
    { pattern: /consumo[\s\S]{0,40}(?:smc|stdm3|mc)\b/, weight: 2 }
  ]);

  const electricityScore = scoreMatches(haystack, [
    { pattern: /\bfornitura di energia elettrica\b/, weight: 4 },
    { pattern: /\benergia elettrica\b/, weight: 4 },
    { pattern: /\bkwh\b/, weight: 3 },
    { pattern: /\bpod\b/, weight: 3 },
    { pattern: /\benergia attiva\b/, weight: 3 },
    { pattern: /\bpotenza impegnata\b/, weight: 2 },
    { pattern: /\bf1\b/, weight: 1 },
    { pattern: /\bf2\b/, weight: 1 },
    { pattern: /\bf3\b/, weight: 1 },
    { pattern: /consumo[\s\S]{0,40}kwh\b/, weight: 2 }
  ]);

  if (gasScore > electricityScore) {
    return "gas";
  }

  if (electricityScore > gasScore) {
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

import path from "node:path";
import { extractPdfText } from "@/lib/parsing/extract";
import { detectProvider, detectUtilityType } from "@/lib/parsing/providers";
import type { UtilityType } from "@/lib/types";
import { parseItalianDate, parseItalianNumber } from "@/lib/utils";

export type ParsedInvoiceInput = {
  utilityType: UtilityType;
  provider: string | null;
  invoiceNumber: string | null;
  issueDate: string | null;
  dueDate: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  totalAmount: number | null;
  consumptionValue: number | null;
  consumptionUnit: string | null;
  unitCost: number | null;
  fixedCost: number | null;
  taxes: number | null;
  previousReading: number | null;
  currentReading: number | null;
  rawExtractedText: string;
  parseConfidence: number;
  notes: string | null;
};

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function firstMatch(text: string, expressions: RegExp[]): string | null {
  for (const expression of expressions) {
    const match = text.match(expression);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function matchAmountNearLabel(text: string, labels: string[]): number | null {
  for (const label of labels) {
    const expression = new RegExp(`${label}[\\s:\\n-]*([0-9.]+,[0-9]+|[0-9]+(?:[.,][0-9]+)?)\\s*(?:â‚¬|euro)?`, "i");
    const match = text.match(expression);
    if (match?.[1]) {
      return parseItalianNumber(match[1]);
    }
  }

  return null;
}

function matchMoneyNearLabel(text: string, labels: string[]): number | null {
  for (const label of labels) {
    const expression = new RegExp(`${label}[\\s:\\n-]*([^\\n]{0,120})`, "i");
    const section = text.match(expression)?.[1];
    if (!section) {
      continue;
    }

    const matches = [...section.matchAll(/([0-9.]+,[0-9]{2}|[0-9]+(?:[.,][0-9]{2}))\s*(?:â‚¬|euro)?/gi)];
    if (matches.length === 0) {
      continue;
    }

    const picked = matches[matches.length - 1]?.[1];
    if (picked) {
      return parseItalianNumber(picked);
    }
  }

  return null;
}

function matchSectionTotalMoney(text: string, label: string): number | null {
  const expression = new RegExp(`${label}[\\s\\S]{0,160}?([0-9.]+,[0-9]{2})\\s*(?:â‚¬|euro)`, "i");
  const match = text.match(expression);
  return match?.[1] ? parseItalianNumber(match[1]) : null;
}

function matchSectionAveragePrice(text: string, label: string, unit: string): number | null {
  const expression = new RegExp(`${label}[\\s\\S]{0,140}?([0-9.]+,[0-9]{3,6})\\s*â‚¬\\/${unit}`, "i");
  const match = text.match(expression);
  return match?.[1] ? parseItalianNumber(match[1]) : null;
}

function matchDateNearLabel(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const expression = new RegExp(`${label}[\\s:\\n-]*(\\d{2}[\\/.-]\\d{2}[\\/.-]\\d{4})`, "i");
    const match = text.match(expression);
    if (match?.[1]) {
      return parseItalianDate(match[1]);
    }
  }

  return null;
}

function matchGenericField(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const expression = new RegExp(`${label}[\\s:\\n-]*([A-Z0-9\\/-]+)`, "i");
    const match = text.match(expression);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractPeriod(text: string) {
  const numericMatch = text.match(
    /(?:periodo(?: di fatturazione| di riferimento)?|fornitura)[\s:\n-]*(\d{2}[\/.-]\d{2}[\/.-]\d{4})\s*(?:-|al|a)\s*(\d{2}[\/.-]\d{2}[\/.-]\d{4})/i
  );

  if (numericMatch) {
    return {
      start: parseItalianDate(numericMatch[1]),
      end: parseItalianDate(numericMatch[2])
    };
  }

  const textualMatch = text.match(
    /(?:periodo(?: di fatturazione| di riferimento)?|fornitura)[\s:\n*-]*(\d{2}\s+[A-Za-z]+\s+\d{4})\s*(?:-|al|a)\s*(\d{2}\s+[A-Za-z]+\s+\d{4})/i
  );

  if (!textualMatch) {
    return {
      start: null,
      end: null
    };
  }

  return {
    start: parseItalianDate(textualMatch[1]),
    end: parseItalianDate(textualMatch[2])
  };
}

function scoreConfidence(values: Array<unknown>): number {
  const present = values.filter((value) => value !== null && value !== undefined).length;
  return Math.min(0.35 + present * 0.09, 0.98);
}

function extractWekiwiReadings(text: string) {
  const matches = [...text.matchAll(/Lettura\s+Certa\s+Distributore(?:del)?\s+\d{2}\/\d{2}\/\d{4}\s*([0-9.]+(?:,[0-9]+)?)/gi)];
  const values = matches.map((match) => parseItalianNumber(match[1])).filter((value): value is number => value !== null);

  if (values.length < 2) {
    return {
      previousReading: null,
      currentReading: null
    };
  }

  return {
    previousReading: values[1] ?? null,
    currentReading: values[0] ?? null
  };
}

export async function parseInvoiceFile(filePath: string): Promise<ParsedInvoiceInput> {
  const text = normalizeText(await extractPdfText(filePath));
  const fileName = path.basename(filePath);
  const lowerText = text.toLowerCase();
  let utilityType = detectUtilityType(text, fileName);
  const provider = detectProvider(text);
  const period = extractPeriod(text);
  const isWekiwi = provider?.toLowerCase() === "wekiwi";
  const isIren = provider?.toLowerCase() === "iren";
  const wekiwiHeaderMatch = text.match(/fattura\s+n(?:°|º|o|\.)?\s*([A-Z0-9\/-]+)\s+del\s+(\d{2}[\/.-]\d{2}[\/.-]\d{4})/i);

  const hasStrongGasSignal =
    /\bfornitura di gas naturale\b|\bgas naturale\b|\bgas domestico\b|\bsmc\b|\bstdm3\b|\bmc\b|\b\d+-g\b/.test(
      lowerText
    ) || /fattura[^\n]{0,40}-g\b/i.test(text);

  const hasStrongElectricitySignal =
    /\bfornitura di energia elettrica\b|\benergia elettrica\b|\bkwh\b|\bf1\b|\bf2\b|\bf3\b|\bpod\b|consumo totale fatturato nel periodo[\s\S]{0,40}kwh/.test(
      lowerText
    );

  if (hasStrongGasSignal) {
    utilityType = "gas";
  } else if (hasStrongElectricitySignal) {
    utilityType = "electricity";
  }

  const invoiceNumber =
    wekiwiHeaderMatch?.[1]?.trim() ??
    firstMatch(text, [/fattura\s+n\.\s*([A-Z0-9*\/-]+)/i]) ??
    matchGenericField(text, [
      "numero fattura",
      "n\\. fattura",
      "nÂ° fattura elettronica valida ai fini fiscali",
      "fattura n\\.?"
    ]) ??
    firstMatch(text, [/(?:numero fattura|n\. fattura|fattura n\.?)[\s:\n-]*([A-Z0-9\/*-]+)/i]);

  const issueDate =
    parseItalianDate(wekiwiHeaderMatch?.[2] ?? null) ??
    matchDateNearLabel(text, ["data emissione", "emessa il", "data fattura"]) ??
    parseItalianDate(firstMatch(text, [/(?:emessa in data)[\s:\n-]*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i])) ??
    parseItalianDate(firstMatch(text, [/(?:data emissione|emessa il|data fattura)[\s:\n-]*(\d{2}[\/.-]\d{2}[\/.-]\d{4})/i]));

  const dueDate =
    matchDateNearLabel(text, ["data scadenza", "scadenza", "da pagare entro il"]) ??
    parseItalianDate(firstMatch(text, [/(?:scadenza|da pagare entro il)[\s:\n-]*(\d{2}[\/.-]\d{2}[\/.-]\d{4})/i]));

  const totalAmount =
    matchMoneyNearLabel(text, ["totale da pagare", "importo complessivo", "totale bolletta", "Totale Bolletta"]) ??
    parseItalianNumber(
      firstMatch(text, [
        /(?:totale da pagare|importo complessivo|totale bolletta)[\s:\n-]*([0-9.,]+)\s*euro/i,
        /(?:totale da pagare|importo complessivo|totale bolletta)[\s:\n-]*â‚¬?\s*([0-9.,]+)/i
      ])
    );

  const consumptionValue =
    utilityType === "gas"
      ? parseItalianNumber(
          firstMatch(text, [
            /consumi fatturati in bolletta[\s:\n-]*([0-9.,]+)/i,
            /consumi totali del periodo[\s:\n-]*([0-9.,]+)/i,
            /standard metri cubi[\s:\n-]*([0-9.,]+)/i,
            /(?:consumo(?: totale)?(?: fatturato)?|smc fatturati)[\s:\n-]*([0-9.,]+)\s*(?:smc|mc|stdm3)/i
          ])
        ) ??
        matchAmountNearLabel(text, ["consumo totale fatturato", "consumi fatturati", "smc fatturati", "mc fatturati"]) ??
        parseItalianNumber(
          firstMatch(text, [/(?:consumo(?: totale)?(?: fatturato)?|smc fatturati)[\s:\n-]*([0-9.,]+)\s*(?:smc|mc|stdm3)/i])
        )
      : parseItalianNumber(
          firstMatch(text, [
            /consumo totale fatturato nel periodo[\s*\n-]*([0-9.]+(?:,[0-9]+)?)\s*kwh/i,
            /energia attiva[\s]*([0-9.]+(?:,[0-9]+)?)\s*kwh\s*x/i,
            /(?:consumo(?: fatturato)?|energia attiva)[\s:\n-]*([0-9.,]+)\s*kwh/i,
            /TOTALE[\s:\n-]*([0-9.]+(?:,[0-9]+)?)\s*kwh/i
          ])
        ) ?? matchAmountNearLabel(text, ["consumo totale fatturato nel periodo", "consumo fatturato", "energia attiva"]);

  const consumptionUnit = utilityType === "gas" ? "Smc" : "kWh";

  const wekiwiMatterCost = isWekiwi ? matchMoneyNearLabel(text, ["Spesa per la materia gas naturale"]) : null;

  const unitCost =
    (isWekiwi ? matchSectionAveragePrice(text, "Quota consumi", "smc") : null) ??
    (utilityType === "electricity" ? matchSectionAveragePrice(text, "ENERGIA ATTIVA", "kWh") : null) ??
    matchMoneyNearLabel(text, ["prezzo medio", "p0", "costo unitario", "prezzo materia prima", "corrispettivo unitario"]) ??
    parseItalianNumber(
      firstMatch(text, [/(?:costo unitario|prezzo materia(?: prima)?|corrispettivo unitario|p0)[\s:\n-]*â‚¬?\s*([0-9.,]+)/i])
    ) ??
    (isWekiwi && wekiwiMatterCost !== null && consumptionValue ? Number((wekiwiMatterCost / consumptionValue).toFixed(5)) : null);

  const wekiwiTransportCost = isWekiwi ? matchMoneyNearLabel(text, ["Spesa per il trasporto e la gestione del contatore"]) : null;
  const wekiwiSystemCost = isWekiwi ? matchMoneyNearLabel(text, ["Spesa per gli oneri di sistema"]) : null;

  const fixedCost =
    (isWekiwi ? matchSectionTotalMoney(text, "Quota fissa") : null) ??
    (isIren ? matchSectionTotalMoney(text, "Quota fissa") : null) ??
    matchMoneyNearLabel(text, ["di cui spesa per la quota fissa", "quota fissa", "spesa fissa", "corrispettivo fisso"]) ??
    (isWekiwi && wekiwiTransportCost !== null && wekiwiSystemCost !== null
      ? Number((wekiwiTransportCost + wekiwiSystemCost).toFixed(2))
      : isWekiwi || isIren
        ? null
        : parseItalianNumber(firstMatch(text, [/(?:quota fissa|spesa fissa|corrispettivo fisso)[\s:\n-]*â‚¬?\s*([0-9.,]+)/i])));

  const taxes =
    (isIren ? matchMoneyNearLabel(text, ["accise e iva"]) : null) ??
    matchMoneyNearLabel(text, ["totale imposte e iva", "imposte", "iva", "accise"]) ??
    parseItalianNumber(firstMatch(text, [/(?:imposte|iva|accise)[\s:\n-]*â‚¬?\s*([0-9.,]+)/i]));

  const providerReadings = isWekiwi ? extractWekiwiReadings(text) : { previousReading: null, currentReading: null };

  const previousReading =
    providerReadings.previousReading ??
    parseItalianNumber(firstMatch(text, [/(?:lettura precedente|lettura iniziale)[\s:\n-]*([0-9.,]+)/i]));

  const currentReading =
    providerReadings.currentReading ??
    parseItalianNumber(firstMatch(text, [/(?:lettura attuale|lettura finale)[\s:\n-]*([0-9.,]+)/i]));

  const parseConfidence = scoreConfidence([
    provider,
    invoiceNumber,
    issueDate,
    dueDate,
    period.start,
    period.end,
    totalAmount,
    consumptionValue,
    fixedCost,
    taxes
  ]);

  const notes =
    parseConfidence < 0.7
      ? "Parsing con confidenza bassa: conviene verificare i valori estratti e valutare un parser dedicato al fornitore."
      : null;

  return {
    utilityType,
    provider,
    invoiceNumber,
    issueDate,
    dueDate,
    billingPeriodStart: period.start,
    billingPeriodEnd: period.end,
    totalAmount,
    consumptionValue,
    consumptionUnit,
    unitCost,
    fixedCost,
    taxes,
    previousReading,
    currentReading,
    rawExtractedText: text,
    parseConfidence,
    notes
  };
}






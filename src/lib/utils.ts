import { format, isValid, parseISO } from "date-fns";

export function parseItalianNumber(raw: string | null | undefined): number | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  if (!normalized) {
    return null;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function parseItalianDate(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  const monthMap: Record<string, string> = {
    gennaio: "01",
    febbraio: "02",
    marzo: "03",
    aprile: "04",
    maggio: "05",
    giugno: "06",
    luglio: "07",
    agosto: "08",
    settembre: "09",
    ottobre: "10",
    novembre: "11",
    dicembre: "12"
  };

  const match = raw.match(/(\d{2})[\/.-](\d{2})[\/.-](\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }

  const textualMatch = raw
    .toLowerCase()
    .match(/(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/);

  if (!textualMatch) {
    return null;
  }

  const [, day, monthName, year] = textualMatch;
  const month = monthMap[monthName];
  if (!month) {
    return null;
  }

  return `${year}-${month}-${day.padStart(2, "0")}`;
}

export function slugifyFileName(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
}

export function formatCurrency(value: number | null): string {
  if (value === null) {
    return "n.d.";
  }

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}

export function formatNumber(value: number | null, unit?: string | null): string {
  if (value === null) {
    return "n.d.";
  }

  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);

  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatPercent(value: number | null): string {
  if (value === null) {
    return "n.d.";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "n.d.";
  }

  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const parsed = parseISO(normalized);

  if (!isValid(parsed)) {
    return "n.d.";
  }

  return format(parsed, "dd/MM/yyyy");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

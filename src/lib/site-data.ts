import rawSiteData from "@/data/site-data.json";
import { buildComparison } from "@/lib/services/comparison";
import type {
  DashboardStats,
  InvoiceRecord,
  InvoiceWithComparison,
  SiteData,
  SiteSettings,
  UtilityType
} from "@/lib/types";

const siteData = rawSiteData as SiteData;

function toReferenceDate(invoice: InvoiceRecord) {
  return invoice.billingPeriodEnd ?? invoice.issueDate ?? invoice.createdAt.slice(0, 10);
}

function sortInvoicesDescending(invoices: InvoiceRecord[]) {
  return [...invoices].sort((left, right) => {
    const dateCompare = toReferenceDate(right).localeCompare(toReferenceDate(left));
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function getPreviousInvoice(invoices: InvoiceRecord[], current: InvoiceRecord) {
  const currentDate = toReferenceDate(current);

  return (
    invoices.find((candidate) => {
      if (candidate.id === current.id || candidate.utilityType !== current.utilityType) {
        return false;
      }

      return toReferenceDate(candidate) < currentDate;
    }) ?? null
  );
}

function withComparisons(invoices: InvoiceRecord[]): InvoiceWithComparison[] {
  const sorted = sortInvoicesDescending(invoices);

  return sorted.map((invoice) => ({
    ...invoice,
    comparison: buildComparison(invoice, getPreviousInvoice(sorted, invoice))
  }));
}

function monthKey(value: string | null) {
  return value ? value.slice(0, 7) : null;
}

function previousMonthKey(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}-01T00:00:00`);
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().slice(0, 7);
}

function sumForMonth(invoices: InvoiceRecord[], targetMonth: string | null, field: "totalAmount" | "consumptionValue") {
  if (!targetMonth) {
    return 0;
  }

  return invoices.reduce((sum, invoice) => {
    const key = monthKey(invoice.billingPeriodEnd ?? invoice.issueDate);
    if (key !== targetMonth) {
      return sum;
    }

    return sum + (invoice[field] ?? 0);
  }, 0);
}

export function getSiteData(): SiteData {
  return siteData;
}

export function getSiteSettings(): SiteSettings {
  return siteData.settings;
}

export function getAllInvoices(): InvoiceWithComparison[] {
  return withComparisons(siteData.invoices);
}

export function getInvoicesByUtility(utilityType?: UtilityType): InvoiceWithComparison[] {
  const invoices = utilityType
    ? siteData.invoices.filter((invoice) => invoice.utilityType === utilityType)
    : siteData.invoices;

  return withComparisons(invoices);
}

export function getInvoiceByIdFromData(id: string): InvoiceWithComparison | null {
  const invoices = getAllInvoices();
  return invoices.find((invoice) => invoice.id === id) ?? null;
}

export function getAllInvoiceIds(): string[] {
  return siteData.invoices.map((invoice) => invoice.id);
}

export function getDashboardStatsFromData(): DashboardStats {
  const invoices = sortInvoicesDescending(siteData.invoices);
  const latestMonth = monthKey(invoices[0] ? invoices[0].billingPeriodEnd ?? invoices[0].issueDate : null);
  const previousMonth = previousMonthKey(latestMonth);
  const invoicesWithComparison = withComparisons(invoices);

  return {
    totalInvoices: invoices.length,
    activeAlerts: invoicesWithComparison.filter(
      (invoice) =>
        invoice.comparison?.totalDeltaPercent !== null &&
        invoice.comparison?.totalDeltaPercent !== undefined &&
        Math.abs(invoice.comparison.totalDeltaPercent) >= siteData.settings.alertThresholdPercent
    ).length,
    currentMonthSpend: Number(sumForMonth(invoices, latestMonth, "totalAmount").toFixed(2)),
    previousMonthSpend: Number(sumForMonth(invoices, previousMonth, "totalAmount").toFixed(2)),
    currentMonthConsumption: Number(sumForMonth(invoices, latestMonth, "consumptionValue").toFixed(2)),
    previousMonthConsumption: Number(sumForMonth(invoices, previousMonth, "consumptionValue").toFixed(2))
  };
}

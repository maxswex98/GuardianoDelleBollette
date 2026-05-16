import {
  getAllInvoiceIds,
  getDashboardStatsFromData,
  getInvoiceByIdFromData,
  getInvoicesByUtility,
  getSiteSettings
} from "@/lib/site-data";
import type { DashboardStats, InvoiceWithComparison, SiteSettings, UtilityType } from "@/lib/types";

export async function getInvoices(utilityType?: UtilityType): Promise<InvoiceWithComparison[]> {
  return getInvoicesByUtility(utilityType);
}

export async function getInvoiceById(id: string): Promise<InvoiceWithComparison | null> {
  return getInvoiceByIdFromData(id);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return getDashboardStatsFromData();
}

export async function getStaticInvoiceIds(): Promise<string[]> {
  return getAllInvoiceIds();
}

export async function getAppSettings(): Promise<SiteSettings> {
  return getSiteSettings();
}

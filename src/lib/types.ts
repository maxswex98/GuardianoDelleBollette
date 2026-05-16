export type UtilityType = "electricity" | "gas";

export type InvoiceRecord = {
  id: string;
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
  sourceFilename: string;
  sourcePath: string;
  archivedPath: string | null;
  publicPdfPath: string | null;
  rawExtractedText: string;
  parseConfidence: number;
  notes: string | null;
  createdAt: string;
};

export type InvoiceComparison = {
  previousInvoiceId: string | null;
  totalDelta: number | null;
  totalDeltaPercent: number | null;
  consumptionDelta: number | null;
  consumptionDeltaPercent: number | null;
  unitCostDelta: number | null;
  unitCostDeltaPercent: number | null;
  fixedCostDelta: number | null;
  fixedCostDeltaPercent: number | null;
  taxesDelta: number | null;
  taxesDeltaPercent: number | null;
};

export type InvoiceWithComparison = InvoiceRecord & {
  comparison: InvoiceComparison | null;
};

export type DashboardStats = {
  totalInvoices: number;
  activeAlerts: number;
  currentMonthSpend: number;
  previousMonthSpend: number;
  currentMonthConsumption: number;
  previousMonthConsumption: number;
};

export type SiteSettings = {
  appName: string;
  ownerName: string;
  coOwnerName: string;
  serviceAddress: string;
  sourceFolderLabel: string;
  alertThresholdPercent: number;
};

export type SiteData = {
  generatedAt: string;
  syncMode: "bootstrap" | "local-folder" | "onedrive";
  settings: SiteSettings;
  invoices: InvoiceRecord[];
};

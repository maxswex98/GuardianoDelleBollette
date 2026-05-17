import type { InvoiceRecord } from "@/lib/types";

function referenceDate(invoice: Pick<InvoiceRecord, "billingPeriodEnd" | "issueDate" | "createdAt">) {
  return invoice.billingPeriodEnd ?? invoice.issueDate ?? invoice.createdAt.slice(0, 10);
}

export function formatArchiveMonth(invoice: Pick<InvoiceRecord, "billingPeriodEnd" | "issueDate" | "createdAt">) {
  const reference = referenceDate(invoice);
  const date = new Date(`${reference}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "n.d.";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${month}-${year}`;
}

export function buildArchiveFileName(
  invoice: Pick<InvoiceRecord, "utilityType" | "billingPeriodEnd" | "issueDate" | "createdAt">
) {
  const utilityLabel = invoice.utilityType === "electricity" ? "Luce" : "Gas";
  return `${utilityLabel}_${formatArchiveMonth(invoice)}.pdf`;
}

import { sql } from "../src/lib/db/client";
import { toIsoDate } from "../src/lib/db/date";
import { ensureSchema } from "../src/lib/db/schema";
import { parseInvoiceFile } from "../src/lib/parsing/parse-invoice";
import { refreshComparison } from "../src/lib/services/invoices";

async function main() {
  const invoiceId = process.argv[2];

  if (!invoiceId) {
    throw new Error("Usage: npm run invoice:reparse -- <invoice-id>");
  }

  await ensureSchema();

  const [row] = await sql`
    select *
    from invoices
    where id = ${invoiceId}
    limit 1
  `;

  if (!row) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  const filePath = (row.archived_path as string | null) ?? String(row.source_path);
  const parsed = await parseInvoiceFile(filePath);

  await sql`
    update invoices
    set utility_type = ${parsed.utilityType},
        provider = ${parsed.provider},
        invoice_number = ${parsed.invoiceNumber},
        issue_date = ${parsed.issueDate},
        due_date = ${parsed.dueDate},
        billing_period_start = ${parsed.billingPeriodStart},
        billing_period_end = ${parsed.billingPeriodEnd},
        total_amount = ${parsed.totalAmount},
        consumption_value = ${parsed.consumptionValue},
        consumption_unit = ${parsed.consumptionUnit},
        unit_cost = ${parsed.unitCost},
        fixed_cost = ${parsed.fixedCost},
        taxes = ${parsed.taxes},
        previous_reading = ${parsed.previousReading},
        current_reading = ${parsed.currentReading},
        raw_extracted_text = ${parsed.rawExtractedText},
        parse_confidence = ${parsed.parseConfidence},
        notes = ${parsed.notes}
    where id = ${invoiceId}
  `;

  const [updated] = await sql`
    select *
    from invoices
    where id = ${invoiceId}
    limit 1
  `;

  await refreshComparison({
    id: String(updated.id),
    utilityType: updated.utility_type,
    provider: updated.provider,
    invoiceNumber: updated.invoice_number,
    issueDate: toIsoDate(updated.issue_date),
    dueDate: toIsoDate(updated.due_date),
    billingPeriodStart: toIsoDate(updated.billing_period_start),
    billingPeriodEnd: toIsoDate(updated.billing_period_end),
    totalAmount: updated.total_amount === null ? null : Number(updated.total_amount),
    consumptionValue: updated.consumption_value === null ? null : Number(updated.consumption_value),
    consumptionUnit: updated.consumption_unit,
    unitCost: updated.unit_cost === null ? null : Number(updated.unit_cost),
    fixedCost: updated.fixed_cost === null ? null : Number(updated.fixed_cost),
    taxes: updated.taxes === null ? null : Number(updated.taxes),
    previousReading: updated.previous_reading === null ? null : Number(updated.previous_reading),
    currentReading: updated.current_reading === null ? null : Number(updated.current_reading),
    sourceFilename: String(updated.source_filename),
    sourcePath: String(updated.source_path),
    archivedPath: updated.archived_path,
    publicPdfPath: null,
    rawExtractedText: String(updated.raw_extracted_text),
    parseConfidence: Number(updated.parse_confidence),
    notes: updated.notes,
    createdAt: new Date(String(updated.created_at)).toISOString()
  });

  console.log(`Reparsed invoice ${invoiceId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

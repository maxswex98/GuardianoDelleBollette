import { sql } from "@/lib/db/client";
import { toIsoDate } from "@/lib/db/date";
import { ensureSchema } from "@/lib/db/schema";
import { parseInvoiceFile } from "@/lib/parsing/parse-invoice";
import { buildComparison } from "@/lib/services/comparison";
import type { InvoiceRecord } from "@/lib/types";

type PersistInvoiceInput = Awaited<ReturnType<typeof parseInvoiceFile>> & {
  sourceFilename: string;
  sourcePath: string;
  archivedPath: string | null;
};

function mapInserted(row: Record<string, unknown>): InvoiceRecord {
  return {
    id: String(row.id),
    utilityType: row.utility_type as InvoiceRecord["utilityType"],
    provider: (row.provider as string | null) ?? null,
    invoiceNumber: (row.invoice_number as string | null) ?? null,
    issueDate: toIsoDate(row.issue_date),
    dueDate: toIsoDate(row.due_date),
    billingPeriodStart: toIsoDate(row.billing_period_start),
    billingPeriodEnd: toIsoDate(row.billing_period_end),
    totalAmount: row.total_amount === null ? null : Number(row.total_amount),
    consumptionValue: row.consumption_value === null ? null : Number(row.consumption_value),
    consumptionUnit: (row.consumption_unit as string | null) ?? null,
    unitCost: row.unit_cost === null ? null : Number(row.unit_cost),
    fixedCost: row.fixed_cost === null ? null : Number(row.fixed_cost),
    taxes: row.taxes === null ? null : Number(row.taxes),
    previousReading: row.previous_reading === null ? null : Number(row.previous_reading),
    currentReading: row.current_reading === null ? null : Number(row.current_reading),
    sourceFilename: String(row.source_filename),
    sourcePath: String(row.source_path),
    archivedPath: (row.archived_path as string | null) ?? null,
    publicPdfPath: null,
    rawExtractedText: String(row.raw_extracted_text),
    parseConfidence: Number(row.parse_confidence),
    notes: (row.notes as string | null) ?? null,
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

export async function persistParsedInvoice(input: PersistInvoiceInput): Promise<InvoiceRecord> {
  await ensureSchema();

  const [row] = await sql`
    insert into invoices (
      utility_type, provider, invoice_number, issue_date, due_date, billing_period_start,
      billing_period_end, total_amount, consumption_value, consumption_unit, unit_cost,
      fixed_cost, taxes, previous_reading, current_reading, source_filename, source_path,
      archived_path, raw_extracted_text, parse_confidence, notes
    ) values (
      ${input.utilityType},
      ${input.provider},
      ${input.invoiceNumber},
      ${input.issueDate},
      ${input.dueDate},
      ${input.billingPeriodStart},
      ${input.billingPeriodEnd},
      ${input.totalAmount},
      ${input.consumptionValue},
      ${input.consumptionUnit},
      ${input.unitCost},
      ${input.fixedCost},
      ${input.taxes},
      ${input.previousReading},
      ${input.currentReading},
      ${input.sourceFilename},
      ${input.sourcePath},
      ${input.archivedPath},
      ${input.rawExtractedText},
      ${input.parseConfidence},
      ${input.notes}
    )
    on conflict (source_path) do update
    set archived_path = excluded.archived_path,
        raw_extracted_text = excluded.raw_extracted_text,
        parse_confidence = excluded.parse_confidence,
        notes = excluded.notes
    returning *
  `;

  const invoice = mapInserted(row);
  await refreshComparison(invoice);
  return invoice;
}

export async function refreshComparison(invoice: InvoiceRecord) {
  const referenceDate = invoice.billingPeriodEnd ?? invoice.issueDate;
  const [previousRow] = await sql`
    select *
    from invoices
    where utility_type = ${invoice.utilityType}
      and id <> ${invoice.id}
      and coalesce(billing_period_end, issue_date, created_at::date) < ${referenceDate ?? "9999-12-31"}
    order by coalesce(billing_period_end, issue_date, created_at::date) desc, created_at desc
    limit 1
  `;

  const previous = previousRow ? mapInserted(previousRow) : null;
  const comparison = buildComparison(invoice, previous);

  await sql`delete from invoice_comparisons where invoice_id = ${invoice.id}`;

  if (!comparison) {
    return null;
  }

  await sql`
    insert into invoice_comparisons (
      invoice_id, previous_invoice_id, total_delta, total_delta_percent,
      consumption_delta, consumption_delta_percent, unit_cost_delta, unit_cost_delta_percent,
      fixed_cost_delta, fixed_cost_delta_percent, taxes_delta, taxes_delta_percent
    ) values (
      ${invoice.id},
      ${comparison.previousInvoiceId},
      ${comparison.totalDelta},
      ${comparison.totalDeltaPercent},
      ${comparison.consumptionDelta},
      ${comparison.consumptionDeltaPercent},
      ${comparison.unitCostDelta},
      ${comparison.unitCostDeltaPercent},
      ${comparison.fixedCostDelta},
      ${comparison.fixedCostDeltaPercent},
      ${comparison.taxesDelta},
      ${comparison.taxesDeltaPercent}
    )
  `;

  return comparison;
}

export async function ingestInvoiceFromFile(filePath: string, archivedPath: string | null) {
  const parsed = await parseInvoiceFile(filePath);
  return persistParsedInvoice({
    ...parsed,
    sourceFilename: filePath.split(/[\\/]/).pop() ?? filePath,
    sourcePath: filePath,
    archivedPath
  });
}

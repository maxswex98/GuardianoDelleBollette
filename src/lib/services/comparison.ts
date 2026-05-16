import type { InvoiceRecord } from "@/lib/types";

function delta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) {
    return null;
  }

  return Number((current - previous).toFixed(3));
}

function deltaPercent(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) {
    return null;
  }

  return Number((((current - previous) / previous) * 100).toFixed(2));
}

export function buildComparison(current: InvoiceRecord, previous: InvoiceRecord | null) {
  if (!previous) {
    return null;
  }

  return {
    previousInvoiceId: previous.id,
    totalDelta: delta(current.totalAmount, previous.totalAmount),
    totalDeltaPercent: deltaPercent(current.totalAmount, previous.totalAmount),
    consumptionDelta: delta(current.consumptionValue, previous.consumptionValue),
    consumptionDeltaPercent: deltaPercent(current.consumptionValue, previous.consumptionValue),
    unitCostDelta: delta(current.unitCost, previous.unitCost),
    unitCostDeltaPercent: deltaPercent(current.unitCost, previous.unitCost),
    fixedCostDelta: delta(current.fixedCost, previous.fixedCost),
    fixedCostDeltaPercent: deltaPercent(current.fixedCost, previous.fixedCost),
    taxesDelta: delta(current.taxes, previous.taxes),
    taxesDeltaPercent: deltaPercent(current.taxes, previous.taxes)
  };
}

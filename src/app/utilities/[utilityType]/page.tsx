import { notFound } from "next/navigation";
import { InvoiceTable } from "@/components/invoice-table";
import { MetricChart } from "@/components/metric-chart";
import { getInvoices } from "@/lib/db/queries";
import type { UtilityType } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamicParams = false;

const utilityLabels: Record<UtilityType, string> = {
  electricity: "Luce",
  gas: "Gas"
};

export default async function UtilityPage({
  params
}: {
  params: Promise<{ utilityType: string }>;
}) {
  const { utilityType } = await params;

  if (utilityType !== "electricity" && utilityType !== "gas") {
    notFound();
  }

  const invoices = await getInvoices(utilityType as UtilityType);

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Vista dedicata</p>
        <h1>{utilityLabels[utilityType as UtilityType]}</h1>
        <p>
          Storico completo, confronto mese su mese e accesso rapido ai PDF processati per la fornitura{" "}
          {utilityLabels[utilityType as UtilityType].toLowerCase()}.
        </p>
      </section>

      <section className="cards-grid">
        <MetricChart
          invoices={invoices.slice(0, 6)}
          title="Costi per mese"
          accent={utilityType === "gas" ? "gold" : "gold"}
          eyebrow="Grafico mensile"
          valueFor={(invoice) => invoice.totalAmount}
          valueLabelFor={(invoice) => formatCurrency(invoice.totalAmount)}
          labelFor={(invoice) => invoice.billingPeriodEnd?.slice(0, 7) ?? invoice.issueDate?.slice(0, 7) ?? "n.d."}
        />
        <MetricChart
          invoices={invoices.slice(0, 6)}
          title={`Consumi per mese (${utilityType === "gas" ? "smc" : "kWh"})`}
          accent={utilityType === "gas" ? "emerald" : "gold"}
          eyebrow="Grafico mensile"
          valueFor={(invoice) => invoice.consumptionValue}
          valueLabelFor={(invoice) => formatNumber(invoice.consumptionValue, invoice.consumptionUnit)}
          labelFor={(invoice) => invoice.billingPeriodEnd?.slice(0, 7) ?? invoice.issueDate?.slice(0, 7) ?? "n.d."}
        />
      </section>

      <InvoiceTable invoices={invoices} title={`Storico ${utilityLabels[utilityType as UtilityType].toLowerCase()}`} />
    </>
  );
}

export function generateStaticParams() {
  return [{ utilityType: "electricity" }, { utilityType: "gas" }];
}

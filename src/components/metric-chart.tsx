import Link from "next/link";
import type { InvoiceWithComparison } from "@/lib/types";
import { clamp } from "@/lib/utils";

type MetricChartProps = {
  invoices: InvoiceWithComparison[];
  title: string;
  accent: "gold" | "emerald";
  eyebrow?: string;
  valueFor: (invoice: InvoiceWithComparison) => number | null;
  labelFor: (invoice: InvoiceWithComparison) => string;
  valueLabelFor: (invoice: InvoiceWithComparison) => string;
};

export function MetricChart({
  invoices,
  title,
  accent,
  eyebrow = "Trend recente",
  valueFor,
  labelFor,
  valueLabelFor
}: MetricChartProps) {
  const latest = [...invoices].reverse().slice(-6);
  const max = Math.max(...latest.map((invoice) => valueFor(invoice) ?? 0), 1);

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <p className="section-note">Ultime 6 bollette</p>
      </div>

      <div className="chart-row">
        {latest.map((invoice) => {
          const value = valueFor(invoice) ?? 0;
          const height = clamp((value / max) * 180, 18, 180);

          return (
            <div key={invoice.id} className="chart-column">
              <div className={`chart-bar ${accent}`} style={{ height }} />
              <strong>{valueLabelFor(invoice)}</strong>
              <span>{labelFor(invoice)}</span>
              <Link href={`/invoices/${invoice.id}`}>Dettaglio</Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

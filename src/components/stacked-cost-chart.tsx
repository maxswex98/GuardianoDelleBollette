import type { InvoiceWithComparison } from "@/lib/types";
import { clamp, formatCurrency } from "@/lib/utils";

type MonthBucket = {
  label: string;
  electricity: number;
  gas: number;
};

function getMonthKey(invoice: InvoiceWithComparison) {
  return invoice.billingPeriodEnd?.slice(0, 7) ?? invoice.issueDate?.slice(0, 7) ?? null;
}

export function StackedCostChart({ invoices }: { invoices: InvoiceWithComparison[] }) {
  const monthly = new Map<string, MonthBucket>();

  for (const invoice of invoices) {
    const key = getMonthKey(invoice);
    if (!key || invoice.totalAmount === null) {
      continue;
    }

    const bucket = monthly.get(key) ?? {
      label: key,
      electricity: 0,
      gas: 0
    };

    if (invoice.utilityType === "electricity") {
      bucket.electricity += invoice.totalAmount;
    } else {
      bucket.gas += invoice.totalAmount;
    }

    monthly.set(key, bucket);
  }

  const data = [...monthly.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6)
    .map(([, bucket]) => bucket);

  const max = Math.max(...data.map((bucket) => bucket.electricity + bucket.gas), 1);

  return (
    <section className="panel panel-accent panel-accent-costs">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Costi totali luce + gas</h2>
          <p className="chart-description">Ogni colonna somma le due utenze e mostra il peso relativo di luce e gas.</p>
        </div>
        <div className="chart-legend">
          <span className="legend-item">
            <i className="legend-swatch electricity" />
            Luce
          </span>
          <span className="legend-item">
            <i className="legend-swatch gas" />
            Gas
          </span>
        </div>
      </div>

      <div className="chart-row stacked">
        {data.map((bucket) => {
          const total = bucket.electricity + bucket.gas;
          const height = clamp((total / max) * 190, 24, 190);
          const electricityHeight = total > 0 ? `${(bucket.electricity / total) * 100}%` : "0%";
          const gasHeight = total > 0 ? `${(bucket.gas / total) * 100}%` : "0%";

          return (
            <div key={bucket.label} className="chart-column">
              <div className="stacked-bar-shell" style={{ height }}>
                <div className="stacked-bar electricity" style={{ height: electricityHeight }} />
                <div className="stacked-bar gas" style={{ height: gasHeight }} />
              </div>
              <strong>{formatCurrency(total)}</strong>
              <span>{bucket.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

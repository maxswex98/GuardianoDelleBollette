import Link from "next/link";
import type { InvoiceWithComparison } from "@/lib/types";
import { withSiteBasePathRoute } from "@/lib/site-path";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/utils";

export function InvoiceTable({
  invoices,
  title
}: {
  invoices: InvoiceWithComparison[];
  title: string;
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Storico</p>
          <h2>{title}</h2>
        </div>
        <p className="section-note">{invoices.length} documenti processati</p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Periodo</th>
              <th>Fornitore</th>
              <th>Totale</th>
              <th>Consumo</th>
              <th>Delta</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.billingPeriodEnd ? formatDate(invoice.billingPeriodEnd) : formatDate(invoice.issueDate)}</td>
                <td>{invoice.provider ?? "n.d."}</td>
                <td>{formatCurrency(invoice.totalAmount)}</td>
                <td>{formatNumber(invoice.consumptionValue, invoice.consumptionUnit)}</td>
                <td>
                  <span
                    className={
                      invoice.comparison?.totalDeltaPercent !== null &&
                      invoice.comparison?.totalDeltaPercent !== undefined &&
                      invoice.comparison.totalDeltaPercent > 0
                        ? "trend-badge up"
                        : "trend-badge"
                    }
                  >
                    {formatPercent(invoice.comparison?.totalDeltaPercent ?? null)}
                  </span>
                </td>
                <td>
                  <Link href={withSiteBasePathRoute(`/invoices/${invoice.id}`)}>Apri</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
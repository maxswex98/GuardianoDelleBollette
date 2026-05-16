import { notFound } from "next/navigation";
import { getInvoiceById, getStaticInvoiceIds } from "@/lib/db/queries";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/utils";

export const dynamicParams = false;

export default async function InvoiceDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  const unitCostLabel =
    invoice.consumptionUnit?.toLowerCase() === "kwh"
      ? "Prezzo medio EUR/kWh"
      : invoice.consumptionUnit?.toLowerCase() === "smc"
        ? "Prezzo medio EUR/smc"
        : "Prezzo medio";

  const unitCostValue =
    invoice.unitCost === null ? "n.d." : `${formatNumber(invoice.unitCost)} EUR/${invoice.consumptionUnit ?? ""}`;

  const unitCostDeltaValue =
    invoice.comparison?.unitCostDelta === null || invoice.comparison?.unitCostDelta === undefined
      ? "n.d."
      : `${formatNumber(invoice.comparison.unitCostDelta)} EUR/${invoice.consumptionUnit ?? ""}`;

  return (
    <>
      <section className="hero">
        <div className="invoice-header">
          <div>
            <p className="eyebrow">Dettaglio documento</p>
            <h1>{invoice.provider ?? "Fornitore sconosciuto"}</h1>
            <p>
              {invoice.utilityType === "electricity" ? "Luce" : "Gas"} | {invoice.sourceFilename}
            </p>
          </div>
          {invoice.publicPdfPath ? (
            <a href={invoice.publicPdfPath} className="trend-badge" target="_blank" rel="noreferrer">Apri PDF</a>
          ) : (
            <span className="trend-badge">PDF non disponibile</span>
          )}
        </div>
      </section>

      <section className="detail-grid">
        <article className="detail-card">
          <span className="panel-label">Totale</span>
          <strong>{formatCurrency(invoice.totalAmount)}</strong>
        </article>
        <article className="detail-card">
          <span className="panel-label">Consumo</span>
          <strong>{formatNumber(invoice.consumptionValue, invoice.consumptionUnit)}</strong>
        </article>
        <article className="detail-card">
          <span className="panel-label">{unitCostLabel}</span>
          <strong>{unitCostValue}</strong>
        </article>
        <article className="detail-card">
          <span className="panel-label">Quota fissa</span>
          <strong>{formatCurrency(invoice.fixedCost)}</strong>
        </article>
        <article className="detail-card">
          <span className="panel-label">Imposte</span>
          <strong>{formatCurrency(invoice.taxes)}</strong>
        </article>
        <article className="detail-card">
          <span className="panel-label">Confidenza parser</span>
          <strong>{Math.round(invoice.parseConfidence * 100)}%</strong>
        </article>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Confronto col precedente</p>
            <h2>Variazioni</h2>
          </div>
        </div>

        <div className="detail-grid">
          <article className="detail-card">
            <span className="panel-label">Delta totale</span>
            <strong>{formatCurrency(invoice.comparison?.totalDelta ?? null)}</strong>
            <p>{formatPercent(invoice.comparison?.totalDeltaPercent ?? null)}</p>
          </article>
          <article className="detail-card">
            <span className="panel-label">Delta consumo</span>
            <strong>{formatNumber(invoice.comparison?.consumptionDelta ?? null, invoice.consumptionUnit)}</strong>
            <p>{formatPercent(invoice.comparison?.consumptionDeltaPercent ?? null)}</p>
          </article>
          <article className="detail-card">
            <span className="panel-label">Delta prezzo medio</span>
            <strong>{unitCostDeltaValue}</strong>
            <p>{formatPercent(invoice.comparison?.unitCostDeltaPercent ?? null)}</p>
          </article>
          <article className="detail-card">
            <span className="panel-label">Delta quota fissa</span>
            <strong>{formatCurrency(invoice.comparison?.fixedCostDelta ?? null)}</strong>
            <p>{formatPercent(invoice.comparison?.fixedCostDeltaPercent ?? null)}</p>
          </article>
          <article className="detail-card">
            <span className="panel-label">Delta imposte</span>
            <strong>{formatCurrency(invoice.comparison?.taxesDelta ?? null)}</strong>
            <p>{formatPercent(invoice.comparison?.taxesDeltaPercent ?? null)}</p>
          </article>
          <article className="detail-card">
            <span className="panel-label">Note</span>
            <strong>{invoice.notes ?? "Parsing regolare"}</strong>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Metadati</p>
            <h2>Campi estratti</h2>
          </div>
        </div>

        <div className="meta-grid">
          <article className="detail-card">
            <span className="panel-label">Numero bolletta</span>
            <strong>{invoice.invoiceNumber ?? "n.d."}</strong>
          </article>
          <article className="detail-card">
            <span className="panel-label">Emissione</span>
            <strong>{formatDate(invoice.issueDate)}</strong>
          </article>
          <article className="detail-card">
            <span className="panel-label">Scadenza</span>
            <strong>{formatDate(invoice.dueDate)}</strong>
          </article>
          <article className="detail-card">
            <span className="panel-label">Periodo</span>
            <strong>
              {formatDate(invoice.billingPeriodStart)} - {formatDate(invoice.billingPeriodEnd)}
            </strong>
          </article>
        </div>
      </section>

      <section className="panel raw-text">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Testo sorgente</p>
            <h2>Estrazione PDF</h2>
          </div>
        </div>
        {invoice.rawExtractedText}
      </section>
    </>
  );
}

export async function generateStaticParams() {
  const ids = await getStaticInvoiceIds();
  return ids.map((id) => ({ id }));
}




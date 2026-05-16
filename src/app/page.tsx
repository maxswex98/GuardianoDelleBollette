import Image from "next/image";
import { InvoiceTable } from "@/components/invoice-table";
import { StackedCostChart } from "@/components/stacked-cost-chart";
import { StatCard } from "@/components/stat-card";
import { getDashboardStats, getInvoices } from "@/lib/db/queries";
import { formatCurrency, formatPercent } from "@/lib/utils";

function getMonthKey(value: string | null) {
  return value ? value.slice(0, 7) : null;
}

function getPreviousMonthKey(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}-01T00:00:00`);
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().slice(0, 7);
}

function formatMonthLabel(value: string | null) {
  if (!value) {
    return "n.d.";
  }

  const parsed = new Date(`${value}-01T00:00:00`);
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric"
  }).format(parsed);
}

export default async function HomePage() {
  const [stats, invoices] = await Promise.all([getDashboardStats(), getInvoices()]);
  const gasInvoices = invoices.filter((invoice) => invoice.utilityType === "gas").slice(0, 6);
  const electricityInvoices = invoices.filter((invoice) => invoice.utilityType === "electricity").slice(0, 6);
  const latestMonthKey = getMonthKey(invoices[0]?.billingPeriodEnd ?? invoices[0]?.issueDate ?? null);
  const previousMonthKey = getPreviousMonthKey(latestMonthKey);
  const latestMonthLabel = formatMonthLabel(latestMonthKey);
  const previousMonthLabel = formatMonthLabel(previousMonthKey);

  const spendDeltaPercent =
    stats.previousMonthSpend > 0
      ? ((stats.currentMonthSpend - stats.previousMonthSpend) / stats.previousMonthSpend) * 100
      : null;

  let alertValue = "Spesa stabile";
  let alertTone: "default" | "alert" | "positive" | "neutral" = "neutral";
  let alertHint = `${latestMonthLabel}: andamento quasi uguale al mese precedente.`;

  if (spendDeltaPercent !== null) {
    if (spendDeltaPercent <= -5) {
      alertValue = "Spesa in calo";
      alertTone = "positive";
      alertHint = `${latestMonthLabel}: ${formatPercent(spendDeltaPercent)} rispetto al mese precedente.`;
    } else if (spendDeltaPercent >= 5) {
      alertValue = "Spesa in aumento";
      alertTone = "alert";
      alertHint = `${latestMonthLabel}: +${formatPercent(Math.abs(spendDeltaPercent))} rispetto al mese precedente.`;
    }
  } else if (stats.currentMonthSpend > 0) {
    alertValue = "Primo mese";
    alertTone = "neutral";
    alertHint = `${latestMonthLabel}: nessun confronto disponibile.`;
  }

  return (
    <>
      <section className="hero">
        <div className="hero-centered hero-centered--compact">
          <div className="hero-visual">
            <Image
              src="/guardian-hero.png"
              alt="Supereroe guardiano delle bollette"
              className="hero-image"
              width={900}
              height={700}
              priority
            />
          </div>
          <div className="hero-copy">
            <h1>Ogni bolletta sotto controllo.</h1>
            <p className="hero-subtitle">Trend, alert e confronti mese su mese in un colpo d'occhio.</p>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Archivio documenti"
          value={String(stats.totalInvoices)}
          hint="Bollette gia archiviate e pronte al confronto"
          tone="default"
        />
        <StatCard label="Alert mese" value={alertValue} hint={alertHint} tone={alertTone} featured />
        <StatCard
          label="Riepilogo mese"
          value={formatCurrency(stats.currentMonthSpend)}
          hint={`${latestMonthLabel}: ${formatPercent(spendDeltaPercent)} rispetto a ${previousMonthLabel}`}
          tone="default"
        />
        <StatCard
          label="Mese precedente"
          value={formatCurrency(stats.previousMonthSpend)}
          hint={previousMonthLabel}
          tone="neutral"
        />
      </section>

      <section className="cards-grid">
        <StackedCostChart invoices={invoices} />
      </section>

      <section className="history-grid">
        <InvoiceTable invoices={electricityInvoices} title="Ultime bollette luce" />
        <InvoiceTable invoices={gasInvoices} title="Ultime bollette gas" />
      </section>
    </>
  );
}

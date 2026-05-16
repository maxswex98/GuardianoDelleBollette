type StatCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "alert" | "positive" | "neutral";
  featured?: boolean;
};

export function StatCard({ label, value, hint, tone = "default", featured = false }: StatCardProps) {
  return (
    <article className={`stat-card ${tone} ${featured ? "featured" : ""}`.trim()}>
      <div className="stat-card-band">
        {featured ? <span className="stat-card-orb" aria-hidden="true" /> : null}
        <p className="panel-label">{label}</p>
      </div>
      <div className="stat-card-body">
        <h3>{value}</h3>
        <p>{hint}</p>
      </div>
    </article>
  );
}

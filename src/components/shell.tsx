import Link from "next/link";
import { getAppSettings } from "@/lib/db/queries";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/utilities/electricity", label: "Luce" },
  { href: "/utilities/gas", label: "Gas" }
];

export async function Shell({ children }: { children: React.ReactNode }) {
  const settings = await getAppSettings();

  return (
    <div className="page-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div>
            <p className="eyebrow">{settings.ownerName}</p>
            <p className="eyebrow co-owner">{settings.coOwnerName}</p>
            <div className="brand-meter">
              <span className="brand-pill electricity">Luce</span>
              <span className="brand-pill gas">Gas</span>
            </div>
            <h1>{settings.appName.toUpperCase()}</h1>
            <p className="service-address">{settings.serviceAddress}</p>
            <p className="sidebar-copy">
              Carica i PDF in OneDrive e controlla subito costi, consumi, quota fissa e imposte.
            </p>
          </div>

          <nav className="nav">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="panel subtle sidebar-channel">
            <p className="panel-label">Canale principale</p>
            <strong>Cartella OneDrive monitorata</strong>
            <p className="path-label">{settings.sourceFolderLabel}</p>
            <p>
              Metti qui i nuovi PDF. Il job settimanale li legge da OneDrive, aggiorna il dataset e pubblica la
              dashboard.
            </p>
          </div>
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}

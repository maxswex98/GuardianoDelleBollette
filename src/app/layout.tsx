import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { withSiteBasePath } from "@/lib/site-path";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guardiano delle bollette",
  description: "Dashboard settimanale per bollette luce e gas sincronizzate da OneDrive",
  icons: {
    icon: withSiteBasePath("/guardiano-favicon.svg"),
    shortcut: withSiteBasePath("/guardiano-favicon.svg"),
    apple: withSiteBasePath("/guardiano-favicon.svg")
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}

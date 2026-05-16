import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guardiano delle bollette",
  description: "Dashboard settimanale per bollette luce e gas sincronizzate da OneDrive"
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

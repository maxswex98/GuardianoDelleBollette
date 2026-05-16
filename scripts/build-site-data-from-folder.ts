import fs from "node:fs/promises";
import path from "node:path";
import { buildSiteData } from "./lib/site-data-builder";
import type { SiteSettings } from "@/lib/types";

async function collectPdfEntries(rootDirectory: string, currentDirectory = rootDirectory): Promise<
  Array<{
    localPath: string;
    sourceFilename: string;
    sourcePath: string;
    modifiedAt: string;
  }>
> {
  const entries = await fs.readdir(currentDirectory, { withFileTypes: true });
  const collected = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDirectory, entry.name);
    if (entry.isDirectory()) {
      collected.push(...(await collectPdfEntries(rootDirectory, fullPath)));
      continue;
    }

    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".pdf") {
      continue;
    }

    const stats = await fs.stat(fullPath);
    collected.push({
      localPath: fullPath,
      sourceFilename: entry.name,
      sourcePath: path.relative(rootDirectory, fullPath).replace(/\\/g, "/"),
      modifiedAt: stats.mtime.toISOString()
    });
  }

  return collected;
}

async function main() {
  const sourceDirectory = process.env.SITE_SOURCE_DIRECTORY;
  if (!sourceDirectory) {
    throw new Error("SITE_SOURCE_DIRECTORY non impostata. Esempio: C:/Users/aless/OneDrive/Bollette/Archivio");
  }

  const settings: SiteSettings = {
    appName: process.env.SITE_APP_NAME ?? "Guardiano delle bollette",
    ownerName: process.env.SITE_OWNER_NAME ?? "BERTOLI MASSIMILIANO",
    coOwnerName: process.env.SITE_CO_OWNER_NAME ?? "Alessandra Scordi",
    serviceAddress: process.env.SITE_SERVICE_ADDRESS ?? "Via Emilia San Pietro, Reggio Emilia",
    sourceFolderLabel: process.env.SITE_SOURCE_FOLDER_LABEL ?? sourceDirectory.replace(/\\/g, "/"),
    alertThresholdPercent: Number(process.env.ALERT_THRESHOLD_PERCENT ?? 15)
  };

  const entries = await collectPdfEntries(sourceDirectory);
  const data = await buildSiteData(entries, settings, "local-folder");
  console.log(`Generato dataset statico con ${data.invoices.length} bollette da ${sourceDirectory}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import fs from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/config";
import { resolvedArchiveDirectory, resolvedWatchDirectory } from "@/lib/server-paths";
import { ingestInvoiceFromFile } from "@/lib/services/invoices";
import { slugifyFileName } from "@/lib/utils";

async function ensureDirectories() {
  await fs.mkdir(resolvedWatchDirectory, { recursive: true });
  await fs.mkdir(resolvedArchiveDirectory, { recursive: true });
}

async function moveToArchive(filePath: string) {
  const fileName = path.basename(filePath);
  const archivedPath = path.join(resolvedArchiveDirectory, `${Date.now()}-${slugifyFileName(fileName)}`);

  try {
    await fs.rename(filePath, archivedPath);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    // OneDrive mounts can appear as different devices inside Docker, so rename may fail with EXDEV.
    if (nodeError.code !== "EXDEV") {
      throw error;
    }

    await fs.copyFile(filePath, archivedPath);
    await fs.unlink(filePath);
  }

  return archivedPath;
}

async function processFile(filePath: string) {
  const archivedPath = await moveToArchive(filePath);
  try {
    const invoice = await ingestInvoiceFromFile(archivedPath, archivedPath);
    console.log(`Imported ${invoice.sourceFilename} as ${invoice.utilityType}`);
  } catch (error) {
    const failedPath = path.join(resolvedWatchDirectory, path.basename(archivedPath));
    await fs.rename(archivedPath, failedPath).catch(() => undefined);
    throw error;
  }
}

async function scanOnce() {
  await ensureDirectories();
  const entries = await fs.readdir(resolvedWatchDirectory, { withFileTypes: true });
  const pdfs = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => path.join(resolvedWatchDirectory, entry.name));

  for (const pdf of pdfs) {
    await processFile(pdf);
  }
}

async function main() {
  console.log(`Watching ${resolvedWatchDirectory}`);

  await scanOnce();

  setInterval(() => {
    scanOnce().catch((error) => {
      console.error("Worker scan failed", error);
    });
  }, env.POLL_INTERVAL_MS);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import manualRules from "../../data/manual-rules.json";
import { parseInvoiceFile } from "@/lib/parsing/parse-invoice";
import { withSiteBasePath } from "@/lib/site-path";
import type { InvoiceRecord, SiteData, SiteSettings } from "@/lib/types";

type SourceEntry = {
  localPath: string;
  sourceFilename: string;
  sourcePath: string;
  sourceFolderLabel?: string;
  modifiedAt: string;
};

type CandidateInvoice = InvoiceRecord & {
  localPath: string;
};

type ManualRules = {
  ignoredFiles: string[];
  invoiceOverrides: Record<string, Partial<InvoiceRecord>>;
};

const rules = manualRules as ManualRules;
const SITE_DATA_PATH = path.resolve(process.cwd(), "src/data/site-data.json");
const PUBLIC_PDFS_DIR = path.resolve(process.cwd(), "public/pdfs");

function referenceDate(invoice: InvoiceRecord) {
  return invoice.billingPeriodEnd ?? invoice.issueDate ?? invoice.createdAt.slice(0, 10);
}

function shouldIgnoreFilename(fileName: string) {
  const lowerName = fileName.toLowerCase();
  return rules.ignoredFiles.some((entry) => lowerName.includes(entry.toLowerCase()));
}

function looksLikeUtilityBill(text: string) {
  const lowerText = text.toLowerCase();

  if (/(servizio rifiuti|rifiuti urbani|tari)\b/.test(lowerText)) {
    return false;
  }

  return /(gas naturale|fornitura di gas|fornitura di energia elettrica|energia elettrica|smc|kwh)\b/.test(lowerText);
}

function applyOverrides(invoice: InvoiceRecord) {
  const override = rules.invoiceOverrides[invoice.sourceFilename];
  if (!override) {
    return invoice;
  }

  return {
    ...invoice,
    ...override,
    sourceFilename: invoice.sourceFilename,
    sourcePath: invoice.sourcePath,
    archivedPath: invoice.archivedPath,
    publicPdfPath: invoice.publicPdfPath,
    rawExtractedText: invoice.rawExtractedText,
    createdAt: invoice.createdAt
  };
}

function createInvoiceId(invoice: {
  utilityType: string;
  provider: string | null;
  invoiceNumber: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  totalAmount: number | null;
  sourceFilename: string;
}) {
  const seed = [
    invoice.utilityType,
    invoice.provider ?? "unknown",
    invoice.invoiceNumber ?? "missing-number",
    invoice.billingPeriodStart ?? "missing-start",
    invoice.billingPeriodEnd ?? "missing-end",
    invoice.totalAmount ?? "missing-total",
    invoice.sourceFilename
  ].join("|");

  return crypto.createHash("sha1").update(seed).digest("hex").slice(0, 24);
}

function dedupeKey(invoice: InvoiceRecord) {
  if (invoice.invoiceNumber && invoice.provider) {
    return `${invoice.utilityType}|${invoice.provider.toLowerCase()}|${invoice.invoiceNumber.toLowerCase()}`;
  }

  return [
    invoice.utilityType,
    invoice.provider?.toLowerCase() ?? "unknown",
    invoice.billingPeriodStart ?? "missing-start",
    invoice.billingPeriodEnd ?? "missing-end",
    invoice.totalAmount ?? "missing-total",
    invoice.consumptionValue ?? "missing-consumption"
  ].join("|");
}

function isInboxSourceFolder(label: string | null | undefined) {
  return (label ?? "").toLowerCase().includes("inserisci");
}

function chooseBestCandidate(left: CandidateInvoice, right: CandidateInvoice) {
  if (right.parseConfidence !== left.parseConfidence) {
    return right.parseConfidence > left.parseConfidence ? right : left;
  }

  const leftIsInbox = isInboxSourceFolder(left.sourceFolderLabel);
  const rightIsInbox = isInboxSourceFolder(right.sourceFolderLabel);

  if (leftIsInbox !== rightIsInbox) {
    return rightIsInbox ? right : left;
  }

  if (referenceDate(right) !== referenceDate(left)) {
    return referenceDate(right) > referenceDate(left) ? right : left;
  }

  return right.sourceFilename.localeCompare(left.sourceFilename) < 0 ? right : left;
}

function formatArchiveMonth(invoice: InvoiceRecord) {
  const reference = invoice.billingPeriodEnd ?? invoice.issueDate ?? invoice.createdAt.slice(0, 10);
  const date = new Date(`${reference}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "n.d.";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${month}-${year}`;
}

function buildArchiveFileName(invoice: InvoiceRecord) {
  const utilityLabel = invoice.utilityType === "electricity" ? "Luce" : "Gas";
  return `${utilityLabel}_${formatArchiveMonth(invoice)}.pdf`;
}

async function resetPublicPdfDirectory() {
  await fs.mkdir(PUBLIC_PDFS_DIR, { recursive: true });
  const existing = await fs.readdir(PUBLIC_PDFS_DIR, { withFileTypes: true });

  await Promise.all(
    existing
      .filter((entry) => entry.isFile() && entry.name !== ".gitkeep")
      .map((entry) => fs.unlink(path.join(PUBLIC_PDFS_DIR, entry.name)))
  );
}

export async function buildSiteData(entries: SourceEntry[], settings: SiteSettings, syncMode: SiteData["syncMode"]): Promise<SiteData & { candidates: CandidateInvoice[] }> {
  const sortedEntries = [...entries].sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
  const parsedInvoices: CandidateInvoice[] = [];

  for (const entry of sortedEntries) {
    if (!entry.sourceFilename.toLowerCase().endsWith(".pdf") || shouldIgnoreFilename(entry.sourceFilename)) {
      continue;
    }

    const parsed = await parseInvoiceFile(entry.localPath);
    if (!looksLikeUtilityBill(parsed.rawExtractedText)) {
      continue;
    }

    if (parsed.totalAmount === null && parsed.consumptionValue === null && parsed.fixedCost === null) {
      continue;
    }

    const baseRecord: InvoiceRecord = {
      id: "pending",
      utilityType: parsed.utilityType,
      provider: parsed.provider,
      invoiceNumber: parsed.invoiceNumber,
      issueDate: parsed.issueDate,
      dueDate: parsed.dueDate,
      billingPeriodStart: parsed.billingPeriodStart,
      billingPeriodEnd: parsed.billingPeriodEnd,
      totalAmount: parsed.totalAmount,
      consumptionValue: parsed.consumptionValue,
      consumptionUnit: parsed.consumptionUnit,
      unitCost: parsed.unitCost,
      fixedCost: parsed.fixedCost,
      taxes: parsed.taxes,
      previousReading: parsed.previousReading,
      currentReading: parsed.currentReading,
      sourceFilename: entry.sourceFilename,
      sourcePath: entry.sourcePath,
      sourceFolderLabel: entry.sourceFolderLabel ?? null,
      archivedPath: null,
      publicPdfPath: null,
      rawExtractedText: parsed.rawExtractedText,
      parseConfidence: parsed.parseConfidence,
      notes: parsed.notes,
      createdAt: entry.modifiedAt
    };

    const overridden = applyOverrides(baseRecord);
    const id = createInvoiceId(overridden);
    const archiveFileName = buildArchiveFileName(overridden);

    parsedInvoices.push({
      ...overridden,
      id,
      archivedPath: withSiteBasePath(`/pdfs/${archiveFileName}`),
      publicPdfPath: withSiteBasePath(`/pdfs/${archiveFileName}`),
      localPath: entry.localPath
    });
  }

  const deduped = new Map<string, CandidateInvoice>();
  for (const invoice of parsedInvoices) {
    const key = dedupeKey(invoice);
    const existing = deduped.get(key);
    deduped.set(key, existing ? chooseBestCandidate(existing, invoice) : invoice);
  }

  const finalInvoices = [...deduped.values()].sort((left, right) => {
    const dateCompare = referenceDate(right).localeCompare(referenceDate(left));
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });

  const usedArchiveNames = new Set<string>();
  for (const invoice of finalInvoices) {
    const baseName = buildArchiveFileName(invoice).replace(/\.pdf$/i, "");
    let archiveFileName = `${baseName}.pdf`;
    let suffix = 2;
    while (usedArchiveNames.has(archiveFileName.toLowerCase())) {
      archiveFileName = `${baseName}_${suffix}.pdf`;
      suffix += 1;
    }
    usedArchiveNames.add(archiveFileName.toLowerCase());
    invoice.archivedPath = withSiteBasePath(`/pdfs/${archiveFileName}`);
    invoice.publicPdfPath = invoice.archivedPath;
  }

  await resetPublicPdfDirectory();

  const publishedInvoices = finalInvoices.filter((invoice) => (invoice.totalAmount ?? 0) >= 0);

  await Promise.all(
    publishedInvoices.map((invoice) => {
      const fileName = invoice.publicPdfPath?.split("/").pop();
      if (!fileName) {
        return Promise.resolve();
      }

      return fs.copyFile(invoice.localPath, path.join(PUBLIC_PDFS_DIR, fileName));
    })
  );

  const data: SiteData = {
    generatedAt: new Date().toISOString(),
    syncMode,
    settings,
    invoices: publishedInvoices.map(({ localPath, ...invoice }) => invoice)
  };

  await fs.writeFile(SITE_DATA_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  return { ...data, candidates: parsedInvoices };
}

import fs from "node:fs/promises";
import path from "node:path";
import { buildSiteData } from "./lib/site-data-builder";
import type { SiteSettings } from "@/lib/types";

type DriveItem = {
  id: string;
  name: string;
  folder?: { childCount: number };
  file?: { mimeType?: string };
  lastModifiedDateTime: string;
};

type SourceFolder = {
  label: string;
  folderPath?: string;
  shareUrl?: string;
};

const STAGING_ROOT = path.resolve(process.cwd(), "data/staging/onedrive");

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variabile mancante: ${name}`);
  }

  return value;
}

function encodeGraphPath(folderPath: string) {
  return folderPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function encodeSharingUrl(sharingUrl: string) {
  const base64Value = Buffer.from(sharingUrl, "utf8").toString("base64");
  return `u!${base64Value.replace(/=+$/g, "").replace(/\//g, "_").replace(/\+/g, "-")}`;
}

async function getAccessToken() {
  const tenantId = process.env.ONEDRIVE_TENANT_ID ?? "consumers";
  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: required("ONEDRIVE_CLIENT_ID"),
    client_secret: required("ONEDRIVE_CLIENT_SECRET"),
    refresh_token: required("ONEDRIVE_REFRESH_TOKEN"),
    grant_type: "refresh_token",
    scope: "offline_access Files.Read User.Read"
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Token OneDrive non ottenuto: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { access_token: string };
  return payload.access_token;
}

async function graphJson<T>(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Graph API error ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as T;
}

async function listChildrenByFolderId(accessToken: string, folderId: string) {
  const children: DriveItem[] = [];
  let nextUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$top=200&select=id,name,folder,file,lastModifiedDateTime`;

  while (nextUrl) {
    const payload = await graphJson<{ value: DriveItem[]; "@odata.nextLink"?: string }>(nextUrl, accessToken);
    children.push(...payload.value);
    nextUrl = payload["@odata.nextLink"] ?? "";
  }

  return children;
}

async function getFolderIdByPath(accessToken: string, folderPath: string) {
  const encodedPath = encodeGraphPath(folderPath);
  const payload = await graphJson<{ id: string }>(
    `https://graph.microsoft.com/v1.0/me/drive/root:/${encodedPath}?$select=id`,
    accessToken
  );
  return payload.id;
}

async function getFolderIdByShareUrl(accessToken: string, shareUrl: string) {
  const encodedShare = encodeSharingUrl(shareUrl);
  const payload = await graphJson<{ id: string }>(
    `https://graph.microsoft.com/v1.0/shares/${encodedShare}/driveItem?$select=id`,
    accessToken
  );
  return payload.id;
}

async function getFolderId(accessToken: string, sourceFolder: SourceFolder) {
  if (sourceFolder.shareUrl) {
    return getFolderIdByShareUrl(accessToken, sourceFolder.shareUrl);
  }

  if (!sourceFolder.folderPath) {
    throw new Error(`Sorgente OneDrive non valida: ${sourceFolder.label}`);
  }

  return getFolderIdByPath(accessToken, sourceFolder.folderPath);
}

async function listPdfFiles(accessToken: string, sourceFolder: SourceFolder) {
  const rootId = await getFolderId(accessToken, sourceFolder);
  const queue = [{ id: rootId, relativePath: "" }];
  const files: Array<{ id: string; name: string; relativePath: string; modifiedAt: string }> = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const children = await listChildrenByFolderId(accessToken, current.id);
    for (const item of children) {
      const itemRelativePath = current.relativePath ? `${current.relativePath}/${item.name}` : item.name;
      if (item.folder) {
        queue.push({ id: item.id, relativePath: itemRelativePath });
        continue;
      }

      if (!item.name.toLowerCase().endsWith(".pdf")) {
        continue;
      }

      files.push({
        id: item.id,
        name: item.name,
        relativePath: itemRelativePath,
        modifiedAt: item.lastModifiedDateTime
      });
    }
  }

  return files;
}

async function downloadDriveItem(accessToken: string, itemId: string, destinationPath: string) {
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/content`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`Download PDF fallito (${response.status}) per ${itemId}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.writeFile(destinationPath, Buffer.from(arrayBuffer));
}

async function prepareStagingDirectory() {
  await fs.rm(STAGING_ROOT, { recursive: true, force: true });
  await fs.mkdir(STAGING_ROOT, { recursive: true });
}

async function main() {
  const sourceFolders: SourceFolder[] = [];

  const archiveShareUrl = process.env.ONEDRIVE_ARCHIVE_SHARE_URL;
  const inboxShareUrl = process.env.ONEDRIVE_INBOX_SHARE_URL;
  const sourceFolderPath = process.env.ONEDRIVE_SOURCE_FOLDER_PATH;

  if (archiveShareUrl) {
    sourceFolders.push({ label: "Archivio", shareUrl: archiveShareUrl });
  }

  if (inboxShareUrl) {
    sourceFolders.push({ label: "Inserisci Qui Le Bollette", shareUrl: inboxShareUrl });
  }

  if (sourceFolders.length === 0) {
    sourceFolders.push({
      label: "Cartella principale",
      folderPath: sourceFolderPath ?? required("ONEDRIVE_SOURCE_FOLDER_PATH")
    });
  }

  const accessToken = await getAccessToken();
  const remoteFiles = (
    await Promise.all(sourceFolders.map(async (sourceFolder) => listPdfFiles(accessToken, sourceFolder)))
  ).flat();

  await prepareStagingDirectory();

  const entries = [];
  for (const file of remoteFiles) {
    const localPath = path.join(STAGING_ROOT, file.relativePath.replace(/\//g, path.sep));
    await downloadDriveItem(accessToken, file.id, localPath);
    entries.push({
      localPath,
      sourceFilename: file.name,
      sourcePath: file.relativePath,
      modifiedAt: file.modifiedAt
    });
  }

  const settings: SiteSettings = {
    appName: process.env.SITE_APP_NAME ?? "Guardiano delle bollette",
    ownerName: process.env.SITE_OWNER_NAME ?? "BERTOLI MASSIMILIANO",
    coOwnerName: process.env.SITE_CO_OWNER_NAME ?? "Alessandra Scordi",
    serviceAddress: process.env.SITE_SERVICE_ADDRESS ?? "Via Emilia San Pietro, Reggio Emilia",
    sourceFolderLabel:
      process.env.SITE_SOURCE_FOLDER_LABEL ??
      sourceFolders
        .map((folder) => folder.label)
        .join(" + "),
    alertThresholdPercent: Number(process.env.ALERT_THRESHOLD_PERCENT ?? 15)
  };

  const data = await buildSiteData(entries, settings, "onedrive");
  console.log(`Sincronizzazione OneDrive completata: ${data.invoices.length} bollette pubblicate.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

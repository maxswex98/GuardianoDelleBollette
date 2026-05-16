# Guardiano delle bollette

Dashboard per luce e gas che legge i PDF da OneDrive, estrae i valori chiave, confronta ogni bolletta con la precedente e pubblica tutto come sito statico aggiornato settimanalmente.

## Architettura finale

- `GitHub Actions` ogni lunedi
- `Microsoft Graph / OneDrive API` per leggere i PDF direttamente dal cloud
- `pdf-parse` + parser dedicati per estrarre i dati
- dataset statico in `src/data/site-data.json`
- PDF pubblici in `public/pdfs`
- `Next.js` esportato staticamente per `GitHub Pages`

## Flusso

1. Carichi i PDF nella cartella OneDrive scelta.
2. Ogni lunedi GitHub Actions legge la cartella via API.
3. Scarica i PDF rilevanti, scarta rifiuti/rimborsi e deduplica.
4. Aggiorna il dataset JSON e i PDF pubblici nel repository.
5. Esegue la build statica e pubblica la dashboard.

## File importanti

- `scripts/sync-onedrive.ts`: scarica i PDF da OneDrive
- `scripts/lib/site-data-builder.ts`: costruisce dataset, deduplica e copia i PDF pubblici
- `data/manual-rules.json`: esclusioni e override manuali
- `src/lib/site-data.ts`: query statiche per la UI
- `.github/workflows/weekly-onedrive-sync.yml`: job del lunedi

## Bootstrap locale

Se vuoi rigenerare il dataset partendo da una cartella locale di PDF:

```powershell
$env:SITE_SOURCE_DIRECTORY='C:/Users/aless/OneDrive/Bollette/Archivio'
npm run site:build-local
```

Variabile necessaria:

- `SITE_SOURCE_DIRECTORY`

## Configurazione GitHub

Nel repository GitHub devi impostare:

### Repository secrets

- `ONEDRIVE_CLIENT_ID`
- `ONEDRIVE_CLIENT_SECRET`
- `ONEDRIVE_REFRESH_TOKEN`

### Repository variables

- `ONEDRIVE_ARCHIVE_SHARE_URL`
- `ONEDRIVE_INBOX_SHARE_URL`
- `ONEDRIVE_TENANT_ID`
- `SITE_APP_NAME`
- `SITE_OWNER_NAME`
- `SITE_CO_OWNER_NAME`
- `SITE_SERVICE_ADDRESS`
- `SITE_SOURCE_FOLDER_LABEL`
- `ALERT_THRESHOLD_PERCENT`

## Come indicarmi la cartella OneDrive

Per la versione GitHub mi vanno bene i link di condivisione OneDrive oppure il percorso cloud logico dentro OneDrive.

Nel tuo caso puoi usare direttamente questi due link:

- `ONEDRIVE_ARCHIVE_SHARE_URL`
- `ONEDRIVE_INBOX_SHARE_URL`

Se preferisci la configurazione a percorso, la cartella radice piu robusta e `Bollette`, ma i link sono piu comodi per non dover ricostruire il path a mano.

## Note sul parsing

Il sistema ha gia una whitelist/blacklist minima:

- scarta file che sembrano `rifiuti` o `rimborso`
- applica override manuali per i casi Wekiwi legacy gia corretti
- deduplica prima per numero fattura, poi per periodo/totale

Per migliorare ancora il parsing in futuro, il punto giusto e `src/lib/parsing/parse-invoice.ts`.

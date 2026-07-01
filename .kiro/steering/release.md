---
inclusion: manual
---

# Release & Deploy

## Flusso

```
prepare_release.sh --patch
        │
        ▼ (push tag v2.0.1)
┌───────────────────────────┐
│  GitHub Actions: DEV      │  build → test → S3 dev → invalidate CF
│  (automatico su tag push) │
└───────────────────────────┘
        │
        ▼ (manuale, gh workflow run)
┌───────────────────────────┐
│  GitHub Actions: PROD     │  S3 dev → S3 prod → invalidate CF
│  (copia file, NO rebuild) │
└───────────────────────────┘
```

## Comandi

### Rilascio su DEV

**macOS / Linux (bash):**

```bash
# Patch bump (2.0.0 → 2.0.1)
./prepare_release.sh

# Minor bump (2.0.0 → 2.1.0)
./prepare_release.sh --minor

# Major bump (2.0.0 → 3.0.0)
./prepare_release.sh --major

# Versione esplicita
./prepare_release.sh --set-version 2.5.0
```

**Windows (PowerShell):**

```powershell
# Patch bump (2.0.0 → 2.0.1)
.\prepare_release.ps1

# Minor bump (2.0.0 → 2.1.0)
.\prepare_release.ps1 -Bump minor

# Major bump (2.0.0 → 3.0.0)
.\prepare_release.ps1 -Bump major

# Versione esplicita
.\prepare_release.ps1 -SetVersion "2.5.0"
```

Lo script:
1. Bumpa `version` in `package.json`
2. Committa `chore(release): v<X.Y.Z>`
3. Crea tag annotato `v<X.Y.Z>`
4. Pusha branch + tag → trigghera il deploy su DEV

### Promozione in PROD

```bash
gh workflow run promote-prod.yml -f tag=v2.0.1
```

Copia gli stessi file da S3 dev a S3 prod senza ricompilare.

### Re-deploy manuale (senza nuovo tag)

```bash
gh workflow run deploy.yml -f ref=v2.0.1
```

## Infrastruttura

| Risorsa | DEV (account 239677748841) | PROD (account 473037869463) |
|---------|---|---|
| S3 Bucket | `help-in-field-web-dev` | `help-in-field-web-prod` |
| CloudFront | `E2PYGPJKDZOR1X` | `E1NIZIO47CY7Y2` |
| URL | `https://d2dck10ir4wp72.cloudfront.net` | `https://dtozsgp5g222b.cloudfront.net` |
| IAM Role | `github-actions-deploy-hif-dev` | `github-actions-deploy-hif-prod` |
| Region | eu-west-1 | eu-west-1 |

## Autenticazione

- OIDC (nessuna access key statica)
- Il ruolo DEV accetta qualsiasi ref del repo
- Il ruolo PROD accetta solo l'environment `production`
- Cross-account: il bucket DEV ha una bucket policy che permette al ruolo PROD di leggere

## Cache Strategy

| File | Cache-Control | Perché |
|------|---------------|--------|
| `assets/*` | `public, max-age=31536000, immutable` | Content hash nel nome — cambiano ad ogni build |
| `index.html` | `no-cache, no-store, must-revalidate` | Entry point SPA, deve essere sempre fresco |
| `404.html` | `no-cache, no-store, must-revalidate` | Fallback SPA |

## Troubleshooting

> ⚠️ Il troubleshooting AWS richiede accesso ai profili SSO `dev`/`prod`. Se non hai i permessi, segnala il problema a chi gestisce l'infrastruttura.

- **OIDC fallisce**: verificare che l'org nel trust policy sia `Dinamica-Generale-Application`
- **403 su CloudFront**: la bucket policy deve avere il `SourceArn` della distribuzione corretta
- **Cache vecchia**: invalidare con `aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"`
- **Re-run job fallito**: `gh run rerun <run-id> --failed`

## Prerequisiti locali

- `gh` CLI autenticato
- **macOS/Linux**: `python3` (usato dallo script bash per aggiornare package.json)
- **Windows**: PowerShell 5.1+ (usa `ConvertFrom-Json` nativo, non serve python)
- Accesso AWS CLI con profili SSO `dev`/`prod`: necessario solo per troubleshooting infrastrutturale

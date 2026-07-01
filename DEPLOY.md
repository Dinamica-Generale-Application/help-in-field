# Deploy — Help-in-Field su AWS CloudFront

Guida al deploy della SPA statica su S3 + CloudFront.

## Prerequisiti

- Account AWS con accesso a S3 e CloudFront
- AWS CLI configurato (`aws configure`)
- Build locale funzionante: `npm run build` produce `dist/`

## 1. Build

```bash
npm run build
```

Output in `dist/`:
- `index.html` — entry point SPA (no hash nel nome)
- `assets/*.js` — chunk JS con content hash (es. `index-AbC123.js`)
- `assets/*.css` — fogli stile con content hash
- `404.html` — fallback SPA per routing client-side

## 2. S3 Bucket

### Creazione bucket

```bash
aws s3 mb s3://help-in-field-web --region eu-south-1
```

### Upload dei file

```bash
# Upload di tutti i file
aws s3 sync dist/ s3://help-in-field-web/ --delete

# Imposta cache headers per assets con hash (immutabili)
aws s3 cp s3://help-in-field-web/assets/ s3://help-in-field-web/assets/ \
  --recursive \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE

# Imposta no-cache per index.html (deve sempre essere fresco)
aws s3 cp s3://help-in-field-web/index.html s3://help-in-field-web/index.html \
  --cache-control "no-cache, no-store, must-revalidate" \
  --metadata-directive REPLACE

# Imposta no-cache per 404.html
aws s3 cp s3://help-in-field-web/404.html s3://help-in-field-web/404.html \
  --cache-control "no-cache, no-store, must-revalidate" \
  --metadata-directive REPLACE
```

### Policy bucket (accesso solo da CloudFront via OAC)

Non abilitare "Static website hosting" sul bucket. Usare Origin Access Control (OAC) per permettere solo a CloudFront di leggere dal bucket.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::help-in-field-web/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

## 3. CloudFront Distribution

### Configurazione Origin

| Parametro | Valore |
|-----------|--------|
| Origin domain | `help-in-field-web.s3.eu-south-1.amazonaws.com` |
| Origin access | Origin Access Control (OAC) |
| S3 bucket access | Yes, update the bucket policy |

### Custom Error Response (SPA Routing)

Questa è la configurazione **fondamentale** per il funzionamento del routing SPA:

| Parametro | Valore |
|-----------|--------|
| HTTP Error Code | `403` |
| Response Page Path | `/index.html` |
| HTTP Response Code | `200` |
| Error Caching Minimum TTL | `0` |

| Parametro | Valore |
|-----------|--------|
| HTTP Error Code | `404` |
| Response Page Path | `/index.html` |
| HTTP Response Code | `200` |
| Error Caching Minimum TTL | `0` |

> **Nota**: Con OAC, S3 restituisce 403 (non 404) per file inesistenti, quindi serve l'error response sia per 403 che per 404.

### Cache Behaviors

#### Default behavior (`*`)

| Parametro | Valore |
|-----------|--------|
| Viewer protocol policy | Redirect HTTP to HTTPS |
| Cache policy | CachingOptimized (o custom) |
| Compress objects | Yes |
| Default TTL | 86400 (1 giorno) |

#### Behavior per `index.html`

| Parametro | Valore |
|-----------|--------|
| Path pattern | `/index.html` |
| Cache policy | CachingDisabled |
| Origin request policy | AllViewer |

> **Alternativa semplice**: non creare un behavior separato per index.html. Gestire il caching tramite gli header S3 impostati durante l'upload (vedi sezione 2). CloudFront rispetterà gli header `Cache-Control` del file.

### Impostazioni generali

| Parametro | Valore |
|-----------|--------|
| Price class | Use only Europe and North America (o All edge locations) |
| Default root object | `index.html` |
| HTTP version | HTTP/2 |
| IPv6 | Enabled |

## 4. Cache Headers (gestiti da Vite)

Vite aggiunge automaticamente un content hash ai nomi dei file JS e CSS:
- `assets/index-AbC123.js` → cambia nome ad ogni build
- `assets/index-XyZ789.css` → cambia nome ad ogni build

Questo permette di usare cache lunghe (1 anno) per gli asset, perché un nuovo deploy genera nomi diversi.

| File | Cache-Control | Motivo |
|------|---------------|--------|
| `assets/*.js` | `public, max-age=31536000, immutable` | Hash nel nome = immutabile |
| `assets/*.css` | `public, max-age=31536000, immutable` | Hash nel nome = immutabile |
| `index.html` | `no-cache, no-store, must-revalidate` | Entry point, deve essere fresco |
| `404.html` | `no-cache, no-store, must-revalidate` | Fallback SPA |

## 5. Invalidation dopo deploy

Dopo ogni `s3 sync`, invalidare index.html nella cache CloudFront:

```bash
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/index.html" "/404.html"
```

> Non serve invalidare `/assets/*` perché i nomi cambiano ad ogni build grazie al content hash.

## 6. Script di deploy completo

```bash
#!/bin/bash
set -e

BUCKET="help-in-field-web"
DISTRIBUTION_ID="EXXXXXXXXXX"

echo "Building..."
npm run build

echo "Syncing to S3..."
aws s3 sync dist/ s3://$BUCKET/ --delete

echo "Setting cache headers for assets..."
aws s3 cp s3://$BUCKET/assets/ s3://$BUCKET/assets/ \
  --recursive \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE

echo "Setting no-cache for HTML files..."
aws s3 cp s3://$BUCKET/index.html s3://$BUCKET/index.html \
  --cache-control "no-cache, no-store, must-revalidate" \
  --metadata-directive REPLACE
aws s3 cp s3://$BUCKET/404.html s3://$BUCKET/404.html \
  --cache-control "no-cache, no-store, must-revalidate" \
  --metadata-directive REPLACE

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/index.html" "/404.html"

echo "Deploy completato!"
```

## 7. Verifica

Dopo il deploy, verificare:

1. **Homepage** (`/`) → carica l'app correttamente
2. **Deep link** (`/reports/new`) → non 404, carica la SPA che gestisce il routing
3. **Assets** → header `Cache-Control: public, max-age=31536000, immutable`
4. **index.html** → header `Cache-Control: no-cache, no-store, must-revalidate`
5. **HTTPS** → redirect automatico da HTTP
6. **Compressione** → header `Content-Encoding: gzip` o `br` sugli asset

```bash
# Verifica headers
curl -I https://tuo-dominio.cloudfront.net/
curl -I https://tuo-dominio.cloudfront.net/assets/index-AbC123.js
```

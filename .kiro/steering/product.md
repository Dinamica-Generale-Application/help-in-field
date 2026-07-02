# Product: Help in Field

Help in Field (v2.0) is a field service report management app for Italian technicians. It lets operators create, edit, search, and export intervention reports (rapporti di assistenza) as PDFs.

## Core Capabilities

- Create/edit intervention reports with client info, device details, cost breakdown, and photo attachments
- Search and list reports sorted by date
- View intervention locations on a map (Leaflet)
- Export reports to PDF (html2pdf.js)
- Auto-calculate costs: hourly rate, mileage, discounts, VAT
- Capture GPS coordinates of intervention location
- Offline-first: all data stored in browser localStorage, no backend

## Domain Context

- **Language**: The UI is entirely in Italian. All labels, messages, and placeholder text use Italian.
- **Users**: Field technicians who log interventions on mobile/tablet browsers.
- **Business model**: Single-user, client-side only. No authentication or multi-tenancy.
- **Key entities**: Report, Device, Attachment, Client, Settings
- **Report statuses**: draft, completed
- **Intervention reasons**: installation, supervision, malfunction, other

"""
Dashboard Generator — Legge i file .json dei rapporti dalla cartella di rete
e genera una dashboard HTML interattiva con filtri e statistiche.

Uso:
    python genera_dashboard.py [cartella_rapporti]

Se non specificata, usa: H:\DG_Assistenza\Assistenze\2026_Guaresi

Output: dashboard.html nella stessa cartella (apribile con qualsiasi browser).
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime


def load_reports(folder: Path) -> list[dict]:
    """Carica tutti i file .json dalla cartella."""
    reports = []
    for f in folder.glob("*.json"):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            # Validate minimum required fields
            if "interventionDate" in data and "companyName" in data:
                reports.append(data)
        except (json.JSONDecodeError, KeyError):
            print(f"  ⚠️  Ignorato (formato non valido): {f.name}")
    return reports


def generate_dashboard_html(reports: list[dict]) -> str:
    """Genera l'HTML della dashboard con dati embedded come JSON."""
    reports_json = json.dumps(reports, ensure_ascii=False, indent=None)
    generated_at = datetime.now().strftime("%d/%m/%Y %H:%M")

    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard Assistenza — Dinamica Generale</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f5f7fa;
    color: #1a1a2e;
    padding: 20px;
    line-height: 1.5;
  }}
  h1 {{
    text-align: center;
    font-size: 1.8rem;
    margin-bottom: 5px;
    color: #1a1a2e;
  }}
  .subtitle {{
    text-align: center;
    color: #666;
    margin-bottom: 25px;
    font-size: 0.85rem;
  }}
  .filters {{
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    align-items: flex-end;
  }}
  .filter-group {{
    display: flex;
    flex-direction: column;
    gap: 4px;
  }}
  .filter-group label {{
    font-size: 0.75rem;
    font-weight: 600;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}
  .filter-group input, .filter-group select {{
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.9rem;
    min-width: 150px;
  }}
  .filter-group input:focus, .filter-group select:focus {{
    outline: none;
    border-color: #4a90d9;
    box-shadow: 0 0 0 2px rgba(74,144,217,0.2);
  }}
  .btn-reset {{
    padding: 8px 16px;
    background: #e8e8e8;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
  }}
  .btn-reset:hover {{ background: #ddd; }}
  .kpi-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 15px;
    margin-bottom: 25px;
  }}
  .kpi-card {{
    background: white;
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }}
  .kpi-value {{
    font-size: 2rem;
    font-weight: 700;
    color: #2563eb;
  }}
  .kpi-label {{
    font-size: 0.8rem;
    color: #666;
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}
  .charts-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
    margin-bottom: 25px;
  }}
  .chart-card {{
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }}
  .chart-card h3 {{
    font-size: 0.9rem;
    color: #555;
    margin-bottom: 15px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}
  table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }}
  th {{
    text-align: left;
    padding: 10px 12px;
    background: #f8f9fa;
    font-weight: 600;
    color: #555;
    border-bottom: 2px solid #e8e8e8;
  }}
  td {{
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
  }}
  tr:hover td {{ background: #f8f9ff; }}
  .bar-container {{
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }}
  .bar-label {{
    min-width: 120px;
    font-size: 0.8rem;
    text-align: right;
    color: #555;
  }}
  .bar {{
    height: 24px;
    background: linear-gradient(90deg, #4a90d9, #64b5f6);
    border-radius: 4px;
    transition: width 0.3s ease;
    min-width: 2px;
  }}
  .bar-value {{
    font-size: 0.8rem;
    font-weight: 600;
    color: #333;
    min-width: 30px;
  }}
  .no-data {{
    text-align: center;
    color: #999;
    padding: 40px;
    font-style: italic;
  }}
  @media (max-width: 768px) {{
    .charts-grid {{ grid-template-columns: 1fr; }}
    .filters {{ flex-direction: column; }}
  }}
</style>
</head>
<body>

<h1>📊 Dashboard Assistenza</h1>
<p class="subtitle">Generata il {generated_at} — {len(reports)} rapporti caricati</p>

<!-- Filtri -->
<div class="filters">
  <div class="filter-group">
    <label>Da</label>
    <input type="date" id="filterFrom" />
  </div>
  <div class="filter-group">
    <label>A</label>
    <input type="date" id="filterTo" />
  </div>
  <div class="filter-group">
    <label>Cliente</label>
    <select id="filterCompany"><option value="">Tutti</option></select>
  </div>
  <div class="filter-group">
    <label>Richiesto da</label>
    <select id="filterRequestedBy"><option value="">Tutti</option></select>
  </div>
  <div class="filter-group">
    <label>Per conto di</label>
    <select id="filterOnBehalfOf"><option value="">Tutti</option></select>
  </div>
  <div class="filter-group">
    <label>Motivo</label>
    <select id="filterReason">
      <option value="">Tutti</option>
      <option value="installation">Installazione</option>
      <option value="supervision">Supervisione</option>
      <option value="malfunction">Malfunzionamento</option>
      <option value="other">Altro</option>
    </select>
  </div>
  <div class="filter-group">
    <label>Operatore</label>
    <select id="filterOperator"><option value="">Tutti</option></select>
  </div>
  <button class="btn-reset" onclick="resetFilters()">↺ Reset</button>
</div>

<!-- KPI Cards -->
<div class="kpi-grid" id="kpiGrid"></div>

<!-- Charts -->
<div class="charts-grid">
  <div class="chart-card">
    <h3>Interventi per mese</h3>
    <div id="chartMonthly"></div>
  </div>
  <div class="chart-card">
    <h3>Top clienti</h3>
    <div id="chartClients"></div>
  </div>
  <div class="chart-card">
    <h3>Per motivo intervento</h3>
    <div id="chartReasons"></div>
  </div>
  <div class="chart-card">
    <h3>Dettaglio rapporti</h3>
    <div style="max-height: 400px; overflow-y: auto;">
      <table id="reportTable">
        <thead>
          <tr>
            <th>Data</th>
            <th>Cliente</th>
            <th>Motivo</th>
            <th>Ore</th>
            <th>Km</th>
            <th>Totale</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  </div>
</div>

<script>
const ALL_REPORTS = {reports_json};

// --- Populate filter dropdowns ---
function populateFilters() {{
  const companies = [...new Set(ALL_REPORTS.map(r => r.companyName).filter(Boolean))].sort();
  const requestedBys = [...new Set(ALL_REPORTS.map(r => r.requestedBy).filter(Boolean))].sort();
  const onBehalfOfs = [...new Set(ALL_REPORTS.map(r => r.onBehalfOf).filter(Boolean))].sort();
  const operators = [...new Set(ALL_REPORTS.flatMap(r => [r.operator1, r.operator2]).filter(Boolean))].sort();

  fillSelect('filterCompany', companies);
  fillSelect('filterRequestedBy', requestedBys);
  fillSelect('filterOnBehalfOf', onBehalfOfs);
  fillSelect('filterOperator', operators);
}}

function fillSelect(id, values) {{
  const sel = document.getElementById(id);
  const current = sel.value;
  // Keep first "Tutti" option
  while (sel.options.length > 1) sel.remove(1);
  values.forEach(v => {{
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    sel.appendChild(opt);
  }});
  sel.value = current;
}}

// --- Filter logic ---
function getFilteredReports() {{
  const from = document.getElementById('filterFrom').value;
  const to = document.getElementById('filterTo').value;
  const company = document.getElementById('filterCompany').value;
  const requestedBy = document.getElementById('filterRequestedBy').value;
  const onBehalfOf = document.getElementById('filterOnBehalfOf').value;
  const reason = document.getElementById('filterReason').value;
  const operator = document.getElementById('filterOperator').value;

  return ALL_REPORTS.filter(r => {{
    if (from && r.interventionDate < from) return false;
    if (to && r.interventionDate > to) return false;
    if (company && r.companyName !== company) return false;
    if (requestedBy && r.requestedBy !== requestedBy) return false;
    if (onBehalfOf && r.onBehalfOf !== onBehalfOf) return false;
    if (reason && r.interventionReason !== reason) return false;
    if (operator && r.operator1 !== operator && r.operator2 !== operator) return false;
    return true;
  }});
}}

function resetFilters() {{
  document.getElementById('filterFrom').value = '';
  document.getElementById('filterTo').value = '';
  document.getElementById('filterCompany').value = '';
  document.getElementById('filterRequestedBy').value = '';
  document.getElementById('filterOnBehalfOf').value = '';
  document.getElementById('filterReason').value = '';
  document.getElementById('filterOperator').value = '';
  render();
}}

// --- Render ---
function render() {{
  const reports = getFilteredReports();
  renderKPIs(reports);
  renderMonthlyChart(reports);
  renderClientsChart(reports);
  renderReasonsChart(reports);
  renderTable(reports);
}}

function renderKPIs(reports) {{
  const totalInterventions = reports.length;
  const totalHours = reports.reduce((s, r) => s + (r.hoursWorked || 0), 0);
  const totalKm = reports.reduce((s, r) => s + (r.kilometers || 0), 0);
  const totalRevenue = reports.reduce((s, r) => s + (r.grandTotal || 0), 0);
  const avgHoursPerIntervention = totalInterventions > 0 ? (totalHours / totalInterventions).toFixed(1) : '0';
  const uniqueClients = new Set(reports.map(r => r.companyName)).size;

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-card"><div class="kpi-value">${{totalInterventions}}</div><div class="kpi-label">Interventi</div></div>
    <div class="kpi-card"><div class="kpi-value">${{totalHours.toFixed(1)}}</div><div class="kpi-label">Ore totali</div></div>
    <div class="kpi-card"><div class="kpi-value">${{totalKm.toLocaleString('it-IT')}}</div><div class="kpi-label">Km totali</div></div>
    <div class="kpi-card"><div class="kpi-value">${{totalRevenue.toLocaleString('it-IT', {{minimumFractionDigits:2, maximumFractionDigits:2}})}}&euro;</div><div class="kpi-label">Fatturato totale</div></div>
    <div class="kpi-card"><div class="kpi-value">${{avgHoursPerIntervention}}</div><div class="kpi-label">Ore medie / intervento</div></div>
    <div class="kpi-card"><div class="kpi-value">${{uniqueClients}}</div><div class="kpi-label">Clienti unici</div></div>
  `;
}}

function renderBarChart(containerId, data, maxBars) {{
  const container = document.getElementById(containerId);
  if (data.length === 0) {{
    container.innerHTML = '<div class="no-data">Nessun dato</div>';
    return;
  }}
  const sorted = data.sort((a, b) => b.value - a.value).slice(0, maxBars || 10);
  const maxVal = Math.max(...sorted.map(d => d.value), 1);
  container.innerHTML = sorted.map(d => `
    <div class="bar-container">
      <div class="bar-label">${{d.label}}</div>
      <div class="bar" style="width: ${{(d.value / maxVal * 100).toFixed(1)}}%"></div>
      <div class="bar-value">${{d.value}}</div>
    </div>
  `).join('');
}}

function renderMonthlyChart(reports) {{
  const monthly = {{}};
  reports.forEach(r => {{
    const month = r.interventionDate?.substring(0, 7);
    if (month) monthly[month] = (monthly[month] || 0) + 1;
  }});
  const data = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({{ label: formatMonth(k), value: v }}));
  renderBarChart('chartMonthly', data, 12);
}}

function renderClientsChart(reports) {{
  const counts = {{}};
  reports.forEach(r => {{
    const name = r.companyName || 'N/D';
    counts[name] = (counts[name] || 0) + 1;
  }});
  const data = Object.entries(counts).map(([k, v]) => ({{ label: k.substring(0, 25), value: v }}));
  renderBarChart('chartClients', data, 8);
}}

function renderReasonsChart(reports) {{
  const reasons = {{ installation: 'Installazione', supervision: 'Supervisione', malfunction: 'Malfunzionamento', other: 'Altro' }};
  const counts = {{}};
  reports.forEach(r => {{
    const reason = reasons[r.interventionReason] || 'Non specificato';
    counts[reason] = (counts[reason] || 0) + 1;
  }});
  const data = Object.entries(counts).map(([k, v]) => ({{ label: k, value: v }}));
  renderBarChart('chartReasons', data, 5);
}}

function renderTable(reports) {{
  const tbody = document.querySelector('#reportTable tbody');
  const sorted = [...reports].sort((a, b) => (b.interventionDate || '').localeCompare(a.interventionDate || ''));
  tbody.innerHTML = sorted.map(r => `
    <tr>
      <td>${{formatDate(r.interventionDate)}}</td>
      <td>${{r.companyName || ''}}</td>
      <td>${{formatReason(r.interventionReason)}}</td>
      <td>${{r.hoursWorked || 0}}</td>
      <td>${{r.kilometers || 0}}</td>
      <td>${{(r.grandTotal || 0).toLocaleString('it-IT', {{minimumFractionDigits:2}})}}&euro;</td>
    </tr>
  `).join('');
}}

// --- Helpers ---
function formatDate(iso) {{
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${{d}}/${{m}}/${{y}}`;
}}
function formatMonth(ym) {{
  const [y, m] = ym.split('-');
  const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return `${{months[parseInt(m)-1]}} ${{y}}`;
}}
function formatReason(r) {{
  const map = {{ installation:'Installazione', supervision:'Supervisione', malfunction:'Malfunzionamento', other:'Altro' }};
  return map[r] || '';
}}

// --- Init ---
populateFilters();
render();

// Listen for filter changes
document.querySelectorAll('.filters input, .filters select').forEach(el => {{
  el.addEventListener('change', render);
}});
</script>
</body>
</html>""";


def main():
    # Determine input folder
    if len(sys.argv) > 1:
        folder = Path(sys.argv[1])
    else:
        folder = Path(r"H:\DG_Assistenza\Assistenze\2026_Guaresi")

    if not folder.exists():
        print(f"❌ Cartella non trovata: {folder}")
        sys.exit(1)

    print(f"📂 Scansione: {folder}")
    reports = load_reports(folder)

    if not reports:
        print("⚠️  Nessun file JSON trovato. Esporta i rapporti dalla webapp (PDF + JSON).")
        print("   I file JSON vengono scaricati automaticamente insieme al PDF.")
        sys.exit(0)

    print(f"✅ Caricati {len(reports)} rapporti")

    # Generate dashboard
    html = generate_dashboard_html(reports)
    output_path = folder / "dashboard.html"
    output_path.write_text(html, encoding="utf-8")

    print(f"📊 Dashboard generata: {output_path}")
    print(f"   Aprila con il browser per visualizzare le statistiche.")

    # Auto-open in browser
    os.startfile(str(output_path))


if __name__ == "__main__":
    main()

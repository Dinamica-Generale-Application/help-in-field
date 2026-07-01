import type { CostBreakdown } from '../utils/cost-calculation';
import { formatCurrency } from '@/utils/format';

interface CostSummaryProps {
  breakdown: CostBreakdown | null;
}

/**
 * Mostra il breakdown costi aggiornato in tempo reale.
 * Non renderizza nulla se breakdown è null (ore = 0 o non compilate).
 */
export function CostSummary({ breakdown }: CostSummaryProps) {
  if (!breakdown) return null;

  const rows = [
    { label: 'Costo ore', value: breakdown.hourlyTotal },
    { label: 'Costo km', value: breakdown.kilometerTotal },
    { label: 'Subtotale', value: breakdown.subtotal },
    { label: 'Sconto', value: -breakdown.discountAmount },
    { label: 'Imponibile', value: breakdown.taxableAmount },
    { label: 'IVA (22%)', value: breakdown.vatAmount },
  ];

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Riepilogo Costi
      </h3>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span>{formatCurrency(row.value)}</span>
          </div>
        ))}
      </div>
      <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
        <span>Totale</span>
        <span className="text-lg">{formatCurrency(breakdown.grandTotal)}</span>
      </div>
    </div>
  );
}

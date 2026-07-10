/**
 * Mission types — planned interventions created by the service manager.
 */

import type { HeatRiskLevel, InterventionReason } from '@/features/reports/types';

export interface Mission {
  id: string;
  /** Comune/città di destinazione */
  destination: string;
  /** Prodotto/modello su cui intervenire */
  product: string;
  /** Motivo dell'intervento */
  interventionReason: InterventionReason;
  /** Livello rischio caldo comunicato */
  heatRisk?: HeatRiskLevel;
  /** Note aggiuntive dal responsabile */
  notes?: string;
  /** Data creazione missione */
  createdAt: string;
}

/**
 * Format used for sharing missions via file (WhatsApp, email, etc.)
 */
export interface MissionExport {
  version: 1;
  type: 'mission';
  mission: Mission;
}

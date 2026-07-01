/**
 * Dialog di conferma eliminazione rapporto.
 *
 * Mostra la ragione sociale e la data dell'intervento del rapporto
 * che si intende eliminare, con avviso di irreversibilità.
 *
 * Validates: Requirements 11.1, 11.3
 */

import React from 'react';
import { Button, Dialog, Portal, Text } from 'react-native-paper';

export interface DeleteReportDialogProps {
  /** Indica se il dialog è visibile */
  visible: boolean;
  /** Ragione sociale del cliente associato al rapporto */
  companyName: string;
  /** Data dell'intervento in formato leggibile (es. "15/06/2024") */
  interventionDate: string;
  /** Callback eseguito quando l'utente conferma l'eliminazione */
  onConfirm: () => void;
  /** Callback eseguito quando l'utente annulla l'eliminazione */
  onDismiss: () => void;
}

/**
 * Dialog modale che chiede conferma prima di eliminare un rapporto.
 * Mostra i dettagli identificativi (ragione sociale e data) per evitare
 * eliminazioni accidentali. L'annullamento mantiene il rapporto invariato.
 */
export default function DeleteReportDialog({
  visible,
  companyName,
  interventionDate,
  onConfirm,
  onDismiss,
}: DeleteReportDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Eliminare rapporto</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">
            Eliminare il rapporto di {companyName} del {interventionDate}?
            L'operazione è irreversibile.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Annulla</Button>
          <Button onPress={onConfirm} textColor="#D32F2F">
            Elimina
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

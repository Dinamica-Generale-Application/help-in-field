/**
 * Dialog di conferma uscita dal form con modifiche non salvate.
 *
 * Viene mostrato quando l'utente tenta di navigare indietro dal form
 * con dati non salvati (isDirty = true).
 *
 * Validates: Requirements 2.8
 */

import React from 'react';
import { Button, Dialog, Portal, Text } from 'react-native-paper';

export interface ConfirmExitDialogProps {
  /** Indica se il dialog è visibile */
  visible: boolean;
  /** Callback eseguito quando l'utente conferma l'uscita senza salvare */
  onConfirm: () => void;
  /** Callback eseguito quando l'utente annulla e rimane nel form */
  onDismiss: () => void;
}

/**
 * Dialog modale che avvisa l'utente della presenza di modifiche non salvate
 * e chiede conferma prima di abbandonare il form.
 */
export default function ConfirmExitDialog({
  visible,
  onConfirm,
  onDismiss,
}: ConfirmExitDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Dati non salvati</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">
            Hai delle modifiche non salvate. Vuoi uscire senza salvare?
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Annulla</Button>
          <Button onPress={onConfirm}>Esci</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

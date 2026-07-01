/**
 * Hook per prevenire la navigazione all'indietro quando il form ha modifiche non salvate.
 *
 * Utilizza l'evento 'beforeRemove' di @react-navigation/native (disponibile via expo-router)
 * per intercettare il tentativo di uscita e mostrare un dialog di conferma.
 *
 * Validates: Requirements 2.8
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from 'expo-router';

/**
 * Intercetta la navigazione all'indietro quando `isDirty` è true.
 * Restituisce lo stato del dialog e le funzioni per gestirlo.
 *
 * @param isDirty - indica se il form ha modifiche non salvate
 */
export function usePreventRemove(isDirty: boolean) {
  const navigation = useNavigation();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ data: { action: any } } | null>(null);

  useEffect(() => {
    if (!isDirty) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      // Prevent the default back behavior
      e.preventDefault();
      // Save the navigation action so we can dispatch it later
      setPendingAction(e);
      setShowExitDialog(true);
    });

    return unsubscribe;
  }, [isDirty, navigation]);

  /** User confirms exit — dispatch the blocked navigation action */
  const confirmExit = useCallback(() => {
    setShowExitDialog(false);
    if (pendingAction) {
      navigation.dispatch(pendingAction.data.action);
      setPendingAction(null);
    }
  }, [navigation, pendingAction]);

  /** User cancels exit — dismiss dialog and stay on the form */
  const dismissExit = useCallback(() => {
    setShowExitDialog(false);
    setPendingAction(null);
  }, []);

  return {
    showExitDialog,
    confirmExit,
    dismissExit,
  };
}

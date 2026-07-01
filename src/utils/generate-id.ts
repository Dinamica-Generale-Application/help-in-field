/**
 * Genera un ID univoco senza dipendere da crypto.getRandomValues.
 * Sostituisce uuid v4 che richiede polyfill in React Native.
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 12);
}

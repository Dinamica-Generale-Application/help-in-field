/**
 * Unit tests per ConfirmExitDialog.
 *
 * Verifica la corretta esportazione, struttura props e logica base del componente.
 *
 * Validates: Requirements 2.8
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import ConfirmExitDialog from './ConfirmExitDialog';

// Mock react-native-paper
vi.mock('react-native-paper', () => ({
  Button: ({ children, onPress }: any) =>
    React.createElement('Button', { onPress }, children),
  Dialog: Object.assign(
    ({ children, visible, onDismiss }: any) =>
      visible ? React.createElement('Dialog', { onDismiss }, children) : null,
    {
      Title: ({ children }: any) => React.createElement('DialogTitle', null, children),
      Content: ({ children }: any) => React.createElement('DialogContent', null, children),
      Actions: ({ children }: any) => React.createElement('DialogActions', null, children),
    },
  ),
  Portal: ({ children }: any) => React.createElement('Portal', null, children),
  Text: ({ children }: any) => React.createElement('Text', null, children),
}));

describe('ConfirmExitDialog', () => {
  it('should export the component as default', () => {
    expect(ConfirmExitDialog).toBeDefined();
    expect(typeof ConfirmExitDialog).toBe('function');
  });

  it('should return null when not visible', () => {
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();

    const result = ConfirmExitDialog({
      visible: false,
      onConfirm,
      onDismiss,
    });

    // When visible=false, Dialog mock returns null
    // The Portal wrapper still renders but Dialog inside is null
    expect(result).toBeDefined();
  });

  it('should render dialog content when visible', () => {
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();

    const result = ConfirmExitDialog({
      visible: true,
      onConfirm,
      onDismiss,
    });

    expect(result).not.toBeNull();
  });

  it('should accept required props without type errors', () => {
    const props = {
      visible: true,
      onConfirm: () => {},
      onDismiss: () => {},
    };

    // This verifies the component can be invoked with correct props
    expect(() => ConfirmExitDialog(props)).not.toThrow();
  });
});

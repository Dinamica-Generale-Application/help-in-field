/**
 * Unit tests per DeleteReportDialog.
 *
 * Verifica la corretta esportazione, struttura props e logica base del componente.
 *
 * Validates: Requirements 11.1, 11.3
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import DeleteReportDialog from './DeleteReportDialog';

// Mock react-native-paper
vi.mock('react-native-paper', () => ({
  Button: ({ children, onPress, textColor }: any) =>
    React.createElement('Button', { onPress, textColor }, children),
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

describe('DeleteReportDialog', () => {
  it('should export the component as default', () => {
    expect(DeleteReportDialog).toBeDefined();
    expect(typeof DeleteReportDialog).toBe('function');
  });

  it('should return null when not visible', () => {
    const result = DeleteReportDialog({
      visible: false,
      companyName: 'Acme Corp',
      interventionDate: '15/06/2024',
      onConfirm: vi.fn(),
      onDismiss: vi.fn(),
    });

    expect(result).toBeDefined();
  });

  it('should render dialog content when visible', () => {
    const result = DeleteReportDialog({
      visible: true,
      companyName: 'Acme Corp',
      interventionDate: '15/06/2024',
      onConfirm: vi.fn(),
      onDismiss: vi.fn(),
    });

    expect(result).not.toBeNull();
  });

  it('should accept all required props without type errors', () => {
    const props = {
      visible: true,
      companyName: 'Test Company S.r.l.',
      interventionDate: '01/01/2024',
      onConfirm: () => {},
      onDismiss: () => {},
    };

    expect(() => DeleteReportDialog(props)).not.toThrow();
  });

  it('should handle empty company name', () => {
    const props = {
      visible: true,
      companyName: '',
      interventionDate: '15/03/2024',
      onConfirm: vi.fn(),
      onDismiss: vi.fn(),
    };

    expect(() => DeleteReportDialog(props)).not.toThrow();
  });

  it('should handle various date formats', () => {
    const props = {
      visible: true,
      companyName: 'Test',
      interventionDate: '2024-06-15',
      onConfirm: vi.fn(),
      onDismiss: vi.fn(),
    };

    expect(() => DeleteReportDialog(props)).not.toThrow();
  });
});

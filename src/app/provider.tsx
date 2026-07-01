import type { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

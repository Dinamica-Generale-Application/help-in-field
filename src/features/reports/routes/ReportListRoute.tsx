/**
 * ReportListRoute — main page showing list of reports with search and FAB.
 * Route: / (index)
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportStore } from '../stores/reportStore';
import { ReportListItem } from '../components/ReportListItem';
import type { Report } from '../types';

/**
 * Custom hook for debounced search.
 * Returns the debounced value after the specified delay.
 */
function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Sort reports by interventionDate descending (most recent first).
 */
function sortByDateDesc(reports: Report[]): Report[] {
  return [...reports].sort((a, b) => {
    const dateA = new Date(a.interventionDate).getTime();
    const dateB = new Date(b.interventionDate).getTime();
    return dateB - dateA;
  });
}

export function ReportListRoute() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const debouncedQuery = useDebouncedValue(searchInput, 300);

  const searchReports = useReportStore((s) => s.searchReports);
  const allReports = useReportStore((s) => s.reports);

  // Get filtered results based on debounced query
  const filteredReports = useMemo(() => {
    const results = debouncedQuery.trim()
      ? searchReports(debouncedQuery)
      : allReports;
    return sortByDateDesc(results);
  }, [debouncedQuery, searchReports, allReports]);

  const isEmpty = filteredReports.length === 0;
  const isSearching = debouncedQuery.trim().length > 0;

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Search bar */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cerca per azienda, seriale, data..."
          aria-label="Cerca rapporti"
          className={cn(
            'w-full rounded-lg border border-input bg-background py-3 pl-10 pr-4 text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            'min-h-[44px]'
          )}
        />
      </div>

      {/* Results or empty state */}
      {isEmpty ? (
        <EmptyState isSearching={isSearching} onCreateClick={() => navigate('/reports/new')} />
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Lista rapporti">
          {filteredReports.map((report) => (
            <li key={report.id}>
              <ReportListItem report={report} />
            </li>
          ))}
        </ul>
      )}

      {/* FAB — Floating Action Button */}
      <button
        type="button"
        onClick={() => navigate('/reports/new')}
        className={cn(
          'fixed bottom-6 right-6 z-30 flex items-center justify-center rounded-full shadow-lg transition-transform',
          'bg-primary text-primary-foreground',
          'hover:scale-105 active:scale-95',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          'h-14 w-14'
        )}
        aria-label="Nuovo rapporto"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Empty state component */
function EmptyState({
  isSearching,
  onCreateClick,
}: {
  isSearching: boolean;
  onCreateClick: () => void;
}) {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <p className="text-muted-foreground">Nessun risultato trovato.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <p className="text-muted-foreground">Nessun rapporto. Crea il primo!</p>
      <button
        type="button"
        onClick={onCreateClick}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          'min-h-[44px]'
        )}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Crea rapporto
      </button>
    </div>
  );
}

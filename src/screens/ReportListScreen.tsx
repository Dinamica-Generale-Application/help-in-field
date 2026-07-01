/**
 * Schermata Elenco Rapporti.
 *
 * Mostra la lista dei rapporti di assistenza tecnica con ricerca,
 * filtro e navigazione al dettaglio o alla creazione di un nuovo rapporto.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { Chip, FAB, IconButton, List, Searchbar, Text } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { useReportStore } from '../store/report-store';
import { reportRepository } from '../data/report-repository';
import { attachmentRepository } from '../data/attachment-repository';
import { generatePdf, sharePdf } from '../domain/pdf-export';
import type { Report } from '../types/report';

/** Formats an ISO date string to DD/MM/YYYY */
function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function ReportListScreen() {
  const { reports, isLoading, loadReports, searchReports } = useReportStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sharingReportId, setSharingReportId] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reload reports every time the screen gains focus (fixes bug: list not refreshing after save)
  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  // Sync filteredReports with reports when not searching
  useFocusEffect(
    useCallback(() => {
      if (!searchQuery.trim()) {
        setFilteredReports(reports);
        setIsSearching(false);
      }
    }, [reports, searchQuery])
  );

  // Debounced search (300ms)
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (!query.trim()) {
        setFilteredReports(reports);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      debounceTimerRef.current = setTimeout(async () => {
        const results = await searchReports({ text: query.trim() });
        setFilteredReports(results);
        setIsSearching(false);
      }, 300);
    },
    [reports, searchReports],
  );

  const handleReportPress = useCallback((report: Report) => {
    router.push(`/report/${report.id}`);
  }, []);

  const handleCreateReport = useCallback(() => {
    router.push('/report/new');
  }, []);

  // Share handler: generates PDF and shares
  const handleShareReport = useCallback(async (reportId: string) => {
    setSharingReportId(reportId);
    try {
      const report = await reportRepository.getById(reportId);
      if (!report) return;
      const attachments = await attachmentRepository.getByReportId(reportId);
      const result = await generatePdf(report, attachments);
      if (result.success && result.filePath) {
        await sharePdf(result.filePath);
      }
    } catch {
      // Silently fail — the user will see the loading indicator stop
    } finally {
      setSharingReportId(null);
    }
  }, []);

  const renderStatusChip = useCallback((status: Report['status']) => {
    const isDraft = status === 'draft';
    return (
      <Chip
        mode="flat"
        compact
        style={[styles.chip, isDraft ? styles.chipDraft : styles.chipCompleted]}
        textStyle={[styles.chipText, isDraft ? styles.chipTextDraft : styles.chipTextCompleted]}
      >
        {isDraft ? 'Bozza' : 'Completato'}
      </Chip>
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Report }) => (
      <List.Item
        title={item.companyName}
        description={`${formatDate(item.interventionDate)}`}
        onPress={() => handleReportPress(item)}
        right={() => (
          <View style={styles.listItemRight}>
            {sharingReportId === item.id ? (
              <ActivityIndicator size="small" style={styles.shareLoader} />
            ) : (
              <IconButton
                icon="share-variant"
                size={20}
                onPress={() => handleShareReport(item.id)}
                accessibilityLabel="Condividi rapporto"
              />
            )}
            {renderStatusChip(item.status)}
          </View>
        )}
        style={styles.listItem}
      />
    ),
    [handleReportPress, handleShareReport, renderStatusChip, sharingReportId],
  );

  const keyExtractor = useCallback((item: Report) => item.id, []);

  // Empty state: no reports exist at all
  if (!isLoading && reports.length === 0 && !searchQuery.trim()) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text variant="titleMedium" style={styles.emptyText}>
            Nessun rapporto presente
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            Crea il primo rapporto di assistenza
          </Text>
        </View>
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleCreateReport}
          accessibilityLabel="Crea nuovo rapporto"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Cerca per ragione sociale, data, numero di serie"
        onChangeText={handleSearchChange}
        value={searchQuery}
        style={styles.searchbar}
        accessibilityLabel="Cerca rapporti"
      />

      {/* Empty search results */}
      {searchQuery.trim() && !isSearching && filteredReports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            Nessun rapporto trovato
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreateReport}
        accessibilityLabel="Crea nuovo rapporto"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    margin: 12,
    elevation: 2,
  },
  listContent: {
    paddingBottom: 80,
  },
  listItem: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 1,
  },
  listItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareLoader: {
    marginRight: 4,
  },
  chip: {
    alignSelf: 'center',
    marginRight: 8,
  },
  chipDraft: {
    backgroundColor: '#FFF9C4',
  },
  chipCompleted: {
    backgroundColor: '#C8E6C9',
  },
  chipText: {
    fontSize: 12,
  },
  chipTextDraft: {
    color: '#F57F17',
  },
  chipTextCompleted: {
    color: '#2E7D32',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#999',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 36,
  },
});

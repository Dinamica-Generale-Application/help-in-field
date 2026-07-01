/**
 * Schermata Dettaglio Rapporto.
 *
 * Mostra tutti i dettagli di un rapporto in sola lettura, organizzati per sezioni:
 * Dati Cliente, Dettagli Intervento, Costi, Allegati.
 * Permette di modificare, esportare PDF o eliminare il rapporto.
 *
 * Validates: Requirements 6.4, 8.1, 8.2, 11.1, 11.2
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  DataTable,
  Divider,
  IconButton,
  Snackbar,
  Surface,
  Text,
} from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';

import { reportRepository } from '../data/report-repository';
import { attachmentRepository } from '../data/attachment-repository';
import { deviceRepository } from '../data/device-repository';
import { generatePdf, sharePdf } from '../domain/pdf-export';
import { useReportStore } from '../store/report-store';
import { DeleteReportDialog } from '../components';
import type { Attachment, Device, Report } from '../types/report';

// --- Helpers ---

/** Formatta una data ISO in DD/MM/YYYY */
function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Formatta un numero come valuta EUR */
function formatCurrency(value: number | undefined | null): string {
  if (value == null) return '0,00 €';
  return value.toFixed(2).replace('.', ',') + ' €';
}

/** Mappa il motivo dell'intervento alla label italiana */
function formatInterventionReason(reason: string | undefined): string {
  switch (reason) {
    case 'installation':
      return 'Installazione';
    case 'supervision':
      return 'Supervisione';
    case 'malfunction':
      return 'Malfunzionamento';
    case 'other':
      return 'Altro';
    default:
      return '-';
  }
}

/** Mappa lo stato garanzia alla label italiana */
function formatWarranty(warranty: string | undefined): string {
  switch (warranty) {
    case 'in_warranty':
      return 'In Garanzia';
    case 'out_warranty':
      return 'Non in Garanzia';
    default:
      return '-';
  }
}

/** Mappa lo stato pagamento alla label italiana */
function formatPayment(payment: string | undefined): string {
  switch (payment) {
    case 'paid':
      return 'Pagato';
    case 'unpaid':
      return 'Non Pagato';
    default:
      return '-';
  }
}

// --- Component ---

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteReport } = useReportStore();

  const [report, setReport] = useState<Report | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Load report and attachments on mount
  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const loadedReport = await reportRepository.getById(id);
        setReport(loadedReport);
        if (loadedReport) {
          const loadedAttachments = await attachmentRepository.getByReportId(id);
          setAttachments(loadedAttachments);
          const loadedDevices = await deviceRepository.getByReportId(id);
          setDevices(loadedDevices);
        }
      } catch {
        setSnackbarMessage('Errore durante il caricamento del rapporto.');
        setSnackbarVisible(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id]);

  // --- Action Handlers ---

  const handleEdit = useCallback(() => {
    if (!id) return;
    router.push(`/report/edit/${id}`);
  }, [id]);

  const handleExportPdf = useCallback(async () => {
    if (!report) return;
    setIsPdfLoading(true);
    try {
      const result = await generatePdf(report, attachments, devices);
      if (result.success && result.filePath) {
        await sharePdf(result.filePath);
      } else {
        setSnackbarMessage(result.error || 'Errore durante la generazione del PDF.');
        setSnackbarVisible(true);
      }
    } catch {
      setSnackbarMessage('Errore durante la condivisione del PDF.');
      setSnackbarVisible(true);
    } finally {
      setIsPdfLoading(false);
    }
  }, [report, attachments, devices]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!id) return;
    setShowDeleteDialog(false);
    try {
      await deleteReport(id);
      router.back();
    } catch {
      setSnackbarMessage('Errore durante l\'eliminazione del rapporto.');
      setSnackbarVisible(true);
    }
  }, [id, deleteReport]);

  const handleRetrySnackbar = useCallback(() => {
    setSnackbarVisible(false);
    handleExportPdf();
  }, [handleExportPdf]);

  // --- Loading state ---
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Caricamento rapporto...</Text>
      </View>
    );
  }

  // --- Not found ---
  if (!report) {
    return (
      <View style={styles.loadingContainer}>
        <Text variant="titleMedium">Rapporto non trovato</Text>
        <Button mode="text" onPress={() => router.back()} style={styles.backButton}>
          Torna indietro
        </Button>
      </View>
    );
  }

  // --- Full-screen image viewer ---
  if (fullScreenImage) {
    return (
      <View style={styles.fullScreenContainer}>
        <Image
          source={{ uri: fullScreenImage }}
          style={styles.fullScreenImage}
          resizeMode="contain"
          onError={() => {
            setFullScreenImage(null);
            setSnackbarMessage('Foto non più disponibile nella cache.');
            setSnackbarVisible(true);
          }}
        />
        <IconButton
          icon="close"
          size={30}
          style={styles.closeImageButton}
          onPress={() => setFullScreenImage(null)}
          accessibilityLabel="Chiudi anteprima"
        />
      </View>
    );
  }

  const images = attachments.filter((a) => a.type === 'image');
  const videos = attachments.filter((a) => a.type === 'video');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Chip */}
        <View style={styles.statusRow}>
          <Chip
            mode="flat"
            style={[
              styles.statusChip,
              report.status === 'completed' ? styles.chipCompleted : styles.chipDraft,
            ]}
            textStyle={
              report.status === 'completed'
                ? styles.chipTextCompleted
                : styles.chipTextDraft
            }
          >
            {report.status === 'completed' ? 'Completato' : 'Bozza'}
          </Chip>
        </View>

        {/* Sezione Dati Cliente */}
        <Card style={styles.card}>
          <Card.Title title="Dati Cliente" titleVariant="titleMedium" />
          <Card.Content>
            <FieldRow label="Ragione Sociale" value={report.companyName} />
            {report.address && <FieldRow label="Indirizzo" value={report.address} />}
            {report.phone && <FieldRow label="Telefono" value={report.phone} />}
          </Card.Content>
        </Card>

        <Divider style={styles.divider} />

        {/* Sezione Dettagli Intervento */}
        <Card style={styles.card}>
          <Card.Title title="Dettagli Intervento" titleVariant="titleMedium" />
          <Card.Content>
            <FieldRow label="Data Intervento" value={formatDate(report.interventionDate)} />
            <FieldRow label="Eseguito da" value={report.performedBy} />
            {report.interventionLocation && (
              <FieldRow label="Luogo Intervento" value={report.interventionLocation} />
            )}
            {report.requestedBy && (
              <FieldRow label="Richiesto da" value={report.requestedBy} />
            )}
            {report.onBehalfOf && (
              <FieldRow label="Per conto di" value={report.onBehalfOf} />
            )}
            {report.interventionReason && (
              <FieldRow
                label="Motivo Intervento"
                value={formatInterventionReason(report.interventionReason)}
              />
            )}
            <FieldRow label="Descrizione" value={report.description} />
            {report.model && <FieldRow label="Modello" value={report.model} />}
            {report.serialNumber && (
              <FieldRow label="Numero di Serie" value={report.serialNumber} />
            )}
            {report.productionYear && (
              <FieldRow label="Anno di Produzione" value={report.productionYear} />
            )}
            {report.warranty && (
              <FieldRow label="Garanzia" value={formatWarranty(report.warranty)} />
            )}
            {report.notes && <FieldRow label="Note" value={report.notes} />}
          </Card.Content>
        </Card>

        <Divider style={styles.divider} />

        {/* Sezione Dispositivi */}
        {devices.length > 0 && (
          <>
            <Card style={styles.card}>
              <Card.Title title="Dispositivi" titleVariant="titleMedium" />
              <Card.Content>
                {devices.map((device, index) => (
                  <View key={device.id} style={{ marginBottom: 12 }}>
                    <Text variant="titleSmall">Dispositivo {index + 1}</Text>
                    {device.model && <FieldRow label="Modello" value={device.model} />}
                    {device.serialNumber && <FieldRow label="Numero di Serie" value={device.serialNumber} />}
                    {device.productionYear && <FieldRow label="Anno Produzione" value={device.productionYear} />}
                    {device.warranty && <FieldRow label="Garanzia" value={formatWarranty(device.warranty)} />}
                  </View>
                ))}
              </Card.Content>
            </Card>

            <Divider style={styles.divider} />
          </>
        )}

        {/* Sezione Costi */}
        <Card style={styles.card}>
          <Card.Title title="Costi" titleVariant="titleMedium" />
          <Card.Content>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Voce</DataTable.Title>
                <DataTable.Title numeric>Importo</DataTable.Title>
              </DataTable.Header>
              <DataTable.Row>
                <DataTable.Cell>
                  Ore lavorate ({report.hoursWorked ?? 0} h × 60,00 €)
                </DataTable.Cell>
                <DataTable.Cell numeric>
                  {formatCurrency(report.hourlyTotal)}
                </DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell>
                  Chilometri ({report.kilometers ?? 0} km × 0,90 €)
                </DataTable.Cell>
                <DataTable.Cell numeric>
                  {formatCurrency(report.kilometerTotal)}
                </DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row style={styles.totalRow}>
                <DataTable.Cell>
                  <Text variant="titleSmall">Totale Intervento</Text>
                </DataTable.Cell>
                <DataTable.Cell numeric>
                  <Text variant="titleSmall">
                    {formatCurrency(report.grandTotal)}
                  </Text>
                </DataTable.Cell>
              </DataTable.Row>
            </DataTable>
          </Card.Content>
        </Card>

        <Divider style={styles.divider} />

        {/* Sezione Allegati */}
        {(images.length > 0 || videos.length > 0) && (
          <Card style={styles.card}>
            <Card.Title title="Allegati" titleVariant="titleMedium" />
            <Card.Content>
              {images.length > 0 && (
                <View style={styles.attachmentsGrid}>
                  {images.map((img) => (
                    <TouchableOpacity
                      key={img.id}
                      style={styles.thumbnailContainer}
                      onPress={() => setFullScreenImage(img.filePath)}
                      accessibilityLabel={`Visualizza immagine: ${img.description || img.fileName}`}
                    >
                      <AttachmentThumbnail
                        uri={img.filePath}
                        style={styles.thumbnail}
                      />
                      {img.description && (
                        <Text variant="labelSmall" style={styles.attachmentDescription}>
                          {img.description}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {videos.length > 0 && (
                <View style={styles.videosSection}>
                  {videos.map((vid) => (
                    <Surface key={vid.id} style={styles.videoItem} elevation={1}>
                      <IconButton icon="video" size={24} />
                      <View style={styles.videoInfo}>
                        <Text variant="bodyMedium" numberOfLines={1}>
                          {vid.fileName}
                        </Text>
                        {vid.description && (
                          <Text variant="labelSmall" style={styles.videoDescription}>
                            {vid.description}
                          </Text>
                        )}
                      </View>
                    </Surface>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Spacer for bottom buttons */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Action buttons */}
      <Surface style={styles.actionBar} elevation={4}>
        <Button
          mode="outlined"
          icon="pencil"
          onPress={handleEdit}
          style={styles.actionButton}
        >
          Modifica
        </Button>
        <Button
          mode="contained"
          icon="file-pdf-box"
          onPress={handleExportPdf}
          loading={isPdfLoading}
          disabled={isPdfLoading}
          style={styles.actionButton}
        >
          Esporta PDF
        </Button>
        <Button
          mode="outlined"
          icon="delete"
          onPress={() => setShowDeleteDialog(true)}
          style={styles.actionButton}
          textColor="#D32F2F"
        >
          Elimina
        </Button>
      </Surface>

      {/* Delete Confirmation Dialog */}
      <DeleteReportDialog
        visible={showDeleteDialog}
        companyName={report.companyName}
        interventionDate={formatDate(report.interventionDate)}
        onConfirm={handleDeleteConfirm}
        onDismiss={() => setShowDeleteDialog(false)}
      />

      {/* Error Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={5000}
        action={{
          label: 'Riprova',
          onPress: handleRetrySnackbar,
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

// --- Sub-components ---

/** Thumbnail with error handling for cached images that may no longer exist */
function AttachmentThumbnail({ uri, style }: { uri: string; style: any }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <View style={[style, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 32 }}>📷</Text>
        <Text style={{ fontSize: 10, color: '#666' }}>Foto non disponibile</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
}

/** Read-only field row with label and value */
function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text variant="labelMedium" style={styles.fieldLabel}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={styles.fieldValue}>
        {value}
      </Text>
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  backButton: {
    marginTop: 16,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  chipDraft: {
    backgroundColor: '#FFF9C4',
  },
  chipCompleted: {
    backgroundColor: '#C8E6C9',
  },
  chipTextDraft: {
    color: '#F57F17',
  },
  chipTextCompleted: {
    color: '#2E7D32',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  divider: {
    marginVertical: 12,
  },
  fieldRow: {
    marginBottom: 10,
  },
  fieldLabel: {
    color: '#666',
    marginBottom: 2,
  },
  fieldValue: {
    color: '#1a1a1a',
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#333',
  },
  attachmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  thumbnailContainer: {
    width: '47%',
    marginBottom: 8,
  },
  thumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
  },
  attachmentDescription: {
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  videosSection: {
    marginTop: 8,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  videoInfo: {
    flex: 1,
    marginLeft: 4,
  },
  videoDescription: {
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  bottomSpacer: {
    height: 20,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  closeImageButton: {
    position: 'absolute',
    top: 40,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});

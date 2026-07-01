/**
 * AttachmentSection — Sezione allegati per il form rapporto.
 * Gestisce scatto foto, selezione galleria, registrazione video,
 * anteprima con descrizione editabile, eliminazione, OCR numero di serie.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Dialog,
  IconButton,
  Portal,
  ProgressBar,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';

import { useAttachmentStore } from '../store/attachment-store';
import { recognizeSerialNumber } from '../domain/ocr';
import type { Attachment } from '../types/report';
import type { AttachmentInput } from '../data/attachment-repository';

// --- Constants ---

const MAX_ATTACHMENTS = 20;
const MAX_DESCRIPTION_LENGTH = 200;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 120; // 2 minutes in seconds

// --- Props ---

export interface AttachmentSectionProps {
  reportId: string;
  onSerialNumberRecognized?: (serialNumber: string) => void;
}

// --- Component ---

export function AttachmentSection({
  reportId,
  onSerialNumberRecognized,
}: AttachmentSectionProps) {
  const {
    attachments,
    isUploading,
    error,
    loadAttachments,
    addAttachment,
    removeAttachment,
    clearError,
  } = useAttachmentStore();

  // Dialog state for OCR prompt
  const [ocrPromptVisible, setOcrPromptVisible] = useState(false);
  const [ocrResultVisible, setOcrResultVisible] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrSerialNumber, setOcrSerialNumber] = useState<string | null>(null);
  const [ocrMessage, setOcrMessage] = useState<string>('');
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Load attachments on mount
  useEffect(() => {
    loadAttachments(reportId);
  }, [reportId, loadAttachments]);

  // Show snackbar on store error
  useEffect(() => {
    if (error) {
      setSnackbarMessage(error);
      setSnackbarVisible(true);
      clearError();
    }
  }, [error, clearError]);

  // --- Helper functions ---

  const showError = useCallback((message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }, []);

  const canAddAttachment = attachments.length < MAX_ATTACHMENTS;

  // --- OCR Flow ---

  const handleOcrPromptConfirm = useCallback(async () => {
    setOcrPromptVisible(false);
    if (!pendingImageUri) return;

    setOcrProcessing(true);
    try {
      const result = await recognizeSerialNumber(pendingImageUri);

      if (result.success && result.serialNumber) {
        setOcrSerialNumber(result.serialNumber);
        setOcrMessage(
          result.needsVerification
            ? `Numero riconosciuto (verifica il valore): ${result.serialNumber}`
            : `Numero di serie riconosciuto: ${result.serialNumber}`
        );
        setOcrResultVisible(true);
      } else {
        // OCR failed or no match
        showError(result.message || 'Nessun numero di serie riconosciuto.');
      }
    } catch {
      showError('Errore durante il riconoscimento. Inserisci il numero di serie manualmente.');
    } finally {
      setOcrProcessing(false);
      setPendingImageUri(null);
    }
  }, [pendingImageUri, showError]);

  const handleOcrPromptDismiss = useCallback(() => {
    setOcrPromptVisible(false);
    setPendingImageUri(null);
  }, []);

  const handleOcrAutoFill = useCallback(() => {
    setOcrResultVisible(false);
    if (ocrSerialNumber && onSerialNumberRecognized) {
      onSerialNumberRecognized(ocrSerialNumber);
    }
    setOcrSerialNumber(null);
    setOcrMessage('');
  }, [ocrSerialNumber, onSerialNumberRecognized]);

  const handleOcrResultDismiss = useCallback(() => {
    setOcrResultVisible(false);
    setOcrSerialNumber(null);
    setOcrMessage('');
  }, []);

  // --- Image/Video Picking ---

  const handleImageResult = useCallback(
    async (result: ImagePicker.ImagePickerResult) => {
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const fileSize = asset.fileSize ?? 0;
      const mimeType = asset.mimeType ?? 'image/jpeg';

      // Validate file size
      if (fileSize > MAX_IMAGE_SIZE) {
        showError("L'immagine supera la dimensione massima consentita di 10MB.");
        return;
      }

      // Check attachment limit
      if (!canAddAttachment) {
        showError(`Raggiunto il limite massimo di ${MAX_ATTACHMENTS} allegati.`);
        return;
      }

      // Add the attachment FIRST
      const input: AttachmentInput = {
        uri: asset.uri,
        type: 'image',
        mimeType,
        fileSize,
      };

      const prevAttachmentCount = attachments.length;
      await addAttachment(reportId, input);

      // Only show OCR prompt if the attachment was actually saved
      // (the store sets error internally if it fails, but doesn't throw)
      const currentAttachments = useAttachmentStore.getState().attachments;
      if (currentAttachments.length > prevAttachmentCount) {
        // Attachment saved successfully — prompt for OCR
        setPendingImageUri(asset.uri);
        setOcrPromptVisible(true);
      }
    },
    [reportId, addAttachment, canAddAttachment, showError, attachments.length]
  );

  const handleTakePhoto = useCallback(async () => {
    if (!canAddAttachment) {
      showError(`Raggiunto il limite massimo di ${MAX_ATTACHMENTS} allegati.`);
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      showError('Permesso fotocamera non concesso.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    await handleImageResult(result);
  }, [canAddAttachment, handleImageResult, showError]);

  const handlePickFromGallery = useCallback(async () => {
    if (!canAddAttachment) {
      showError(`Raggiunto il limite massimo di ${MAX_ATTACHMENTS} allegati.`);
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showError('Permesso accesso galleria non concesso.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    await handleImageResult(result);
  }, [canAddAttachment, handleImageResult, showError]);

  const handleRecordVideo = useCallback(async () => {
    if (!canAddAttachment) {
      showError(`Raggiunto il limite massimo di ${MAX_ATTACHMENTS} allegati.`);
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      showError('Permesso fotocamera non concesso.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: MAX_VIDEO_DURATION,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const asset = result.assets[0];
    const fileSize = asset.fileSize ?? 0;
    const mimeType = asset.mimeType ?? 'video/mp4';

    if (fileSize > MAX_VIDEO_SIZE) {
      showError('Il video supera la dimensione massima consentita di 50MB.');
      return;
    }

    const input: AttachmentInput = {
      uri: asset.uri,
      type: 'video',
      mimeType,
      fileSize,
    };
    await addAttachment(reportId, input);
  }, [reportId, addAttachment, canAddAttachment, showError]);

  const handlePickVideo = useCallback(async () => {
    if (!canAddAttachment) {
      showError(`Raggiunto il limite massimo di ${MAX_ATTACHMENTS} allegati.`);
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showError('Permesso accesso galleria non concesso.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: MAX_VIDEO_DURATION,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const asset = result.assets[0];
    const fileSize = asset.fileSize ?? 0;
    const mimeType = asset.mimeType ?? 'video/mp4';

    if (fileSize > MAX_VIDEO_SIZE) {
      showError('Il video supera la dimensione massima consentita di 50MB.');
      return;
    }

    const input: AttachmentInput = {
      uri: asset.uri,
      type: 'video',
      mimeType,
      fileSize,
    };
    await addAttachment(reportId, input);
  }, [reportId, addAttachment, canAddAttachment, showError]);

  // --- Description update ---
  // Note: description is updated in-memory; store would need an updateDescription action
  // For now, we manage local state for descriptions
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize descriptions from loaded attachments
    const descs: Record<string, string> = {};
    for (const att of attachments) {
      descs[att.id] = att.description ?? '';
    }
    setDescriptions(descs);
  }, [attachments]);

  const handleDescriptionChange = useCallback((attachmentId: string, text: string) => {
    if (text.length <= MAX_DESCRIPTION_LENGTH) {
      setDescriptions((prev) => ({ ...prev, [attachmentId]: text }));
    }
  }, []);

  // --- Delete attachment ---

  const handleDelete = useCallback(
    async (attachmentId: string) => {
      await removeAttachment(attachmentId);
    },
    [removeAttachment]
  );

  // --- Render ---

  return (
    <Card style={styles.card}>
      <Card.Title
        title={`Allegati (${attachments.length}/${MAX_ATTACHMENTS})`}
        titleVariant="titleMedium"
      />
      <Card.Content>
        {/* Upload progress */}
        {isUploading && <ProgressBar indeterminate style={styles.progressBar} />}

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            icon="camera"
            onPress={handleTakePhoto}
            disabled={!canAddAttachment || isUploading}
            compact
            style={styles.actionButton}
          >
            Scatta Foto
          </Button>
          <Button
            mode="outlined"
            icon="image"
            onPress={handlePickFromGallery}
            disabled={!canAddAttachment || isUploading}
            compact
            style={styles.actionButton}
          >
            Scegli dalla Galleria
          </Button>
        </View>
        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            icon="video"
            onPress={handleRecordVideo}
            disabled={!canAddAttachment || isUploading}
            compact
            style={styles.actionButton}
          >
            Registra Video
          </Button>
          <Button
            mode="outlined"
            icon="video-image"
            onPress={handlePickVideo}
            disabled={!canAddAttachment || isUploading}
            compact
            style={styles.actionButton}
          >
            Video da Galleria
          </Button>
        </View>

        {/* Attachment list */}
        {attachments.length > 0 && (
          <ScrollView style={styles.attachmentList} nestedScrollEnabled>
            {attachments.map((attachment) => (
              <AttachmentItem
                key={attachment.id}
                attachment={attachment}
                description={descriptions[attachment.id] ?? ''}
                onDescriptionChange={handleDescriptionChange}
                onDelete={handleDelete}
              />
            ))}
          </ScrollView>
        )}
      </Card.Content>

      {/* OCR Prompt Dialog */}
      <Portal>
        <Dialog visible={ocrPromptVisible} onDismiss={handleOcrPromptDismiss}>
          <Dialog.Title>Riconoscimento Numero di Serie</Dialog.Title>
          <Dialog.Content>
            <Text>Riconoscere il numero di serie?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleOcrPromptDismiss}>No</Button>
            <Button onPress={handleOcrPromptConfirm}>Sì</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* OCR Processing Dialog */}
      <Portal>
        <Dialog visible={ocrProcessing} dismissable={false}>
          <Dialog.Title>Riconoscimento in corso...</Dialog.Title>
          <Dialog.Content>
            <ProgressBar indeterminate />
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* OCR Result Dialog */}
      <Portal>
        <Dialog visible={ocrResultVisible} onDismiss={handleOcrResultDismiss}>
          <Dialog.Title>Risultato OCR</Dialog.Title>
          <Dialog.Content>
            <Text>{ocrMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleOcrResultDismiss}>Chiudi</Button>
            <Button mode="contained" onPress={handleOcrAutoFill}>
              Compila automaticamente
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Error Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        action={{ label: 'OK', onPress: () => setSnackbarVisible(false) }}
      >
        {snackbarMessage}
      </Snackbar>
    </Card>
  );
}

// --- AttachmentItem sub-component ---

interface AttachmentItemProps {
  attachment: Attachment;
  description: string;
  onDescriptionChange: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

function AttachmentItem({
  attachment,
  description,
  onDescriptionChange,
  onDelete,
}: AttachmentItemProps) {
  return (
    <View style={styles.attachmentItem}>
      {/* Thumbnail or icon */}
      <View style={styles.thumbnailContainer}>
        {attachment.type === 'image' ? (
          <Image
            source={{ uri: attachment.filePath }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <IconButton icon="video" size={32} style={styles.videoIcon} />
        )}
      </View>

      {/* Description field */}
      <View style={styles.descriptionContainer}>
        <TextInput
          mode="outlined"
          label="Descrizione"
          value={description}
          onChangeText={(text) => onDescriptionChange(attachment.id, text)}
          maxLength={MAX_DESCRIPTION_LENGTH}
          dense
          style={styles.descriptionInput}
          right={
            <TextInput.Affix text={`${description.length}/${MAX_DESCRIPTION_LENGTH}`} />
          }
        />
      </View>

      {/* Delete button */}
      <IconButton
        icon="delete"
        size={24}
        onPress={() => onDelete(attachment.id)}
        style={styles.deleteButton}
      />
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
  },
  progressBar: {
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: 140,
  },
  attachmentList: {
    maxHeight: 400,
    marginTop: 12,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    marginRight: 12,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
  },
  videoIcon: {
    margin: 0,
  },
  descriptionContainer: {
    flex: 1,
    marginRight: 4,
  },
  descriptionInput: {
    fontSize: 14,
  },
  deleteButton: {
    margin: 0,
  },
});

export default AttachmentSection;

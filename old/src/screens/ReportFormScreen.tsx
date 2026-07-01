/**
 * ReportFormScreen - Schermata creazione/modifica rapporto di assistenza.
 *
 * Implementa il form completo con tutti i campi obbligatori e opzionali,
 * calcolo costi in tempo reale, validazione inline, e scroll automatico
 * al primo errore al tentativo di salvataggio.
 * Supporta multipli dispositivi per rapporto e rilevamento GPS.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Divider,
  HelperText,
  RadioButton,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

/** Genera un ID univoco senza dipendere da crypto.getRandomValues */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 12);
}

import { useReportStore } from '../store/report-store';
import { useSettingsStore } from '../store/settings-store';
import { useLocationEstimate } from '../hooks/useLocationEstimate';
import { AttachmentSection } from '../components/AttachmentSection';
import { recognizeSerialNumber } from '../domain/ocr';
import { deviceRepository } from '../data/device-repository';
import { clientRepository } from '../data/client-repository';
import { roundToQuarterHour } from '../domain/geolocation';
import { requestSpeechPermission, startListening, stopListening } from '../utils/speech-to-text';
import type { Client } from '../data/client-repository';
import type { InterventionReason, WarrantyStatus, Device } from '../types/report';

// --- Costanti ---

const WARRANTY_BUTTONS = [
  { value: 'in_warranty', label: 'In Garanzia' },
  { value: 'out_warranty', label: 'Non in Garanzia' },
];

/** Formato data di default: oggi in GG/MM/AAAA */
function getTodayFormatted(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Converte data da GG/MM/AAAA a ISO 8601 (YYYY-MM-DD) */
function dateToISO(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

/** Converte data da ISO 8601 (YYYY-MM-DD) a GG/MM/AAAA */
function dateFromISO(isoStr: string): string {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoStr;
}

/** Formatta ore decimali in formato leggibile (es. 1.5 -> "1h 30min") */
function formatTravelTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// --- Tipo locale dispositivo per stato form ---
interface LocalDevice {
  id: string;
  model: string;
  serialNumber: string;
  productionYear: string;
  warranty: WarrantyStatus | '';
}

function createEmptyLocalDevice(): LocalDevice {
  return {
    id: generateId(),
    model: '',
    serialNumber: '',
    productionYear: '',
    warranty: '',
  };
}

// --- Componente ---

export default function ReportFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id;
  const isEditMode = Boolean(editId);

  // Store
  const {
    formData,
    validationErrors,
    costBreakdown,
    isLoading,
    currentReport,
    initForm,
    updateFormField,
    saveReport,
  } = useReportStore();

  const { operatorName } = useSettingsStore();

  // Dispositivi locali
  const [localDevices, setLocalDevices] = useState<LocalDevice[]>([]);
  const [ocrLoadingDeviceId, setOcrLoadingDeviceId] = useState<string | null>(null);

  // Refs per scroll al primo errore
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldRefs = useRef<Record<string, View | null>>({});

  // Hook per calcolo km/tempo da GPS
  const {
    estimate: locationEstimate,
    isCalculating: isCalculatingLocation,
    interventionCoords,
    error: locationError,
    calculateFromCurrentPosition,
  } = useLocationEstimate();

  // GPS per luogo intervento
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState<string | null>(null);

  // Speech-to-text state
  const [isListening, setIsListening] = useState(false);

  // Client autocomplete state
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inizializzazione form
  useEffect(() => {
    if (isEditMode && editId) {
      const { currentReport } = useReportStore.getState();
      if (currentReport && currentReport.id === editId) {
        initForm(currentReport);
        // Load devices for this report
        deviceRepository.getByReportId(editId).then((devices) => {
          setLocalDevices(
            devices.map((d) => ({
              id: d.id,
              model: d.model ?? '',
              serialNumber: d.serialNumber ?? '',
              productionYear: d.productionYear ?? '',
              warranty: (d.warranty as WarrantyStatus | '') ?? '',
            }))
          );
        });
      } else {
        import('../data/report-repository').then(({ reportRepository }) => {
          reportRepository.getById(editId).then((report) => {
            if (report) {
              initForm(report);
            } else {
              initForm();
            }
          });
        });
        deviceRepository.getByReportId(editId).then((devices) => {
          setLocalDevices(
            devices.map((d) => ({
              id: d.id,
              model: d.model ?? '',
              serialNumber: d.serialNumber ?? '',
              productionYear: d.productionYear ?? '',
              warranty: (d.warranty as WarrantyStatus | '') ?? '',
            }))
          );
        });
      }
    } else {
      initForm();
      // Set default date and operator name for new reports
      // Load settings first to ensure operatorName is available
      useSettingsStore.getState().loadSettings().then(() => {
        const { operatorName: opName } = useSettingsStore.getState();
        updateFormField('interventionDate', dateToISO(getTodayFormatted()));
        updateFormField('performedBy', opName || 'Operatore');
      });
    }
  }, [editId, isEditMode]);

  // Helper: ottieni errore per un campo
  const getFieldError = useCallback(
    (field: string): string | undefined => {
      const error = validationErrors.find((e) => e.field === field);
      return error?.message;
    },
    [validationErrors]
  );

  // Helper: ha errore per un campo
  const hasError = useCallback(
    (field: string): boolean => {
      return validationErrors.some((e) => e.field === field);
    },
    [validationErrors]
  );

  // Scroll al primo errore
  const scrollToFirstError = useCallback(() => {
    if (validationErrors.length === 0) return;

    const firstErrorField = validationErrors[0].field;
    const ref = fieldRefs.current[firstErrorField];
    if (ref && scrollViewRef.current) {
      ref.measureLayout(
        scrollViewRef.current as unknown as View,
        (_x, y) => {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
        },
        () => {}
      );
    }
  }, [validationErrors]);

  // Effetto per scroll al primo errore quando cambiano gli errori di validazione
  useEffect(() => {
    if (validationErrors.length > 0) {
      scrollToFirstError();
    }
  }, [validationErrors, scrollToFirstError]);

  // Handler salvataggio — salva anche i dispositivi
  const handleSave = useCallback(async () => {
    // Ensure performedBy is set from settings before saving
    const { operatorName: opName } = useSettingsStore.getState();
    if (!formData?.performedBy && opName) {
      updateFormField('performedBy', opName);
    }

    // Mark as completed (user clicked save)
    updateFormField('status', 'completed');

    // Small delay to let state update propagate
    await new Promise(resolve => setTimeout(resolve, 50));

    const result = await saveReport(editId);
    if (result) {
      // Salva dispositivi
      const reportId = result.id;
      // Remove existing devices and re-create (simplest approach)
      if (isEditMode && editId) {
        const existingDevices = await deviceRepository.getByReportId(editId);
        for (const d of existingDevices) {
          await deviceRepository.removeDevice(d.id);
        }
      }
      for (const ld of localDevices) {
        if (ld.model || ld.serialNumber || ld.productionYear || ld.warranty) {
          await deviceRepository.addDevice(reportId, {
            model: ld.model || undefined,
            serialNumber: ld.serialNumber || undefined,
            productionYear: ld.productionYear || undefined,
            warranty: (ld.warranty as WarrantyStatus) || undefined,
          });
        }
      }
      router.back();
    }
  }, [editId, formData, saveReport, router, localDevices, isEditMode, updateFormField]);

  // Handler aggiornamento campo numerico
  const handleNumericField = useCallback(
    (field: 'hoursWorked' | 'kilometers', text: string) => {
      if (text === '') {
        updateFormField(field, undefined);
        return;
      }
      const num = parseFloat(text.replace(',', '.'));
      if (!isNaN(num)) {
        updateFormField(field, num);
      }
    },
    [updateFormField]
  );

  // Handler: calcola km e tempo di viaggio da GPS
  const handleCalculateFromGPS = useCallback(async () => {
    const result = await calculateFromCurrentPosition();
    if (result) {
      updateFormField('kilometers', result.distanceKm);
    }
  }, [calculateFromCurrentPosition, updateFormField]);

  // Handler: rileva GPS per luogo intervento
  const handleDetectGpsLocation = useCallback(async () => {
    setIsDetectingGps(true);
    setGpsFeedback(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsFeedback('❌ Permesso GPS negato.');
        setIsDetectingGps(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Platform.OS === 'web' ? Location.Accuracy.Balanced : Location.Accuracy.High,
      });
      const lat = location.coords.latitude;
      const lon = location.coords.longitude;

      // Store coordinates on the form
      updateFormField('interventionLat', lat);
      updateFormField('interventionLon', lon);

      let feedbackMsg = `✅ Posizione rilevata (${lat.toFixed(4)}, ${lon.toFixed(4)})`;

      // Reverse geocode for location name
      try {
        const [geocode] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (geocode) {
          const parts = [geocode.street, geocode.city, geocode.region].filter(Boolean);
          const address = parts.join(', ');
          if (address) {
            updateFormField('interventionLocation', address);
            feedbackMsg = `✅ ${address}`;
          }
        }
      } catch {
        // Reverse geocoding optional
      }

      // Calculate distance from base and auto-fill km
      const { homeCoordinates, getGeolocationConfig } = useSettingsStore.getState();
      if (homeCoordinates) {
        const { estimateTravel } = await import('../domain/geolocation');
        const config = getGeolocationConfig();
        const estimate = await estimateTravel(homeCoordinates, { latitude: lat, longitude: lon }, config);
        updateFormField('kilometers', estimate.distanceKm);
        feedbackMsg += ` — ${estimate.distanceKm} km A/R, ~${formatTravelTime(estimate.travelTimeHours)}`;
      }

      setGpsFeedback(feedbackMsg);
    } catch (e) {
      setGpsFeedback(`❌ Errore: ${e instanceof Error ? e.message : 'impossibile rilevare posizione'}`);
    } finally {
      setIsDetectingGps(false);
    }
  }, [updateFormField]);

  // --- Handlers dispositivi ---
  const handleAddDevice = useCallback(() => {
    setLocalDevices((prev) => [...prev, createEmptyLocalDevice()]);
  }, []);

  // Handler: toggle speech recognition
  const handleToggleSpeech = useCallback(async () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
    } else {
      const granted = await requestSpeechPermission();
      if (!granted) {
        if (Platform.OS === 'web') {
          window.alert('Riconoscimento vocale non disponibile su questo browser.');
        } else {
          Alert.alert('Permesso negato', 'Per usare il riconoscimento vocale è necessario concedere il permesso al microfono.');
        }
        return;
      }
      setIsListening(true);
      startListening({
        onResult: (text, isFinal) => {
          if (isFinal) {
            // Append final transcript to description
            const currentDesc = useReportStore.getState().formData?.description ?? '';
            const separator = currentDesc && !currentDesc.endsWith(' ') ? ' ' : '';
            updateFormField('description', currentDesc + separator + text);
          }
        },
        onError: (error) => {
          console.warn('[Speech] Error:', error);
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        },
      });
    }
  }, [isListening, updateFormField]);

  // Handler: client autocomplete search
  const handleCompanyNameChange = useCallback((text: string) => {
    updateFormField('companyName', text);

    if (suggestionDebounceRef.current) {
      clearTimeout(suggestionDebounceRef.current);
    }

    if (text.trim().length < 2) {
      setClientSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    suggestionDebounceRef.current = setTimeout(async () => {
      try {
        const results = await clientRepository.search(text.trim());
        setClientSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setClientSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);
  }, [updateFormField]);

  // Handler: select client from autocomplete
  const handleSelectClient = useCallback((client: Client) => {
    updateFormField('companyName', client.companyName);
    if (client.address) updateFormField('address', client.address);
    if (client.phone) updateFormField('phone', client.phone);
    setShowSuggestions(false);
    setClientSuggestions([]);
  }, [updateFormField]);

  const handleRemoveDevice = useCallback((deviceId: string) => {
    setLocalDevices((prev) => prev.filter((d) => d.id !== deviceId));
  }, []);

  const handleUpdateDevice = useCallback(
    (deviceId: string, field: keyof LocalDevice, value: string) => {
      setLocalDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, [field]: value } : d))
      );
    },
    []
  );

  // Handler OCR per un dispositivo specifico
  const handleDeviceOcr = useCallback(async (deviceId: string) => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setOcrLoadingDeviceId(deviceId);
      const ocrResult = await recognizeSerialNumber(result.assets[0].uri);

      if (ocrResult.success) {
        setLocalDevices((prev) =>
          prev.map((d) => {
            if (d.id !== deviceId) return d;
            const updated = { ...d };
            if (ocrResult.serialNumber) {
              updated.serialNumber = ocrResult.serialNumber;
            }
            if (ocrResult.model) {
              updated.model = ocrResult.model;
            }
            return updated;
          })
        );

        // Informa l'utente di cosa è stato riconosciuto
        const parts: string[] = [];
        if (ocrResult.model) parts.push(`Modello: ${ocrResult.model}`);
        if (ocrResult.serialNumber) parts.push(`Seriale: ${ocrResult.serialNumber}`);
        if (ocrResult.message) parts.push(ocrResult.message);
        Alert.alert('OCR Completato', parts.join('\n'));
      } else {
        Alert.alert(
          'OCR',
          ocrResult.message || 'Nessun codice riconosciuto. Inserisci i valori manualmente.'
        );
      }
    } catch (err: unknown) {
      // Show error to user instead of silently failing
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      Alert.alert('Errore OCR', `Riconoscimento non riuscito: ${msg}. Inserisci i valori manualmente.`);
    } finally {
      setOcrLoadingDeviceId(null);
    }
  }, []);

  // Data visualizzata nel formato GG/MM/AAAA
  const displayDate = useMemo(() => {
    if (!formData?.interventionDate) return getTodayFormatted();
    return dateFromISO(formData.interventionDate);
  }, [formData?.interventionDate]);

  if (!formData) {
    return null;
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* === SEZIONE: Dati Cliente === */}
      <Card style={styles.card}>
        <Card.Title title="Dati Cliente" titleVariant="titleMedium" />
        <Card.Content>
          {/* Ragione Sociale (obbligatorio) con autocomplete */}
          <View ref={(ref) => { fieldRefs.current['companyName'] = ref; }}>
            <TextInput
              label="Ragione Sociale *"
              value={formData.companyName}
              onChangeText={handleCompanyNameChange}
              onFocus={() => {
                if (clientSuggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                // Delay to allow press on suggestion
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              mode="outlined"
              error={hasError('companyName')}
              style={styles.input}
            />
            <HelperText type="error" visible={hasError('companyName')}>
              {getFieldError('companyName')}
            </HelperText>
            {showSuggestions && clientSuggestions.length > 0 && (
              <Surface style={styles.suggestionsContainer} elevation={3}>
                <FlatList
                  data={clientSuggestions}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  style={styles.suggestionsList}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.suggestionItem}
                      onPress={() => handleSelectClient(item)}
                    >
                      <Text variant="bodyMedium" style={styles.suggestionName}>
                        {item.companyName}
                      </Text>
                      {item.address && (
                        <Text variant="bodySmall" style={styles.suggestionDetail}>
                          {item.address}
                        </Text>
                      )}
                    </Pressable>
                  )}
                />
              </Surface>
            )}
          </View>

          {/* Indirizzo (opzionale) */}
          <TextInput
            label="Indirizzo"
            value={formData.address ?? ''}
            onChangeText={(text) => updateFormField('address', text)}
            mode="outlined"
            style={styles.input}
          />

          {/* Telefono (opzionale) */}
          <TextInput
            label="Telefono"
            value={formData.phone ?? ''}
            onChangeText={(text) => updateFormField('phone', text)}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* === SEZIONE: Dettagli Intervento === */}
      <Card style={styles.card}>
        <Card.Title title="Dettagli Intervento" titleVariant="titleMedium" />
        <Card.Content>
          {/* Data intervento (obbligatorio) */}
          <View ref={(ref) => { fieldRefs.current['interventionDate'] = ref; }}>
            <TextInput
              label="Data Intervento * (GG/MM/AAAA)"
              value={displayDate}
              onChangeText={(text) => {
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
                  updateFormField('interventionDate', dateToISO(text));
                } else {
                  updateFormField('interventionDate', dateToISO(text));
                }
              }}
              mode="outlined"
              keyboardType="numeric"
              error={hasError('interventionDate')}
              style={styles.input}
            />
            <HelperText type="error" visible={hasError('interventionDate')}>
              {getFieldError('interventionDate')}
            </HelperText>
          </View>

          {/* Luogo intervento con GPS */}
          <TextInput
            label="Luogo intervento"
            value={formData.interventionLocation ?? ''}
            onChangeText={(text) => updateFormField('interventionLocation', text)}
            mode="outlined"
            style={styles.input}
          />
          <Button
            mode="outlined"
            onPress={handleDetectGpsLocation}
            loading={isDetectingGps}
            disabled={isDetectingGps}
            compact
            style={{ marginBottom: 8, alignSelf: 'flex-start' }}
          >
            📍 Rileva GPS
          </Button>

          {/* Richiesto da (opzionale) */}
          <TextInput
            label="Richiesto da"
            value={formData.requestedBy ?? ''}
            onChangeText={(text) => updateFormField('requestedBy', text)}
            mode="outlined"
            style={styles.input}
          />

          {/* Per conto di (opzionale) */}
          <TextInput
            label="Per conto di"
            value={formData.onBehalfOf ?? ''}
            onChangeText={(text) => updateFormField('onBehalfOf', text)}
            mode="outlined"
            style={styles.input}
          />

          {/* Motivo intervento (radio buttons verticali) */}
          <View style={styles.fieldGroup}>
            <Text variant="labelLarge" style={styles.fieldLabel}>
              Motivo intervento
            </Text>
            <RadioButton.Group
              onValueChange={(value) =>
                updateFormField('interventionReason', value as InterventionReason)
              }
              value={formData.interventionReason ?? ''}
            >
              <RadioButton.Item label="Installazione" value="installation" />
              <RadioButton.Item label="Supervisione" value="supervision" />
              <RadioButton.Item label="Malfunzionamento" value="malfunction" />
              <RadioButton.Item label="Altro" value="other" />
            </RadioButton.Group>
          </View>

          {/* Descrizione (obbligatorio, max 2000 char) */}
          <View ref={(ref) => { fieldRefs.current['description'] = ref; }}>
            <TextInput
              label="Descrizione *"
              value={formData.description}
              onChangeText={(text) => updateFormField('description', text.slice(0, 2000))}
              mode="outlined"
              multiline
              numberOfLines={4}
              maxLength={2000}
              error={hasError('description')}
              style={styles.input}
            />
            <Button
              mode={isListening ? 'contained' : 'outlined'}
              onPress={handleToggleSpeech}
              compact
              style={{ alignSelf: 'flex-start', marginBottom: 8 }}
            >
              {isListening ? '⏹️ Stop' : '🎤 Dettatura'}
            </Button>
            <HelperText type="info" visible={true}>
              {formData.description.length}/2000 caratteri
            </HelperText>
            <HelperText type="error" visible={hasError('description')}>
              {getFieldError('description')}
            </HelperText>
          </View>
        </Card.Content>
      </Card>

      {/* === SEZIONE: Dispositivi === */}
      <Card style={styles.card}>
        <Card.Title title="Dispositivi" titleVariant="titleMedium" />
        <Card.Content>
          {localDevices.map((device, index) => (
            <Surface key={device.id} style={styles.deviceCard} elevation={1}>
              <View style={styles.deviceHeader}>
                <Text variant="titleSmall">Dispositivo {index + 1}</Text>
                <Button
                  mode="text"
                  compact
                  onPress={() => handleRemoveDevice(device.id)}
                  textColor="#d32f2f"
                  accessibilityLabel="Rimuovi dispositivo"
                >
                  🗑️ Rimuovi
                </Button>
              </View>

              <TextInput
                label="Modello"
                value={device.model}
                onChangeText={(text) => handleUpdateDevice(device.id, 'model', text)}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Numero di serie"
                value={device.serialNumber}
                onChangeText={(text) => handleUpdateDevice(device.id, 'serialNumber', text)}
                mode="outlined"
                style={styles.input}
              />
              <Button
                mode="outlined"
                onPress={() => handleDeviceOcr(device.id)}
                disabled={ocrLoadingDeviceId === device.id}
                loading={ocrLoadingDeviceId === device.id}
                compact
                style={{ marginBottom: 8, alignSelf: 'flex-start' }}
              >
                📷 OCR
              </Button>

              <TextInput
                label="Anno produzione"
                value={device.productionYear}
                onChangeText={(text) => handleUpdateDevice(device.id, 'productionYear', text)}
                mode="outlined"
                keyboardType="numeric"
                maxLength={4}
                style={styles.input}
              />

              <View style={styles.fieldGroup}>
                <Text variant="labelMedium" style={styles.fieldLabel}>
                  Garanzia
                </Text>
                <SegmentedButtons
                  value={device.warranty}
                  onValueChange={(value) => handleUpdateDevice(device.id, 'warranty', value)}
                  buttons={WARRANTY_BUTTONS}
                  style={styles.segmentedButtons}
                />
              </View>
            </Surface>
          ))}

          <Button
            mode="outlined"
            icon="plus"
            onPress={handleAddDevice}
            style={styles.addDeviceButton}
          >
            Aggiungi dispositivo
          </Button>
        </Card.Content>
      </Card>

      {/* === SEZIONE: Costi === */}
      <Card style={styles.card}>
        <Card.Title title="Costi" titleVariant="titleMedium" />
        <Card.Content>
          {/* Ore lavorate (obbligatorio, incrementi 0.25) */}
          <View ref={(ref) => { fieldRefs.current['hoursWorked'] = ref; }}>
            <TextInput
              label="Ore lavorate * (incrementi 0.25)"
              value={formData.hoursWorked != null ? String(formData.hoursWorked) : ''}
              onChangeText={(text) => handleNumericField('hoursWorked', text)}
              mode="outlined"
              keyboardType="decimal-pad"
              error={hasError('hoursWorked')}
              style={styles.input}
            />
            <HelperText type="error" visible={hasError('hoursWorked')}>
              {getFieldError('hoursWorked')}
            </HelperText>
          </View>

          {/* Km (opzionale) — con calcolo GPS */}
          <View ref={(ref) => { fieldRefs.current['kilometers'] = ref; }}>
            <TextInput
              label="Km (andata e ritorno)"
              value={formData.kilometers != null ? String(formData.kilometers) : ''}
              onChangeText={(text) => handleNumericField('kilometers', text)}
              mode="outlined"
              keyboardType="decimal-pad"
              error={hasError('kilometers')}
              style={styles.input}
            />
            <HelperText type="error" visible={hasError('kilometers')}>
              {getFieldError('kilometers')}
            </HelperText>

            <Button
              mode="outlined"
              onPress={handleCalculateFromGPS}
              loading={isCalculatingLocation}
              disabled={isCalculatingLocation}
              icon="map-marker-distance"
              compact
              style={styles.gpsButton}
            >
              Calcola km da GPS
            </Button>

            {locationError && (
              <HelperText type="error" visible={true}>
                {locationError}
              </HelperText>
            )}

            {locationEstimate && (
              <Surface style={styles.estimateSurface} elevation={1}>
                <Text variant="bodySmall" style={styles.estimateText}>
                  📍 Distanza A/R: {locationEstimate.distanceKm} km
                </Text>
                <Text variant="bodySmall" style={styles.estimateText}>
                  🕐 Tempo viaggio A/R stimato: {formatTravelTime(locationEstimate.travelTimeHours)}
                </Text>
                <Text variant="labelSmall" style={styles.estimateSource}>
                  {locationEstimate.source === 'routing_api'
                    ? 'Calcolato via routing stradale'
                    : 'Stima offline (linea d\'aria + fattore correttivo)'}
                </Text>
              </Surface>
            )}
          </View>

          {/* Breakdown costi in tempo reale */}
          <Surface style={styles.costSurface} elevation={1}>
            <Text variant="titleSmall" style={styles.costTitle}>
              Riepilogo Costi
            </Text>
            <View style={styles.costRow}>
              <Text variant="bodyMedium">Costo orario</Text>
              <Text variant="bodyMedium">
                € {costBreakdown?.hourlyTotal?.toFixed(2) ?? '0.00'}
              </Text>
            </View>
            <View style={styles.costRow}>
              <Text variant="bodyMedium">Costo km</Text>
              <Text variant="bodyMedium">
                € {costBreakdown?.kilometerTotal?.toFixed(2) ?? '0.00'}
              </Text>
            </View>
            <Divider style={styles.costDivider} />
            <View style={styles.costRow}>
              <Text variant="titleMedium" style={styles.totalLabel}>
                Totale
              </Text>
              <Text variant="titleMedium" style={styles.totalValue}>
                € {costBreakdown?.grandTotal?.toFixed(2) ?? '0.00'}
              </Text>
            </View>
          </Surface>
        </Card.Content>
      </Card>

      {/* === SEZIONE: Note === */}
      <Card style={styles.card}>
        <Card.Title title="Note" titleVariant="titleMedium" />
        <Card.Content>
          <TextInput
            label="Note"
            value={formData.notes ?? ''}
            onChangeText={(text) => updateFormField('notes', text.slice(0, 2000))}
            mode="outlined"
            multiline
            numberOfLines={3}
            maxLength={2000}
            style={styles.input}
          />
          <HelperText type="info" visible={true}>
            {(formData.notes ?? '').length}/2000 caratteri
          </HelperText>
        </Card.Content>
      </Card>

      {/* === SEZIONE: Allegati (foto, video, OCR) === */}
      {isEditMode && editId ? (
        <AttachmentSection
          reportId={editId}
          onSerialNumberRecognized={(serialNumber) => {
            updateFormField('serialNumber', serialNumber);
          }}
        />
      ) : (
        <Card style={styles.card}>
          <Card.Title title="Allegati" titleVariant="titleMedium" />
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: '#666', fontStyle: 'italic' }}>
              Salva il rapporto per poter aggiungere foto e video.
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* === Pulsante Salva === */}
      <Button
        mode="contained"
        onPress={handleSave}
        loading={isLoading}
        disabled={isLoading}
        style={styles.saveButton}
        contentStyle={styles.saveButtonContent}
      >
        {isEditMode ? 'Aggiorna Rapporto' : 'Salva Rapporto'}
      </Button>

      {/* Spacing finale */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// --- Stili ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 4,
  },
  fieldGroup: {
    marginVertical: 12,
  },
  fieldLabel: {
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 4,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInput: {
    flex: 1,
  },
  gpsIconButton: {
    marginLeft: 4,
    marginBottom: 4,
  },
  serialRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serialInput: {
    flex: 1,
  },
  ocrIconButton: {
    marginLeft: 4,
    marginBottom: 4,
  },
  deviceCard: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addDeviceButton: {
    marginTop: 8,
  },

  costSurface: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  costTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  costDivider: {
    marginVertical: 8,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalValue: {
    fontWeight: 'bold',
    color: '#1976D2',
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  gpsButton: {
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  estimateSurface: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
    marginBottom: 8,
  },
  estimateText: {
    marginBottom: 4,
  },
  estimateSource: {
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  bottomSpacer: {
    height: 32,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 999,
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 200,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionName: {
    fontWeight: '600',
  },
  suggestionDetail: {
    color: '#666',
    marginTop: 2,
  },
});

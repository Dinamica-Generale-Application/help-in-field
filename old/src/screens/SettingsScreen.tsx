/**
 * SettingsScreen - Schermata impostazioni dell'app.
 *
 * Permette di configurare:
 * - Nome operatore (precompila "eseguito da")
 * - Posizione di partenza fissa (sede/officina) tramite GPS o inserimento manuale
 * - Chiave API OpenRouteService (opzionale)
 * - Parametri stima offline (fattore correttivo, velocità media)
 * - Import clienti CSV
 * - Backup/Ripristino
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Divider,
  HelperText,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import * as Location from 'expo-location';
import { useSettingsStore } from '../store/settings-store';
import { exportBackup, importBackup } from '../utils/backup';
import { importClientsFromCsv } from '../data/client-repository';
import type { Coordinates } from '../domain/geolocation';

function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function SettingsScreen() {
  const {
    homeCoordinates,
    homeAddress,
    operatorName,
    openRouteServiceApiKey,
    roadFactor,
    averageSpeedKmh,
    isLoaded,
    loadSettings,
    setHomeLocation,
    setOperatorName,
    setApiKey,
    setRoadFactor,
    setAverageSpeed,
  } = useSettingsStore();

  // Stato locale per i campi di input
  const [operatorInput, setOperatorInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [roadFactorInput, setRoadFactorInput] = useState('');
  const [speedInput, setSpeedInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  // Caricamento iniziale
  useEffect(() => {
    loadSettings();
  }, []);

  // Sincronizza input locali con store caricato
  useEffect(() => {
    if (isLoaded) {
      setOperatorInput(operatorName);
      setAddressInput(homeAddress);
      setLatInput(homeCoordinates?.latitude?.toString() ?? '');
      setLonInput(homeCoordinates?.longitude?.toString() ?? '');
      setApiKeyInput(openRouteServiceApiKey);
      setRoadFactorInput(roadFactor.toString());
      setSpeedInput(averageSpeedKmh.toString());
    }
  }, [isLoaded]);

  // --- Handlers ---

  const handleSaveOperator = useCallback(async () => {
    await setOperatorName(operatorInput.trim());
    setSnackbar('Nome operatore salvato.');
  }, [operatorInput, setOperatorName]);

  const handleDetectLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permesso negato', 'Per rilevare la posizione è necessario concedere il permesso GPS.');
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords: Coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setLatInput(coords.latitude.toString());
      setLonInput(coords.longitude.toString());

      // Reverse geocoding
      try {
        const [geocode] = await Location.reverseGeocodeAsync(coords);
        if (geocode) {
          const parts = [geocode.street, geocode.city, geocode.region].filter(Boolean);
          setAddressInput(parts.join(', '));
        }
      } catch {
        // opzionale
      }
    } catch {
      showAlert('Errore', 'Impossibile rilevare la posizione GPS.');
    }
    setIsLocating(false);
  }, []);

  const handleSaveLocation = useCallback(async () => {
    const lat = parseFloat(latInput.replace(',', '.'));
    const lon = parseFloat(lonInput.replace(',', '.'));

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      showAlert('Errore', 'Coordinate non valide. Latitudine: -90/+90, Longitudine: -180/+180.');
      return;
    }

    await setHomeLocation({ latitude: lat, longitude: lon }, addressInput);
    setSnackbar('Posizione di partenza salvata.');
  }, [latInput, lonInput, addressInput, setHomeLocation]);

  const handleSaveApiKey = useCallback(async () => {
    await setApiKey(apiKeyInput.trim());
    setSnackbar('Chiave API salvata.');
  }, [apiKeyInput, setApiKey]);

  const handleSaveEstimateParams = useCallback(async () => {
    const factor = parseFloat(roadFactorInput.replace(',', '.'));
    const speed = parseFloat(speedInput.replace(',', '.'));

    if (isNaN(factor) || factor < 1 || factor > 3) {
      showAlert('Errore', 'Il fattore correttivo deve essere tra 1.0 e 3.0.');
      return;
    }
    if (isNaN(speed) || speed < 10 || speed > 130) {
      showAlert('Errore', 'La velocità media deve essere tra 10 e 130 km/h.');
      return;
    }

    await setRoadFactor(factor);
    await setAverageSpeed(speed);
    setSnackbar('Parametri di stima salvati.');
  }, [roadFactorInput, speedInput, setRoadFactor, setAverageSpeed]);

  const handleExportBackup = useCallback(async () => {
    try {
      await exportBackup();
      setSnackbar('Backup esportato.');
    } catch (e) {
      showAlert('Errore', e instanceof Error ? e.message : 'Errore durante il backup.');
    }
  }, []);

  const handleImportBackup = useCallback(async () => {
    try {
      const count = await importBackup();
      if (count > 0) {
        setSnackbar(`Importati ${count} rapporti.`);
      } else {
        setSnackbar('Nessun nuovo rapporto da importare.');
      }
    } catch (e) {
      showAlert('Errore', e instanceof Error ? e.message : 'Errore durante il ripristino.');
    }
  }, []);

  const handleImportCsv = useCallback(async () => {
    try {
      const count = await importClientsFromCsv();
      if (count > 0) {
        setSnackbar(`Importati ${count} clienti.`);
      } else {
        setSnackbar('Nessun nuovo cliente da importare.');
      }
    } catch (e) {
      showAlert('Errore', e instanceof Error ? e.message : "Errore durante l'importazione CSV.");
    }
  }, []);

  if (!isLoaded) {
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* === Nome Operatore === */}
      <Card style={styles.card}>
        <Card.Title
          title="Operatore"
          subtitle="Precompila il campo 'Intervento eseguito da'"
          titleVariant="titleMedium"
        />
        <Card.Content>
          <TextInput
            label="Nome operatore"
            value={operatorInput}
            onChangeText={setOperatorInput}
            mode="outlined"
            style={styles.input}
          />
          <Button mode="contained" onPress={handleSaveOperator} icon="content-save" style={styles.saveButton}>
            Salva
          </Button>
        </Card.Content>
      </Card>

      {/* === Posizione di partenza === */}
      <Card style={styles.card}>
        <Card.Title
          title="Posizione di Partenza"
          subtitle="Sede/officina — per calcolo km automatico"
          titleVariant="titleMedium"
        />
        <Card.Content>
          <TextInput
            label="Indirizzo (descrittivo)"
            value={addressInput}
            onChangeText={setAddressInput}
            mode="outlined"
            style={styles.input}
          />
          <View style={styles.row}>
            <TextInput
              label="Latitudine"
              value={latInput}
              onChangeText={setLatInput}
              mode="outlined"
              keyboardType="decimal-pad"
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              label="Longitudine"
              value={lonInput}
              onChangeText={setLonInput}
              mode="outlined"
              keyboardType="decimal-pad"
              style={[styles.input, styles.halfInput]}
            />
          </View>
          <HelperText type="info" visible={true}>
            Usa "Rileva GPS" per impostare dalla posizione corrente.
          </HelperText>
          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={handleDetectLocation}
              loading={isLocating}
              disabled={isLocating}
              icon="crosshairs-gps"
              style={styles.button}
            >
              Rileva GPS
            </Button>
            <Button mode="contained" onPress={handleSaveLocation} icon="content-save" style={styles.button}>
              Salva Posizione
            </Button>
          </View>
          {homeCoordinates && (
            <View style={styles.savedInfo}>
              <Text variant="bodySmall" style={styles.savedLabel}>
                ✅ {homeAddress || 'Posizione salvata'} ({homeCoordinates.latitude.toFixed(4)}, {homeCoordinates.longitude.toFixed(4)})
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* === API Routing === */}
      <Card style={styles.card}>
        <Card.Title
          title="API di Routing (Opzionale)"
          subtitle="Per km e tempo di viaggio più precisi"
          titleVariant="titleMedium"
        />
        <Card.Content>
          <TextInput
            label="Chiave API OpenRouteService"
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />
          <HelperText type="info" visible={true}>
            Gratuita: registrati su openrouteservice.org (2000 req/giorno).
          </HelperText>
          <Button mode="contained" onPress={handleSaveApiKey} icon="content-save" style={styles.saveButton}>
            Salva Chiave API
          </Button>
        </Card.Content>
      </Card>

      {/* === Parametri stima offline === */}
      <Card style={styles.card}>
        <Card.Title
          title="Parametri Stima Offline"
          subtitle="Usati senza API di routing"
          titleVariant="titleMedium"
        />
        <Card.Content>
          <TextInput
            label="Fattore correttivo (1.0 - 3.0)"
            value={roadFactorInput}
            onChangeText={setRoadFactorInput}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <TextInput
            label="Velocità media (km/h)"
            value={speedInput}
            onChangeText={setSpeedInput}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Button mode="contained" onPress={handleSaveEstimateParams} icon="content-save" style={styles.saveButton}>
            Salva Parametri
          </Button>
        </Card.Content>
      </Card>

      {/* === Clienti === */}
      <Card style={styles.card}>
        <Card.Title
          title="Import Clienti"
          subtitle="Importa elenco clienti da file CSV"
          titleVariant="titleMedium"
        />
        <Card.Content>
          <HelperText type="info" visible={true}>
            Formato CSV: nome,indirizzo,telefono (una riga per cliente, prima riga = intestazione).
          </HelperText>
          <Button mode="outlined" onPress={handleImportCsv} icon="file-delimited">
            Importa CSV
          </Button>
        </Card.Content>
      </Card>

      {/* === Backup === */}
      <Card style={styles.card}>
        <Card.Title
          title="Backup e Ripristino"
          subtitle="Esporta/importa tutti i dati come JSON"
          titleVariant="titleMedium"
        />
        <Card.Content>
          <View style={styles.buttonRow}>
            <Button mode="outlined" onPress={handleExportBackup} icon="download" style={styles.button}>
              Esporta Backup
            </Button>
            <Button mode="outlined" onPress={handleImportBackup} icon="upload" style={styles.button}>
              Importa Backup
            </Button>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacer} />

      <Snackbar
        visible={Boolean(snackbar)}
        onDismiss={() => setSnackbar('')}
        duration={3000}
      >
        {snackbar}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { padding: 16 },
  card: { marginBottom: 16 },
  input: { marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  halfInput: { flex: 1 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  button: { flex: 1 },
  saveButton: { marginTop: 8, alignSelf: 'flex-start' },
  savedInfo: { marginTop: 12, padding: 8, backgroundColor: '#e8f5e9', borderRadius: 8 },
  savedLabel: { color: '#2e7d32' },
  bottomSpacer: { height: 32 },
});

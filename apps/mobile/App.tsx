import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  addLocalVital,
  clearSyncedVitals,
  getLocalVitals,
  markVitalSyncFailed,
  markVitalSynced,
} from './src/services/localVitalsStore';
import { syncVitalRecord } from './src/services/syncVitals';
import { TriageLevel, VitalLocalRecord } from './src/types/vitals';

const MAX_EKG_BYTES = 1024 * 1024;
const triageLevels: TriageLevel[] = ['Rojo', 'Amarillo', 'Verde'];

const bytesFromBase64 = (base64?: string) => {
  if (!base64) {
    return 0;
  }
  return Math.ceil((base64.length * 3) / 4);
};

const formatBytes = (bytes: number) => {
  if (!bytes) {
    return '0 KB';
  }
  return `${Math.round(bytes / 1024)} KB`;
};

const triageColor = (triage: TriageLevel) => {
  if (triage === 'Rojo') {
    return '#d92d20';
  }
  if (triage === 'Amarillo') {
    return '#b7791f';
  }
  return '#087f5b';
};

export default function App() {
  const [patientId, setPatientId] = useState('');
  const [ambulanceId, setAmbulanceId] = useState('AMB-001');
  const [heartRate, setHeartRate] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [triage, setTriage] = useState<TriageLevel>('Verde');
  const [notes, setNotes] = useState('');
  const [ekgBase64, setEkgBase64] = useState<string>();
  const [ekgBytes, setEkgBytes] = useState(0);
  const [records, setRecords] = useState<VitalLocalRecord[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const pendingCount = useMemo(
    () => records.filter((record) => !record.synced).length,
    [records],
  );

  const loadRecords = useCallback(async () => {
    setRecords(await getLocalVitals());
  }, []);

  const syncPending = useCallback(async () => {
    if (syncingRef.current) {
      return;
    }

    syncingRef.current = true;
    setIsSyncing(true);

    try {
      let latest = await getLocalVitals();
      const pending = latest.filter((record) => !record.synced);

      for (const record of pending) {
        const result = await syncVitalRecord(record);
        latest = result.ok
          ? await markVitalSynced(record.id, result.serverTimestamp)
          : await markVitalSyncFailed(record.id, result.error ?? 'Sync failed');
      }

      setRecords(latest);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsConnected(online);
      if (online) {
        syncPending();
      }
    });

    return unsubscribe;
  }, [syncPending]);

  const attachEkg = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Se necesita acceso para adjuntar la foto EKG.');
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            base64: true,
            quality: 0.45,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          })
        : await ImagePicker.launchImageLibraryAsync({
            base64: true,
            quality: 0.45,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          });

    if (result.canceled) {
      return;
    }

    const base64 = result.assets[0]?.base64 ?? undefined;
    const size = bytesFromBase64(base64);

    if (!base64) {
      Alert.alert('EKG invalido', 'No fue posible leer la imagen en Base64.');
      return;
    }

    if (size > MAX_EKG_BYTES) {
      Alert.alert(
        'EKG supera 1 MB',
        `La imagen pesa ${formatBytes(size)}. Selecciona una foto mas liviana.`,
      );
      return;
    }

    setEkgBase64(base64);
    setEkgBytes(size);
  };

  const resetForm = () => {
    setPatientId('');
    setHeartRate('');
    setBloodPressure('');
    setTriage('Verde');
    setNotes('');
    setEkgBase64(undefined);
    setEkgBytes(0);
  };

  const submitVital = async () => {
    const parsedHeartRate = Number(heartRate);

    if (!patientId.trim() || !ambulanceId.trim()) {
      Alert.alert('Datos incompletos', 'Ingresa paciente y ambulancia.');
      return;
    }

    if (!Number.isFinite(parsedHeartRate) || parsedHeartRate < 20 || parsedHeartRate > 250) {
      Alert.alert('FC invalida', 'La frecuencia cardiaca debe estar entre 20 y 250.');
      return;
    }

    if (!/^\d{2,3}\/\d{2,3}$/.test(bloodPressure.trim())) {
      Alert.alert('PA invalida', 'Usa el formato 120/80.');
      return;
    }

    const updated = await addLocalVital({
      patientId,
      ambulanceId,
      heartRate: parsedHeartRate,
      bloodPressure,
      triage,
      ekgBase64,
      ekgBytes,
      notes,
    });

    setRecords(updated);
    resetForm();

    if (isConnected) {
      syncPending();
    } else {
      Alert.alert('Guardado offline', 'El registro quedo en cola local para sincronizar.');
    }
  };

  const removeSynced = async () => {
    setRecords(await clearSyncedVitals());
  };

  const renderRecord = ({ item }: { item: VitalLocalRecord }) => (
    <View style={styles.record}>
      <View style={styles.recordHeader}>
        <View>
          <Text style={styles.recordTitle}>{item.patientId}</Text>
          <Text style={styles.recordMeta}>{item.ambulanceId}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: triageColor(item.triage) }]}>
          <Text style={styles.badgeText}>{item.triage}</Text>
        </View>
      </View>
      <View style={styles.recordVitals}>
        <Text style={styles.metric}>FC {item.heartRate}</Text>
        <Text style={styles.metric}>PA {item.bloodPressure}</Text>
        <Text style={styles.metric}>EKG {formatBytes(item.ekgBytes)}</Text>
      </View>
      <Text style={styles.syncState}>
        {item.synced ? 'Sincronizado' : `Pendiente (${item.retryCount} reintentos)`}
      </Text>
      {item.lastError ? <Text style={styles.errorText}>{item.lastError}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View>
              <Text style={styles.appName}>VitalSync Movil</Text>
              <Text style={styles.subtitle}>Registro prehospitalario offline-first</Text>
            </View>
            <View style={[styles.connection, isConnected ? styles.online : styles.offline]}>
              <Text style={styles.connectionText}>
                {isConnected ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{records.length}</Text>
              <Text style={styles.summaryLabel}>Locales</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{pendingCount}</Text>
              <Text style={styles.summaryLabel}>Pendientes</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{isSyncing ? 'Si' : 'No'}</Text>
              <Text style={styles.summaryLabel}>Sync</Text>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Nuevo registro</Text>
            <TextInput
              autoCapitalize="characters"
              onChangeText={setPatientId}
              placeholder="ID paciente"
              placeholderTextColor="#7a869a"
              style={styles.input}
              value={patientId}
            />
            <TextInput
              autoCapitalize="characters"
              onChangeText={setAmbulanceId}
              placeholder="Ambulancia"
              placeholderTextColor="#7a869a"
              style={styles.input}
              value={ambulanceId}
            />
            <View style={styles.inlineInputs}>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setHeartRate}
                placeholder="FC"
                placeholderTextColor="#7a869a"
                style={[styles.input, styles.inlineInput]}
                value={heartRate}
              />
              <TextInput
                keyboardType="numbers-and-punctuation"
                onChangeText={setBloodPressure}
                placeholder="PA 120/80"
                placeholderTextColor="#7a869a"
                style={[styles.input, styles.inlineInput]}
                value={bloodPressure}
              />
            </View>

            <View style={styles.triageRow}>
              {triageLevels.map((level) => (
                <Pressable
                  key={level}
                  onPress={() => setTriage(level)}
                  style={[
                    styles.triageButton,
                    triage === level && {
                      backgroundColor: triageColor(level),
                      borderColor: triageColor(level),
                    },
                  ]}
                >
                  <Text style={[styles.triageText, triage === level && styles.triageTextActive]}>
                    {level}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              multiline
              onChangeText={setNotes}
              placeholder="Notas clinicas opcionales"
              placeholderTextColor="#7a869a"
              style={[styles.input, styles.notes]}
              value={notes}
            />

            <View style={styles.ekgRow}>
              <Pressable style={styles.secondaryButton} onPress={() => attachEkg('library')}>
                <Text style={styles.secondaryButtonText}>Adjuntar EKG</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => attachEkg('camera')}>
                <Text style={styles.secondaryButtonText}>Camara</Text>
              </Pressable>
            </View>
            <Text style={styles.ekgStatus}>
              {ekgBase64 ? `EKG listo: ${formatBytes(ekgBytes)}` : 'EKG opcional, maximo 1 MB'}
            </Text>

            <Pressable style={styles.primaryButton} onPress={submitVital}>
              <Text style={styles.primaryButtonText}>Guardar y sincronizar</Text>
            </Pressable>
          </View>

          <View style={styles.queueHeader}>
            <Text style={styles.sectionTitle}>Cola local vitales_local</Text>
            <View style={styles.queueActions}>
              <Pressable style={styles.smallButton} onPress={syncPending}>
                <Text style={styles.smallButtonText}>Sync</Text>
              </Pressable>
              <Pressable style={styles.smallButton} onPress={removeSynced}>
                <Text style={styles.smallButtonText}>Limpiar</Text>
              </Pressable>
            </View>
          </View>

          <FlatList
            data={records}
            keyExtractor={(item) => item.id}
            renderItem={renderRecord}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyState}>Aun no hay registros locales.</Text>
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f8fb',
  },
  screen: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
    gap: 18,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  appName: {
    color: '#15202b',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#536471',
    fontSize: 14,
    marginTop: 3,
  },
  connection: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  online: {
    backgroundColor: '#d3f9d8',
  },
  offline: {
    backgroundColor: '#ffe3e3',
  },
  connectionText: {
    color: '#15202b',
    fontSize: 12,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryItem: {
    backgroundColor: '#ffffff',
    borderColor: '#d8dee9',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  summaryValue: {
    color: '#0b7285',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    color: '#536471',
    fontSize: 12,
    marginTop: 2,
  },
  formSection: {
    backgroundColor: '#ffffff',
    borderColor: '#d8dee9',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  sectionTitle: {
    color: '#15202b',
    fontSize: 17,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 7,
    borderWidth: 1,
    color: '#15202b',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineInput: {
    flex: 1,
  },
  triageRow: {
    flexDirection: 'row',
    gap: 8,
  },
  triageButton: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  triageText: {
    color: '#15202b',
    fontSize: 13,
    fontWeight: '800',
  },
  triageTextActive: {
    color: '#ffffff',
  },
  notes: {
    minHeight: 76,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  ekgRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#e7f5ff',
    borderColor: '#a5d8ff',
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#0b7285',
    fontSize: 14,
    fontWeight: '800',
  },
  ekgStatus: {
    color: '#536471',
    fontSize: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0b7285',
    borderRadius: 7,
    minHeight: 50,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  queueHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  queueActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: '#15202b',
    fontSize: 12,
    fontWeight: '800',
  },
  record: {
    backgroundColor: '#ffffff',
    borderColor: '#d8dee9',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  recordHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  recordTitle: {
    color: '#15202b',
    fontSize: 16,
    fontWeight: '800',
  },
  recordMeta: {
    color: '#536471',
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  recordVitals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metric: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  syncState: {
    color: '#0b7285',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
  errorText: {
    color: '#d92d20',
    fontSize: 12,
    marginTop: 6,
  },
  emptyState: {
    color: '#536471',
    fontSize: 14,
    paddingVertical: 18,
    textAlign: 'center',
  },
});

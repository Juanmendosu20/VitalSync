import AsyncStorage from '@react-native-async-storage/async-storage';

import { VitalDraft, VitalLocalRecord } from '../types/vitals';

const VITALS_KEY = '@vitalsync/vitales_local';

const nowIso = () => new Date().toISOString();

const createId = () =>
  `vital_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export async function getLocalVitals(): Promise<VitalLocalRecord[]> {
  const raw = await AsyncStorage.getItem(VITALS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as VitalLocalRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveLocalVitals(records: VitalLocalRecord[]) {
  const ordered = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await AsyncStorage.setItem(VITALS_KEY, JSON.stringify(ordered));
  return ordered;
}

export async function addLocalVital(draft: VitalDraft): Promise<VitalLocalRecord[]> {
  const timestamp = nowIso();
  const current = await getLocalVitals();
  const record: VitalLocalRecord = {
    id: createId(),
    patientId: draft.patientId.trim(),
    ambulanceId: draft.ambulanceId.trim(),
    heartRate: draft.heartRate,
    bloodPressure: draft.bloodPressure.trim(),
    triage: draft.triage,
    ekgBase64: draft.ekgBase64,
    ekgBytes: draft.ekgBytes,
    notes: draft.notes?.trim(),
    synced: false,
    retryCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return saveLocalVitals([record, ...current]);
}

export async function markVitalSynced(
  id: string,
  serverTimestamp?: string,
): Promise<VitalLocalRecord[]> {
  const current = await getLocalVitals();
  return saveLocalVitals(
    current.map((record) =>
      record.id === id
        ? {
            ...record,
            synced: true,
            syncedAt: nowIso(),
            serverTimestamp,
            lastError: undefined,
          }
        : record,
    ),
  );
}

export async function markVitalSyncFailed(
  id: string,
  error: string,
): Promise<VitalLocalRecord[]> {
  const current = await getLocalVitals();
  return saveLocalVitals(
    current.map((record) =>
      record.id === id
        ? {
            ...record,
            retryCount: record.retryCount + 1,
            lastError: error,
          }
        : record,
    ),
  );
}

export async function clearSyncedVitals(): Promise<VitalLocalRecord[]> {
  const current = await getLocalVitals();
  return saveLocalVitals(current.filter((record) => !record.synced));
}

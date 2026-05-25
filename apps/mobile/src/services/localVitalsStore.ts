import { Q } from '@nozbe/watermelondb';
import { RawRecord } from '@nozbe/watermelondb/RawRecord';

import { localVitalsCollection } from '../database';
import { LocalVital } from '../database/models/LocalVital';
import { VitalDraft, VitalLocalRecord, TriageLevel } from '../types/vitals';

const nowMs = () => Date.now();
const toIso = (timestamp?: number | null) =>
  timestamp ? new Date(timestamp).toISOString() : undefined;

type LocalVitalRaw = RawRecord & {
  patient_id: string;
  ambulance_id: string;
  heart_rate: number;
  blood_pressure: string;
  triage: TriageLevel;
  ekg_base64?: string | null;
  ekg_bytes: number;
  notes?: string | null;
  synced: boolean;
  retry_count: number;
  created_at: number;
  updated_at: number;
  synced_at?: number | null;
  server_timestamp?: string | null;
  last_error?: string | null;
};

function toRecord(model: LocalVital): VitalLocalRecord {
  const raw = model._raw as LocalVitalRaw;

  return {
    id: model.id,
    patientId: raw.patient_id,
    ambulanceId: raw.ambulance_id,
    heartRate: raw.heart_rate,
    bloodPressure: raw.blood_pressure,
    triage: raw.triage,
    ekgBase64: raw.ekg_base64 ?? undefined,
    ekgBytes: raw.ekg_bytes,
    notes: raw.notes ?? undefined,
    synced: raw.synced,
    retryCount: raw.retry_count,
    createdAt: toIso(raw.created_at) ?? new Date(0).toISOString(),
    updatedAt: toIso(raw.updated_at) ?? new Date(0).toISOString(),
    syncedAt: toIso(raw.synced_at),
    serverTimestamp: raw.server_timestamp ?? undefined,
    lastError: raw.last_error ?? undefined,
  };
}

function assignRaw(model: LocalVital, patch: Partial<LocalVitalRaw>) {
  Object.entries(patch).forEach(([key, value]) => {
    model._setRaw(key as never, value ?? null);
  });
}

export async function getLocalVitals(): Promise<VitalLocalRecord[]> {
  const records = await localVitalsCollection
    .query(Q.sortBy('created_at', Q.desc))
    .fetch();

  return records.map(toRecord);
}

export async function addLocalVital(draft: VitalDraft): Promise<VitalLocalRecord[]> {
  const timestamp = nowMs();

  await localVitalsCollection.database.write(async () => {
    await localVitalsCollection.create((record) => {
      assignRaw(record, {
        patient_id: draft.patientId.trim(),
        ambulance_id: draft.ambulanceId.trim(),
        heart_rate: draft.heartRate,
        blood_pressure: draft.bloodPressure.trim(),
        triage: draft.triage,
        ekg_base64: draft.ekgBase64 ?? null,
        ekg_bytes: draft.ekgBytes,
        notes: draft.notes?.trim() || null,
        synced: false,
        retry_count: 0,
        created_at: timestamp,
        updated_at: timestamp,
      });
    });
  });

  return getLocalVitals();
}

export async function markVitalSynced(
  id: string,
  serverTimestamp?: string,
): Promise<VitalLocalRecord[]> {
  await localVitalsCollection.database.write(async () => {
    const record = await localVitalsCollection.find(id);

    await record.update((model) => {
      assignRaw(model, {
        synced: true,
        synced_at: nowMs(),
        server_timestamp: serverTimestamp ?? null,
        last_error: null,
      });
    });
  });

  return getLocalVitals();
}

export async function markVitalSyncFailed(
  id: string,
  error: string,
): Promise<VitalLocalRecord[]> {
  await localVitalsCollection.database.write(async () => {
    const record = await localVitalsCollection.find(id);
    const raw = record._raw as LocalVitalRaw;

    await record.update((model) => {
      assignRaw(model, {
        retry_count: raw.retry_count + 1,
        last_error: error,
      });
    });
  });

  return getLocalVitals();
}

export async function clearSyncedVitals(): Promise<VitalLocalRecord[]> {
  await localVitalsCollection.database.write(async () => {
    const syncedRecords = await localVitalsCollection
      .query(Q.where('synced', true))
      .fetch();

    await Promise.all(syncedRecords.map((record) => record.markAsDeleted()));
  });

  return getLocalVitals();
}

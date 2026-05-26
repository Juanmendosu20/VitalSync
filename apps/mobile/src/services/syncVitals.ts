import { SyncResult, VitalLocalRecord } from '../types/vitals';
import * as Crypto from 'expo-crypto';

type SyncMode = 'mock' | 'edge' | 'supabase';

const edgeEndpoint = process.env.EXPO_PUBLIC_INGEST_VITALS_URL;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const hospitalId = process.env.EXPO_PUBLIC_HOSPITAL_ID ?? 'HSV-001';
const hashSalt = process.env.EXPO_PUBLIC_PATIENT_HASH_SALT ?? 'vitalsync-demo-salt';
const smsAlertEndpoint = process.env.EXPO_PUBLIC_SMS_ALERT_URL;
const enableHisQueue = process.env.EXPO_PUBLIC_ENABLE_HIS_QUEUE !== 'false';

function getSyncMode(): SyncMode {
  const configuredMode = process.env.EXPO_PUBLIC_SYNC_MODE as SyncMode | undefined;

  if (configuredMode === 'edge' || configuredMode === 'supabase' || configuredMode === 'mock') {
    return configuredMode;
  }

  if (supabaseUrl && supabaseAnonKey) {
    return 'supabase';
  }

  // Compatibility with the first Expo prototype.
  return process.env.EXPO_PUBLIC_USE_MOCK_SYNC === 'false' ? 'edge' : 'mock';
}

async function createPatientHash(patientId: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${patientId}:${hashSalt}`,
  );
}

function normalizeTriage(triage: VitalLocalRecord['triage']) {
  return triage.toUpperCase();
}

function getSmsAlertEndpoint() {
  if (smsAlertEndpoint) {
    return smsAlertEndpoint;
  }

  if (!supabaseUrl) {
    return undefined;
  }

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/sms-alert`;
}

function toIngestPayload(record: VitalLocalRecord) {
  return {
    event_type: 'vital_signs_submitted',
    patient_id: record.patientId,
    ambulance_id: record.ambulanceId,
    fc: record.heartRate,
    pa: record.bloodPressure,
    triage: record.triage,
    ekg_base64: record.ekgBase64,
    ekg_bytes: record.ekgBytes,
    notes: record.notes,
    hospital_id: hospitalId,
    client_record_id: record.id,
    client_created_at: record.createdAt,
    client_updated_at: record.updatedAt,
  };
}

export async function syncVitalRecord(record: VitalLocalRecord): Promise<SyncResult> {
  const syncMode = getSyncMode();

  if (syncMode === 'mock') {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return {
      ok: true,
      serverTimestamp: new Date().toISOString(),
    };
  }

  if (syncMode === 'supabase') {
    return syncVitalViaSupabase(record);
  }

  return syncVitalViaEdgeFunction(record);
}

async function syncVitalViaEdgeFunction(record: VitalLocalRecord): Promise<SyncResult> {
  if (!edgeEndpoint) {
    return {
      ok: false,
      error: 'Missing EXPO_PUBLIC_INGEST_VITALS_URL',
    };
  }

  try {
    const response = await fetch(edgeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toIngestPayload(record)),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        error: `HTTP ${response.status}: ${text || response.statusText}`,
      };
    }

    const body = (await response.json().catch(() => ({}))) as {
      server_timestamp?: string;
      serverTimestamp?: string;
    };

    return {
      ok: true,
      serverTimestamp: body.server_timestamp ?? body.serverTimestamp ?? new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown sync error',
    };
  }
}

async function syncVitalViaSupabase(record: VitalLocalRecord): Promise<SyncResult> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      error: 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY',
    };
  }

  const patientHash = await createPatientHash(record.patientId);
  const apiBase = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const patientResponse = await fetch(`${apiBase}/pacientes_dim?on_conflict=patient_hash`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        patient_hash: patientHash,
        hospital_id: hospitalId,
      }),
    });

    if (!patientResponse.ok) {
      const text = await patientResponse.text();
      return {
        ok: false,
        error: `pacientes_dim HTTP ${patientResponse.status}: ${text || patientResponse.statusText}`,
      };
    }

    const vitalResponse = await fetch(`${apiBase}/vitales`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        ambulancia_id: record.ambulanceId,
        patient_hash: patientHash,
        hospital_id: hospitalId,
        frecuencia_cardiaca: record.heartRate,
        presion_arterial: record.bloodPressure,
        triage: normalizeTriage(record.triage),
        ekg_url: record.ekgBase64
          ? `data:image/jpeg;base64,${record.ekgBase64}`
          : null,
      }),
    });

    if (!vitalResponse.ok) {
      const text = await vitalResponse.text();
      return {
        ok: false,
        error: `vitales HTTP ${vitalResponse.status}: ${text || vitalResponse.statusText}`,
      };
    }

    const body = (await vitalResponse.json().catch(() => [])) as Array<{
      id?: string;
      created_at?: string;
    }>;

    await Promise.all([
      notifyRedTriage(patientHash, normalizeTriage(record.triage)),
      enqueueHisSummary(apiBase, headers, record, patientHash, body[0]?.id),
    ]);

    return {
      ok: true,
      serverTimestamp: body[0]?.created_at ?? new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown Supabase sync error',
    };
  }
}

async function notifyRedTriage(patientHash: string, triage: string) {
  const endpoint = getSmsAlertEndpoint();

  if (triage !== 'ROJO' || !endpoint || !supabaseAnonKey) {
    return;
  }

  await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      patient_hash: patientHash,
      hospital_id: hospitalId,
      triage,
    }),
  }).catch(() => undefined);
}

async function enqueueHisSummary(
  apiBase: string,
  headers: Record<string, string>,
  record: VitalLocalRecord,
  patientHash: string,
  vitalRecordId?: string,
) {
  if (!enableHisQueue) {
    return;
  }

  await fetch(`${apiBase}/his_queue`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      patient_hash: patientHash,
      hospital_id: hospitalId,
      sent: false,
      attempts: 0,
      status: 'pending',
      payload: {
        source: 'mobile',
        vital_record_id: vitalRecordId,
        client_record_id: record.id,
        ambulance_id: record.ambulanceId,
        frecuencia_cardiaca: record.heartRate,
        presion_arterial: record.bloodPressure,
        triage: normalizeTriage(record.triage),
        ekg_bytes: record.ekgBytes,
        notes: record.notes,
        client_created_at: record.createdAt,
        client_updated_at: record.updatedAt,
      },
    }),
  }).catch(() => undefined);
}

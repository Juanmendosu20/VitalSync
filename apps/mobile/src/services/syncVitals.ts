import { SyncResult, VitalLocalRecord } from '../types/vitals';

const endpoint = process.env.EXPO_PUBLIC_INGEST_VITALS_URL;
const mockSync = process.env.EXPO_PUBLIC_USE_MOCK_SYNC !== 'false';

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
    client_record_id: record.id,
    client_created_at: record.createdAt,
    client_updated_at: record.updatedAt,
  };
}

export async function syncVitalRecord(record: VitalLocalRecord): Promise<SyncResult> {
  if (mockSync || !endpoint) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return {
      ok: true,
      serverTimestamp: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch(endpoint, {
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

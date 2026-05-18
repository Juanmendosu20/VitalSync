export type TriageLevel = 'Rojo' | 'Amarillo' | 'Verde';

export type VitalLocalRecord = {
  id: string;
  patientId: string;
  ambulanceId: string;
  heartRate: number;
  bloodPressure: string;
  triage: TriageLevel;
  ekgBase64?: string;
  ekgBytes: number;
  notes?: string;
  synced: boolean;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  serverTimestamp?: string;
  lastError?: string;
};

export type VitalDraft = {
  patientId: string;
  ambulanceId: string;
  heartRate: number;
  bloodPressure: string;
  triage: TriageLevel;
  ekgBase64?: string;
  ekgBytes: number;
  notes?: string;
};

export type SyncResult = {
  ok: boolean;
  serverTimestamp?: string;
  error?: string;
};

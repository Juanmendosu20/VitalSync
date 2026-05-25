import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const vitalSyncSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'vitales_local',
      columns: [
        { name: 'patient_id', type: 'string' },
        { name: 'ambulance_id', type: 'string' },
        { name: 'heart_rate', type: 'number' },
        { name: 'blood_pressure', type: 'string' },
        { name: 'triage', type: 'string' },
        { name: 'ekg_base64', type: 'string', isOptional: true },
        { name: 'ekg_bytes', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'server_timestamp', type: 'string', isOptional: true },
        { name: 'last_error', type: 'string', isOptional: true },
      ],
    }),
  ],
});

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { LocalVital } from './models/LocalVital';
import { vitalSyncSchema } from './schema';

const adapter = new SQLiteAdapter({
  schema: vitalSyncSchema,
  dbName: 'vitalsync_mobile',
  jsi: false,
  onSetUpError: (error) => {
    console.error('[WatermelonDB] setup error', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [LocalVital],
});

export const localVitalsCollection = database.get<LocalVital>('vitales_local');

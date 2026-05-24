# VitalSync Movil

App Expo para la Persona 3 del proyecto VitalSync. Implementa el flujo offline-first del ADR-002: los signos vitales se guardan primero en una cola local `vitales_local` y luego se sincronizan automaticamente cuando hay conexion.

## Funcionalidad incluida

- Formulario para FC, PA, Triage, ambulancia, paciente y notas clinicas.
- Adjuntar foto EKG en Base64 desde galeria o camara, con limite de 1 MB.
- Persistencia local con campo `synced: boolean`, `retryCount`, timestamps y errores.
- Deteccion de conexion con NetInfo.
- Sincronizacion automatica en tres modos: `mock`, `supabase` directo o `edge` contra `ingest-vitals`.
- Payload compatible con el contrato del documento: `patient_id`, `fc`, `pa`, `triage`, `ekg_base64`, `client_updated_at`.

## Ejecutar

```bash
cd apps/mobile
npm install
npm start
```

Para Android con Expo:

```bash
npm run android
```

## Configuracion

Copia `.env.example` a `.env`:

```bash
EXPO_PUBLIC_SYNC_MODE=mock
EXPO_PUBLIC_USE_MOCK_SYNC=true
EXPO_PUBLIC_INGEST_VITALS_URL=https://your-project-ref.functions.supabase.co/ingest-vitals
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_HOSPITAL_ID=HSP-SAN-VICENTE
EXPO_PUBLIC_PATIENT_HASH_SALT=vitalsync-demo-salt
```

### Modos de sincronizacion

`mock` es el modo seguro para probar offline-first sin backend:

```bash
EXPO_PUBLIC_SYNC_MODE=mock
```

`supabase` conecta la app movil con las tablas actuales del proyecto (`pacientes_dim` y `vitales`). Es el modo recomendado para la demo integrada con dashboard mientras no exista `ingest-vitals`:

```bash
EXPO_PUBLIC_SYNC_MODE=supabase
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_HOSPITAL_ID=HSP-SAN-VICENTE
EXPO_PUBLIC_PATIENT_HASH_SALT=<mismo-salt-del-simulador>
```

`edge` usa la Edge Function formal del documento. Activarlo cuando Backend entregue `ingest-vitals`:

```bash
EXPO_PUBLIC_SYNC_MODE=edge
EXPO_PUBLIC_INGEST_VITALS_URL=https://<project-ref>.functions.supabase.co/ingest-vitals
```

Si no defines `EXPO_PUBLIC_SYNC_MODE`, la app conserva compatibilidad con el primer prototipo: `EXPO_PUBLIC_USE_MOCK_SYNC=false` equivale a `edge`.

## Contrato Supabase directo

En `EXPO_PUBLIC_SYNC_MODE=supabase`, la app:

1. Genera `patient_hash = SHA-256(patientId + salt)` con `expo-crypto`.
2. Hace upsert en `pacientes_dim` con `patient_hash` y `hospital_id`.
3. Inserta en `vitales` con `ambulancia_id`, `frecuencia_cardiaca`, `presion_arterial`, `triage`, `ekg_url` y `created_at`.
4. El dashboard recibe el registro por Supabase Realtime.

## Prueba offline-first

1. Abrir la app con Expo.
2. Activar modo avion o desconectar internet.
3. Registrar FC, PA y Triage.
4. Confirmar que el registro queda en la cola local como pendiente.
5. Reactivar internet.
6. Confirmar que la app sincroniza automaticamente y marca el registro como `Sincronizado`.

## Nota sobre WatermelonDB

El protocolo pide React Native + WatermelonDB. Para avanzar rapido en Expo Go, esta version usa una capa local aislada en `src/services/localVitalsStore.ts` con el mismo contrato de `vitales_local`. WatermelonDB requiere configuracion nativa/dev build; si el equipo lo exige como dependencia final, se reemplaza solo esa capa de almacenamiento sin tocar el formulario ni el servicio de sincronizacion.

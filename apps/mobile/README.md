# VitalSync Movil

App Expo/React Native para la Persona 3 del proyecto VitalSync. Implementa el flujo offline-first del ADR-002: los signos vitales se guardan primero en WatermelonDB (`vitales_local`, SQLite local) y luego se sincronizan automaticamente cuando hay conexion.

La app movil se plantea como un cliente externo del sistema, no como parte de un monolito. Consume servicios serverless separados: Supabase REST/Realtime, Supabase Edge Functions y el HIS mock publicado como API.

## Funcionalidad incluida

- Formulario para FC, PA, Triage, ambulancia, paciente y notas clinicas.
- Adjuntar foto EKG en Base64 desde galeria o camara, con limite de 1 MB.
- Persistencia local con WatermelonDB y tabla `vitales_local` con `synced: boolean`, `retryCount`, timestamps y errores.
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

> Nota: WatermelonDB usa un modulo nativo de SQLite. Para una prueba en tablet o APK se debe usar un development build o APK nativa, no Expo Go puro.

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

## Arquitectura movil

La app movil queda separada del dashboard y del backend. Su responsabilidad es capturar datos clinicos en ambulancia, persistirlos localmente y sincronizarlos con el backend serverless cuando haya red.

Componentes principales:

- UI React Native: formulario clinico y cola local.
- WatermelonDB: base local SQLite offline-first (`vitales_local`).
- Sync service: adaptador para `mock`, `supabase` directo o `edge`.
- Supabase/serverless: servicios externos consumidos por HTTP; la app no contiene logica del dashboard ni del HIS.

Esto mantiene la modificabilidad: si cambia `ingest-vitals` o Supabase, se reemplaza `src/services/syncVitals.ts` sin tocar el formulario ni la base local.

## Prueba offline-first

1. Abrir la app con Expo.
2. Activar modo avion o desconectar internet.
3. Registrar FC, PA y Triage.
4. Confirmar que el registro queda en la cola local como pendiente.
5. Reactivar internet.
6. Confirmar que la app sincroniza automaticamente y marca el registro como `Sincronizado`.

## APK / tablet

La app ya tiene identificador Android `com.vitalsync.mobile`. Cuando el grupo decida avanzar a APK, el camino recomendado es generar un build nativo con Expo/EAS o `expo prebuild` y compilar Android. Para la entrega tambien puede presentarse como elemento externo conectado al dashboard mediante `EXPO_PUBLIC_SYNC_MODE=supabase`.

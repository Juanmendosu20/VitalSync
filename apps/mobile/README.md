# VitalSync Movil

App Expo para la Persona 3 del proyecto VitalSync. Implementa el flujo offline-first del ADR-002: los signos vitales se guardan primero en una cola local `vitales_local` y luego se sincronizan automaticamente cuando hay conexion.

## Funcionalidad incluida

- Formulario para FC, PA, Triage, ambulancia, paciente y notas clinicas.
- Adjuntar foto EKG en Base64 desde galeria o camara, con limite de 1 MB.
- Persistencia local con campo `synced: boolean`, `retryCount`, timestamps y errores.
- Deteccion de conexion con NetInfo.
- Sincronizacion automatica contra `ingest-vitals` o modo mock mientras Backend entrega la URL real.
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
EXPO_PUBLIC_USE_MOCK_SYNC=true
EXPO_PUBLIC_INGEST_VITALS_URL=https://your-project-ref.functions.supabase.co/ingest-vitals
```

Mientras Persona 1 no entregue la URL de Supabase, deja `EXPO_PUBLIC_USE_MOCK_SYNC=true`.
Cuando exista `ingest-vitals`, cambia a:

```bash
EXPO_PUBLIC_USE_MOCK_SYNC=false
EXPO_PUBLIC_INGEST_VITALS_URL=https://<project-ref>.functions.supabase.co/ingest-vitals
```

## Prueba offline-first

1. Abrir la app con Expo.
2. Activar modo avion o desconectar internet.
3. Registrar FC, PA y Triage.
4. Confirmar que el registro queda en la cola local como pendiente.
5. Reactivar internet.
6. Confirmar que la app sincroniza automaticamente y marca el registro como `Sincronizado`.

## Nota sobre WatermelonDB

El protocolo pide React Native + WatermelonDB. Para avanzar rapido en Expo Go, esta version usa una capa local aislada en `src/services/localVitalsStore.ts` con el mismo contrato de `vitales_local`. WatermelonDB requiere configuracion nativa/dev build; si el equipo lo exige como dependencia final, se reemplaza solo esa capa de almacenamiento sin tocar el formulario ni el servicio de sincronizacion.

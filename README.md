# VitalSync

Repositorio del proyecto final VitalSync.

## Apps

- `apps/dashboard`: dashboard web de coordinacion medica, construido con React/Vite. Incluye vista de pacientes, alertas de emergencia y simulacion realtime.
- `apps/mobile`: app movil de la Persona 3, construida con Expo. Incluye formulario clinico, cola offline-first `vitales_local`, adjunto EKG Base64 y sincronizacion con `ingest-vitals`.

## Dashboard web

```bash
cd apps/dashboard
npm install
npm run dev
```

## Persona 3 - App movil

```bash
cd apps/mobile
npm install
npm start
```

La configuracion de Supabase se define en `apps/mobile/.env`. Mientras Backend no entregue la URL real de la Edge Function, se puede usar el modo mock:

```bash
EXPO_PUBLIC_USE_MOCK_SYNC=true
```

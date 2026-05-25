# VitalSync

Repositorio del proyecto final VitalSync.

## Arquitectura

VitalSync se organiza como componentes separados, no como monolito:

- Dashboard web desplegable en Vercel.
- App movil externa para tabletas de ambulancia.
- Simulador de ambulancias.
- APIs serverless para HIS mock.
- Supabase como backend serverless para base de datos, realtime y Edge Functions.

Esta separacion ayuda a disponibilidad, performance y modificabilidad: cada pieza puede evolucionar o desplegarse sin reescribir todo el sistema.

## Apps

- `apps/dashboard`: dashboard web de coordinacion medica, construido con React/Vite. Incluye vista de pacientes, alertas de emergencia y simulacion realtime.
- `apps/mobile`: app movil de la Persona 3, construida con Expo/React Native + WatermelonDB. Incluye formulario clinico, cola offline-first `vitales_local`, adjunto EKG Base64 y sincronizacion en modo mock, Supabase directo o Edge Function.

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

La configuracion de Supabase se define en `apps/mobile/.env`. Para demo local se puede usar modo mock:

```bash
EXPO_PUBLIC_SYNC_MODE=mock
```

Para conectar la app externa con el dashboard usando Supabase:

```bash
EXPO_PUBLIC_SYNC_MODE=supabase
```

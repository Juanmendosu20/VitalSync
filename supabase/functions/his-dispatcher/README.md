# his-dispatcher Edge Function

Dispatcher asíncrono del HIS con patrón Circuit Breaker.

## Deploy
```bash
npx supabase functions deploy his-dispatcher
```

## Variables de entorno requeridas en Supabase Dashboard → Settings → Edge Functions
```
HIS_MOCK_URL=https://TU-DOMINIO.vercel.app/api/his-mock
```

## pg_cron (ejecutar en SQL Editor de Supabase)
```sql
-- Habilitar extensiones
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Job que invoca la Edge Function cada minuto
select cron.schedule(
  'his-dispatcher-job',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://TU-PROJECT-REF.supabase.co/functions/v1/his-dispatcher',
    headers := '{"Authorization": "Bearer TU-ANON-KEY", "Content-Type": "application/json"}',
    body := '{}'
  );
  $$
);
```

## Estados del Circuit Breaker
| Estado | Descripción |
|--------|-------------|
| CLOSED | HIS operativo, todos los jobs se procesan |
| OPEN | HIS caído, jobs se acumulan en cola sin intentar |
| HALF_OPEN | Prueba controlada: 1 job para verificar recuperación |

-- Agregar columnas faltantes para Circuit Breaker completo
alter table circuit_state
  add column if not exists failure_count integer default 0,
  add column if not exists success_count integer default 0,
  add column if not exists last_failure_at timestamptz,
  add column if not exists updated_at timestamptz default now();

-- Insertar fila inicial si no existe
insert into circuit_state (state, failure_count, success_count)
select 'CLOSED', 0, 0
where not exists (select 1 from circuit_state);

-- Agregar columna sent a his_queue si no existe (ya la tiene, es idempotente)
alter table his_queue
  add column if not exists sent boolean default false,
  add column if not exists attempts integer default 0,
  add column if not exists status text default 'pending';

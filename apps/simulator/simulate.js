require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const AMBULANCIAS = [
  { id: 'AMB-001', lat: 6.2442, lng: -75.5812 },
  { id: 'AMB-002', lat: 6.2530, lng: -75.5740 },
  { id: 'AMB-003', lat: 6.2380, lng: -75.5900 },
  { id: 'AMB-004', lat: 6.2600, lng: -75.5650 },
  { id: 'AMB-005', lat: 6.2310, lng: -75.5780 },
];

// EKG fake en Base64 (~1KB)
const fakeEKG = Buffer.from('FAKE_EKG_DATA_' + 'x'.repeat(100)).toString('base64');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTriage() {
  const rand = Math.random();
  if (rand < 0.15) return 'Rojo';
  if (rand < 0.45) return 'Amarillo';
  return 'Verde';
}

// Anonimiza el ID del paciente con HMAC-SHA256
function hashPatientId(rawId) {
  const salt = process.env.PATIENT_HASH_SALT || 'default_salt';
  return crypto.createHmac('sha256', salt).update(rawId).digest('hex');
}

async function enviarDatos(ambulancia) {
  const triage = randomTriage();
  const rawPatientId = `PAC-${ambulancia.id}-${Date.now()}`;

  // Columnas exactas de la tabla 'vitales' en Supabase
  const payload = {
    patient_hash: hashPatientId(rawPatientId),
    hospital_id: 'HSP-SAN-VICENTE',
    frecuencia_cardiaca: randomInt(55, 140),
    presion_arterial: `${randomInt(80, 180)}/${randomInt(50, 110)}`,
    triage: triage,
    ekg_url: `data:image/png;base64,${fakeEKG}`,
  };

  const { error } = await supabase
    .from('vitales')
    .insert(payload);

  if (error) {
    console.error(`❌ [${ambulancia.id}] Error:`, error.message);
  } else {
    const emoji = triage === 'Rojo' ? '🔴' : triage === 'Amarillo' ? '🟡' : '🟢';
    console.log(`${emoji} [${ambulancia.id}] FC:${payload.frecuencia_cardiaca} PA:${payload.presion_arterial} → ${triage}`);
  }
}

async function ciclo() {
  console.log(`\n⏱️  [${new Date().toLocaleTimeString()}] Enviando datos de ${AMBULANCIAS.length} ambulancias...`);
  await Promise.all(AMBULANCIAS.map(enviarDatos));
}

console.log('🚑 VitalSync Mock Simulator iniciado');
console.log(`📡 Conectado a: ${process.env.SUPABASE_URL}\n`);

ciclo();
setInterval(ciclo, 10000);

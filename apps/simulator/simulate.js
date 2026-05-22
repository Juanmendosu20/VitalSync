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

const HOSPITAL_ID = 'HSP-SAN-VICENTE';

// EKG fake en Base64
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

// Hash fijo por ambulancia (simula paciente estable en la ambulancia)
function hashAmbulancia(ambId) {
  const salt = process.env.PATIENT_HASH_SALT || 'default_salt';
  return crypto.createHmac('sha256', salt).update(ambId).digest('hex');
}

async function enviarDatos(ambulancia) {
  const triage = randomTriage();
  const patient_hash = hashAmbulancia(ambulancia.id);

  // 1. Upsert en pacientes_dim (crea si no existe, ignora si ya existe)
  const { error: errPaciente } = await supabase
    .from('pacientes_dim')
    .upsert({ patient_hash, hospital_id: HOSPITAL_ID }, { onConflict: 'patient_hash' });

  if (errPaciente) {
    console.error(`❌ [${ambulancia.id}] Error pacientes_dim:`, errPaciente.message);
    return;
  }

  // 2. Insertar signos vitales
  const payload = {
    patient_hash,
    hospital_id: HOSPITAL_ID,
    frecuencia_cardiaca: randomInt(55, 140),
    presion_arterial: `${randomInt(80, 180)}/${randomInt(50, 110)}`,
    triage,
    ekg_url: `data:image/png;base64,${fakeEKG}`,
  };

  const { error: errVital } = await supabase
    .from('vitales')
    .insert(payload);

  if (errVital) {
    console.error(`❌ [${ambulancia.id}] Error vitales:`, errVital.message);
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

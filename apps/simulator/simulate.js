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
  { id: 'AMB-006', lat: 6.2470, lng: -75.5830 },
  { id: 'AMB-007', lat: 6.2550, lng: -75.5710 },
  { id: 'AMB-008', lat: 6.2395, lng: -75.5860 },
  { id: 'AMB-009', lat: 6.2615, lng: -75.5630 },
  { id: 'AMB-010', lat: 6.2325, lng: -75.5760 },
  { id: 'AMB-011', lat: 6.2480, lng: -75.5800 },
  { id: 'AMB-012', lat: 6.2540, lng: -75.5720 },
  { id: 'AMB-013', lat: 6.2370, lng: -75.5920 },
  { id: 'AMB-014', lat: 6.2590, lng: -75.5660 },
  { id: 'AMB-015', lat: 6.2300, lng: -75.5790 },
];

const HOSPITAL_ID = 'HSP-SAN-VICENTE';
const fakeEKG = Buffer.from('FAKE_EKG_DATA_' + 'x'.repeat(100)).toString('base64');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTriage() {
  const rand = Math.random();
  if (rand < 0.15) return 'ROJO';
  if (rand < 0.45) return 'AMARILLO';
  return 'VERDE';
}

function hashAmbulancia(ambId) {
  const salt = process.env.PATIENT_HASH_SALT || 'default_salt';
  return crypto.createHmac('sha256', salt).update(ambId).digest('hex');
}

async function enviarDatos(ambulancia) {
  const triage = randomTriage();
  const patient_hash = hashAmbulancia(ambulancia.id);

  await supabase
    .from('pacientes_dim')
    .upsert({ patient_hash, hospital_id: HOSPITAL_ID }, { onConflict: 'patient_hash' });

  const payload = {
    ambulancia_id: ambulancia.id,
    patient_hash,
    hospital_id: HOSPITAL_ID,
    frecuencia_cardiaca: randomInt(55, 140),
    presion_arterial: `${randomInt(80, 180)}/${randomInt(50, 110)}`,
    triage,
    ekg_url: `data:image/png;base64,${fakeEKG}`,
  };

  const { error } = await supabase.from('vitales').insert(payload);

  const emoji = triage === 'ROJO' ? '🔴' : triage === 'AMARILLO' ? '🟡' : '🟢';
  if (error) {
    console.error(`❌ [${ambulancia.id}]`, error.message);
  } else {
    console.log(`${emoji} [${ambulancia.id}] FC:${payload.frecuencia_cardiaca} PA:${payload.presion_arterial} → ${triage}`);
  }
}

// Rotar ambulancias: 1 por segundo
let index = 0;

console.log('🚑 VitalSync Simulator — 1 ambulancia/seg');
console.log(`📡 ${process.env.SUPABASE_URL}\n`);

setInterval(() => {
  const amb = AMBULANCIAS[index % AMBULANCIAS.length];
  index++;
  enviarDatos(amb);
}, 1000);

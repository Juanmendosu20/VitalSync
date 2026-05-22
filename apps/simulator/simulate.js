require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

const TRIAGE = ['Verde', 'Amarillo', 'Rojo'];

// EKG fake en Base64 (~1KB)
const fakeEKG = Buffer.from('FAKE_EKG_DATA_' + 'x'.repeat(100)).toString('base64');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTriage() {
  const rand = Math.random();
  if (rand < 0.15) return 'Rojo';      // 15% crítico
  if (rand < 0.45) return 'Amarillo';  // 30% urgente
  return 'Verde';                        // 55% estable
}

async function enviarDatos(ambulancia) {
  const triage = randomTriage();
  const payload = {
    ambulance_id: ambulancia.id,
    patient_id: `PAC-${ambulancia.id}-${Date.now()}`,
    heart_rate: randomInt(55, 140),
    systolic_bp: randomInt(80, 180),
    diastolic_bp: randomInt(50, 110),
    triage_level: triage,
    latitude: ambulancia.lat + (Math.random() - 0.5) * 0.01,
    longitude: ambulancia.lng + (Math.random() - 0.5) * 0.01,
    ekg_base64: fakeEKG,
    recorded_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('vitals')
    .insert(payload);

  if (error) {
    console.error(`❌ [${ambulancia.id}] Error:`, error.message);
  } else {
    const emoji = triage === 'Rojo' ? '🔴' : triage === 'Amarillo' ? '🟡' : '🟢';
    console.log(`${emoji} [${ambulancia.id}] FC:${payload.heart_rate} PA:${payload.systolic_bp}/${payload.diastolic_bp} → ${triage}`);
  }
}

async function ciclo() {
  console.log(`\n⏱️  [${new Date().toLocaleTimeString()}] Enviando datos de ${AMBULANCIAS.length} ambulancias...`);
  await Promise.all(AMBULANCIAS.map(enviarDatos));
}

console.log('🚑 VitalSync Mock Simulator iniciado');
console.log(`📡 Conectado a: ${process.env.SUPABASE_URL}\n`);

ciclo(); // Primera ejecución inmediata
setInterval(ciclo, 10000); // Cada 10 segundos
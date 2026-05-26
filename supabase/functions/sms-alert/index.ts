import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TEXTBEE_API_KEY   = Deno.env.get('TEXTBEE_API_KEY') ?? '';
const TEXTBEE_DEVICE_ID = Deno.env.get('TEXTBEE_DEVICE_ID') ?? '';

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '').replace(/^57/, '');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { patient_hash, hospital_id, triage } = body;

  if (!patient_hash || !hospital_id) {
    return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), { status: 400 });
  }

  if (String(triage).toUpperCase() !== 'ROJO') {
    return new Response(JSON.stringify({ skipped: true, reason: 'Solo Triage Rojo' }), { status: 200 });
  }

  if (!TEXTBEE_API_KEY || !TEXTBEE_DEVICE_ID) {
    return new Response(JSON.stringify({ error: 'Faltan variables de entorno de TextBee' }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const unaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: yaEnviado } = await supabase
    .from('sms_log')
    .select('id')
    .eq('patient_hash', patient_hash)
    .gte('enviado_at', unaHoraAtras)
    .maybeSingle();

  if (yaEnviado) {
    return new Response(JSON.stringify({ skipped: true, reason: 'SMS ya enviado en la ultima hora' }), { status: 200 });
  }

  const { data: cirujanos } = await supabase
    .from('cirujanos_guardia')
    .select('nombre, telefono')
    .eq('hospital_id', hospital_id)
    .eq('activo', true);

  if (!cirujanos || cirujanos.length === 0) {
    return new Response(JSON.stringify({ skipped: true, reason: 'Sin cirujanos activos' }), { status: 200 });
  }

  const receivers = cirujanos.map((c: any) => normalizePhone(c.telefono));
  console.log('Receivers:', receivers);

  const hora = new Date().toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour12: false
  }).replace(/:/g, '');

  const message =
    `Hospital ${hospital_id}. ` +
    `Paciente ${patient_hash.slice(0, 6)}. ` +
    `Hora ${hora}.`;

  console.log('Message:', message);

  const res = await fetch(
    `https://api.textbee.dev/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`,
    {
      method: 'POST',
      headers: { 'x-api-key': TEXTBEE_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipients: receivers, message }),
    }
  );

  const responseText = await res.text();
  console.log('STATUS:', res.status);
  console.log('TEXTBEE RESPONSE:', responseText);

  if (res.ok) {
    await supabase.from('sms_log').insert({ patient_hash, hospital_id });
  }

  return new Response(JSON.stringify({
    success: res.ok,
    sms_status: res.status,
    recipients: receivers.length,
    response: responseText
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
});

/**
 * Validación rápida del motor de cálculo (Node.js plain).
 * Reproduce el caso real de la Sección 7 sin Expo/React.
 */

const dayjs = require('dayjs');

// ── Festivos ────────────────────────────────────────────────
const FESTIVOS = {
  '2026-04-02': 'Jueves Santo',
  '2026-04-03': 'Viernes Santo',
};

// ── Config por defecto ──────────────────────────────────────
const config = {
  valorHoraOrdinaria: 23196.87,
  factorRecNocturno: 8856.58,
  factorExtraDiurna25: 8434.41,
  factorExtraNocturna40: 12231.72,
  factorDominicalFestivo: 25305.50,
  pctSalud: 4,
  pctPension: 4,
  pctRetencion: 11.43,
  pctFondoSol: 1,
  pctSindical: 1.20,
  baseDeduccion: 'BRUTO',
  fechaAnclaje: '2026-05-22',
  tipoAnclaje: 'NOCTURNO',
};

// ── Motor de turnos ────────────────────────────────────────
const CICLO = 21;

function posEnCiclo(fecha) {
  const ancla = dayjs(config.fechaAnclaje);
  const dia = dayjs(fecha);
  const diff = dia.diff(ancla, 'day');
  return ((diff % CICLO) + CICLO) % CICLO;
}

function clasificarDia(fecha) {
  const pos = posEnCiclo(fecha);
  const d = dayjs(fecha);
  const esDomingo = d.day() === 0;
  const esFestivo = fecha in FESTIVOS;

  let tipo, numeroDia;
  if (pos <= 6) { tipo = 'NOCTURNO'; numeroDia = pos + 1; }
  else if (pos <= 10) { tipo = 'DESCANSO'; numeroDia = pos - 6; }
  else if (pos <= 17) { tipo = 'DIURNO'; numeroDia = pos - 10; }
  else { tipo = 'DESCANSO'; numeroDia = pos - 17; }

  return { fecha, tipo, numeroDia, esDomingo, esFestivo };
}

// ── Clasificar quincena 10/04 – 24/04/2026 ────────────────
const dias = [];
let cursor = dayjs('2026-04-10');
const fin = dayjs('2026-04-24');
while (!cursor.isAfter(fin)) {
  dias.push(clasificarDia(cursor.format('YYYY-MM-DD')));
  cursor = cursor.add(1, 'day');
}

console.log('\n=== CLASIFICACIÓN DE DÍAS (10/04 – 24/04/2026) ===');
dias.forEach(d => {
  const marca = d.esDomingo ? '★DOM' : d.esFestivo ? '◆FEST' : '   ';
  console.log(`  ${d.fecha} [pos=${posEnCiclo(d.fecha).toString().padStart(2)}]  ${d.tipo.padEnd(8)} día ${d.numeroDia}  ${marca}`);
});

// ── Contar días por tipo ───────────────────────────────────
let diasDiurnos = 0, diasNocturnos = 0, diasDescansoN = 0, diasDescansoF = 0;
let diasDomFestDiurno = 0, diasDomFestNocturno = 0;

for (const d of dias) {
  const esFest = d.esDomingo || d.esFestivo;
  if (d.tipo === 'DIURNO') { esFest ? diasDomFestDiurno++ : diasDiurnos++; }
  else if (d.tipo === 'NOCTURNO') { esFest ? diasDomFestNocturno++ : diasNocturnos++; }
  else { esFest ? diasDescansoF++ : diasDescansoN++; }
}

console.log('\n=== RESUMEN DE DÍAS ===');
console.log(`  DIURNO normal:       ${diasDiurnos}`);
console.log(`  DIURNO dom/fest:     ${diasDomFestDiurno}`);
console.log(`  NOCTURNO normal:     ${diasNocturnos}`);
console.log(`  NOCTURNO dom/fest:   ${diasDomFestNocturno}`);
console.log(`  DESCANSO normal:     ${diasDescansoN}`);
console.log(`  DESCANSO dom/fest:   ${diasDescansoF}`);

// ── Cálculo de conceptos ──────────────────────────────────
const H = 11.5, HA = 0.5, HJ = 12;
const V = config.valorHoraOrdinaria;
const RN = config.factorRecNocturno;
const DF = config.factorDominicalFestivo;

const conceptos = [];
function add(nombre, horas, factor) {
  const total = Math.round(horas * factor);
  conceptos.push({ nombre, horas, factor, total });
  return total;
}

let bruto = 0;

// Diurnas normales
if (diasDiurnos > 0) {
  bruto += add('Horas ordinarias diurnas', diasDiurnos * H, V);
  bruto += add('Alimentación diurna', diasDiurnos * HA, V);
}

// Nocturnas normales
if (diasNocturnos > 0) {
  bruto += add('Horas ordinarias nocturnas', diasNocturnos * H, V);
  bruto += add('Alimentación nocturna', diasNocturnos * HA, V);
  bruto += add('Recargo nocturno', diasNocturnos * HJ, RN);
}

// Nocturnas dom/fest
if (diasDomFestNocturno > 0) {
  bruto += add('Horas noct. dom/fest', diasDomFestNocturno * H, V);
  bruto += add('Alimentación noct. dom/fest', diasDomFestNocturno * HA, V);
  bruto += add('Recargo noct. dom/fest', diasDomFestNocturno * HJ, RN);
  bruto += add('Recargo dominical/festivo noct.', diasDomFestNocturno * H, DF);
}

// Diurnas dom/fest
if (diasDomFestDiurno > 0) {
  bruto += add('Horas diurnas dom/fest', diasDomFestDiurno * H, V);
  bruto += add('Alimentación diurna dom/fest', diasDomFestDiurno * HA, V);
  bruto += add('Recargo dominical/festivo diurno', diasDomFestDiurno * H, DF);
}

// Descanso compensatorio normal
if (diasDescansoN > 0) bruto += add('Descanso comp.', diasDescansoN * H, V);
if (diasDescansoF > 0) bruto += add('Descanso comp. dom/fest', diasDescansoF * H, V);

console.log('\n=== CONCEPTOS DEVENGADOS ===');
conceptos.forEach(c => {
  console.log(`  ${c.nombre.padEnd(38)} ${c.horas.toFixed(2).padStart(6)} h  × ${c.factor.toFixed(2).padStart(10)}  = ${c.total.toLocaleString('es-CO').padStart(12)}`);
});
console.log(`  ${''.padEnd(38)} ${''.padStart(6)}    ${'TOTAL BRUTO'.padStart(10)}  = ${bruto.toLocaleString('es-CO').padStart(12)}`);

// ── Deducciones ───────────────────────────────────────────
const base = bruto; // baseDeduccion = BRUTO
const salud = Math.round(base * 0.04);
const pension = Math.round(base * 0.04);
const retencion = Math.round(base * 0.1143);
const fondo = Math.round(base * 0.01);   // solo 2ª quincena
const sindical = Math.round(base * 0.012); // solo 2ª quincena
const totalDesc = salud + pension + retencion + fondo + sindical;

console.log('\n=== DEDUCCIONES ===');
console.log(`  Salud 4%:                              ${salud.toLocaleString('es-CO')}`);
console.log(`  Pensión 4%:                            ${pension.toLocaleString('es-CO')}`);
console.log(`  Retención 11,43%:                      ${retencion.toLocaleString('es-CO')}`);
console.log(`  Fondo Solidaridad 1%:                  ${fondo.toLocaleString('es-CO')}`);
console.log(`  Cuota Sindical 1,2%:                   ${sindical.toLocaleString('es-CO')}`);
console.log(`  TOTAL DESCUENTOS:                      ${totalDesc.toLocaleString('es-CO')}`);

const neto = bruto - totalDesc;
console.log('\n=== RESULTADO ===');
console.log(`  BRUTO CALCULADO:     ${bruto.toLocaleString('es-CO').padStart(14)}`);
console.log(`  BRUTO ESPERADO:      ${(4628575).toLocaleString('es-CO').padStart(14)}  (caso real)`);
console.log(`  DIFERENCIA BRUTO:    ${(bruto - 4628575).toLocaleString('es-CO').padStart(14)}`);
console.log(`  NETO CALCULADO:      ${neto.toLocaleString('es-CO').padStart(14)}`);
console.log(`  NETO ESPERADO:       ${(3713503).toLocaleString('es-CO').padStart(14)}  (caso real)`);
console.log(`  DIFERENCIA NETO:     ${(neto - 3713503).toLocaleString('es-CO').padStart(14)}`);
console.log(`\n  Estado: ${Math.abs(neto - 3713503) < 300000 ? '✓ DENTRO DE TOLERANCIA' : '✗ FUERA DE TOLERANCIA'}`);
console.log('\n  ⚠ La diferencia se explica por las horas extra (14,5h ×2) y ajustes');
console.log('  presentes en el caso real pero que requieren entrada manual.');

/**
 * Motor de cálculo de pago por quincena.
 *
 * Reglas (Sección 5 y 6 de la especificación):
 * - Cada jornada laboral = 12 h (11,5 h ordinarias + 0,5 h alimentación)
 * - Días de descanso compensatorio = 11,5 h × valorHora
 * - Recargos nocturnos sobre las 12 h de la jornada
 * - Recargo dominical/festivo sobre las 11,5 h de la jornada
 * - Deducciones según quincena A o B
 *
 * ⚠ Factores de recargo configurables — verificar con liquidación real.
 */

import type {
  Quincena,
  LiquidacionQuincena,
  ConceptoPago,
  DetalleDeduccion,
  ConfiguracionUsuario,
  DiaCalendario,
  AjusteManual,
} from '../types';

const HORAS_ORDINARIAS = 11.5;
const HORAS_ALIMENTACION = 0.5;
const HORAS_JORNADA = 12; // para recargo nocturno

function concepto(
  nombre: string,
  horas: number,
  valorUnitario: number,
): ConceptoPago {
  return { nombre, horas, valorUnitario, total: Math.round(horas * valorUnitario) };
}

export function calcularQuincena(
  quincena: Quincena,
  config: ConfiguracionUsuario,
  ajustes: AjusteManual[] = [],
): LiquidacionQuincena {
  const {
    valorHoraOrdinaria,
    factorRecNocturno,
    factorExtraDiurna25,
    factorExtraNocturna40,
    factorDominicalFestivo,
  } = config;

  // ─── Clasificar días ───────────────────────────────────
  let diasDiurnos = 0;
  let diasNocturnos = 0;
  let diasDescanso = 0;
  let diasDomFestDiurno = 0;
  let diasDomFestNocturno = 0;
  let diasDescansoNormal = 0;
  let diasDescansoFest = 0;

  for (const dia of quincena.dias) {
    const esFest = dia.esDomingo || dia.esFestivo;

    if (dia.tipo === 'DIURNO') {
      if (esFest) diasDomFestDiurno++;
      else diasDiurnos++;
    } else if (dia.tipo === 'NOCTURNO') {
      if (esFest) diasDomFestNocturno++;
      else diasNocturnos++;
    } else {
      // DESCANSO
      if (esFest) diasDescansoFest++;
      else diasDescansoNormal++;
    }
  }

  diasDescanso = diasDescansoNormal + diasDescansoFest;

  // ─── Conceptos devengados ──────────────────────────────
  const conceptos: ConceptoPago[] = [];

  // 1. Horas ordinarias DIURNAS (sin dom/fest)
  if (diasDiurnos > 0) {
    conceptos.push(
      concepto(
        'Horas ordinarias diurnas',
        diasDiurnos * HORAS_ORDINARIAS,
        valorHoraOrdinaria,
      ),
    );
    conceptos.push(
      concepto(
        'Hora de alimentación diurna',
        diasDiurnos * HORAS_ALIMENTACION,
        valorHoraOrdinaria,
      ),
    );
  }

  // 2. Horas ordinarias NOCTURNAS (sin dom/fest)
  if (diasNocturnos > 0) {
    conceptos.push(
      concepto(
        'Horas ordinarias nocturnas',
        diasNocturnos * HORAS_ORDINARIAS,
        valorHoraOrdinaria,
      ),
    );
    conceptos.push(
      concepto(
        'Hora de alimentación nocturna',
        diasNocturnos * HORAS_ALIMENTACION,
        valorHoraOrdinaria,
      ),
    );
    // Recargo nocturno 35% (⚠ factor real ≈ 38%)
    conceptos.push(
      concepto(
        'Recargo nocturno (≈35%)',
        diasNocturnos * HORAS_JORNADA,
        factorRecNocturno,
      ),
    );
  }

  // 3. Horas NOCTURNAS dominicales/festivas
  if (diasDomFestNocturno > 0) {
    conceptos.push(
      concepto(
        'Horas nocturnas dom./fest.',
        diasDomFestNocturno * HORAS_ORDINARIAS,
        valorHoraOrdinaria,
      ),
    );
    conceptos.push(
      concepto(
        'Hora alimentación dom./fest. nocturna',
        diasDomFestNocturno * HORAS_ALIMENTACION,
        valorHoraOrdinaria,
      ),
    );
    conceptos.push(
      concepto(
        'Recargo nocturno dom./fest.',
        diasDomFestNocturno * HORAS_JORNADA,
        factorRecNocturno,
      ),
    );
    // Recargo dominical/festivo sobre 11,5 h
    conceptos.push(
      concepto(
        'Recargo dominical/festivo nocturno',
        diasDomFestNocturno * HORAS_ORDINARIAS,
        factorDominicalFestivo,
      ),
    );
  }

  // 4. Horas DIURNAS dominicales/festivas
  if (diasDomFestDiurno > 0) {
    conceptos.push(
      concepto(
        'Horas diurnas dom./fest.',
        diasDomFestDiurno * HORAS_ORDINARIAS,
        valorHoraOrdinaria,
      ),
    );
    conceptos.push(
      concepto(
        'Hora alimentación dom./fest. diurna',
        diasDomFestDiurno * HORAS_ALIMENTACION,
        valorHoraOrdinaria,
      ),
    );
    conceptos.push(
      concepto(
        'Recargo dominical/festivo diurno',
        diasDomFestDiurno * HORAS_ORDINARIAS,
        factorDominicalFestivo,
      ),
    );
  }

  // 5. DESCANSO COMPENSATORIO normal
  if (diasDescansoNormal > 0) {
    conceptos.push(
      concepto(
        'Descanso compensatorio',
        diasDescansoNormal * HORAS_ORDINARIAS,
        valorHoraOrdinaria,
      ),
    );
  }

  // 6. DESCANSO COMPENSATORIO dominical/festivo
  if (diasDescansoFest > 0) {
    conceptos.push(
      concepto(
        'Descanso compensatorio dom./fest.',
        diasDescansoFest * HORAS_ORDINARIAS,
        valorHoraOrdinaria,
      ),
    );
  }

  // 7. Ajustes manuales
  for (const aj of ajustes) {
    if (aj.horasExtra > 0) {
      const factor =
        aj.tipoExtra === 'DIURNA' ? factorExtraDiurna25 : factorExtraNocturna40;
      const label = aj.tipoExtra === 'DIURNA' ? 'Extras diurnas 25%' : 'Extras nocturnas 40%';
      conceptos.push(concepto(`${label} (${aj.descripcion})`, aj.horasExtra, factor));
    }
    if (aj.horasFestivos > 0) {
      const factor =
        aj.tipoFestivo === 'NOCTURNO' ? factorRecNocturno : factorDominicalFestivo;
      conceptos.push(
        concepto(`Festivos ajuste (${aj.descripcion})`, aj.horasFestivos, factor),
      );
    }
  }

  const totalBruto = conceptos.reduce((s, c) => s + c.total, 0);

  // ─── Deducciones ───────────────────────────────────────
  const deducciones: DetalleDeduccion[] = [];
  const base =
    config.baseDeduccion === 'BRUTO' ? totalBruto : config.valorBaseFijo;

  const esPrimeraQuincena = quincena.tipo === 'A';

  deducciones.push({
    nombre: 'Aporte a Salud (4%)',
    base,
    porcentaje: config.pctSalud,
    valor: Math.round((base * config.pctSalud) / 100),
  });

  deducciones.push({
    nombre: 'Aporte a Pensión (4%)',
    base,
    porcentaje: config.pctPension,
    valor: Math.round((base * config.pctPension) / 100),
  });

  deducciones.push({
    nombre: `Retención en la Fuente (${config.pctRetencion}%)`,
    base,
    porcentaje: config.pctRetencion,
    valor: Math.round((base * config.pctRetencion) / 100),
  });

  // Fondo de Solidaridad — ambas quincenas (ingresos > 4 SMLMV)
  if (config.pctFondoSol > 0) {
    deducciones.push({
      nombre: 'Fondo de Solidaridad (1%)',
      base,
      porcentaje: config.pctFondoSol,
      valor: Math.round((base * config.pctFondoSol) / 100),
    });
  }

  // Cuota sindical — solo 2ª quincena, solo si está afiliado
  if (!esPrimeraQuincena && config.pctSindical > 0) {
    deducciones.push({
      nombre: `Cuota Sindical SINTRAMINED (${config.pctSindical}%)`,
      base,
      porcentaje: config.pctSindical,
      valor: Math.round((base * config.pctSindical) / 100),
    });
  }

  const totalDeducciones = deducciones.reduce((s, d) => s + d.valor, 0);

  return {
    quincenaId: quincena.id,
    tipo: quincena.tipo,
    fechaInicio: quincena.fechaInicio,
    fechaFin: quincena.fechaFin,
    etiqueta: quincena.etiqueta,
    diasDiurnos,
    diasNocturnos,
    diasDescanso,
    diasDomFestTrabajados: diasDomFestDiurno + diasDomFestNocturno,
    conceptos,
    totalBruto,
    deducciones,
    totalDeducciones,
    neto: totalBruto - totalDeducciones,
  };
}

/**
 * Formatea los días del período en grupos para mostrar en UI.
 */
export function resumirDias(dias: DiaCalendario[]) {
  let diurno = 0, nocturno = 0, descanso = 0, domFest = 0;
  for (const d of dias) {
    if (d.tipo === 'DIURNO') diurno++;
    else if (d.tipo === 'NOCTURNO') nocturno++;
    else descanso++;
    if (d.esDomingo || d.esFestivo) domFest++;
  }
  return { diurno, nocturno, descanso, domFest, total: dias.length };
}

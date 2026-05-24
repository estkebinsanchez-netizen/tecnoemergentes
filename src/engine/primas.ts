/**
 * Motor de cálculo de primas extralegales y vacaciones.
 *
 * Convención colectiva Drummond Ltd.:
 *   - Prima Semestral Extralegal junio:    25 días de salario básico (pago 15 jun)
 *   - Prima Extralegal Navidad:            30 días de salario básico (pago 15 dic)
 *   - Prima Anual Extralegal Vacaciones:   29 días de salario básico (pago con vacaciones)
 *
 * Salario básico diario = configurable (default: valorHoraOrdinaria × 12 h).
 *
 * Proporcionalidad: mismas condiciones que la prima legal de servicios (Código Sustantivo
 * del Trabajo, Art. 306): (días trabajados en el semestre / días del semestre) × prima.
 * Para proyecciones asumimos el semestre completo salvo que el usuario indique lo contrario.
 */

import dayjs from 'dayjs';
import type {
  ConfiguracionUsuario,
  LiquidacionPrima,
  PeriodoVacaciones,
} from '../types';

// Días de cada prima según la convención
const DIAS_PRIMA_JUNIO = 25;
const DIAS_PRIMA_NAVIDAD = 30;
const DIAS_PRIMA_VACACIONES = 29;

/**
 * Genera las primas proyectadas para el año en curso y el siguiente.
 * Solo incluye las que caen dentro del rango visible (hasta dic 2026).
 */
export function calcularPrimasProyectadas(
  config: ConfiguracionUsuario,
): LiquidacionPrima[] {
  const sbd = config.salarioBasicoDiario;
  const primas: LiquidacionPrima[] = [];

  // Años a proyectar
  for (const anio of [2025, 2026]) {
    // Prima junio
    const fechaJunio = `${anio}-06-15`;
    if (fechaJunio >= dayjs().subtract(6, 'month').format('YYYY-MM-DD') &&
        fechaJunio <= '2026-12-31') {
      primas.push({
        tipo: 'JUNIO',
        etiqueta: `Prima extralegal junio ${anio}`,
        fechaPago: fechaJunio,
        diasSalario: DIAS_PRIMA_JUNIO,
        salarioBasicoDiario: sbd,
        total: Math.round(DIAS_PRIMA_JUNIO * sbd),
        proporcional: false,
      });
    }

    // Prima navidad
    const fechaNavidad = `${anio}-12-15`;
    if (fechaNavidad >= dayjs().subtract(6, 'month').format('YYYY-MM-DD') &&
        fechaNavidad <= '2026-12-31') {
      primas.push({
        tipo: 'NAVIDAD',
        etiqueta: `Prima extralegal navidad ${anio}`,
        fechaPago: fechaNavidad,
        diasSalario: DIAS_PRIMA_NAVIDAD,
        salarioBasicoDiario: sbd,
        total: Math.round(DIAS_PRIMA_NAVIDAD * sbd),
        proporcional: false,
      });
    }
  }

  // Ordenar por fecha
  primas.sort((a, b) => a.fechaPago.localeCompare(b.fechaPago));
  return primas;
}

/**
 * Calcula una prima proporcional (si el trabajador no completó el semestre).
 */
export function calcularPrimaProporcional(
  tipo: 'JUNIO' | 'NAVIDAD',
  diasTrabajados: number,
  config: ConfiguracionUsuario,
): LiquidacionPrima {
  const sbd = config.salarioBasicoDiario;
  const diasBase = tipo === 'JUNIO' ? DIAS_PRIMA_JUNIO : DIAS_PRIMA_NAVIDAD;
  const diasSemestre = 180; // ~6 meses
  const factor = Math.min(diasTrabajados / diasSemestre, 1);
  const diasEfectivos = diasBase * factor;
  const anio = dayjs().year();
  const fechaPago = tipo === 'JUNIO' ? `${anio}-06-15` : `${anio}-12-15`;

  return {
    tipo,
    etiqueta: `Prima ${tipo.toLowerCase()} ${anio} (proporcional)`,
    fechaPago,
    diasSalario: diasEfectivos,
    salarioBasicoDiario: sbd,
    total: Math.round(diasEfectivos * sbd),
    proporcional: true,
    diasTrabajados,
    diasSemestre,
  };
}

/**
 * Calcula el pago de un período de vacaciones.
 * Incluye:
 *   - Pago de vacaciones: días de disfrute × salario básico diario
 *   - Prima extralegal de vacaciones: 29 días × salario básico diario
 */
export function calcularVacaciones(
  id: string,
  fechaInicio: string,
  fechaFin: string,
  config: ConfiguracionUsuario,
  observaciones = '',
): PeriodoVacaciones {
  const sbd = config.salarioBasicoDiario;
  const inicio = dayjs(fechaInicio);
  const fin = dayjs(fechaFin);
  // +1 para incluir el día de fin
  const diasDisfrute = fin.diff(inicio, 'day') + 1;

  const pagoVacaciones = Math.round(diasDisfrute * sbd);
  const primaVacaciones = Math.round(DIAS_PRIMA_VACACIONES * sbd);

  return {
    id,
    fechaInicio,
    fechaFin,
    diasDisfrute,
    salarioBasicoDiario: sbd,
    pagoVacaciones,
    primaVacaciones,
    totalRecibir: pagoVacaciones + primaVacaciones,
    observaciones,
  };
}

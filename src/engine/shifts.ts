/**
 * Motor de clasificación de turnos rotativos.
 *
 * Ciclo de 21 días:
 *   pos  0-6   → NOCTURNO  (7 noches, empieza viernes 18:00)
 *   pos  7-10  → DESCANSO  (4 días post-nocturno)
 *   pos 11-17  → DIURNO    (7 días, empieza martes 06:00)
 *   pos 18-20  → DESCANSO  (3 días post-diurno)
 *
 * Punto de anclaje por defecto: 2026-05-22 = inicio NOCTURNO (pos 0).
 */

import dayjs from 'dayjs';
import type { TipoTurno, DiaCalendario, ConfiguracionUsuario } from '../types';
import { FESTIVOS_2025_2026 } from './holidays';

const CICLO = 21;

function posEnCiclo(fecha: string, config: ConfiguracionUsuario): number {
  const ancla = dayjs(config.fechaAnclaje);
  const dia = dayjs(fecha);
  const diff = dia.diff(ancla, 'day');
  return ((diff % CICLO) + CICLO) % CICLO;
}

export function clasificarDia(
  fecha: string,
  config: ConfiguracionUsuario,
): DiaCalendario {
  const pos = posEnCiclo(fecha, config);
  const d = dayjs(fecha);
  const esDomingo = d.day() === 0;
  const festivo = FESTIVOS_2025_2026[fecha];

  let tipo: TipoTurno;
  let numeroDia: number | undefined;

  if (config.tipoAnclaje === 'NOCTURNO') {
    if (pos <= 6) {
      tipo = 'NOCTURNO';
      numeroDia = pos + 1;
    } else if (pos <= 10) {
      tipo = 'DESCANSO';
      numeroDia = pos - 6;
    } else if (pos <= 17) {
      tipo = 'DIURNO';
      numeroDia = pos - 10;
    } else {
      tipo = 'DESCANSO';
      numeroDia = pos - 17;
    }
  } else {
    // Anclaje DIURNO: pos 0-6 = DIURNO, 7-9 = DESCANSO, 10-16 = NOCTURNO, 17-20 = DESCANSO
    if (pos <= 6) {
      tipo = 'DIURNO';
      numeroDia = pos + 1;
    } else if (pos <= 9) {
      tipo = 'DESCANSO';
      numeroDia = pos - 6;
    } else if (pos <= 16) {
      tipo = 'NOCTURNO';
      numeroDia = pos - 9;
    } else {
      tipo = 'DESCANSO';
      numeroDia = pos - 16;
    }
  }

  return {
    fecha,
    tipo,
    numeroDia,
    esDomingo,
    esFestivo: !!festivo,
    nombreFestivo: festivo,
  };
}

export function clasificarRango(
  fechaInicio: string,
  fechaFin: string,
  config: ConfiguracionUsuario,
): DiaCalendario[] {
  const dias: DiaCalendario[] = [];
  let cursor = dayjs(fechaInicio);
  const fin = dayjs(fechaFin);

  while (!cursor.isAfter(fin)) {
    dias.push(clasificarDia(cursor.format('YYYY-MM-DD'), config));
    cursor = cursor.add(1, 'day');
  }
  return dias;
}

/**
 * Devuelve el estado del ciclo en una fecha dada como objeto legible (para UI).
 */
export function estadoCiclo(fecha: string, config: ConfiguracionUsuario) {
  const pos = posEnCiclo(fecha, config);
  const dia = clasificarDia(fecha, config);
  return { pos, ...dia };
}

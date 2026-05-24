/**
 * Generador de quincenas corridas.
 *
 * Quincena A (1ª del mes): del 25 del mes anterior al 9 del mes en curso.
 * Quincena B (2ª del mes): del 10 al 24 del mes en curso.
 *
 * Se generan desde la quincena actual hasta la que termina el 24/12/2026.
 */

import dayjs from 'dayjs';
import type { Quincena, TipoQuincena, ConfiguracionUsuario } from '../types';
import { clasificarRango } from './shifts';

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function etiqueta(tipo: TipoQuincena, mes: number, anio: number): string {
  const ord = tipo === 'A' ? '1ª' : '2ª';
  return `${ord} quincena ${MESES_ES[mes - 1]} ${anio}`;
}

function idQuincena(tipo: TipoQuincena, mes: number, anio: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}-${tipo}`;
}

/**
 * Genera todas las quincenas desde la fecha actual hasta el 24/12/2026.
 */
export function generarQuincenas(config: ConfiguracionUsuario): Quincena[] {
  const quincenas: Quincena[] = [];
  const hoy = dayjs();
  const limiteProyeccion = dayjs('2026-12-24');

  // Determinar primera quincena a incluir (la que contiene hoy o la siguiente)
  let cursor = hoy;

  // Encontrar la primera quincena A que empieza en/antes de hoy
  // Quincena A: inicia día 25 del mes anterior → corresponde al mes siguiente
  // Quincena B: inicia día 10 del mismo mes → corresponde al mismo mes

  // Empezamos desde 3 meses antes para tener algo de histórico inicial
  cursor = hoy.subtract(3, 'month').date(10);

  const vistasIds = new Set<string>();

  while (cursor.isBefore(limiteProyeccion) || cursor.isSame(limiteProyeccion, 'day')) {
    const mes = cursor.month() + 1;
    const anio = cursor.year();

    // Quincena B de este mes: 10 → 24
    const inicioB = dayjs(`${anio}-${String(mes).padStart(2, '0')}-10`);
    const finB = dayjs(`${anio}-${String(mes).padStart(2, '0')}-24`);
    const idB = idQuincena('B', mes, anio);

    if (!vistasIds.has(idB) && !finB.isAfter(limiteProyeccion.add(1, 'day'))) {
      vistasIds.add(idB);
      quincenas.push({
        id: idB,
        tipo: 'B',
        fechaInicio: inicioB.format('YYYY-MM-DD'),
        fechaFin: finB.format('YYYY-MM-DD'),
        etiqueta: etiqueta('B', mes, anio),
        dias: clasificarRango(
          inicioB.format('YYYY-MM-DD'),
          finB.format('YYYY-MM-DD'),
          config,
        ),
      });
    }

    // Quincena A del mes SIGUIENTE: 25 de este mes → 9 del siguiente
    const mesS = mes === 12 ? 1 : mes + 1;
    const anioS = mes === 12 ? anio + 1 : anio;
    const inicioA = dayjs(`${anio}-${String(mes).padStart(2, '0')}-25`);
    const finA = dayjs(`${anioS}-${String(mesS).padStart(2, '0')}-09`);
    const idA = idQuincena('A', mesS, anioS);

    if (!vistasIds.has(idA) && inicioA.isBefore(limiteProyeccion.add(1, 'day'))) {
      vistasIds.add(idA);
      const finAEfectivo = finA.isAfter(limiteProyeccion) ? limiteProyeccion : finA;
      quincenas.push({
        id: idA,
        tipo: 'A',
        fechaInicio: inicioA.format('YYYY-MM-DD'),
        fechaFin: finAEfectivo.format('YYYY-MM-DD'),
        etiqueta: etiqueta('A', mesS, anioS),
        dias: clasificarRango(
          inicioA.format('YYYY-MM-DD'),
          finAEfectivo.format('YYYY-MM-DD'),
          config,
        ),
      });
    }

    cursor = cursor.add(1, 'month');
  }

  // Ordenar por fecha de inicio
  quincenas.sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));

  return quincenas;
}

/**
 * Retorna la quincena que contiene una fecha dada.
 */
export function quincenaDeFecha(
  fecha: string,
  config: ConfiguracionUsuario,
): Quincena | undefined {
  const todas = generarQuincenas(config);
  return todas.find(
    (q) => fecha >= q.fechaInicio && fecha <= q.fechaFin,
  );
}

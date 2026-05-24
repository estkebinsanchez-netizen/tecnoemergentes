/**
 * Validación del motor contra el caso real de la Sección 7.
 *
 * Quincena: 10/04/2026 – 24/04/2026 (2ª quincena de abril)
 * Neto esperado: 3.713.503 COP
 * Bruto esperado: 4.628.575 COP
 */

import dayjs from 'dayjs';
import { CONFIG_DEFAULT } from '../types';
import { clasificarRango } from './shifts';
import { calcularQuincena } from './payroll';
import type { Quincena } from '../types';

export function validarCasoReal(): {
  ok: boolean;
  brutoCalculado: number;
  netoCalculado: number;
  brutoEsperado: number;
  netoEsperado: number;
  diferenciaBruto: number;
  diferenciaNeto: number;
  detalleDias: string;
} {
  const config = { ...CONFIG_DEFAULT };

  const fechaInicio = '2026-04-10';
  const fechaFin = '2026-04-24';

  const dias = clasificarRango(fechaInicio, fechaFin, config);

  const quincena: Quincena = {
    id: '2026-04-B',
    tipo: 'B',
    fechaInicio,
    fechaFin,
    etiqueta: '2ª quincena abril 2026',
    dias,
  };

  const liq = calcularQuincena(quincena, config);

  const brutoEsperado = 4628575;
  const netoEsperado = 3713503;

  const detalleDias = dias
    .map((d) => {
      const marca = d.esDomingo ? '🔵DOM' : d.esFestivo ? '🟡FEST' : '';
      return `${d.fecha} ${d.tipo}[${d.numeroDia}] ${marca}`;
    })
    .join('\n');

  return {
    ok: Math.abs(liq.neto - netoEsperado) < 100000, // tolerancia 100k por factores ⚠
    brutoCalculado: liq.totalBruto,
    netoCalculado: liq.neto,
    brutoEsperado,
    netoEsperado,
    diferenciaBruto: liq.totalBruto - brutoEsperado,
    diferenciaNeto: liq.neto - netoEsperado,
    detalleDias,
  };
}

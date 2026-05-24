/**
 * Utilidades de formato para la UI.
 */

/**
 * Formatea un número como pesos colombianos.
 * Ejemplo: 3713503 → "$ 3.713.503"
 */
export function formatCOP(valor: number): string {
  return `$ ${Math.round(valor).toLocaleString('es-CO')}`;
}

/**
 * Formatea horas con un decimal.
 */
export function formatHoras(horas: number): string {
  return `${horas.toFixed(1)} h`;
}

/**
 * Formatea una fecha YYYY-MM-DD en forma legible.
 */
export function formatFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  const meses = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];
  return `${parseInt(dia)} ${meses[parseInt(mes) - 1]} ${anio}`;
}

/**
 * Formatea rango de fechas de quincena.
 */
export function formatRango(inicio: string, fin: string): string {
  return `${formatFecha(inicio)} – ${formatFecha(fin)}`;
}

/**
 * Porcentaje con 2 decimales.
 */
export function formatPct(pct: number): string {
  return `${pct.toFixed(2)} %`;
}

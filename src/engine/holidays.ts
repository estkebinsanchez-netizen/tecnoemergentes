/**
 * Festivos oficiales de Colombia 2025 y 2026.
 * Fuente: Ley 51 de 1983 y calendario oficial.
 * Los puentes (festivos "emilianistas") se trasladan al lunes siguiente.
 */

export const FESTIVOS_2025_2026: Record<string, string> = {
  // ── 2025 ──────────────────────────────────────────────
  '2025-01-01': 'Año Nuevo',
  '2025-01-06': 'Reyes Magos',
  '2025-03-24': 'San José',          // 19 mar → lunes 24
  '2025-04-17': 'Jueves Santo',
  '2025-04-18': 'Viernes Santo',
  '2025-05-01': 'Día del Trabajo',
  '2025-06-02': 'Ascensión del Señor', // 40 días Easter(20 abr) → lunes 2 jun
  '2025-06-23': 'Corpus Christi',      // 60 días → lunes 23 jun
  '2025-06-30': 'Sagrado Corazón',    // 68 días → lunes 30 jun
  '2025-06-30b': '',                   // San Pedro y San Pablo se fusiona
  '2025-07-20': 'Independencia de Colombia',
  '2025-08-07': 'Batalla de Boyacá',
  '2025-08-18': 'Asunción de la Virgen', // 15 ago → lunes 18
  '2025-10-13': 'Día de la Raza',        // 12 oct → lunes 13
  '2025-11-03': 'Todos los Santos',      // 1 nov → lunes 3
  '2025-11-17': 'Independencia de Cartagena', // 11 nov → lunes 17
  '2025-12-08': 'Inmaculada Concepción',
  '2025-12-25': 'Navidad',

  // ── 2026 ──────────────────────────────────────────────
  '2026-01-01': 'Año Nuevo',
  '2026-01-12': 'Reyes Magos',          // 6 ene → lunes 12
  '2026-03-23': 'San José',             // 19 mar → lunes 23
  '2026-04-02': 'Jueves Santo',         // Easter 2026 = 5 abr
  '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajo',
  '2026-05-18': 'Ascensión del Señor',  // 40 días después de Easter (5 abr) = 15 may → lunes 18
  '2026-06-08': 'Corpus Christi',       // 60 días → lunes 8 jun
  '2026-06-15': 'Sagrado Corazón',      // 68 días → lunes 15 jun
  '2026-06-29': 'San Pedro y San Pablo', // 29 jun → lunes 29
  '2026-07-20': 'Independencia de Colombia',
  '2026-08-07': 'Batalla de Boyacá',
  '2026-08-17': 'Asunción de la Virgen', // 15 ago → lunes 17
  '2026-10-12': 'Día de la Raza',        // 12 oct (lunes)
  '2026-11-02': 'Todos los Santos',      // 1 nov → lunes 2
  '2026-11-16': 'Independencia de Cartagena', // 11 nov → lunes 16
  '2026-12-08': 'Inmaculada Concepción',
  '2026-12-25': 'Navidad',
};

export function esFestivo(fecha: string): boolean {
  return fecha in FESTIVOS_2025_2026;
}

export function nombreFestivo(fecha: string): string | undefined {
  return FESTIVOS_2025_2026[fecha];
}

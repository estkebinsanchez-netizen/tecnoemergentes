// ──────────────────────────────────────────────────────────
// Tipos centrales de la aplicación
// ──────────────────────────────────────────────────────────

export type TipoTurno = 'DIURNO' | 'NOCTURNO' | 'DESCANSO';
export type TipoQuincena = 'A' | 'B'; // A = 25-9, B = 10-24

export interface DiaCalendario {
  fecha: string;        // YYYY-MM-DD
  tipo: TipoTurno;
  numeroDia?: number;   // posición dentro del bloque (1-7 para trabajo, 1-3/4 para descanso)
  esDomingo: boolean;
  esFestivo: boolean;
  nombreFestivo?: string;
}

export interface Quincena {
  id: string;           // e.g. "2026-04-B"
  tipo: TipoQuincena;
  fechaInicio: string;  // YYYY-MM-DD
  fechaFin: string;     // YYYY-MM-DD
  etiqueta: string;     // e.g. "2ª quincena abril 2026"
  dias: DiaCalendario[];
}

// ──────────────────────────────────────────────────────────
// Configuración del usuario (Dashboard)
// ──────────────────────────────────────────────────────────

export type BaseDeduccion = 'BRUTO' | 'FIJO';

export interface ConfiguracionUsuario {
  nombre: string;

  // Valor hora base
  valorHoraOrdinaria: number;  // default 23196.87

  // Salario básico diario para primas (configurable)
  // Por defecto: valorHoraOrdinaria × 12 h (una jornada = un día)
  salarioBasicoDiario: number; // default 278362.44

  // Factores por hora de cada concepto (⚠ configurables)
  factorRecNocturno: number;       // default 8856.58  (por hora, × 12h/jornada)
  factorExtraDiurna25: number;     // default 8434.41
  factorExtraNocturna40: number;   // default 12231.72
  factorDominicalFestivo: number;  // default 25305.50

  // Deducciones (%)
  pctSalud: number;           // default 4
  pctPension: number;         // default 4
  pctRetencion: number;       // default 11.43
  pctFondoSol: number;        // default 1   — solo 2ª quincena
  pctSindical: number;        // default 1.20 — solo 2ª quincena

  // Base sobre la que se aplican las deducciones
  baseDeduccion: BaseDeduccion;  // default 'BRUTO'
  valorBaseFijo: number;          // usado si baseDeduccion === 'FIJO'

  // Anclaje del ciclo
  fechaAnclaje: string;  // YYYY-MM-DD, default "2026-05-22"
  tipoAnclaje: TipoTurno; // tipo de turno en la fecha de anclaje, default "NOCTURNO"
}

export const CONFIG_DEFAULT: ConfiguracionUsuario = {
  nombre: '',
  valorHoraOrdinaria: 23196.87,
  salarioBasicoDiario: 278362.44,  // 23196.87 × 12 h
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
  valorBaseFijo: 5567249,
  fechaAnclaje: '2026-05-22',
  tipoAnclaje: 'NOCTURNO',
};

// ──────────────────────────────────────────────────────────
// Conceptos de pago
// ──────────────────────────────────────────────────────────

export interface ConceptoPago {
  nombre: string;
  horas: number;
  valorUnitario: number;
  total: number;
}

export interface DetalleDeduccion {
  nombre: string;
  base: number;
  porcentaje: number;
  valor: number;
}

export interface LiquidacionQuincena {
  quincenaId: string;
  fechaInicio: string;
  fechaFin: string;
  etiqueta: string;

  // Días del período
  diasDiurnos: number;
  diasNocturnos: number;
  diasDescanso: number;
  diasDomFestTrabajados: number;

  // Conceptos devengados
  conceptos: ConceptoPago[];
  totalBruto: number;

  // Deducciones
  deducciones: DetalleDeduccion[];
  totalDeducciones: number;

  // Resultado
  neto: number;

  // Ajustes manuales opcionales
  ajustes?: AjusteManual[];
}

// ──────────────────────────────────────────────────────────
// Ajuste manual de una quincena
// ──────────────────────────────────────────────────────────

export interface AjusteManual {
  id: string;
  quincenaId: string;
  descripcion: string;
  horasExtra: number;
  tipoExtra: 'DIURNA' | 'NOCTURNA';
  horasFestivos: number;
  tipoFestivo: 'DIURNO' | 'NOCTURNO';
  notas: string;
}

// ──────────────────────────────────────────────────────────
// Primas extralegales
// ──────────────────────────────────────────────────────────

export type TipoPrima = 'JUNIO' | 'NAVIDAD' | 'VACACIONES';

export interface LiquidacionPrima {
  tipo: TipoPrima;
  etiqueta: string;        // "Prima extralegal junio 2026"
  fechaPago: string;       // YYYY-MM-DD
  diasSalario: number;     // 25, 30 o 29
  salarioBasicoDiario: number;
  total: number;
  proporcional: boolean;   // true si no completó el semestre
  diasTrabajados?: number; // para cálculo proporcional
  diasSemestre?: number;
}

// ──────────────────────────────────────────────────────────
// Vacaciones
// ──────────────────────────────────────────────────────────

export interface PeriodoVacaciones {
  id: string;
  fechaInicio: string;     // YYYY-MM-DD — inicio del disfrute
  fechaFin: string;        // YYYY-MM-DD — fin del disfrute
  diasDisfrute: number;    // días calendario de disfrute
  salarioBasicoDiario: number;
  pagoVacaciones: number;  // días disfrute × salario básico diario
  primaVacaciones: number; // 29 días × salario básico diario
  totalRecibir: number;    // pagoVacaciones + primaVacaciones
  observaciones: string;
}

// ──────────────────────────────────────────────────────────
// Quincena real (histórico)
// ──────────────────────────────────────────────────────────

export interface QuincenaReal {
  id: string;
  quincenaId: string;
  fechaRegistro: string;
  brutoReal: number;
  deduccionesReal: number;
  netoReal: number;
  observaciones: string;
}

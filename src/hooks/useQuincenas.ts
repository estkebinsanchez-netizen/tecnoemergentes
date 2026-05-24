import { useMemo } from 'react';
import type { ConfiguracionUsuario, LiquidacionQuincena } from '../types';
import { generarQuincenas } from '../engine/periods';
import { calcularQuincena } from '../engine/payroll';

export function useQuincenas(config: ConfiguracionUsuario) {
  const liquidaciones = useMemo<LiquidacionQuincena[]>(() => {
    const quincenas = generarQuincenas(config);
    return quincenas.map((q) => calcularQuincena(q, config));
  }, [config]);

  return { liquidaciones };
}

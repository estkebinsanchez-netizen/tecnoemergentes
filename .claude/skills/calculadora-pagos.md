# Calculadora de pagos — Drummond Ltd. (Kevin Sánchez)

Calcula el pago proyectado para cualquier quincena o fecha de pago usando el motor de la app y las reglas reales verificadas con la colilla de diciembre 2025.

## Parámetros calibrados (verificados con colilla real)

| Concepto | Valor |
|----------|-------|
| Valor hora ordinaria 2026 | $23.196,87 |
| RDIARIO convención (para primas) | $321.183 |
| Factor recargo nocturno/hora | $8.856,58 (× 12 h/jornada) |
| Factor dominical/festivo/hora | $25.305,50 (× 11,5 h/jornada) |
| Retención en la Fuente | 11,43% (año fiscal 2026) |
| Salud | 4% |
| Pensión | 4% |
| Fondo de Solidaridad | 1% — ambas quincenas (ingresos > 4 SMLMV) |
| Cuota Sindical | 1% — solo 2ª quincena |

## Ciclo de turnos

- Anclaje: 2026-05-22 = inicio bloque NOCTURNO (posición 0)
- Ciclo 21 días: pos 0-6 NOCTURNO → pos 7-10 DESCANSO → pos 11-17 DIURNO → pos 18-20 DESCANSO
- Jornada: 11,5 h ordinarias + 0,5 h alimentación = 12 h totales
- Recargo nocturno: 12 h × $8.856,58
- Recargo dom./fest.: 11,5 h × $25.305,50

## Quincenas

- **Tipo A (1ª):** día 25 al 9 del mes siguiente — deducciones: Salud + Pensión + Retención + Fondo Solidaridad
- **Tipo B (2ª):** día 10 al 24 — deducciones: Salud + Pensión + Retención + Fondo Solidaridad + Sindical

## Primas extralegales (convención colectiva Drummond)

| Prima | Días | Fecha pago |
|-------|------|-----------|
| Semestral extralegal junio | 25 días × RDIARIO | 15 junio |
| Navidad extralegal | 30 días × RDIARIO | ~9 diciembre |
| Vacaciones extralegal | 29 días × RDIARIO | al inicio del disfrute |

## Prima legal ordinaria (Código Sustantivo del Trabajo)

- 15 días × RDIARIO por semestre
- Junio: pagada el 15 de junio junto con la prima extralegal
- Diciembre: pagada con la 1ª quincena de diciembre

## Procedimiento de cálculo

Cuando el usuario pida calcular una quincena o fecha de pago:

1. Determinar el período (tipo A o B, fechas inicio-fin)
2. Calcular posición en ciclo para cada día: `posEnCiclo = ((diff % 21) + 21) % 21`
3. Clasificar cada día: NOCTURNO/DESCANSO/DIURNO + domingo/festivo
4. Aplicar conceptos de pago según clasificación
5. Calcular deducciones según tipo de quincena
6. Si es 15 junio o 1ª quincena diciembre: sumar primas correspondientes
7. Presentar tabla de devengados + deducciones + neto

## Festivos Colombia 2026 relevantes

- 18 mayo: Ascensión del Señor
- 8 junio: Corpus Christi
- 15 junio: Sagrado Corazón
- 29 junio: San Pedro y San Pablo (lunes)
- 20 julio: Independencia
- 7 agosto: Batalla de Boyacá
- 17 agosto: Asunción de la Virgen (lunes)
- 12 octubre: Día de la Raza (lunes)
- 2 noviembre: Todos los Santos (lunes)
- 16 noviembre: Independencia de Cartagena (lunes)
- 8 diciembre: Inmaculada Concepción
- 25 diciembre: Navidad

## Validación con colilla real

Colilla dic-2025 verificada: TOTAL PAGOS $19.027.470 / NETO $16.507.670
- Salario hora dic-2025: $22.071,23
- Retención dic-2025: 10,94% (cambió a 11,43% en año fiscal 2026)
- RDIARIO dic-2025: $305.588 → escalado a 2026: $321.183

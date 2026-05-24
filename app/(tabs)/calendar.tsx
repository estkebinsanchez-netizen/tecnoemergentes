import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  useColorScheme,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useConfig } from '../../src/hooks/useConfig';
import { clasificarDia } from '../../src/engine/shifts';
import { useTheme, Colors, Typography, Spacing, Radius } from '../../src/theme';
import type { TipoTurno } from '../../src/types';

dayjs.locale('es');

const DIAS_HEADER = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

function turnoColor(tipo: TipoTurno, dark: boolean) {
  switch (tipo) {
    case 'NOCTURNO': return { bg: dark ? Colors.nocturno.dark : Colors.nocturno.light, text: Colors.nocturno.text };
    case 'DIURNO': return { bg: dark ? Colors.diurno.dark : Colors.diurno.light, text: Colors.diurno.text };
    case 'DESCANSO': return { bg: dark ? Colors.descanso.dark : Colors.descanso.light, text: Colors.descanso.text };
  }
}

const TURNO_LABEL: Record<TipoTurno, string> = {
  NOCTURNO: 'Nocturno',
  DIURNO: 'Diurno',
  DESCANSO: 'Descanso',
};

export default function CalendarScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const t = useTheme(dark);
  const { config } = useConfig();

  const hoy = dayjs();
  const [mes, setMes] = useState(hoy);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  const diasDelMes = useMemo(() => {
    const inicio = mes.startOf('month');
    const fin = mes.endOf('month');
    const result: ({ fecha: string } & ReturnType<typeof clasificarDia> | null)[] = [];

    for (let i = 0; i < inicio.day(); i++) result.push(null);

    let c = inicio;
    while (!c.isAfter(fin)) {
      const fecha = c.format('YYYY-MM-DD');
      result.push({ ...clasificarDia(fecha, config), fecha });
      c = c.add(1, 'day');
    }
    return result;
  }, [mes, config]);

  const infoSel = seleccionado ? clasificarDia(seleccionado, config) : null;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: t.bg }]}>
      {/* Barra superior */}
      <View style={[s.topBar, { borderBottomColor: t.separator }]}>
        <Text style={[s.topTitle, { color: t.text }]}>Turnos</Text>
      </View>

      <ScrollView>
        {/* Navegación de mes */}
        <View style={[s.navMes, { borderBottomColor: t.separator }]}>
          <TouchableOpacity style={s.navBtn} onPress={() => setMes((m) => m.subtract(1, 'month'))}>
            <Text style={[s.navArrow, { color: Colors.accent }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[s.mesLabel, { color: t.text }]}>
            {mes.format('MMMM YYYY')}
          </Text>
          <TouchableOpacity style={s.navBtn} onPress={() => setMes((m) => m.add(1, 'month'))}>
            <Text style={[s.navArrow, { color: Colors.accent }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Cabecera días semana */}
        <View style={[s.semanaRow, { backgroundColor: t.card, borderBottomColor: t.separator }]}>
          {DIAS_HEADER.map((d) => (
            <Text
              key={d}
              style={[s.semanaLabel, { color: d === 'Do' ? Colors.negative : t.textTertiary }]}
            >
              {d}
            </Text>
          ))}
        </View>

        {/* Grid */}
        <View style={[s.grid, { backgroundColor: t.bg }]}>
          {diasDelMes.map((dia, idx) => {
            if (!dia) return <View key={`e${idx}`} style={s.celdaVacia} />;

            const esHoy = dia.fecha === hoy.format('YYYY-MM-DD');
            const esSel = dia.fecha === seleccionado;
            const col = turnoColor(dia.tipo, dark);
            const esDom = dayjs(dia.fecha).day() === 0;

            return (
              <TouchableOpacity
                key={dia.fecha}
                style={[
                  s.celda,
                  { backgroundColor: col.bg },
                  esHoy && s.celdaHoy,
                  esSel && { borderWidth: 2, borderColor: Colors.accent },
                ]}
                onPress={() => setSeleccionado(esSel ? null : dia.fecha)}
                activeOpacity={0.7}
              >
                <Text style={[
                  s.celdaNum,
                  { color: esDom ? Colors.negative : col.text },
                  esHoy && s.celdaNumHoy,
                ]}>
                  {dayjs(dia.fecha).date()}
                </Text>
                {dia.esFestivo && (
                  <View style={[s.festPunto, { backgroundColor: Colors.warning }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Detalle día seleccionado */}
        {seleccionado && infoSel && (
          <View style={[s.detalle, { backgroundColor: t.card, borderTopColor: t.separator }]}>
            <Text style={[s.detalleFecha, { color: t.text }]}>
              {dayjs(seleccionado).format('dddd, D [de] MMMM')}
            </Text>
            <View style={s.detalleRow}>
              <View style={[s.detalleBadge, { backgroundColor: turnoColor(infoSel.tipo, dark).bg }]}>
                <Text style={[s.detalleBadgeText, { color: turnoColor(infoSel.tipo, dark).text }]}>
                  {TURNO_LABEL[infoSel.tipo]}
                  {infoSel.numeroDia ? ` · día ${infoSel.numeroDia}` : ''}
                </Text>
              </View>
              {infoSel.esDomingo && (
                <View style={[s.detalleBadge, { backgroundColor: dark ? '#2A0D0D' : '#FFF5F5' }]}>
                  <Text style={[s.detalleBadgeText, { color: Colors.negative }]}>Domingo</Text>
                </View>
              )}
              {infoSel.esFestivo && (
                <View style={[s.detalleBadge, { backgroundColor: dark ? '#2A1E00' : '#FFF8EE' }]}>
                  <Text style={[s.detalleBadgeText, { color: Colors.warning }]}>
                    {infoSel.nombreFestivo}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Leyenda */}
        <View style={[s.leyenda, { borderTopColor: t.separator }]}>
          {(['NOCTURNO', 'DIURNO', 'DESCANSO'] as TipoTurno[]).map((tipo) => {
            const col = turnoColor(tipo, dark);
            return (
              <View key={tipo} style={s.leyendaItem}>
                <View style={[s.leyendaSquare, { backgroundColor: col.bg }]} />
                <Text style={[s.leyendaText, { color: t.textSecondary }]}>
                  {TURNO_LABEL[tipo]}
                </Text>
              </View>
            );
          })}
          <View style={s.leyendaItem}>
            <View style={[s.festPunto, { backgroundColor: Colors.warning }]} />
            <Text style={[s.leyendaText, { color: t.textSecondary }]}>Festivo</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  topTitle: { ...Typography.headline },
  navMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 24, fontWeight: '300' },
  mesLabel: { ...Typography.title3, textTransform: 'capitalize' },
  semanaRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  semanaLabel: { flex: 1, textAlign: 'center', ...Typography.caption2, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 4 },
  celdaVacia: { width: '14.28%', aspectRatio: 1.1, padding: 2 },
  celda: {
    width: '14.28%',
    aspectRatio: 1.1,
    margin: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  celdaHoy: { borderWidth: 2, borderColor: Colors.accent },
  celdaNum: { ...Typography.footnote, fontWeight: '600' },
  celdaNumHoy: { fontWeight: '800' },
  festPunto: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  detalle: {
    padding: Spacing.md,
    borderTopWidth: 0.5,
  },
  detalleFecha: {
    ...Typography.headline,
    textTransform: 'capitalize',
    marginBottom: 10,
  },
  detalleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detalleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  detalleBadgeText: { ...Typography.footnote, fontWeight: '600' },
  leyenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: Spacing.md,
    borderTopWidth: 0.5,
  },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaSquare: { width: 12, height: 12, borderRadius: 3 },
  leyendaText: { ...Typography.caption },
});

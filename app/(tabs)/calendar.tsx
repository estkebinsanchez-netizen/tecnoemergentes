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
import { useConfig } from '../../src/hooks/useConfig';
import { clasificarDia } from '../../src/engine/shifts';
import type { TipoTurno } from '../../src/types';

const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function colorTurno(tipo: TipoTurno, dark: boolean) {
  switch (tipo) {
    case 'DIURNO': return { bg: '#FFF9C4', text: '#F57F17', border: '#F9A825' };
    case 'NOCTURNO': return { bg: '#E3F2FD', text: '#1565C0', border: '#1976D2' };
    case 'DESCANSO': return { bg: dark ? '#1e3a28' : '#E8F5E9', text: '#2E7D32', border: '#388E3C' };
  }
}

function leyendaLabel(tipo: TipoTurno) {
  switch (tipo) {
    case 'DIURNO': return '☀️ Diurno';
    case 'NOCTURNO': return '🌙 Nocturno';
    case 'DESCANSO': return '🏖 Descanso';
  }
}

export default function CalendarScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const s = styles(dark);
  const { config } = useConfig();

  const hoy = dayjs();
  const [mesActual, setMesActual] = useState(hoy);

  const diasDelMes = useMemo(() => {
    const inicio = mesActual.startOf('month');
    const fin = mesActual.endOf('month');
    const dias = [];

    // Días vacíos al inicio (domingo = 0)
    const primerDia = inicio.day();
    for (let i = 0; i < primerDia; i++) {
      dias.push(null);
    }

    let cursor = inicio;
    while (!cursor.isAfter(fin)) {
      const fecha = cursor.format('YYYY-MM-DD');
      const clasificado = clasificarDia(fecha, config);
      dias.push({ ...clasificado, fecha });
      cursor = cursor.add(1, 'day');
    }
    return dias;
  }, [mesActual, config]);

  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const infoSeleccionado = diaSeleccionado
    ? clasificarDia(diaSeleccionado, config)
    : null;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Calendario de Turnos</Text>
      </View>

      <ScrollView>
        {/* Navegación de mes */}
        <View style={s.navMes}>
          <TouchableOpacity
            style={s.navBtn}
            onPress={() => setMesActual((m) => m.subtract(1, 'month'))}
          >
            <Text style={s.navBtnText}>◀</Text>
          </TouchableOpacity>
          <Text style={s.mesLabel}>
            {MESES[mesActual.month()]} {mesActual.year()}
          </Text>
          <TouchableOpacity
            style={s.navBtn}
            onPress={() => setMesActual((m) => m.add(1, 'month'))}
          >
            <Text style={s.navBtnText}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Encabezados días de semana */}
        <View style={s.semanaHeader}>
          {DIAS_SEMANA.map((d) => (
            <View key={d} style={s.diaSemanaBox}>
              <Text style={[s.diaSemanaText, d === 'Do' && { color: '#e53935' }]}>
                {d}
              </Text>
            </View>
          ))}
        </View>

        {/* Grid del mes */}
        <View style={s.grid}>
          {diasDelMes.map((dia, idx) => {
            if (!dia) {
              return <View key={`empty-${idx}`} style={s.diaVacio} />;
            }
            const esHoy = dia.fecha === hoy.format('YYYY-MM-DD');
            const esSeleccionado = dia.fecha === diaSeleccionado;
            const colores = colorTurno(dia.tipo, dark);
            const esDomingo = dayjs(dia.fecha).day() === 0;

            return (
              <TouchableOpacity
                key={dia.fecha}
                style={[
                  s.diaBox,
                  { backgroundColor: colores.bg, borderColor: colores.border },
                  esHoy && s.diaHoy,
                  esSeleccionado && s.diaSeleccionado,
                ]}
                onPress={() =>
                  setDiaSeleccionado(
                    esSeleccionado ? null : dia.fecha,
                  )
                }
              >
                <Text
                  style={[
                    s.diaNum,
                    { color: esDomingo ? '#e53935' : colores.text },
                    esHoy && s.diaNumHoy,
                  ]}
                >
                  {dayjs(dia.fecha).date()}
                </Text>
                {(dia.esFestivo) && (
                  <Text style={s.diaFestMarca}>◆</Text>
                )}
                <Text style={[s.diaTipo, { color: colores.text }]}>
                  {dia.tipo === 'DIURNO' ? '☀' : dia.tipo === 'NOCTURNO' ? '🌙' : '🏖'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Detalle del día seleccionado */}
        {infoSeleccionado && diaSeleccionado && (
          <View style={s.detalleDia}>
            <Text style={s.detalleTitle}>
              {dayjs(diaSeleccionado).format('dddd D [de] MMMM YYYY')}
            </Text>
            <View
              style={[
                s.detalleBadge,
                { backgroundColor: colorTurno(infoSeleccionado.tipo, dark).bg },
              ]}
            >
              <Text
                style={[
                  s.detalleBadgeText,
                  { color: colorTurno(infoSeleccionado.tipo, dark).text },
                ]}
              >
                {leyendaLabel(infoSeleccionado.tipo)}
                {infoSeleccionado.numeroDia
                  ? ` — día ${infoSeleccionado.numeroDia}`
                  : ''}
              </Text>
            </View>
            {infoSeleccionado.esDomingo && (
              <Text style={s.detalleSub}>📅 Domingo</Text>
            )}
            {infoSeleccionado.esFestivo && (
              <Text style={s.detalleSub}>
                ◆ Festivo: {infoSeleccionado.nombreFestivo}
              </Text>
            )}
          </View>
        )}

        {/* Leyenda */}
        <View style={s.leyenda}>
          {(['NOCTURNO', 'DIURNO', 'DESCANSO'] as TipoTurno[]).map((tipo) => {
            const col = colorTurno(tipo, dark);
            return (
              <View key={tipo} style={s.leyendaItem}>
                <View style={[s.leyendaColor, { backgroundColor: col.bg, borderColor: col.border }]} />
                <Text style={[s.leyendaText, { color: col.text }]}>
                  {leyendaLabel(tipo)}
                </Text>
              </View>
            );
          })}
          <View style={s.leyendaItem}>
            <Text style={s.leyendaFestMarca}>◆</Text>
            <Text style={s.leyendaText}>Festivo</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (dark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: dark ? '#0f0f23' : '#f0f4f8' },
    header: {
      backgroundColor: dark ? '#1a1a2e' : '#1565C0',
      padding: 16,
      paddingTop: 20,
    },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    navMes: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: dark ? '#1a1a2e' : '#1976D2',
    },
    navBtn: { padding: 8 },
    navBtnText: { color: '#fff', fontSize: 18 },
    mesLabel: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    semanaHeader: {
      flexDirection: 'row',
      paddingHorizontal: 4,
      paddingVertical: 8,
      backgroundColor: dark ? '#1e1e3a' : '#fff',
    },
    diaSemanaBox: { flex: 1, alignItems: 'center' },
    diaSemanaText: { fontSize: 12, color: dark ? '#aaa' : '#666', fontWeight: '600' },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 4,
      backgroundColor: dark ? '#0f0f23' : '#f0f4f8',
    },
    diaVacio: { width: '14.28%', aspectRatio: 1, padding: 2 },
    diaBox: {
      width: '14.28%',
      aspectRatio: 0.9,
      padding: 2,
      margin: 1,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    diaHoy: { borderWidth: 3, borderColor: '#FF6F00' },
    diaSeleccionado: { borderWidth: 3, borderColor: '#7B1FA2' },
    diaNum: { fontSize: 13, fontWeight: 'bold' },
    diaNumHoy: { textDecorationLine: 'underline' },
    diaFestMarca: { fontSize: 8, color: '#FF8F00' },
    diaTipo: { fontSize: 10 },
    detalleDia: {
      margin: 16,
      padding: 16,
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderRadius: 12,
    },
    detalleTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: dark ? '#e0e0e0' : '#333',
      marginBottom: 8,
      textTransform: 'capitalize',
    },
    detalleBadge: { padding: 8, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 4 },
    detalleBadgeText: { fontWeight: 'bold', fontSize: 14 },
    detalleSub: { color: dark ? '#aaa' : '#666', fontSize: 13, marginTop: 4 },
    leyenda: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 16,
      gap: 12,
    },
    leyendaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
    leyendaColor: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, marginRight: 4 },
    leyendaFestMarca: { color: '#FF8F00', marginRight: 4 },
    leyendaText: { fontSize: 12, color: dark ? '#aaa' : '#555' },
  });

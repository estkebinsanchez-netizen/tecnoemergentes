import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { useConfig } from '../../src/hooks/useConfig';
import { useQuincenas } from '../../src/hooks/useQuincenas';
import { formatCOP } from '../../src/utils/formatting';
import type { LiquidacionQuincena } from '../../src/types';
import dayjs from 'dayjs';

const { width: SCREEN_W } = Dimensions.get('window');
const BAR_W = SCREEN_W - 64;

// Gráfico de barras simple sin dependencias externas
function BarChart({
  data,
  dark,
}: {
  data: { label: string; bruto: number; neto: number }[];
  dark: boolean;
}) {
  const maxVal = Math.max(...data.map((d) => d.bruto));
  const BAR_HEIGHT = 18;

  return (
    <View>
      {data.map((d, i) => {
        const pctBruto = (d.bruto / maxVal) * 100;
        const pctNeto = (d.neto / maxVal) * 100;
        return (
          <View key={i} style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 10, color: dark ? '#aaa' : '#666', marginBottom: 2 }}>
              {d.label}
            </Text>
            {/* Barra bruto */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <View
                style={{
                  width: `${pctBruto}%`,
                  height: BAR_HEIGHT,
                  backgroundColor: '#1976D2',
                  borderRadius: 3,
                  maxWidth: BAR_W,
                }}
              />
              <Text style={{ fontSize: 10, color: '#1976D2', marginLeft: 6 }}>
                {formatCOP(d.bruto)}
              </Text>
            </View>
            {/* Barra neto */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: `${pctNeto}%`,
                  height: BAR_HEIGHT,
                  backgroundColor: '#2E7D32',
                  borderRadius: 3,
                  maxWidth: BAR_W,
                }}
              />
              <Text style={{ fontSize: 10, color: '#2E7D32', marginLeft: 6 }}>
                {formatCOP(d.neto)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function ChartsScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const s = styles(dark);
  const { config, loading } = useConfig();
  const { liquidaciones } = useQuincenas(config);

  const hoy = dayjs().format('YYYY-MM-DD');

  // Próximas 12 quincenas
  const proximas = useMemo(
    () => liquidaciones.filter((q) => q.fechaFin >= hoy).slice(0, 12),
    [liquidaciones, hoy],
  );

  // Agrupación mensual
  const porMes = useMemo(() => {
    const mapa = new Map<string, { bruto: number; neto: number; label: string }>();
    for (const q of liquidaciones) {
      const key = q.fechaInicio.slice(0, 7); // YYYY-MM
      const existing = mapa.get(key);
      if (existing) {
        existing.bruto += q.totalBruto;
        existing.neto += q.neto;
      } else {
        const d = dayjs(q.fechaInicio);
        mapa.set(key, {
          bruto: q.totalBruto,
          neto: q.neto,
          label: d.format('MMM YY'),
        });
      }
    }
    return Array.from(mapa.values()).slice(0, 12);
  }, [liquidaciones]);

  const totalNeto = proximas.reduce((s, q) => s + q.neto, 0);
  const avgNeto = proximas.length > 0 ? totalNeto / proximas.length : 0;

  const chartDataQuincenas = proximas.map((q) => ({
    label: q.etiqueta.replace('quincena ', 'Q ').replace(' 2026', ''),
    bruto: q.totalBruto,
    neto: q.neto,
  }));

  if (loading) return null;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Gráficos de Proyección</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Tarjetas de resumen */}
        <View style={s.cards}>
          <View style={s.card}>
            <Text style={s.cardLabel}>Neto promedio</Text>
            <Text style={s.cardValue}>{formatCOP(avgNeto)}</Text>
            <Text style={s.cardSub}>por quincena</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Total proyectado</Text>
            <Text style={s.cardValue}>{formatCOP(totalNeto)}</Text>
            <Text style={s.cardSub}>{proximas.length} quincenas</Text>
          </View>
        </View>

        {/* Leyenda */}
        <View style={s.leyenda}>
          <View style={[s.leyendaColor, { backgroundColor: '#1976D2' }]} />
          <Text style={s.leyendaText}> Bruto</Text>
          <View style={[s.leyendaColor, { backgroundColor: '#2E7D32', marginLeft: 16 }]} />
          <Text style={s.leyendaText}> Neto</Text>
        </View>

        {/* Gráfico por quincena */}
        <Text style={s.sectionTitle}>Proyección por quincena (próximas 12)</Text>
        <View style={s.chartBox}>
          <BarChart data={chartDataQuincenas} dark={dark} />
        </View>

        {/* Gráfico mensual */}
        <Text style={s.sectionTitle}>Comparativa mensual (bruto + neto)</Text>
        <View style={s.chartBox}>
          <BarChart data={porMes} dark={dark} />
        </View>

        {/* Tabla resumida */}
        <Text style={s.sectionTitle}>Tabla de proyección</Text>
        <View style={s.tabla}>
          <View style={s.tablaHeader}>
            <Text style={[s.tablaCel, { flex: 2 }]}>Quincena</Text>
            <Text style={[s.tablaCel, s.tablaRight]}>Bruto</Text>
            <Text style={[s.tablaCel, s.tablaRight]}>Neto</Text>
          </View>
          {proximas.map((q) => (
            <View
              key={q.quincenaId}
              style={[s.tablaFila, q.fechaInicio <= hoy && hoy <= q.fechaFin && s.filaActual]}
            >
              <Text style={[s.tablaCel, { flex: 2, fontSize: 11 }]} numberOfLines={1}>
                {q.etiqueta}
              </Text>
              <Text style={[s.tablaCel, s.tablaRight, { color: '#1976D2' }]}>
                {(q.totalBruto / 1000).toFixed(0)}k
              </Text>
              <Text style={[s.tablaCel, s.tablaRight, { color: '#2E7D32', fontWeight: 'bold' }]}>
                {(q.neto / 1000).toFixed(0)}k
              </Text>
            </View>
          ))}
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
    cards: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    card: {
      flex: 1,
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    cardLabel: { fontSize: 11, color: dark ? '#888' : '#666', marginBottom: 4 },
    cardValue: { fontSize: 18, fontWeight: 'bold', color: '#1565C0' },
    cardSub: { fontSize: 10, color: dark ? '#666' : '#999', marginTop: 2 },
    leyenda: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    leyendaColor: { width: 14, height: 14, borderRadius: 3 },
    leyendaText: { fontSize: 12, color: dark ? '#ccc' : '#555' },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: dark ? '#e0e0e0' : '#333',
      marginBottom: 10,
      marginTop: 8,
    },
    chartBox: {
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    tabla: {
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 20,
    },
    tablaHeader: {
      flexDirection: 'row',
      backgroundColor: '#1565C0',
      padding: 10,
    },
    tablaCel: { flex: 1, color: dark ? '#e0e0e0' : '#333', fontSize: 12 },
    tablaRight: { textAlign: 'right' },
    tablaFila: {
      flexDirection: 'row',
      padding: 8,
      borderBottomWidth: 1,
      borderBottomColor: dark ? '#2d2d44' : '#f0f0f0',
    },
    filaActual: { backgroundColor: dark ? '#162742' : '#e3f2fd' },
  });

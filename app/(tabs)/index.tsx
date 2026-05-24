import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import dayjs from 'dayjs';

import { useConfig } from '../../src/hooks/useConfig';
import { useQuincenas } from '../../src/hooks/useQuincenas';
import { formatCOP, formatRango } from '../../src/utils/formatting';
import { useTheme, Colors, Typography, Spacing, Radius } from '../../src/theme';
import type { LiquidacionQuincena } from '../../src/types';

export default function ProyeccionScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const t = useTheme(dark);
  const router = useRouter();

  const { config, loading } = useConfig();
  const { liquidaciones } = useQuincenas(config);

  const hoy = dayjs().format('YYYY-MM-DD');

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  const quincenaActual = liquidaciones.find(
    (q) => hoy >= q.fechaInicio && hoy <= q.fechaFin,
  );
  const futuras = liquidaciones.filter((q) => q.fechaFin >= hoy);
  const totalFuturo = futuras.reduce((sum, q) => sum + q.neto, 0);

  async function exportarPDF() {
    const filas = liquidaciones
      .map(
        (q) =>
          `<tr>
            <td>${q.etiqueta}</td>
            <td style="text-align:right">${formatCOP(q.totalBruto)}</td>
            <td style="text-align:right;color:#FF3B30">${formatCOP(q.totalDeducciones)}</td>
            <td style="text-align:right;font-weight:700;color:#34C759">${formatCOP(q.neto)}</td>
          </tr>`,
      )
      .join('');

    const html = `<html><head><meta charset="utf-8"/>
      <style>
        body{font-family:-apple-system,Arial;font-size:12px;padding:24px;color:#1C1C1E}
        h1{font-size:20px;font-weight:700;margin-bottom:4px}
        p{color:#6C6C70;font-size:12px;margin:0 0 20px}
        table{width:100%;border-collapse:collapse}
        th{background:#007AFF;color:#fff;padding:10px 8px;text-align:left;font-size:11px}
        td{padding:8px;border-bottom:1px solid #F2F2F7;font-size:12px}
        tr:nth-child(even) td{background:#F9F9F9}
      </style></head><body>
      <h1>Proyección de Quincenas</h1>
      <p>Generado ${dayjs().format('DD/MM/YYYY')}${config.nombre ? ` · ${config.nombre}` : ''}</p>
      <table>
        <tr><th>Quincena</th><th>Bruto</th><th>Descuentos</th><th>Neto</th></tr>
        ${filas}
      </table>
      <p style="margin-top:16px;font-size:10px;color:#AEAEB2">
        ⚠ Proyección estimada. Verificar factores de recargo con liquidación real.
      </p></body></html>`;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  }

  function QuincenaRow({ item: q }: { item: LiquidacionQuincena }) {
    const esActual = q.fechaInicio <= hoy && hoy <= q.fechaFin;
    const esPasada = q.fechaFin < hoy;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/quincena/${q.quincenaId}`)}
        activeOpacity={0.6}
        style={[
          s.row,
          { backgroundColor: t.card, borderBottomColor: t.separator },
          esActual && { backgroundColor: dark ? '#0D1A33' : '#EEF4FF' },
        ]}
      >
        {/* Indicador lateral */}
        {esActual && <View style={s.indicador} />}

        <View style={s.rowContent}>
          <View style={s.rowLeft}>
            {/* Tipo de quincena */}
            <View style={s.rowMeta}>
              <Text style={[s.rowTipo, { color: esActual ? Colors.accent : t.textTertiary }]}>
                {q.tipo === 'B' ? '2ª quincena' : '1ª quincena'}
              </Text>
              {esActual && (
                <View style={s.chipActual}>
                  <Text style={s.chipActualText}>HOY</Text>
                </View>
              )}
            </View>

            {/* Mes y año */}
            <Text
              style={[
                s.rowMes,
                { color: esPasada ? t.textSecondary : t.text },
                esActual && { color: Colors.accent },
              ]}
            >
              {q.etiqueta.replace('ª quincena ', ' ').replace('1 ', '1ª ').replace('2 ', '2ª ')}
            </Text>

            {/* Rango de fechas */}
            <Text style={[s.rowRango, { color: t.textTertiary }]}>
              {formatRango(q.fechaInicio, q.fechaFin)}
            </Text>

            {/* Resumen de días */}
            <View style={s.diasRow}>
              {q.diasNocturnos > 0 && (
                <Text style={[s.diaChip, { color: Colors.nocturno.text }]}>
                  {q.diasNocturnos}N
                </Text>
              )}
              {q.diasDiurnos > 0 && (
                <Text style={[s.diaChip, { color: '#92400E' }]}>
                  {q.diasDiurnos}D
                </Text>
              )}
              {q.diasDescanso > 0 && (
                <Text style={[s.diaChip, { color: Colors.descanso.text }]}>
                  {q.diasDescanso}R
                </Text>
              )}
              {q.diasDomFestTrabajados > 0 && (
                <Text style={[s.diaChip, { color: Colors.warning }]}>
                  {q.diasDomFestTrabajados}F
                </Text>
              )}
            </View>
          </View>

          {/* Monto neto */}
          <View style={s.rowRight}>
            <Text style={[s.rowNeto, { color: esPasada ? t.textSecondary : Colors.positive }]}>
              {formatCOP(q.neto)}
            </Text>
            <Text style={[s.rowBruto, { color: t.textTertiary }]}>
              {formatCOP(q.totalBruto)}
            </Text>
            <Ionicons style={s.chevron} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Componente header de la lista
  function ListHeader() {
    return (
      <>
        {/* Hero — quincena actual */}
        {quincenaActual && (
          <View style={[s.hero, { backgroundColor: t.card }]}>
            <Text style={[s.heroLabel, { color: t.textSecondary }]}>
              Neto estimado · quincena actual
            </Text>
            <Text style={[s.heroNeto, { color: t.text }]}>
              {formatCOP(quincenaActual.neto)}
            </Text>
            <View style={s.heroSub}>
              <Text style={[s.heroSubText, { color: t.textTertiary }]}>
                Bruto {formatCOP(quincenaActual.totalBruto)}
              </Text>
              <View style={[s.heroDot, { backgroundColor: t.separator }]} />
              <Text style={[s.heroSubText, { color: Colors.negative }]}>
                −{formatCOP(quincenaActual.totalDeducciones)}
              </Text>
            </View>
            <View style={[s.heroDivider, { backgroundColor: t.separator }]} />
            <Text style={[s.heroTotal, { color: t.textSecondary }]}>
              Proyectado restante 2026 ·{' '}
              <Text style={{ color: t.text, fontWeight: '600' }}>
                {formatCOP(totalFuturo)}
              </Text>
            </Text>
          </View>
        )}

        {/* Acción exportar */}
        <View style={[s.actionsBar, { borderBottomColor: t.separator }]}>
          <Text style={[s.sectionTitle, { color: t.textSecondary }]}>
            TODAS LAS QUINCENAS
          </Text>
          <TouchableOpacity onPress={exportarPDF}>
            <Text style={[s.exportLink, { color: Colors.accent }]}>Exportar PDF</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      {/* Barra superior */}
      <View style={[s.topBar, { borderBottomColor: t.separator }]}>
        <Text style={[s.topTitle, { color: t.text }]}>Turnos & Quincenas</Text>
        {config.nombre ? (
          <Text style={[s.topName, { color: t.textSecondary }]}>{config.nombre}</Text>
        ) : null}
      </View>

      <FlatList
        data={liquidaciones}
        keyExtractor={(q) => q.quincenaId}
        renderItem={QuincenaRow}
        ListHeaderComponent={ListHeader}
        initialScrollIndex={Math.max(0, liquidaciones.findIndex((q) => q.fechaFin >= hoy) - 1)}
        getItemLayout={(_, index) => ({ length: 100, offset: 100 * index, index })}
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {/* Nota de advertencia */}
      <View style={[s.footer, { backgroundColor: t.card, borderTopColor: t.separator }]}>
        <Text style={[s.footerText, { color: t.textTertiary }]}>
          ⚠ Proyección estimada · Verifica en Ajustes
        </Text>
      </View>
    </SafeAreaView>
  );
}

// Componente Ionicons simplificado (solo el chevron)
function Ionicons({ style }: { style?: object }) {
  return (
    <Text style={[{ color: '#AEAEB2', fontSize: 16, marginTop: 4 }, style]}>›</Text>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },

  topBar: {
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: { ...Typography.headline },
  topName: { ...Typography.subhead },

  // Hero card
  hero: {
    margin: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  heroLabel: { ...Typography.caption, letterSpacing: 0.3 },
  heroNeto: { ...Typography.largeTitle, marginTop: 4, marginBottom: 4 },
  heroSub: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroSubText: { ...Typography.footnote },
  heroDot: { width: 3, height: 3, borderRadius: 1.5 },
  heroDivider: { height: 0.5, marginVertical: 12 },
  heroTotal: { ...Typography.footnote },

  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  sectionTitle: { ...Typography.caption2, letterSpacing: 0.6, textTransform: 'uppercase' },
  exportLink: { ...Typography.footnote },

  // Fila de quincena
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    overflow: 'hidden',
  },
  indicador: {
    width: 3,
    backgroundColor: Colors.accent,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  rowTipo: { ...Typography.caption2, letterSpacing: 0.3, textTransform: 'uppercase' },
  chipActual: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  chipActualText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  rowMes: { ...Typography.headline, marginBottom: 2 },
  rowRango: { ...Typography.caption, marginBottom: 6 },
  diasRow: { flexDirection: 'row', gap: 10 },
  diaChip: { ...Typography.caption2, fontWeight: '600' },

  rowRight: { alignItems: 'flex-end' },
  rowNeto: { ...Typography.title3, fontWeight: '700' },
  rowBruto: { ...Typography.caption, marginTop: 2 },
  chevron: {},

  footer: {
    padding: 12,
    borderTopWidth: 0.5,
    alignItems: 'center',
  },
  footerText: { ...Typography.caption2 },
});

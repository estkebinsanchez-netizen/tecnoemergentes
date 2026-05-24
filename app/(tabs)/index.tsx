import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import dayjs from 'dayjs';

import { useConfig } from '../../src/hooks/useConfig';
import { useQuincenas } from '../../src/hooks/useQuincenas';
import { formatCOP, formatRango } from '../../src/utils/formatting';
import type { LiquidacionQuincena } from '../../src/types';

export default function ProyeccionScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const s = styles(dark);
  const router = useRouter();

  const { config, loading } = useConfig();
  const { liquidaciones } = useQuincenas(config);

  const hoy = dayjs().format('YYYY-MM-DD');

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color="#1565C0" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const quinceenaActual = liquidaciones.find(
    (q) => hoy >= q.fechaInicio && hoy <= q.fechaFin,
  );

  async function exportarPDF() {
    const filas = liquidaciones
      .map(
        (q) =>
          `<tr>
            <td>${q.etiqueta}</td>
            <td style="text-align:right">${formatCOP(q.totalBruto)}</td>
            <td style="text-align:right; color:red">${formatCOP(q.totalDeducciones)}</td>
            <td style="text-align:right; font-weight:bold">${formatCOP(q.neto)}</td>
          </tr>`,
      )
      .join('');

    const html = `
      <html><head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Arial; font-size: 12px; padding: 20px; }
          h1 { color: #1565C0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1565C0; color: white; padding: 8px; }
          td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background: #f5f5f5; }
        </style>
      </head><body>
        <h1>Proyección de Quincenas — Turnos & Quincenas</h1>
        <p>Generado: ${dayjs().format('DD/MM/YYYY')}</p>
        ${config.nombre ? `<p>Trabajador: <strong>${config.nombre}</strong></p>` : ''}
        <table>
          <tr>
            <th>Quincena</th><th>Bruto</th><th>Deducciones</th><th>Neto</th>
          </tr>
          ${filas}
        </table>
        <p style="color:#888; font-size:10px; margin-top:20px;">
          ⚠ Proyección estimada. Factores de recargo pueden variar. Verificar con liquidación real.
        </p>
      </body></html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  }

  function renderQuincena({ item: q }: { item: LiquidacionQuincena }) {
    const esActual = q.fechaInicio <= hoy && hoy <= q.fechaFin;
    const esPasada = q.fechaFin < hoy;

    return (
      <TouchableOpacity
        style={[s.card, esActual && s.cardActual, esPasada && s.cardPasada]}
        onPress={() => router.push(`/quincena/${q.quincenaId}`)}
        activeOpacity={0.8}
      >
        <View style={s.cardHeader}>
          <Text style={[s.cardTitulo, esActual && s.cardTituloActual]}>
            {q.etiqueta}
          </Text>
          {esActual && (
            <View style={s.badgeActual}>
              <Text style={s.badgeText}>ACTUAL</Text>
            </View>
          )}
        </View>

        <Text style={s.cardRango}>{formatRango(q.fechaInicio, q.fechaFin)}</Text>

        <View style={s.cardMontos}>
          <View style={s.montoBox}>
            <Text style={s.montoLabel}>Bruto</Text>
            <Text style={s.montoBruto}>{formatCOP(q.totalBruto)}</Text>
          </View>
          <View style={s.montoBox}>
            <Text style={s.montoLabel}>Descuentos</Text>
            <Text style={s.montoDesc}>− {formatCOP(q.totalDeducciones)}</Text>
          </View>
          <View style={[s.montoBox, s.montoNetoBox]}>
            <Text style={s.montoLabel}>Neto</Text>
            <Text style={s.montoNeto}>{formatCOP(q.neto)}</Text>
          </View>
        </View>

        <View style={s.cardDias}>
          <Text style={s.diasText}>
            {q.diasNocturnos > 0 && `🌙 ${q.diasNocturnos}`}
            {q.diasDiurnos > 0 && `  ☀️ ${q.diasDiurnos}`}
            {q.diasDescanso > 0 && `  🏖 ${q.diasDescanso}`}
            {q.diasDomFestTrabajados > 0 && `  📅 ${q.diasDomFestTrabajados} dom/fest`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  const totalProyectado = liquidaciones
    .filter((q) => q.fechaInicio >= hoy)
    .reduce((s, q) => s + q.neto, 0);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Proyección de Quincenas</Text>
          <Text style={s.headerSub}>hasta dic 2026</Text>
        </View>
        <TouchableOpacity style={s.exportBtn} onPress={exportarPDF}>
          <Text style={s.exportText}>PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen superior */}
      {quinceenaActual && (
        <View style={s.resumen}>
          <Text style={s.resumenLabel}>Quincena actual — neto estimado</Text>
          <Text style={s.resumenNeto}>{formatCOP(quinceenaActual.neto)}</Text>
          <Text style={s.resumenSub}>
            Pendiente hasta dic 2026: {formatCOP(totalProyectado)}
          </Text>
        </View>
      )}

      <FlatList
        data={liquidaciones}
        keyExtractor={(q) => q.quincenaId}
        renderItem={renderQuincena}
        contentContainerStyle={s.list}
        initialScrollIndex={Math.max(
          0,
          liquidaciones.findIndex((q) => q.fechaFin >= hoy) - 1,
        )}
        getItemLayout={(_, index) => ({ length: 130, offset: 130 * index, index })}
      />

      <View style={s.disclaimer}>
        <Text style={s.disclaimerText}>
          ⚠ Proyección estimada. Verifica los factores de recargo con tu liquidación real en Ajustes.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = (dark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: dark ? '#0f0f23' : '#f0f4f8' },
    header: {
      backgroundColor: dark ? '#1a1a2e' : '#1565C0',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
    exportBtn: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
    },
    exportText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    resumen: {
      backgroundColor: dark ? '#1e3a5f' : '#1976D2',
      padding: 16,
      alignItems: 'center',
    },
    resumenLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
    resumenNeto: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginVertical: 4 },
    resumenSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    list: { padding: 12 },
    card: {
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    cardActual: {
      borderWidth: 2,
      borderColor: '#1565C0',
      backgroundColor: dark ? '#162742' : '#e3f2fd',
    },
    cardPasada: { opacity: 0.6 },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    cardTitulo: { fontSize: 14, fontWeight: '600', color: dark ? '#e0e0e0' : '#333' },
    cardTituloActual: { color: '#1565C0' },
    badgeActual: {
      backgroundColor: '#1565C0',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    cardRango: { fontSize: 12, color: dark ? '#aaa' : '#666', marginBottom: 10 },
    cardMontos: { flexDirection: 'row', justifyContent: 'space-between' },
    montoBox: { flex: 1, alignItems: 'center' },
    montoNetoBox: {
      backgroundColor: dark ? '#1a3d28' : '#e8f5e9',
      borderRadius: 8,
      paddingVertical: 4,
    },
    montoLabel: { fontSize: 10, color: dark ? '#888' : '#999', marginBottom: 2 },
    montoBruto: { fontSize: 13, fontWeight: '600', color: dark ? '#e0e0e0' : '#333' },
    montoDesc: { fontSize: 13, fontWeight: '600', color: '#e53935' },
    montoNeto: { fontSize: 14, fontWeight: 'bold', color: '#2e7d32' },
    cardDias: { marginTop: 8 },
    diasText: { fontSize: 12, color: dark ? '#aaa' : '#666' },
    disclaimer: {
      padding: 12,
      backgroundColor: dark ? '#1a1a2e' : '#fff3e0',
      borderTopWidth: 1,
      borderTopColor: dark ? '#333' : '#ffe0b2',
    },
    disclaimerText: { fontSize: 11, color: dark ? '#ffcc80' : '#e65100', textAlign: 'center' },
  });

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import dayjs from 'dayjs';

import { useConfig } from '../../src/hooks/useConfig';
import { useQuincenas } from '../../src/hooks/useQuincenas';
import { loadAjustes, saveAjuste, deleteAjuste } from '../../src/storage/database';
import { calcularQuincena } from '../../src/engine/payroll';
import { generarQuincenas } from '../../src/engine/periods';
import { formatCOP, formatHoras, formatRango } from '../../src/utils/formatting';
import type { AjusteManual, LiquidacionQuincena, ConceptoPago } from '../../src/types';

export default function DetalleQuincenaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const s = styles(dark);
  const { config } = useConfig();

  const [ajustes, setAjustes] = useState<AjusteManual[]>([]);
  const [modalAjuste, setModalAjuste] = useState(false);
  const [horasExtraD, setHorasExtraD] = useState('0');
  const [horasExtraN, setHorasExtraN] = useState('0');
  const [descAjuste, setDescAjuste] = useState('');
  const [notaAjuste, setNotaAjuste] = useState('');

  const quincenas = generarQuincenas(config);
  const quincena = quincenas.find((q) => q.id === id);

  const cargarAjustes = useCallback(async () => {
    if (!id) return;
    const data = await loadAjustes(id);
    setAjustes(data);
  }, [id]);

  useEffect(() => { cargarAjustes(); }, [cargarAjustes]);

  if (!quincena) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.error}>Quincena no encontrada.</Text>
      </SafeAreaView>
    );
  }

  const liquidacion = calcularQuincena(quincena, config, ajustes);

  async function guardarAjuste() {
    const eD = parseFloat(horasExtraD.replace(',', '.')) || 0;
    const eN = parseFloat(horasExtraN.replace(',', '.')) || 0;
    if (eD === 0 && eN === 0) {
      Alert.alert('Error', 'Ingresa al menos una hora extra.');
      return;
    }
    const nuevo: AjusteManual = {
      id: `aj_${id}_${Date.now()}`,
      quincenaId: id,
      descripcion: descAjuste || 'Ajuste manual',
      horasExtra: eD,
      tipoExtra: 'DIURNA',
      horasFestivos: eN,
      tipoFestivo: 'NOCTURNO',
      notas: notaAjuste,
    };
    await saveAjuste(nuevo);
    setModalAjuste(false);
    setHorasExtraD('0');
    setHorasExtraN('0');
    setDescAjuste('');
    setNotaAjuste('');
    cargarAjustes();
  }

  async function eliminarAjuste(ajId: string) {
    await deleteAjuste(ajId);
    cargarAjustes();
  }

  async function exportarDetalle() {
    const filaConceptos = liquidacion.conceptos
      .map(
        (c) =>
          `<tr>
            <td>${c.nombre}</td>
            <td style="text-align:right">${c.horas.toFixed(2)}</td>
            <td style="text-align:right">${formatCOP(c.valorUnitario)}</td>
            <td style="text-align:right; font-weight:bold">${formatCOP(c.total)}</td>
          </tr>`,
      )
      .join('');

    const filaDeducciones = liquidacion.deducciones
      .map(
        (d) =>
          `<tr>
            <td>${d.nombre}</td>
            <td colspan="2" style="text-align:right">${d.porcentaje.toFixed(2)}%</td>
            <td style="text-align:right; color:red">−${formatCOP(d.valor)}</td>
          </tr>`,
      )
      .join('');

    const html = `
      <html><head><meta charset="utf-8"/>
        <style>
          body { font-family: Arial; font-size: 12px; padding: 20px; }
          h1 { color: #1565C0; } h2 { color: #333; font-size: 14px; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #1565C0; color: white; padding: 8px; }
          td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
          .total { font-size: 14px; font-weight: bold; margin: 12px 0; }
          .neto { font-size: 18px; color: #2E7D32; font-weight: bold; }
        </style>
      </head><body>
        <h1>${liquidacion.etiqueta}</h1>
        <p>${formatRango(liquidacion.fechaInicio, liquidacion.fechaFin)}</p>
        <p>Días: ${liquidacion.diasNocturnos} nocturnos · ${liquidacion.diasDiurnos} diurnos · ${liquidacion.diasDescanso} descanso</p>
        <h2>Devengados</h2>
        <table>
          <tr><th>Concepto</th><th>Horas</th><th>Valor/hora</th><th>Total</th></tr>
          ${filaConceptos}
          <tr><td colspan="3"><strong>TOTAL BRUTO</strong></td><td style="text-align:right;font-weight:bold">${formatCOP(liquidacion.totalBruto)}</td></tr>
        </table>
        <h2>Deducciones</h2>
        <table>
          <tr><th>Concepto</th><th colspan="2">%</th><th>Valor</th></tr>
          ${filaDeducciones}
          <tr><td colspan="3"><strong>TOTAL DESCUENTOS</strong></td><td style="text-align:right;color:red;font-weight:bold">−${formatCOP(liquidacion.totalDeducciones)}</td></tr>
        </table>
        <div class="total neto" style="margin-top:16px">NETO A PAGAR: ${formatCOP(liquidacion.neto)}</div>
        <p style="color:#888; font-size:10px;">⚠ Proyección estimada. Verificar con liquidación real.</p>
      </body></html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  }

  function ConceptoRow({ c }: { c: ConceptoPago }) {
    return (
      <View style={s.conceptoRow}>
        <Text style={s.conceptoNombre} numberOfLines={2}>{c.nombre}</Text>
        <Text style={s.conceptoHoras}>{c.horas.toFixed(1)} h</Text>
        <Text style={s.conceptoTotal}>{formatCOP(c.total)}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Encabezado */}
        <View style={s.encabezado}>
          <Text style={s.titulo}>{liquidacion.etiqueta}</Text>
          <Text style={s.rango}>{formatRango(liquidacion.fechaInicio, liquidacion.fechaFin)}</Text>

          <View style={s.resumenDias}>
            {liquidacion.diasNocturnos > 0 && (
              <View style={s.badgeDia}>
                <Text style={s.badgeDiaText}>🌙 {liquidacion.diasNocturnos}</Text>
              </View>
            )}
            {liquidacion.diasDiurnos > 0 && (
              <View style={[s.badgeDia, { backgroundColor: '#FFF9C4' }]}>
                <Text style={[s.badgeDiaText, { color: '#F57F17' }]}>☀️ {liquidacion.diasDiurnos}</Text>
              </View>
            )}
            {liquidacion.diasDescanso > 0 && (
              <View style={[s.badgeDia, { backgroundColor: '#E8F5E9' }]}>
                <Text style={[s.badgeDiaText, { color: '#2E7D32' }]}>🏖 {liquidacion.diasDescanso}</Text>
              </View>
            )}
            {liquidacion.diasDomFestTrabajados > 0 && (
              <View style={[s.badgeDia, { backgroundColor: '#FBE9E7' }]}>
                <Text style={[s.badgeDiaText, { color: '#BF360C' }]}>📅 {liquidacion.diasDomFestTrabajados}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Devengados */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>📈 Conceptos devengados</Text>
          <View style={s.tablaHeader}>
            <Text style={[s.tablaHeaderTxt, { flex: 2 }]}>Concepto</Text>
            <Text style={s.tablaHeaderTxt}>Horas</Text>
            <Text style={s.tablaHeaderTxt}>Total</Text>
          </View>
          {liquidacion.conceptos.map((c, i) => (
            <ConceptoRow key={i} c={c} />
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL BRUTO</Text>
            <Text style={s.totalBruto}>{formatCOP(liquidacion.totalBruto)}</Text>
          </View>
        </View>

        {/* Deducciones */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>📉 Deducciones</Text>
          {liquidacion.deducciones.map((d, i) => (
            <View key={i} style={s.deduccionRow}>
              <Text style={s.deduccionNombre} numberOfLines={2}>{d.nombre}</Text>
              <Text style={s.deduccionPct}>{d.porcentaje.toFixed(2)}%</Text>
              <Text style={s.deduccionVal}>−{formatCOP(d.valor)}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL DESC.</Text>
            <Text style={s.totalDesc}>−{formatCOP(liquidacion.totalDeducciones)}</Text>
          </View>
        </View>

        {/* Neto */}
        <View style={s.netoBox}>
          <Text style={s.netoLabel}>NETO A PAGAR</Text>
          <Text style={s.netoValor}>{formatCOP(liquidacion.neto)}</Text>
        </View>

        {/* Ajustes manuales */}
        <View style={s.seccion}>
          <View style={s.seccionHeaderRow}>
            <Text style={s.seccionTitulo}>🔧 Ajustes manuales</Text>
            <TouchableOpacity style={s.addBtn} onPress={() => setModalAjuste(true)}>
              <Text style={s.addBtnText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>
          {ajustes.length === 0 && (
            <Text style={s.sinAjustes}>Sin ajustes. Agrega horas extra o festivos puntuales.</Text>
          )}
          {ajustes.map((aj) => (
            <View key={aj.id} style={s.ajusteRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.ajusteDesc}>{aj.descripcion}</Text>
                {aj.horasExtra > 0 && (
                  <Text style={s.ajusteSub}>Extra diurna: {aj.horasExtra} h</Text>
                )}
                {aj.horasFestivos > 0 && (
                  <Text style={s.ajusteSub}>Extra nocturna: {aj.horasFestivos} h</Text>
                )}
                {aj.notas ? <Text style={s.ajusteNota}>{aj.notas}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => eliminarAjuste(aj.id)}>
                <Text style={s.ajusteEliminar}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Exportar */}
        <TouchableOpacity style={s.exportBtn} onPress={exportarDetalle}>
          <Text style={s.exportBtnText}>📄 Exportar detalle en PDF</Text>
        </TouchableOpacity>

        <View style={s.disclaimer}>
          <Text style={s.disclaimerText}>
            ⚠ Proyección estimada. Los factores de recargo pueden diferir. Verifica en Ajustes.
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal de ajuste */}
      <Modal visible={modalAjuste} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalOverlay}
        >
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Agregar ajuste manual</Text>

            <Text style={s.inputLabel}>Descripción</Text>
            <TextInput
              style={s.input}
              value={descAjuste}
              onChangeText={setDescAjuste}
              placeholder="Ej. Horas extra semana santa"
              placeholderTextColor="#888"
            />
            <Text style={s.inputLabel}>Horas extra diurnas (recargo 25%)</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              value={horasExtraD}
              onChangeText={setHorasExtraD}
            />
            <Text style={s.inputLabel}>Horas extra nocturnas (recargo 40%)</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              value={horasExtraN}
              onChangeText={setHorasExtraN}
            />
            <Text style={s.inputLabel}>Notas</Text>
            <TextInput
              style={s.input}
              value={notaAjuste}
              onChangeText={setNotaAjuste}
              placeholder="Opcional"
              placeholderTextColor="#888"
            />

            <View style={s.modalBtns}>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: dark ? '#2d2d44' : '#f0f0f0' }]}
                onPress={() => setModalAjuste(false)}
              >
                <Text style={{ color: dark ? '#e0e0e0' : '#333', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: '#1565C0' }]}
                onPress={guardarAjuste}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (dark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: dark ? '#0f0f23' : '#f0f4f8' },
    content: { padding: 16 },
    error: { color: 'red', padding: 20 },
    encabezado: {
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    titulo: { fontSize: 18, fontWeight: 'bold', color: dark ? '#e0e0e0' : '#333' },
    rango: { fontSize: 13, color: dark ? '#aaa' : '#666', marginVertical: 4 },
    resumenDias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    badgeDia: {
      backgroundColor: '#E3F2FD',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeDiaText: { fontSize: 12, color: '#1565C0', fontWeight: '600' },
    seccion: {
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    seccionTitulo: { fontSize: 14, fontWeight: 'bold', color: dark ? '#e0e0e0' : '#333', marginBottom: 10 },
    seccionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    tablaHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: dark ? '#333' : '#eee',
      paddingBottom: 6,
      marginBottom: 6,
    },
    tablaHeaderTxt: { flex: 1, fontSize: 11, color: dark ? '#888' : '#999', fontWeight: '600', textAlign: 'right' },
    conceptoRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: dark ? '#2d2d44' : '#f5f5f5' },
    conceptoNombre: { flex: 2, fontSize: 12, color: dark ? '#d0d0d0' : '#444' },
    conceptoHoras: { flex: 1, fontSize: 12, color: dark ? '#aaa' : '#666', textAlign: 'right' },
    conceptoTotal: { flex: 1, fontSize: 12, color: dark ? '#e0e0e0' : '#333', textAlign: 'right', fontWeight: '500' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 4 },
    totalLabel: { fontSize: 13, fontWeight: 'bold', color: dark ? '#e0e0e0' : '#333' },
    totalBruto: { fontSize: 15, fontWeight: 'bold', color: '#1565C0' },
    totalDesc: { fontSize: 15, fontWeight: 'bold', color: '#e53935' },
    deduccionRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: dark ? '#2d2d44' : '#f5f5f5' },
    deduccionNombre: { flex: 2, fontSize: 12, color: dark ? '#d0d0d0' : '#444' },
    deduccionPct: { flex: 1, fontSize: 12, color: dark ? '#aaa' : '#666', textAlign: 'right' },
    deduccionVal: { flex: 1, fontSize: 12, color: '#e53935', textAlign: 'right', fontWeight: '500' },
    netoBox: {
      backgroundColor: dark ? '#1a3d28' : '#e8f5e9',
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
      marginBottom: 12,
    },
    netoLabel: { fontSize: 13, color: dark ? '#aaa' : '#555', marginBottom: 4 },
    netoValor: { fontSize: 28, fontWeight: 'bold', color: '#2E7D32' },
    addBtn: { backgroundColor: '#1565C0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    addBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    sinAjustes: { fontSize: 12, color: dark ? '#666' : '#999', fontStyle: 'italic' },
    ajusteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: dark ? '#2d2d44' : '#f5f5f5',
    },
    ajusteDesc: { fontSize: 13, color: dark ? '#d0d0d0' : '#333', fontWeight: '500' },
    ajusteSub: { fontSize: 12, color: dark ? '#aaa' : '#666', marginTop: 2 },
    ajusteNota: { fontSize: 11, color: dark ? '#666' : '#999', fontStyle: 'italic' },
    ajusteEliminar: { color: '#e53935', fontSize: 18, paddingLeft: 8 },
    exportBtn: {
      backgroundColor: dark ? '#1e3a5f' : '#e3f2fd',
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      marginBottom: 12,
    },
    exportBtnText: { color: '#1565C0', fontWeight: '600', fontSize: 14 },
    disclaimer: {
      padding: 12,
      backgroundColor: dark ? '#2d1f0a' : '#fff3e0',
      borderRadius: 8,
    },
    disclaimerText: { fontSize: 11, color: dark ? '#ffcc80' : '#e65100', textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalBox: {
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: dark ? '#e0e0e0' : '#333', marginBottom: 16 },
    inputLabel: { fontSize: 13, color: dark ? '#ccc' : '#555', marginBottom: 4 },
    input: {
      borderWidth: 1,
      borderColor: dark ? '#444' : '#ddd',
      borderRadius: 8,
      padding: 10,
      color: dark ? '#e0e0e0' : '#333',
      backgroundColor: dark ? '#0f0f23' : '#f9f9f9',
      marginBottom: 12,
      fontSize: 15,
    },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  });

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
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import dayjs from 'dayjs';

import { useConfig } from '../../src/hooks/useConfig';
import { loadAjustes, saveAjuste, deleteAjuste } from '../../src/storage/database';
import { calcularQuincena } from '../../src/engine/payroll';
import { generarQuincenas } from '../../src/engine/periods';
import { formatCOP, formatRango } from '../../src/utils/formatting';
import { useTheme, Colors, Typography, Spacing, Radius } from '../../src/theme';
import type { AjusteManual, ConceptoPago } from '../../src/types';

export default function DetalleQuincenaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const t = useTheme(dark);
  const router = useRouter();
  const { config } = useConfig();

  const [ajustes, setAjustes] = useState<AjusteManual[]>([]);
  const [modalAjuste, setModalAjuste] = useState(false);
  const [horasExtraD, setHorasExtraD] = useState('0');
  const [horasExtraN, setHorasExtraN] = useState('0');
  const [descAjuste, setDescAjuste] = useState('');

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
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <Text style={{ color: t.text, padding: 20 }}>Quincena no encontrada.</Text>
      </SafeAreaView>
    );
  }

  const liq = calcularQuincena(quincena, config, ajustes);

  async function guardarAjuste() {
    const eD = parseFloat(horasExtraD.replace(',', '.')) || 0;
    const eN = parseFloat(horasExtraN.replace(',', '.')) || 0;
    if (eD === 0 && eN === 0) {
      Alert.alert('Error', 'Ingresa al menos una hora extra.');
      return;
    }
    await saveAjuste({
      id: `aj_${id}_${Date.now()}`,
      quincenaId: id,
      descripcion: descAjuste || 'Ajuste manual',
      horasExtra: eD,
      tipoExtra: 'DIURNA',
      horasFestivos: eN,
      tipoFestivo: 'NOCTURNO',
      notas: '',
    });
    setModalAjuste(false);
    setHorasExtraD('0');
    setHorasExtraN('0');
    setDescAjuste('');
    cargarAjustes();
  }

  async function exportarDetalle() {
    const filaConceptos = liq.conceptos
      .map(
        (c) => `<tr>
          <td>${c.nombre}</td>
          <td style="text-align:right">${c.horas.toFixed(2)} h</td>
          <td style="text-align:right;font-weight:600">${formatCOP(c.total)}</td>
        </tr>`,
      ).join('');

    const filaDeducciones = liq.deducciones
      .map(
        (d) => `<tr>
          <td>${d.nombre}</td>
          <td style="text-align:right">${d.porcentaje.toFixed(2)}%</td>
          <td style="text-align:right;color:#FF3B30">−${formatCOP(d.valor)}</td>
        </tr>`,
      ).join('');

    const html = `<html><head><meta charset="utf-8"/>
      <style>
        body{font-family:-apple-system,Arial;font-size:12px;padding:24px;color:#1C1C1E}
        h1{font-size:18px;font-weight:700;margin-bottom:2px}
        .sub{color:#6C6C70;font-size:12px;margin-bottom:20px}
        h2{font-size:13px;font-weight:600;color:#6C6C70;text-transform:uppercase;letter-spacing:0.5px;margin:20px 0 8px}
        table{width:100%;border-collapse:collapse}
        td{padding:7px 4px;border-bottom:1px solid #F2F2F7;font-size:12px}
        .neto{font-size:22px;font-weight:700;color:#34C759;margin-top:20px}
        .note{font-size:10px;color:#AEAEB2;margin-top:16px}
      </style></head><body>
      <h1>${liq.etiqueta}</h1>
      <div class="sub">${formatRango(liq.fechaInicio, liq.fechaFin)}</div>
      <h2>Devengados</h2>
      <table>${filaConceptos}
        <tr><td colspan="2"><strong>Total bruto</strong></td>
        <td style="text-align:right;font-weight:700;color:#007AFF">${formatCOP(liq.totalBruto)}</td></tr>
      </table>
      <h2>Deducciones</h2>
      <table>${filaDeducciones}
        <tr><td colspan="2"><strong>Total descuentos</strong></td>
        <td style="text-align:right;font-weight:700;color:#FF3B30">−${formatCOP(liq.totalDeducciones)}</td></tr>
      </table>
      <div class="neto">Neto a pagar: ${formatCOP(liq.neto)}</div>
      <div class="note">⚠ Proyección estimada. Verificar con liquidación real.</div>
      </body></html>`;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  }

  function Separador() {
    return <View style={[s.sep, { backgroundColor: t.separator }]} />;
  }

  function FilaConcepto({ c }: { c: ConceptoPago }) {
    return (
      <View style={s.fila}>
        <Text style={[s.filaNombre, { color: t.text }]} numberOfLines={2}>{c.nombre}</Text>
        <Text style={[s.filaHoras, { color: t.textTertiary }]}>{c.horas.toFixed(1)} h</Text>
        <Text style={[s.filaTotal, { color: t.text }]}>{formatCOP(c.total)}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Encabezado */}
        <View style={[s.encabezado, { backgroundColor: t.card }]}>
          <Text style={[s.encTitulo, { color: t.textSecondary }]}>
            {liq.tipo === 'B' ? '2ª quincena' : '1ª quincena'}
          </Text>
          <Text style={[s.encMes, { color: t.text }]}>{liq.etiqueta.split('quincena ')[1]}</Text>
          <Text style={[s.encRango, { color: t.textTertiary }]}>
            {formatRango(liq.fechaInicio, liq.fechaFin)}
          </Text>

          {/* Resumen días */}
          <View style={[s.diasBox, { backgroundColor: t.secondary }]}>
            {liq.diasNocturnos > 0 && (
              <View style={s.diaItem}>
                <Text style={[s.diaNum, { color: Colors.nocturno.text }]}>{liq.diasNocturnos}</Text>
                <Text style={[s.diaLbl, { color: t.textTertiary }]}>Noct.</Text>
              </View>
            )}
            {liq.diasDiurnos > 0 && (
              <View style={s.diaItem}>
                <Text style={[s.diaNum, { color: '#92400E' }]}>{liq.diasDiurnos}</Text>
                <Text style={[s.diaLbl, { color: t.textTertiary }]}>Diurn.</Text>
              </View>
            )}
            {liq.diasDescanso > 0 && (
              <View style={s.diaItem}>
                <Text style={[s.diaNum, { color: Colors.descanso.text }]}>{liq.diasDescanso}</Text>
                <Text style={[s.diaLbl, { color: t.textTertiary }]}>Desc.</Text>
              </View>
            )}
            {liq.diasDomFestTrabajados > 0 && (
              <View style={s.diaItem}>
                <Text style={[s.diaNum, { color: Colors.warning }]}>{liq.diasDomFestTrabajados}</Text>
                <Text style={[s.diaLbl, { color: t.textTertiary }]}>Dom/F.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Neto — hero */}
        <View style={[s.netoCard, { backgroundColor: t.positiveBg }]}>
          <Text style={[s.netoLabel, { color: t.textSecondary }]}>Neto a pagar</Text>
          <Text style={s.netoValor}>{formatCOP(liq.neto)}</Text>
        </View>

        {/* Devengados */}
        <View style={[s.seccion, { backgroundColor: t.card }]}>
          <Text style={[s.secTitulo, { color: t.textSecondary }]}>DEVENGADOS</Text>
          <Separador />
          {liq.conceptos.map((c, i) => (
            <React.Fragment key={i}>
              <FilaConcepto c={c} />
              {i < liq.conceptos.length - 1 && <Separador />}
            </React.Fragment>
          ))}
          <Separador />
          <View style={s.totalFila}>
            <Text style={[s.totalLabel, { color: t.text }]}>Total bruto</Text>
            <Text style={[s.totalVal, { color: Colors.accent }]}>
              {formatCOP(liq.totalBruto)}
            </Text>
          </View>
        </View>

        {/* Deducciones */}
        <View style={[s.seccion, { backgroundColor: t.card }]}>
          <Text style={[s.secTitulo, { color: t.textSecondary }]}>DEDUCCIONES</Text>
          <Separador />
          {liq.deducciones.map((d, i) => (
            <React.Fragment key={i}>
              <View style={s.fila}>
                <Text style={[s.filaNombre, { color: t.text }]} numberOfLines={2}>{d.nombre}</Text>
                <Text style={[s.filaHoras, { color: t.textTertiary }]}>{d.porcentaje.toFixed(2)}%</Text>
                <Text style={[s.filaTotal, { color: Colors.negative }]}>−{formatCOP(d.valor)}</Text>
              </View>
              {i < liq.deducciones.length - 1 && <Separador />}
            </React.Fragment>
          ))}
          <Separador />
          <View style={s.totalFila}>
            <Text style={[s.totalLabel, { color: t.text }]}>Total descuentos</Text>
            <Text style={[s.totalVal, { color: Colors.negative }]}>
              −{formatCOP(liq.totalDeducciones)}
            </Text>
          </View>
        </View>

        {/* Ajustes manuales */}
        <View style={[s.seccion, { backgroundColor: t.card }]}>
          <View style={s.secHeader}>
            <Text style={[s.secTitulo, { color: t.textSecondary }]}>AJUSTES MANUALES</Text>
            <TouchableOpacity onPress={() => setModalAjuste(true)}>
              <Text style={[s.addLink, { color: Colors.accent }]}>+ Agregar</Text>
            </TouchableOpacity>
          </View>

          {ajustes.length === 0 ? (
            <Text style={[s.sinAjustes, { color: t.textTertiary }]}>
              Sin ajustes. Agrega horas extra puntuales si es necesario.
            </Text>
          ) : (
            ajustes.map((aj, i) => (
              <React.Fragment key={aj.id}>
                {i > 0 && <Separador />}
                <View style={s.ajusteFila}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.ajusteDesc, { color: t.text }]}>{aj.descripcion}</Text>
                    {aj.horasExtra > 0 && (
                      <Text style={[s.ajusteSub, { color: t.textTertiary }]}>
                        Extra diurna: {aj.horasExtra} h
                      </Text>
                    )}
                    {aj.horasFestivos > 0 && (
                      <Text style={[s.ajusteSub, { color: t.textTertiary }]}>
                        Extra nocturna: {aj.horasFestivos} h
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => deleteAjuste(aj.id).then(cargarAjustes)}>
                    <Text style={{ color: Colors.negative, fontSize: 18 }}>×</Text>
                  </TouchableOpacity>
                </View>
              </React.Fragment>
            ))
          )}
        </View>

        {/* Exportar */}
        <TouchableOpacity
          style={[s.btnExportar, { backgroundColor: t.card }]}
          onPress={exportarDetalle}
        >
          <Text style={[s.btnExportarText, { color: Colors.accent }]}>
            Exportar detalle en PDF
          </Text>
        </TouchableOpacity>

        {/* Nota */}
        <Text style={[s.nota, { color: t.textTertiary }]}>
          ⚠ Proyección estimada · Verifica factores de recargo en Ajustes
        </Text>
      </ScrollView>

      {/* Modal ajuste */}
      <Modal visible={modalAjuste} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalOverlay}
        >
          <View style={[s.modalBox, { backgroundColor: t.card }]}>
            <Text style={[s.modalTitulo, { color: t.text }]}>Agregar ajuste manual</Text>

            <Text style={[s.inputLabel, { color: t.textSecondary }]}>Descripción</Text>
            <TextInput
              style={[s.input, { color: t.text, borderColor: t.separator, backgroundColor: t.secondary }]}
              value={descAjuste}
              onChangeText={setDescAjuste}
              placeholder="Ej. Horas extra semana santa"
              placeholderTextColor={t.textTertiary}
            />

            <Text style={[s.inputLabel, { color: t.textSecondary }]}>Horas extra diurnas (recargo 25%)</Text>
            <TextInput
              style={[s.input, { color: t.text, borderColor: t.separator, backgroundColor: t.secondary }]}
              keyboardType="numeric"
              value={horasExtraD}
              onChangeText={setHorasExtraD}
            />

            <Text style={[s.inputLabel, { color: t.textSecondary }]}>Horas extra nocturnas (recargo 40%)</Text>
            <TextInput
              style={[s.input, { color: t.text, borderColor: t.separator, backgroundColor: t.secondary }]}
              keyboardType="numeric"
              value={horasExtraN}
              onChangeText={setHorasExtraN}
            />

            <View style={s.modalBtns}>
              <TouchableOpacity
                style={[s.btnModal, { backgroundColor: t.secondary }]}
                onPress={() => setModalAjuste(false)}
              >
                <Text style={[s.btnModalText, { color: t.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnModal, { backgroundColor: Colors.accent }]}
                onPress={guardarAjuste}
              >
                <Text style={[s.btnModalText, { color: '#fff' }]}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  encabezado: {
    padding: Spacing.md,
    margin: Spacing.md,
    borderRadius: Radius.lg,
  },
  encTitulo: { ...Typography.caption2, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  encMes: { ...Typography.title2, marginBottom: 2 },
  encRango: { ...Typography.footnote, marginBottom: 12 },
  diasBox: {
    flexDirection: 'row',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    gap: 16,
  },
  diaItem: { alignItems: 'center' },
  diaNum: { ...Typography.title3, fontWeight: '700' },
  diaLbl: { ...Typography.caption2 },

  netoCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  netoLabel: { ...Typography.footnote, marginBottom: 4 },
  netoValor: { ...Typography.largeTitle, color: Colors.positive },

  seccion: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secTitulo: { ...Typography.caption2, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },
  addLink: { ...Typography.footnote },

  sep: { height: 0.5, marginVertical: 1 },

  fila: { flexDirection: 'row', paddingVertical: 8, alignItems: 'flex-start' },
  filaNombre: { ...Typography.footnote, flex: 2, paddingRight: 8 },
  filaHoras: { ...Typography.caption, flex: 1, textAlign: 'right' },
  filaTotal: { ...Typography.footnote, fontWeight: '500', flex: 1, textAlign: 'right' },

  totalFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  totalLabel: { ...Typography.headline },
  totalVal: { ...Typography.headline },

  sinAjustes: { ...Typography.footnote, fontStyle: 'italic', paddingVertical: 8 },
  ajusteFila: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  ajusteDesc: { ...Typography.subhead, fontWeight: '500' },
  ajusteSub: { ...Typography.caption },

  btnExportar: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'center',
  },
  btnExportarText: { ...Typography.headline },

  nota: { ...Typography.caption2, textAlign: 'center', padding: Spacing.md },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg },
  modalTitulo: { ...Typography.title3, marginBottom: Spacing.md },
  inputLabel: { ...Typography.footnote, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: Spacing.sm,
    ...Typography.body,
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: Spacing.sm },
  btnModal: { flex: 1, padding: 14, borderRadius: Radius.md, alignItems: 'center' },
  btnModalText: { ...Typography.headline },
});

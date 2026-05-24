import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { useConfig } from '../../src/hooks/useConfig';
import {
  calcularPrimasProyectadas,
  calcularVacaciones,
} from '../../src/engine/primas';
import {
  loadVacaciones,
  saveVacaciones,
  deleteVacaciones,
} from '../../src/storage/database';
import { formatCOP, formatFecha } from '../../src/utils/formatting';
import type { LiquidacionPrima, PeriodoVacaciones } from '../../src/types';

export default function PrimasScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const s = styles(dark);
  const { config } = useConfig();

  const primas = calcularPrimasProyectadas(config);
  const [vacaciones, setVacaciones] = useState<PeriodoVacaciones[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [fechaInicioInput, setFechaInicioInput] = useState('');
  const [fechaFinInput, setFechaFinInput] = useState('');
  const [obsInput, setObsInput] = useState('');
  const [errorFecha, setErrorFecha] = useState('');

  const cargar = useCallback(async () => {
    const data = await loadVacaciones();
    setVacaciones(data);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirModal() {
    const hoy = dayjs().format('YYYY-MM-DD');
    setFechaInicioInput(hoy);
    setFechaFinInput(dayjs().add(15, 'day').format('YYYY-MM-DD'));
    setObsInput('');
    setErrorFecha('');
    setModalVisible(true);
  }

  async function guardar() {
    setErrorFecha('');
    if (!fechaInicioInput.match(/^\d{4}-\d{2}-\d{2}$/) ||
        !fechaFinInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setErrorFecha('Usa el formato YYYY-MM-DD. Ej: 2026-07-15');
      return;
    }
    if (fechaFinInput < fechaInicioInput) {
      setErrorFecha('La fecha fin debe ser posterior al inicio.');
      return;
    }
    const nuevo = calcularVacaciones(
      `vac_${Date.now()}`,
      fechaInicioInput,
      fechaFinInput,
      config,
      obsInput,
    );
    await saveVacaciones(nuevo);
    setModalVisible(false);
    cargar();
  }

  async function eliminar(id: string) {
    Alert.alert('Eliminar', '¿Deseas eliminar este período de vacaciones?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteVacaciones(id);
          cargar();
        },
      },
    ]);
  }

  const hoy = dayjs().format('YYYY-MM-DD');
  const primasProximas = primas.filter((p) => p.fechaPago >= hoy);
  const primasPasadas = primas.filter((p) => p.fechaPago < hoy);

  const totalPrimasProximas = primasProximas.reduce((s, p) => s + p.total, 0);
  const totalVacaciones = vacaciones.reduce((s, v) => s + v.totalRecibir, 0);

  function PrimaCard({ prima }: { prima: LiquidacionPrima }) {
    const esProxima = prima.fechaPago >= hoy;
    const icono = prima.tipo === 'JUNIO' ? '🌞' :
                  prima.tipo === 'NAVIDAD' ? '🎄' : '🏖';
    const color = prima.tipo === 'JUNIO' ? '#F57F17' :
                  prima.tipo === 'NAVIDAD' ? '#C62828' : '#1565C0';
    const bgColor = prima.tipo === 'JUNIO'
      ? (dark ? '#2d2200' : '#FFFDE7')
      : prima.tipo === 'NAVIDAD'
      ? (dark ? '#2d0a0a' : '#FFEBEE')
      : (dark ? '#0d2137' : '#E3F2FD');

    return (
      <View style={[s.primaCard, { borderLeftColor: color, backgroundColor: bgColor }]}>
        <View style={s.primaHeader}>
          <Text style={s.primaIcono}>{icono}</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[s.primaTitulo, { color }]}>{prima.etiqueta}</Text>
            <Text style={s.primaFecha}>Pago: {formatFecha(prima.fechaPago)}</Text>
          </View>
          {!esProxima && <Text style={s.badgePasada}>Pasada</Text>}
        </View>

        <View style={s.primaDesglose}>
          <View style={s.primaDetalleRow}>
            <Text style={s.primaDetalleLabel}>Días de salario</Text>
            <Text style={s.primaDetalleVal}>{prima.diasSalario.toFixed(0)} días</Text>
          </View>
          <View style={s.primaDetalleRow}>
            <Text style={s.primaDetalleLabel}>Salario básico diario</Text>
            <Text style={s.primaDetalleVal}>{formatCOP(prima.salarioBasicoDiario)}</Text>
          </View>
          <View style={[s.primaDetalleRow, s.primaTotal]}>
            <Text style={[s.primaDetalleLabel, { fontWeight: 'bold' }]}>Total prima</Text>
            <Text style={[s.primaDetalleVal, { fontWeight: 'bold', color, fontSize: 16 }]}>
              {formatCOP(prima.total)}
            </Text>
          </View>
        </View>

        {prima.proporcional && (
          <Text style={s.primaNota}>
            * Cálculo proporcional ({prima.diasTrabajados} días de {prima.diasSemestre})
          </Text>
        )}
      </View>
    );
  }

  function VacacionesCard({ v }: { v: PeriodoVacaciones }) {
    return (
      <View style={s.vacCard}>
        <View style={s.vacHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.vacTitulo}>
              🏖 {formatFecha(v.fechaInicio)} – {formatFecha(v.fechaFin)}
            </Text>
            <Text style={s.vacSub}>{v.diasDisfrute} días de disfrute</Text>
            {v.observaciones ? <Text style={s.vacObs}>{v.observaciones}</Text> : null}
          </View>
          <TouchableOpacity onPress={() => eliminar(v.id)}>
            <Ionicons name="trash-outline" size={18} color="#e53935" />
          </TouchableOpacity>
        </View>

        <View style={s.vacMontos}>
          <View style={s.vacMontoCol}>
            <Text style={s.vacMontoLabel}>Pago vacaciones</Text>
            <Text style={s.vacMontoVal}>{formatCOP(v.pagoVacaciones)}</Text>
            <Text style={s.vacMontoSub}>{v.diasDisfrute} días × {formatCOP(v.salarioBasicoDiario)}</Text>
          </View>
          <View style={[s.vacMontoCol, s.vacMontoMid]}>
            <Text style={s.vacMontoLabel}>Prima vacaciones</Text>
            <Text style={s.vacMontoVal}>{formatCOP(v.primaVacaciones)}</Text>
            <Text style={s.vacMontoSub}>29 días × {formatCOP(v.salarioBasicoDiario)}</Text>
          </View>
          <View style={[s.vacMontoCol, s.vacMontoTotal]}>
            <Text style={s.vacMontoLabel}>Total a recibir</Text>
            <Text style={[s.vacMontoVal, { color: '#2E7D32', fontWeight: 'bold', fontSize: 15 }]}>
              {formatCOP(v.totalRecibir)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Primas & Vacaciones</Text>
        <Text style={s.headerSub}>Convención colectiva Drummond Ltd.</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {/* Resumen rápido */}
        <View style={s.resumenCards}>
          <View style={s.resCard}>
            <Text style={s.resLabel}>Primas proyectadas</Text>
            <Text style={s.resValor}>{formatCOP(totalPrimasProximas)}</Text>
            <Text style={s.resSub}>{primasProximas.length} pagos pendientes</Text>
          </View>
          {vacaciones.length > 0 && (
            <View style={[s.resCard, { borderTopColor: '#2E7D32' }]}>
              <Text style={s.resLabel}>Total vacaciones</Text>
              <Text style={[s.resValor, { color: '#2E7D32' }]}>{formatCOP(totalVacaciones)}</Text>
              <Text style={s.resSub}>{vacaciones.length} período(s)</Text>
            </View>
          )}
        </View>

        {/* Convención — referencia */}
        <View style={s.convencionBox}>
          <Text style={s.convencionTitulo}>📋 Primas extralegales (convención)</Text>
          <Text style={s.convencionItem}>• <Text style={{ fontWeight: 'bold' }}>Junio (15 jun):</Text> 25 días de salario básico</Text>
          <Text style={s.convencionItem}>• <Text style={{ fontWeight: 'bold' }}>Navidad (15 dic):</Text> 30 días de salario básico</Text>
          <Text style={s.convencionItem}>• <Text style={{ fontWeight: 'bold' }}>Vacaciones:</Text> 29 días de salario básico (+ pago de días de disfrute)</Text>
          <Text style={s.convencionNota}>
            Salario básico diario configurable en Ajustes. Por defecto: valor hora × 12 h.
          </Text>
        </View>

        {/* Primas próximas */}
        {primasProximas.length > 0 && (
          <>
            <Text style={s.secTitulo}>Próximas primas</Text>
            {primasProximas.map((p, i) => <PrimaCard key={i} prima={p} />)}
          </>
        )}

        {/* Vacaciones */}
        <View style={s.secHeader}>
          <Text style={s.secTitulo}>Períodos de vacaciones</Text>
          <TouchableOpacity style={s.addBtn} onPress={abrirModal}>
            <Text style={s.addBtnText}>+ Agregar</Text>
          </TouchableOpacity>
        </View>

        {vacaciones.length === 0 ? (
          <View style={s.vacEmpty}>
            <Text style={s.vacEmptyText}>
              Sin períodos registrados. Agrega tus fechas de vacaciones para ver el pago proyectado (disfrute + prima).
            </Text>
          </View>
        ) : (
          vacaciones.map((v) => <VacacionesCard key={v.id} v={v} />)
        )}

        {/* Primas pasadas */}
        {primasPasadas.length > 0 && (
          <>
            <Text style={[s.secTitulo, { marginTop: 16 }]}>Primas anteriores (referencia)</Text>
            {primasPasadas.map((p, i) => <PrimaCard key={i} prima={p} />)}
          </>
        )}

        <View style={s.nota}>
          <Text style={s.notaText}>
            ⚠ El salario básico diario para primas se configura en Ajustes. Verifica con tu liquidación real.
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal agregar vacaciones */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalOverlay}
        >
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>🏖 Agregar período de vacaciones</Text>
            <Text style={s.modalSub}>
              Incluye pago de días de disfrute + prima extralegal de 29 días.
            </Text>

            <Text style={s.inputLabel}>Fecha inicio (YYYY-MM-DD)</Text>
            <TextInput
              style={[s.input, errorFecha ? { borderColor: '#e53935' } : {}]}
              value={fechaInicioInput}
              onChangeText={(v) => { setFechaInicioInput(v); setErrorFecha(''); }}
              placeholder="2026-07-01"
              placeholderTextColor="#888"
            />

            <Text style={s.inputLabel}>Fecha fin (YYYY-MM-DD)</Text>
            <TextInput
              style={[s.input, errorFecha ? { borderColor: '#e53935' } : {}]}
              value={fechaFinInput}
              onChangeText={(v) => { setFechaFinInput(v); setErrorFecha(''); }}
              placeholder="2026-07-15"
              placeholderTextColor="#888"
            />

            {errorFecha ? (
              <Text style={s.errorText}>{errorFecha}</Text>
            ) : null}

            {/* Previsualización */}
            {fechaInicioInput.match(/^\d{4}-\d{2}-\d{2}$/) &&
             fechaFinInput.match(/^\d{4}-\d{2}-\d{2}$/) &&
             fechaFinInput >= fechaInicioInput && (
              <View style={s.preview}>
                {(() => {
                  const prev = calcularVacaciones('prev', fechaInicioInput, fechaFinInput, config);
                  return (
                    <>
                      <Text style={s.previewTitulo}>Vista previa:</Text>
                      <Text style={s.previewItem}>Días: {prev.diasDisfrute}</Text>
                      <Text style={s.previewItem}>Pago disfrute: {formatCOP(prev.pagoVacaciones)}</Text>
                      <Text style={s.previewItem}>Prima vacaciones (29 días): {formatCOP(prev.primaVacaciones)}</Text>
                      <Text style={[s.previewItem, { fontWeight: 'bold', color: '#2E7D32' }]}>
                        Total: {formatCOP(prev.totalRecibir)}
                      </Text>
                    </>
                  );
                })()}
              </View>
            )}

            <Text style={s.inputLabel}>Observaciones (opcional)</Text>
            <TextInput
              style={s.input}
              value={obsInput}
              onChangeText={setObsInput}
              placeholder="Ej. Vacaciones julio 2026"
              placeholderTextColor="#888"
            />

            <View style={s.modalBtns}>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: dark ? '#2d2d44' : '#f0f0f0' }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: dark ? '#e0e0e0' : '#333', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: '#1565C0' }]}
                onPress={guardar}
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
    header: {
      backgroundColor: dark ? '#1a1a2e' : '#1565C0',
      padding: 16,
      paddingTop: 20,
    },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
    content: { padding: 16 },
    resumenCards: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    resCard: {
      flex: 1,
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderRadius: 12,
      padding: 14,
      borderTopWidth: 3,
      borderTopColor: '#1565C0',
    },
    resLabel: { fontSize: 11, color: dark ? '#888' : '#666', marginBottom: 4 },
    resValor: { fontSize: 18, fontWeight: 'bold', color: '#1565C0' },
    resSub: { fontSize: 10, color: dark ? '#666' : '#999', marginTop: 2 },
    convencionBox: {
      backgroundColor: dark ? '#1a2d1a' : '#F1F8E9',
      borderRadius: 10,
      padding: 14,
      marginBottom: 16,
      borderLeftWidth: 3,
      borderLeftColor: '#558B2F',
    },
    convencionTitulo: { fontSize: 13, fontWeight: 'bold', color: dark ? '#A5D6A7' : '#33691E', marginBottom: 8 },
    convencionItem: { fontSize: 12, color: dark ? '#ccc' : '#555', marginBottom: 4 },
    convencionNota: { fontSize: 11, color: dark ? '#888' : '#888', marginTop: 6, fontStyle: 'italic' },
    secTitulo: { fontSize: 14, fontWeight: 'bold', color: dark ? '#e0e0e0' : '#333', marginBottom: 10 },
    secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    addBtn: { backgroundColor: '#1565C0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    addBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    primaCard: {
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderLeftWidth: 4,
    },
    primaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    primaIcono: { fontSize: 24 },
    primaTitulo: { fontSize: 14, fontWeight: 'bold' },
    primaFecha: { fontSize: 12, color: dark ? '#aaa' : '#666', marginTop: 2 },
    badgePasada: {
      fontSize: 10,
      color: dark ? '#888' : '#999',
      backgroundColor: dark ? '#2d2d44' : '#f0f0f0',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    primaDesglose: {
      backgroundColor: dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)',
      borderRadius: 8,
      padding: 10,
    },
    primaDetalleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    primaDetalleLabel: { fontSize: 12, color: dark ? '#bbb' : '#555' },
    primaDetalleVal: { fontSize: 12, color: dark ? '#e0e0e0' : '#333' },
    primaTotal: {
      borderTopWidth: 1,
      borderTopColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      marginTop: 4,
      paddingTop: 8,
    },
    primaNota: { fontSize: 11, color: dark ? '#888' : '#999', marginTop: 6, fontStyle: 'italic' },
    vacEmpty: {
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
      marginBottom: 12,
    },
    vacEmptyText: { fontSize: 13, color: dark ? '#888' : '#666', textAlign: 'center' },
    vacCard: {
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    vacHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    vacTitulo: { fontSize: 14, fontWeight: '600', color: dark ? '#e0e0e0' : '#333' },
    vacSub: { fontSize: 12, color: dark ? '#aaa' : '#666', marginTop: 2 },
    vacObs: { fontSize: 11, color: dark ? '#888' : '#999', fontStyle: 'italic', marginTop: 2 },
    vacMontos: { flexDirection: 'row', gap: 6 },
    vacMontoCol: { flex: 1, alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: dark ? '#0f0f23' : '#f5f5f5' },
    vacMontoMid: {},
    vacMontoTotal: { backgroundColor: dark ? '#1a3d28' : '#E8F5E9' },
    vacMontoLabel: { fontSize: 10, color: dark ? '#888' : '#777', textAlign: 'center', marginBottom: 4 },
    vacMontoVal: { fontSize: 13, fontWeight: '600', color: dark ? '#e0e0e0' : '#333', textAlign: 'center' },
    vacMontoSub: { fontSize: 9, color: dark ? '#666' : '#aaa', textAlign: 'center', marginTop: 2 },
    nota: {
      backgroundColor: dark ? '#2d1f0a' : '#fff3e0',
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
    },
    notaText: { fontSize: 11, color: dark ? '#ffcc80' : '#e65100', textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalBox: {
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: dark ? '#e0e0e0' : '#333', marginBottom: 4 },
    modalSub: { fontSize: 12, color: dark ? '#aaa' : '#666', marginBottom: 16 },
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
    errorText: { color: '#e53935', fontSize: 12, marginTop: -8, marginBottom: 8 },
    preview: {
      backgroundColor: dark ? '#162742' : '#e3f2fd',
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    previewTitulo: { fontSize: 12, fontWeight: 'bold', color: dark ? '#90CAF9' : '#1565C0', marginBottom: 6 },
    previewItem: { fontSize: 12, color: dark ? '#ccc' : '#444', marginBottom: 3 },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  });

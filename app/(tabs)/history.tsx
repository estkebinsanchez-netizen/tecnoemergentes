import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import {
  loadQuincenasReales,
  saveQuincenaReal,
  deleteQuincenaReal,
} from '../../src/storage/database';
import { formatCOP, formatRango } from '../../src/utils/formatting';
import type { QuincenaReal, LiquidacionQuincena } from '../../src/types';
import { useConfig } from '../../src/hooks/useConfig';
import { useQuincenas } from '../../src/hooks/useQuincenas';

export default function HistoryScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const s = styles(dark);
  const { config } = useConfig();
  const { liquidaciones } = useQuincenas(config);

  const [historico, setHistorico] = useState<QuincenaReal[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [quincenaSeleccionada, setQuincenaSeleccionada] = useState<LiquidacionQuincena | null>(null);
  const [brutoInput, setBrutoInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [obsInput, setObsInput] = useState('');

  const cargarHistorico = useCallback(async () => {
    const data = await loadQuincenasReales();
    setHistorico(data);
  }, []);

  useEffect(() => { cargarHistorico(); }, [cargarHistorico]);

  function abrirModal(liq: LiquidacionQuincena) {
    setQuincenaSeleccionada(liq);
    setBrutoInput(String(Math.round(liq.totalBruto)));
    setDescInput(String(Math.round(liq.totalDeducciones)));
    setObsInput('');
    setModalVisible(true);
  }

  async function guardarReal() {
    if (!quincenaSeleccionada) return;
    const bruto = parseFloat(brutoInput.replace(/\./g, '').replace(',', '.'));
    const desc = parseFloat(descInput.replace(/\./g, '').replace(',', '.'));
    if (isNaN(bruto) || isNaN(desc)) {
      Alert.alert('Error', 'Ingresa valores numéricos válidos.');
      return;
    }
    const registro: QuincenaReal = {
      id: `${quincenaSeleccionada.quincenaId}_${Date.now()}`,
      quincenaId: quincenaSeleccionada.quincenaId,
      fechaRegistro: dayjs().format('YYYY-MM-DD'),
      brutoReal: bruto,
      deduccionesReal: desc,
      netoReal: bruto - desc,
      observaciones: obsInput,
    };
    await saveQuincenaReal(registro);
    setModalVisible(false);
    cargarHistorico();
  }

  async function eliminar(id: string) {
    Alert.alert('Eliminar', '¿Deseas eliminar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteQuincenaReal(id);
          cargarHistorico();
        },
      },
    ]);
  }

  // Mapa: quincenaId → proyectado
  const proyectadoMap = new Map(
    liquidaciones.map((l) => [l.quincenaId, l]),
  );

  const hoy = dayjs().format('YYYY-MM-DD');
  const quincenasPasadas = liquidaciones.filter((q) => q.fechaFin < hoy);

  function renderItem({ item: qr }: { item: QuincenaReal }) {
    const proyectado = proyectadoMap.get(qr.quincenaId);
    const difNeto = proyectado ? qr.netoReal - proyectado.neto : null;

    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitulo}>
            {proyectado?.etiqueta ?? qr.quincenaId}
          </Text>
          <TouchableOpacity onPress={() => eliminar(qr.id)}>
            <Ionicons name="trash-outline" size={18} color="#e53935" />
          </TouchableOpacity>
        </View>
        <View style={s.montos}>
          <View style={s.montoCol}>
            <Text style={s.montoLabel}>Neto real</Text>
            <Text style={[s.montoVal, { color: '#2E7D32' }]}>
              {formatCOP(qr.netoReal)}
            </Text>
          </View>
          {proyectado && (
            <View style={s.montoCol}>
              <Text style={s.montoLabel}>Proyectado</Text>
              <Text style={[s.montoVal, { color: '#1565C0' }]}>
                {formatCOP(proyectado.neto)}
              </Text>
            </View>
          )}
          {difNeto !== null && (
            <View style={s.montoCol}>
              <Text style={s.montoLabel}>Diferencia</Text>
              <Text
                style={[
                  s.montoVal,
                  { color: difNeto >= 0 ? '#2E7D32' : '#e53935' },
                ]}
              >
                {difNeto >= 0 ? '+' : ''}{formatCOP(difNeto)}
              </Text>
            </View>
          )}
        </View>
        {qr.observaciones ? (
          <Text style={s.obs}>{qr.observaciones}</Text>
        ) : null}
        <Text style={s.fecha}>Registrado: {qr.fechaRegistro}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Histórico de Quincenas</Text>
        <Text style={s.headerSub}>Proyectado vs. Real</Text>
      </View>

      {historico.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No hay registros reales guardados.</Text>
          <Text style={s.emptySub}>
            Registra los valores de tu liquidación real para comparar con la proyección.
          </Text>
        </View>
      ) : (
        <FlatList
          data={historico}
          keyExtractor={(q) => q.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12 }}
        />
      )}

      {/* Botones para registrar quincenas pasadas */}
      <View style={s.footer}>
        <Text style={s.footerTitle}>Registrar quincena pagada:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {quincenasPasadas.slice(-6).reverse().map((q) => (
            <TouchableOpacity
              key={q.quincenaId}
              style={s.qBtn}
              onPress={() => abrirModal(q)}
            >
              <Text style={s.qBtnText} numberOfLines={2}>
                {q.etiqueta.replace(' 2026', '').replace(' 2025', '')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Modal de registro */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalOverlay}
        >
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>
              Registrar quincena real
            </Text>
            {quincenaSeleccionada && (
              <Text style={s.modalSub}>{quincenaSeleccionada.etiqueta}</Text>
            )}

            <Text style={s.inputLabel}>Bruto pagado (COP)</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              value={brutoInput}
              onChangeText={setBrutoInput}
              placeholder="Ej. 4628575"
              placeholderTextColor="#888"
            />

            <Text style={s.inputLabel}>Total descuentos (COP)</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              value={descInput}
              onChangeText={setDescInput}
              placeholder="Ej. 915072"
              placeholderTextColor="#888"
            />

            <Text style={s.inputLabel}>Observaciones (opcional)</Text>
            <TextInput
              style={[s.input, { height: 80 }]}
              multiline
              value={obsInput}
              onChangeText={setObsInput}
              placeholder="Notas sobre esta quincena"
              placeholderTextColor="#888"
            />

            <View style={s.modalBtns}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnCancelar]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={s.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnGuardar]}
                onPress={guardarReal}
              >
                <Text style={[s.modalBtnText, { color: '#fff' }]}>Guardar</Text>
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
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyText: { fontSize: 16, color: dark ? '#888' : '#666', marginBottom: 8 },
    emptySub: { fontSize: 13, color: dark ? '#555' : '#999', textAlign: 'center' },
    card: {
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    cardTitulo: { fontSize: 14, fontWeight: '600', color: dark ? '#e0e0e0' : '#333', flex: 1 },
    montos: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
    montoCol: { alignItems: 'center' },
    montoLabel: { fontSize: 11, color: dark ? '#888' : '#999' },
    montoVal: { fontSize: 14, fontWeight: 'bold' },
    obs: { fontSize: 12, color: dark ? '#aaa' : '#666', fontStyle: 'italic', marginBottom: 4 },
    fecha: { fontSize: 11, color: dark ? '#666' : '#999' },
    footer: {
      padding: 12,
      backgroundColor: dark ? '#1a1a2e' : '#fff',
      borderTopWidth: 1,
      borderTopColor: dark ? '#333' : '#eee',
    },
    footerTitle: { fontSize: 12, color: dark ? '#aaa' : '#666', marginBottom: 8 },
    qBtn: {
      backgroundColor: '#1565C0',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginRight: 8,
      maxWidth: 120,
    },
    qBtnText: { color: '#fff', fontSize: 11, textAlign: 'center' },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalBox: {
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: dark ? '#e0e0e0' : '#333',
      marginBottom: 4,
    },
    modalSub: { fontSize: 13, color: dark ? '#aaa' : '#666', marginBottom: 16 },
    inputLabel: { fontSize: 13, color: dark ? '#ccc' : '#555', marginBottom: 4 },
    input: {
      borderWidth: 1,
      borderColor: dark ? '#444' : '#ddd',
      borderRadius: 8,
      padding: 12,
      color: dark ? '#e0e0e0' : '#333',
      backgroundColor: dark ? '#0f0f23' : '#f9f9f9',
      marginBottom: 12,
      fontSize: 15,
    },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
    modalBtnCancelar: { backgroundColor: dark ? '#2d2d44' : '#f0f0f0' },
    modalBtnGuardar: { backgroundColor: '#1565C0' },
    modalBtnText: { fontSize: 15, fontWeight: '600', color: dark ? '#e0e0e0' : '#333' },
  });

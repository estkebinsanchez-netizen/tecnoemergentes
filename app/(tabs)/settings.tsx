import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  Alert,
  Switch,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useConfig } from '../../src/hooks/useConfig';
import type { ConfiguracionUsuario, BaseDeduccion } from '../../src/types';
import { CONFIG_DEFAULT } from '../../src/types';

type NumericKey = keyof {
  [K in keyof ConfiguracionUsuario as ConfiguracionUsuario[K] extends number ? K : never]: true;
};

function CampoNumerico({
  label,
  value,
  onChange,
  dark,
  destacado,
  nota,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  dark: boolean;
  destacado?: boolean;
  nota?: string;
}) {
  const [texto, setTexto] = useState(String(value));

  useEffect(() => { setTexto(String(value)); }, [value]);

  function confirmar() {
    const n = parseFloat(texto.replace(',', '.'));
    if (!isNaN(n)) onChange(n);
    else setTexto(String(value));
  }

  return (
    <View style={[fieldStyles.wrap, destacado && fieldStyles.destacado]}>
      <Text style={[fieldStyles.label, { color: dark ? (destacado ? '#FFD54F' : '#ccc') : (destacado ? '#e65100' : '#555') }]}>
        {label}
        {destacado ? ' ⭐' : ''}
      </Text>
      <TextInput
        style={[fieldStyles.input, { color: dark ? '#e0e0e0' : '#333', borderColor: destacado ? '#FF8F00' : (dark ? '#444' : '#ddd'), backgroundColor: dark ? '#0f0f23' : '#f9f9f9' }]}
        value={texto}
        onChangeText={setTexto}
        onBlur={confirmar}
        keyboardType="numeric"
        returnKeyType="done"
        onSubmitEditing={confirmar}
      />
      {nota && <Text style={[fieldStyles.nota, { color: dark ? '#888' : '#999' }]}>{nota}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  destacado: {
    borderWidth: 1,
    borderColor: '#FF8F00',
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'rgba(255,143,0,0.05)',
  },
  label: { fontSize: 13, marginBottom: 4, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  nota: { fontSize: 11, marginTop: 3 },
});

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const s = styles(dark);
  const { config, updateConfig } = useConfig();

  function campo(label: string, key: NumericKey, destacado = false, nota?: string) {
    return (
      <CampoNumerico
        key={key}
        label={label}
        value={config[key] as number}
        onChange={(v) => updateConfig({ [key]: v })}
        dark={dark}
        destacado={destacado}
        nota={nota}
      />
    );
  }

  async function exportarJSON() {
    const json = JSON.stringify(config, null, 2);
    const file = new File(Paths.document, 'config_turnos.json');
    file.write(json);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
  }

  async function importarJSON() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (result.canceled) return;
    const asset = result.assets[0];
    const sourceFile = new File(asset.uri);
    const content = await sourceFile.text();
    try {
      const parsed = JSON.parse(content) as Partial<ConfiguracionUsuario>;
      await updateConfig(parsed);
      Alert.alert('Importado', 'Configuración restaurada correctamente.');
    } catch {
      Alert.alert('Error', 'El archivo no es válido.');
    }
  }

  function resetear() {
    Alert.alert(
      'Restablecer',
      '¿Deseas restaurar todos los valores por defecto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: () => updateConfig({ ...CONFIG_DEFAULT }),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Configuración</Text>
        <Text style={s.headerSub}>Todos los cambios se guardan automáticamente</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {/* Datos personales */}
        <Text style={s.seccion}>👤 Datos del trabajador</Text>
        <View style={s.seccionBox}>
          <Text style={[fieldStyles.label, { color: dark ? '#ccc' : '#555' }]}>Nombre (opcional)</Text>
          <TextInput
            style={[fieldStyles.input, { color: dark ? '#e0e0e0' : '#333', borderColor: dark ? '#444' : '#ddd', backgroundColor: dark ? '#0f0f23' : '#f9f9f9' }]}
            value={config.nombre}
            onChangeText={(v) => updateConfig({ nombre: v })}
            placeholder="Tu nombre"
            placeholderTextColor="#888"
          />
        </View>

        {/* Hora base */}
        <Text style={s.seccion}>💰 Valor hora</Text>
        <View style={s.seccionBox}>
          {campo('Valor hora ordinaria (COP)', 'valorHoraOrdinaria', false, 'Base de todos los cálculos. Cambia en abril cada año.')}
        </View>

        {/* Factores de recargo ⚠ */}
        <Text style={s.seccion}>⚠ Factores de recargo (verificar con liquidación real)</Text>
        <View style={s.warningBox}>
          <Text style={s.warningText}>
            Estos factores se derivan de la liquidación real pero pueden no coincidir exactamente con los porcentajes nominales. Ajústalos según tu colilla de pago.
          </Text>
        </View>
        <View style={s.seccionBox}>
          {campo('Recargo nocturno por hora (≈35%)', 'factorRecNocturno', false, '× 12 h/jornada ≈ 106.279/noche')}
          {campo('Extra diurna 25% — por hora', 'factorExtraDiurna25')}
          {campo('Extra nocturna 40% — por hora', 'factorExtraNocturna40')}
          {campo('Recargo dominical/festivo por hora', 'factorDominicalFestivo', false, '× 11,5 h/jornada')}
        </View>

        {/* Deducciones */}
        <Text style={s.seccion}>📋 Deducciones (%)</Text>
        <View style={s.seccionBox}>
          {campo('Aporte a Salud (%)', 'pctSalud')}
          {campo('Aporte a Pensión (%)', 'pctPension')}
          {campo(
            'Retención en la Fuente (%)',
            'pctRetencion',
            true,
            'Varía por persona. Aplicado en ambas quincenas.',
          )}
          {campo('Fondo de Solidaridad (%) — solo 2ª quincena', 'pctFondoSol')}
          {campo('Cuota Sindical SINTRAMINED (%) — solo 2ª quincena', 'pctSindical')}
        </View>

        {/* Base de deducciones */}
        <Text style={s.seccion}>🧮 Base de cálculo de deducciones</Text>
        <View style={s.seccionBox}>
          <Text style={[fieldStyles.label, { color: dark ? '#ccc' : '#555' }]}>
            Aplicar deducciones sobre:
          </Text>
          {(['BRUTO', 'FIJO'] as BaseDeduccion[]).map((opcion) => (
            <TouchableOpacity
              key={opcion}
              style={[s.radioBtn, config.baseDeduccion === opcion && s.radioBtnActivo]}
              onPress={() => updateConfig({ baseDeduccion: opcion })}
            >
              <View style={[s.radioCircle, config.baseDeduccion === opcion && s.radioCircleActivo]} />
              <Text style={[s.radioLabel, { color: dark ? '#e0e0e0' : '#333' }]}>
                {opcion === 'BRUTO' ? 'Total devengado (bruto) — recomendado' : 'Base fija configurable'}
              </Text>
            </TouchableOpacity>
          ))}
          {config.baseDeduccion === 'FIJO' &&
            campo('Valor base fijo (COP)', 'valorBaseFijo', false, 'Referencia caso real: 5.567.249')}
        </View>

        {/* Anclaje de turno */}
        <Text style={s.seccion}>📅 Anclaje del ciclo de turnos</Text>
        <View style={s.seccionBox}>
          <Text style={[fieldStyles.label, { color: dark ? '#ccc' : '#555' }]}>
            Fecha de anclaje (YYYY-MM-DD)
          </Text>
          <TextInput
            style={[fieldStyles.input, { color: dark ? '#e0e0e0' : '#333', borderColor: dark ? '#444' : '#ddd', backgroundColor: dark ? '#0f0f23' : '#f9f9f9' }]}
            value={config.fechaAnclaje}
            onChangeText={(v) => updateConfig({ fechaAnclaje: v })}
            placeholder="2026-05-22"
            placeholderTextColor="#888"
          />
          <Text style={[fieldStyles.nota, { color: dark ? '#888' : '#999' }]}>
            Defecto: 2026-05-22 (inicio NOCTURNO). Cambia si tu ciclo tiene una referencia distinta.
          </Text>
        </View>

        {/* Exportar / Importar */}
        <Text style={s.seccion}>💾 Respaldo de configuración</Text>
        <View style={s.seccionBox}>
          <TouchableOpacity style={s.accionBtn} onPress={exportarJSON}>
            <Text style={s.accionBtnText}>📤 Exportar configuración (JSON)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.accionBtn, { marginTop: 8 }]} onPress={importarJSON}>
            <Text style={s.accionBtnText}>📥 Importar configuración (JSON)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.accionBtn, { marginTop: 8, backgroundColor: dark ? '#3d1a1a' : '#ffebee' }]}
            onPress={resetear}
          >
            <Text style={[s.accionBtnText, { color: '#e53935' }]}>
              🔄 Restablecer valores por defecto
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
    content: { padding: 16 },
    seccion: {
      fontSize: 14,
      fontWeight: 'bold',
      color: dark ? '#e0e0e0' : '#333',
      marginTop: 8,
      marginBottom: 8,
    },
    seccionBox: {
      backgroundColor: dark ? '#1e1e3a' : '#fff',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    warningBox: {
      backgroundColor: dark ? '#2d1f0a' : '#fff3e0',
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#FF8F00',
    },
    warningText: { color: dark ? '#ffcc80' : '#e65100', fontSize: 12 },
    radioBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 8,
      marginBottom: 6,
      backgroundColor: dark ? '#0f0f23' : '#f9f9f9',
    },
    radioBtnActivo: { backgroundColor: dark ? '#162742' : '#e3f2fd' },
    radioCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: '#888',
      marginRight: 10,
    },
    radioCircleActivo: { borderColor: '#1565C0', backgroundColor: '#1565C0' },
    radioLabel: { fontSize: 13, flex: 1 },
    accionBtn: {
      backgroundColor: dark ? '#1e3a5f' : '#e3f2fd',
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
    },
    accionBtnText: { color: '#1565C0', fontWeight: '600', fontSize: 14 },
  });

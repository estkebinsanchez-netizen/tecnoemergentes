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
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useConfig } from '../../src/hooks/useConfig';
import { useTheme, Colors, Typography, Spacing, Radius } from '../../src/theme';
import type { ConfiguracionUsuario, BaseDeduccion } from '../../src/types';
import { CONFIG_DEFAULT } from '../../src/types';

// Campo numérico genérico
function CampoNum({
  label,
  value,
  onChange,
  t,
  nota,
  destacado,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  t: ReturnType<typeof useTheme>;
  nota?: string;
  destacado?: boolean;
}) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(value)), [value]);

  function confirmar() {
    const n = parseFloat(txt.replace(',', '.'));
    if (!isNaN(n)) onChange(n);
    else setTxt(String(value));
  }

  return (
    <View style={cs.campoWrap}>
      <Text style={[cs.campoLabel, { color: destacado ? Colors.accent : t.textSecondary }]}>
        {label}{destacado ? ' ·  DESTACADO' : ''}
      </Text>
      <TextInput
        style={[
          cs.campoInput,
          {
            color: t.text,
            backgroundColor: t.secondary,
            borderColor: destacado ? Colors.accent : 'transparent',
          },
        ]}
        value={txt}
        onChangeText={setTxt}
        onBlur={confirmar}
        onSubmitEditing={confirmar}
        keyboardType="numeric"
        returnKeyType="done"
      />
      {nota && <Text style={[cs.campNota, { color: t.textTertiary }]}>{nota}</Text>}
    </View>
  );
}

const cs = StyleSheet.create({
  campoWrap: { marginBottom: 16 },
  campoLabel: { ...Typography.caption, marginBottom: 6 },
  campoInput: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: 12,
    ...Typography.body,
  },
  campNota: { ...Typography.caption2, marginTop: 4 },
});

// Separador interno de sección
function Sep({ t }: { t: ReturnType<typeof useTheme> }) {
  return <View style={{ height: 0.5, backgroundColor: t.separator, marginVertical: 4 }} />;
}

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const t = useTheme(dark);
  const { config, updateConfig } = useConfig();

  function nc(label: string, key: keyof ConfiguracionUsuario, nota?: string, destacado = false) {
    return (
      <CampoNum
        key={key}
        label={label}
        value={config[key] as number}
        onChange={(v) => updateConfig({ [key]: v })}
        t={t}
        nota={nota}
        destacado={destacado}
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
    try {
      const content = await new File(result.assets[0].uri).text();
      const parsed = JSON.parse(content) as Partial<ConfiguracionUsuario>;
      await updateConfig(parsed);
      Alert.alert('Importado', 'Configuración restaurada correctamente.');
    } catch {
      Alert.alert('Error', 'El archivo no es válido.');
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: t.bg }]}>
      <View style={[s.topBar, { borderBottomColor: t.separator }]}>
        <Text style={[s.topTitle, { color: t.text }]}>Ajustes</Text>
        <Text style={[s.topSub, { color: t.textTertiary }]}>Se guardan automáticamente</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {/* Nombre */}
        <Text style={[s.secLabel, { color: t.textTertiary }]}>TRABAJADOR</Text>
        <View style={[s.card, { backgroundColor: t.card }]}>
          <Text style={[cs.campoLabel, { color: t.textSecondary }]}>Nombre (opcional)</Text>
          <TextInput
            style={[cs.campoInput, { color: t.text, backgroundColor: t.secondary, borderColor: 'transparent', borderWidth: 1 }]}
            value={config.nombre}
            onChangeText={(v) => updateConfig({ nombre: v })}
            placeholder="Tu nombre"
            placeholderTextColor={t.textTertiary}
          />
        </View>

        {/* Valores hora y primas */}
        <Text style={[s.secLabel, { color: t.textTertiary }]}>VALORES BASE</Text>
        <View style={[s.card, { backgroundColor: t.card }]}>
          {nc('Valor hora ordinaria (COP)', 'valorHoraOrdinaria', 'Cambia en abril cada año. Actualmente: $23.196,87')}
          <Sep t={t} />
          {nc('Salario básico diario (COP) · para primas', 'salarioBasicoDiario', 'Para calcular primas extralegales. Default: valor hora × 12 h')}
        </View>

        {/* Retención destacada */}
        <Text style={[s.secLabel, { color: t.textTertiary }]}>DEDUCCIONES (%)</Text>
        <View style={[s.card, { backgroundColor: t.card }]}>
          {nc('Retención en la Fuente', 'pctRetencion', 'Varía por persona. Aplica en ambas quincenas.', true)}
          <Sep t={t} />
          {nc('Aporte a Salud', 'pctSalud')}
          <Sep t={t} />
          {nc('Aporte a Pensión', 'pctPension')}
          <Sep t={t} />
          {nc('Fondo de Solidaridad — solo 2ª quincena', 'pctFondoSol')}
          <Sep t={t} />
          {nc('Cuota Sindical SINTRAMINED — solo 2ª quincena', 'pctSindical')}
        </View>

        {/* Base de deducciones */}
        <Text style={[s.secLabel, { color: t.textTertiary }]}>BASE DE CÁLCULO DE DEDUCCIONES</Text>
        <View style={[s.card, { backgroundColor: t.card }]}>
          {(['BRUTO', 'FIJO'] as BaseDeduccion[]).map((op) => (
            <TouchableOpacity
              key={op}
              style={[s.radioRow, { borderBottomColor: t.separator }]}
              onPress={() => updateConfig({ baseDeduccion: op })}
            >
              <View style={[s.radioDot, config.baseDeduccion === op && { backgroundColor: Colors.accent, borderColor: Colors.accent }, { borderColor: t.separator }]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.radioLabel, { color: t.text }]}>
                  {op === 'BRUTO' ? 'Total devengado (bruto)' : 'Base fija configurable'}
                </Text>
                <Text style={[s.radioSub, { color: t.textTertiary }]}>
                  {op === 'BRUTO' ? 'Recomendado' : 'Caso real de referencia: $5.567.249'}
                </Text>
              </View>
              {config.baseDeduccion === op && (
                <Text style={{ color: Colors.accent, fontSize: 18 }}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
          {config.baseDeduccion === 'FIJO' && (
            <View style={{ marginTop: 12 }}>
              {nc('Valor base fijo (COP)', 'valorBaseFijo')}
            </View>
          )}
        </View>

        {/* Factores de recargo */}
        <Text style={[s.secLabel, { color: t.textTertiary }]}>FACTORES DE RECARGO ⚠</Text>
        <View style={[s.warningBanner, { backgroundColor: t.warningBg }]}>
          <Text style={[s.warningText, { color: Colors.warning }]}>
            Estos factores provienen de la liquidación real pero pueden no coincidir exactamente con los porcentajes nominales. Ajústalos con tu colilla de pago.
          </Text>
        </View>
        <View style={[s.card, { backgroundColor: t.card }]}>
          {nc('Recargo nocturno por hora (≈35%)', 'factorRecNocturno', '× 12 h/jornada ≈ $106.279/noche')}
          <Sep t={t} />
          {nc('Extra diurna 25% — por hora', 'factorExtraDiurna25')}
          <Sep t={t} />
          {nc('Extra nocturna 40% — por hora', 'factorExtraNocturna40')}
          <Sep t={t} />
          {nc('Recargo dominical/festivo por hora', 'factorDominicalFestivo', '× 11,5 h/jornada')}
        </View>

        {/* Anclaje ciclo */}
        <Text style={[s.secLabel, { color: t.textTertiary }]}>ANCLAJE DEL CICLO DE TURNOS</Text>
        <View style={[s.card, { backgroundColor: t.card }]}>
          <Text style={[cs.campoLabel, { color: t.textSecondary }]}>Fecha de anclaje (YYYY-MM-DD)</Text>
          <TextInput
            style={[cs.campoInput, { color: t.text, backgroundColor: t.secondary, borderColor: 'transparent', borderWidth: 1 }]}
            value={config.fechaAnclaje}
            onChangeText={(v) => updateConfig({ fechaAnclaje: v })}
            placeholder="2026-05-22"
            placeholderTextColor={t.textTertiary}
          />
          <Text style={[cs.campNota, { color: t.textTertiary }]}>
            Defecto: 2026-05-22 = inicio NOCTURNO. Cambia si tu ciclo usa otra referencia.
          </Text>
        </View>

        {/* Respaldo */}
        <Text style={[s.secLabel, { color: t.textTertiary }]}>RESPALDO</Text>
        <View style={[s.card, { backgroundColor: t.card }]}>
          <TouchableOpacity style={s.accionRow} onPress={exportarJSON}>
            <Text style={[s.accionText, { color: Colors.accent }]}>Exportar configuración (JSON)</Text>
          </TouchableOpacity>
          <View style={[{ height: 0.5, backgroundColor: t.separator }]} />
          <TouchableOpacity style={s.accionRow} onPress={importarJSON}>
            <Text style={[s.accionText, { color: Colors.accent }]}>Importar configuración (JSON)</Text>
          </TouchableOpacity>
          <View style={[{ height: 0.5, backgroundColor: t.separator }]} />
          <TouchableOpacity
            style={s.accionRow}
            onPress={() =>
              Alert.alert('Restablecer', '¿Deseas restaurar todos los valores por defecto?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Restablecer', style: 'destructive', onPress: () => updateConfig({ ...CONFIG_DEFAULT }) },
              ])
            }
          >
            <Text style={[s.accionText, { color: Colors.negative }]}>Restablecer valores por defecto</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  topTitle: { ...Typography.headline },
  topSub: { ...Typography.caption2, marginTop: 2 },
  content: { padding: Spacing.md },
  secLabel: {
    ...Typography.caption2,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  warningBanner: {
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: Spacing.sm,
  },
  warningText: { ...Typography.footnote },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  radioLabel: { ...Typography.subhead },
  radioSub: { ...Typography.caption2, marginTop: 2 },
  accionRow: { paddingVertical: 14 },
  accionText: { ...Typography.subhead },
});

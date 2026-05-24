/**
 * Inicialización de la base de datos SQLite local.
 * Toda la persistencia es local en el dispositivo — sin backend.
 */

import * as SQLite from 'expo-sqlite';
import type { ConfiguracionUsuario, QuincenaReal, AjusteManual } from '../types';
import { CONFIG_DEFAULT } from '../types';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('turnos.db');
  await initSchema(_db);
  return _db;
}

async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS configuracion (
      id INTEGER PRIMARY KEY DEFAULT 1,
      nombre TEXT DEFAULT '',
      valorHoraOrdinaria REAL DEFAULT 23196.87,
      factorRecNocturno REAL DEFAULT 8856.58,
      factorExtraDiurna25 REAL DEFAULT 8434.41,
      factorExtraNocturna40 REAL DEFAULT 12231.72,
      factorDominicalFestivo REAL DEFAULT 25305.50,
      pctSalud REAL DEFAULT 4,
      pctPension REAL DEFAULT 4,
      pctRetencion REAL DEFAULT 11.43,
      pctFondoSol REAL DEFAULT 1,
      pctSindical REAL DEFAULT 1.20,
      baseDeduccion TEXT DEFAULT 'BRUTO',
      valorBaseFijo REAL DEFAULT 5567249,
      fechaAnclaje TEXT DEFAULT '2026-05-22',
      tipoAnclaje TEXT DEFAULT 'NOCTURNO'
    );

    CREATE TABLE IF NOT EXISTS quincena_real (
      id TEXT PRIMARY KEY,
      quincenaId TEXT NOT NULL,
      fechaRegistro TEXT NOT NULL,
      brutoReal REAL NOT NULL,
      deduccionesReal REAL NOT NULL,
      netoReal REAL NOT NULL,
      observaciones TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS ajuste_manual (
      id TEXT PRIMARY KEY,
      quincenaId TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      horasExtra REAL DEFAULT 0,
      tipoExtra TEXT DEFAULT 'DIURNA',
      horasFestivos REAL DEFAULT 0,
      tipoFestivo TEXT DEFAULT 'DIURNO',
      notas TEXT DEFAULT ''
    );
  `);

  // Insertar configuración por defecto si no existe
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM configuracion WHERE id = 1',
  );
  if (!existing) {
    await db.runAsync(
      `INSERT INTO configuracion (id) VALUES (1)`,
    );
  }
}

// ── Configuración ──────────────────────────────────────────

export async function loadConfig(): Promise<ConfiguracionUsuario> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ConfiguracionUsuario>(
    'SELECT * FROM configuracion WHERE id = 1',
  );
  return row ?? { ...CONFIG_DEFAULT };
}

export async function saveConfig(config: ConfiguracionUsuario): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE configuracion SET
      nombre = ?, valorHoraOrdinaria = ?, factorRecNocturno = ?,
      factorExtraDiurna25 = ?, factorExtraNocturna40 = ?,
      factorDominicalFestivo = ?, pctSalud = ?, pctPension = ?,
      pctRetencion = ?, pctFondoSol = ?, pctSindical = ?,
      baseDeduccion = ?, valorBaseFijo = ?, fechaAnclaje = ?, tipoAnclaje = ?
    WHERE id = 1`,
    [
      config.nombre,
      config.valorHoraOrdinaria,
      config.factorRecNocturno,
      config.factorExtraDiurna25,
      config.factorExtraNocturna40,
      config.factorDominicalFestivo,
      config.pctSalud,
      config.pctPension,
      config.pctRetencion,
      config.pctFondoSol,
      config.pctSindical,
      config.baseDeduccion,
      config.valorBaseFijo,
      config.fechaAnclaje,
      config.tipoAnclaje,
    ],
  );
}

// ── Histórico (quincenas reales) ──────────────────────────

export async function loadQuincenasReales(): Promise<QuincenaReal[]> {
  const db = await getDatabase();
  return await db.getAllAsync<QuincenaReal>(
    'SELECT * FROM quincena_real ORDER BY fechaRegistro DESC',
  );
}

export async function saveQuincenaReal(q: QuincenaReal): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO quincena_real
      (id, quincenaId, fechaRegistro, brutoReal, deduccionesReal, netoReal, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [q.id, q.quincenaId, q.fechaRegistro, q.brutoReal, q.deduccionesReal, q.netoReal, q.observaciones],
  );
}

export async function deleteQuincenaReal(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM quincena_real WHERE id = ?', [id]);
}

// ── Ajustes manuales ──────────────────────────────────────

export async function loadAjustes(quincenaId: string): Promise<AjusteManual[]> {
  const db = await getDatabase();
  return await db.getAllAsync<AjusteManual>(
    'SELECT * FROM ajuste_manual WHERE quincenaId = ?',
    [quincenaId],
  );
}

export async function saveAjuste(a: AjusteManual): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO ajuste_manual
      (id, quincenaId, descripcion, horasExtra, tipoExtra, horasFestivos, tipoFestivo, notas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [a.id, a.quincenaId, a.descripcion, a.horasExtra, a.tipoExtra, a.horasFestivos, a.tipoFestivo, a.notas],
  );
}

export async function deleteAjuste(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM ajuste_manual WHERE id = ?', [id]);
}

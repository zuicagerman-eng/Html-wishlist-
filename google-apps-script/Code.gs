/**
 * 🎄 WISH LIST NAVIDEÑA — el "servidor" que guarda todo en tu Google Sheet
 * ========================================================================
 *
 * INSTALACIÓN (una sola vez, desde una computadora, ~5 minutos):
 *
 *  1. Abre tu Google Sheet → menú  Extensiones → Apps Script.
 *  2. Borra el código de ejemplo, pega ESTE archivo completo y guarda (💾).
 *  3. Botón azul  Implementar → Nueva implementación.
 *  4. En "Seleccionar tipo" (el engranaje ⚙️) elige  Aplicación web  y pon:
 *        • Ejecutar como ............ Yo (tu correo)
 *        • Quién tiene acceso ....... Cualquier usuario      ← ¡importante!
 *  5. Implementar → Autorizar acceso → elige tu cuenta.
 *     Si aparece "Google no ha verificado esta app": Configuración avanzada →
 *     "Ir a … (no seguro)" → Permitir. (Es tu propio script, no pasa nada.)
 *  6. Copia la "URL de la aplicación web" (termina en /exec) y pégala en
 *     config.js, en SCRIPT_URL.
 *
 * Para comprobar que funciona, abre esa URL en el navegador: debe mostrar
 * algo como  {"items":[],"ok":true}
 *
 * ¿Cambiaste este código después? Implementar → Gestionar implementaciones →
 * ✏️ (editar) → Versión: "Nueva versión" → Implementar. Así la URL NO cambia.
 *
 * Los deseos quedan en la pestaña "Deseos" (se crea sola). Puedes verla y
 * editarla a mano: la app toma los cambios la próxima vez que se actualice.
 * Ojo: ahí SÍ se ve quién reservó qué… ¡no la abran si no quieren spoilers! 🤫
 */

const NOMBRE_HOJA = 'Deseos';

const COLUMNAS = [
  { key: 'id',           titulo: 'ID',            formato: '@',                ancho: 120 },
  { key: 'persona',      titulo: 'Persona',       formato: '@',                ancho: 110 },
  { key: 'titulo',       titulo: 'Deseo',         formato: '@',                ancho: 260 },
  { key: 'categoria',    titulo: 'Tipo',          formato: '@',                ancho: 130 },
  { key: 'prioridad',    titulo: 'Prioridad',     formato: '@',                ancho: 90  },
  { key: 'precio',       titulo: 'Precio',        formato: '#,##0.00',         ancho: 90  },
  { key: 'link',         titulo: 'Link',          formato: '@',                ancho: 220 },
  { key: 'notas',        titulo: 'Notas',         formato: '@',                ancho: 260 },
  { key: 'reservadoPor', titulo: 'Reservado por', formato: '@',                ancho: 130 },
  { key: 'estado',       titulo: 'Estado',        formato: '@',                ancho: 120 },
  { key: 'creado',       titulo: 'Creado',        formato: 'dd/mm/yyyy hh:mm', ancho: 130 },
  { key: 'actualizado',  titulo: 'Actualizado',   formato: 'dd/mm/yyyy hh:mm', ancho: 130 },
];

const POR_KEY = {};
COLUMNAS.forEach(function (c) { POR_KEY[c.key] = c; });

/** Campos que la app puede cambiar (id y fechas los maneja el script). */
const EDITABLES = ['persona', 'titulo', 'categoria', 'prioridad', 'precio', 'link',
                   'notas', 'reservadoPor', 'estado'];
const LARGO_MAX = { titulo: 200, notas: 1000, link: 2000, categoria: 60 };
const ESTADOS = { reservado: '🎁 Reservado', comprado: '✅ Comprado' };


// ───────────────────────── Puntos de entrada (web app) ─────────────────────────

/** GET → devuelve todos los deseos. */
function doGet() {
  return responder_(function () {
    return conCandado_(function () {
      return { items: leerDeseos_(hoja_()) };
    });
  });
}

/** POST {ops:[…]} → aplica los cambios en orden y devuelve la lista actualizada. */
function doPost(e) {
  return responder_(function () {
    const texto = (e && e.postData && e.postData.contents) || '{}';
    const cuerpo = JSON.parse(texto);
    const ops = Array.isArray(cuerpo.ops) ? cuerpo.ops.slice(0, 200) : [];
    return conCandado_(function () {
      const h = hoja_();
      const resultados = ops.map(function (op) {
        try {
          return aplicar_(h, op);
        } catch (err) {
          return 'error: ' + mensaje_(err);
        }
      });
      SpreadsheetApp.flush();
      return { resultados: resultados, items: leerDeseos_(h) };
    });
  });
}

/**
 * (Opcional) Ejecútala una vez desde el editor (botón ▶ Ejecutar) para crear
 * la pestaña "Deseos" y dar los permisos antes de implementar.
 */
function prepararHoja() {
  conCandado_(function () { hoja_(); });
  SpreadsheetApp.getActiveSpreadsheet()
    .toast('¡Lista! Ahora: Implementar → Nueva implementación 🎄', 'Wish List', 10);
}


// ───────────────────────────────── Lógica ─────────────────────────────────

function aplicar_(h, op) {
  if (!op || typeof op !== 'object' || !op.id) return 'ignorado';
  const id = String(op.id).trim().slice(0, 64);
  const fila = buscarFila_(h, id);

  if (op.op === 'add') {
    const datos = limpiar_(op.data || {});
    if (fila) {                      // ya existía (reintento o "deshacer"): se actualiza
      escribirCeldas_(h, fila, datos);
      return 'ok';
    }
    datos.id = id;
    datos.creado = fechaValida_(op.data && op.data.creado) || new Date();
    agregarFila_(h, datos);
    return 'ok';
  }

  if (op.op === 'update') {
    if (!fila) return 'no-existe';
    if (op.si && typeof op.si === 'object' && !cumple_(h, fila, op.si)) return 'conflicto';
    escribirCeldas_(h, fila, limpiar_(op.changes || {}));
    return 'ok';
  }

  if (op.op === 'delete') {
    if (fila) {
      // Google no deja borrar todas las filas no congeladas: dejamos margen.
      if (h.sh.getMaxRows() <= 2) h.sh.insertRowsAfter(h.sh.getMaxRows(), 20);
      h.sh.deleteRow(fila);
    }
    return 'ok';
  }

  return 'ignorado';
}

/** Comprueba condiciones tipo {reservadoPor: ''} antes de reservar (evita choques). */
function cumple_(h, fila, si) {
  return Object.keys(si).every(function (k) {
    const c = POR_KEY[k];
    if (!c || !h.col[k]) return true;
    const actual = deCelda_(c, h.sh.getRange(fila, h.col[k]).getValue());
    const esperado = si[k] === null || si[k] === undefined ? '' : si[k];
    return String(actual).trim().toLowerCase() === String(esperado).trim().toLowerCase();
  });
}

function limpiar_(o) {
  const r = {};
  EDITABLES.forEach(function (k) {
    if (!Object.prototype.hasOwnProperty.call(o, k)) return;
    const v = o[k];
    if (k === 'prioridad') r[k] = aPrioridad_(v);
    else if (k === 'precio') r[k] = aPrecio_(v);
    else if (k === 'estado') r[k] = aEstado_(v);
    else r[k] = String(v === null || v === undefined ? '' : v).trim().slice(0, LARGO_MAX[k] || 80);
  });
  return r;
}


// ─────────────────────────────── Hoja de cálculo ───────────────────────────────

/** Devuelve la pestaña "Deseos" (la crea si hace falta) y dónde está cada columna. */
function hoja_() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  if (!libro) {
    throw new Error('Este script debe crearse DESDE la hoja: Extensiones → Apps Script.');
  }
  let sh = libro.getSheetByName(NOMBRE_HOJA);
  if (!sh) sh = libro.insertSheet(NOMBRE_HOJA, 0);
  if (sh.getMaxRows() < 2) sh.insertRowsAfter(sh.getMaxRows(), 100);

  let encabezados = [];
  const ultimaCol = sh.getLastColumn();
  if (ultimaCol > 0) {
    encabezados = sh.getRange(1, 1, 1, ultimaCol).getValues()[0]
      .map(function (v) { return String(v).trim(); });
  }

  const faltan = COLUMNAS.filter(function (c) { return encabezados.indexOf(c.titulo) === -1; });
  if (faltan.length) {
    const necesarias = encabezados.length + faltan.length;
    if (sh.getMaxColumns() < necesarias) {
      sh.insertColumnsAfter(sh.getMaxColumns(), necesarias - sh.getMaxColumns());
    }
    sh.getRange(1, encabezados.length + 1, 1, faltan.length)
      .setValues([faltan.map(function (c) { return c.titulo; })]);
    encabezados = encabezados.concat(faltan.map(function (c) { return c.titulo; }));
    darFormato_(sh, encabezados);
  }

  const col = {};
  COLUMNAS.forEach(function (c) { col[c.key] = encabezados.indexOf(c.titulo) + 1; });
  return { sh: sh, col: col, ancho: encabezados.length };
}

/** Encabezado rojo navideño, fila congelada, anchos y formatos de cada columna. */
function darFormato_(sh, encabezados) {
  sh.getRange(1, 1, 1, encabezados.length)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#b3001b')
    .setHorizontalAlignment('center');
  sh.setFrozenRows(1);
  sh.setTabColor('#1f7a4a');
  const filas = Math.max(sh.getMaxRows() - 1, 1);
  COLUMNAS.forEach(function (c) {
    const i = encabezados.indexOf(c.titulo) + 1;
    if (i < 1) return;
    sh.getRange(2, i, filas, 1).setNumberFormat(c.formato);
    if (c.ancho) sh.setColumnWidth(i, c.ancho);
  });
}

function leerDeseos_(h) {
  const ultima = h.sh.getLastRow();
  if (ultima < 2) return [];
  const filas = h.sh.getRange(2, 1, ultima - 1, h.ancho).getValues();
  const items = [];
  filas.forEach(function (fila, i) {
    const it = {};
    COLUMNAS.forEach(function (c) { it[c.key] = deCelda_(c, fila[h.col[c.key] - 1]); });
    if (!it.id && !it.titulo) return;                 // fila vacía
    if (!it.id) {                                     // fila escrita a mano en la hoja
      it.id = 'h' + Utilities.getUuid().replace(/-/g, '').slice(0, 11);
      h.sh.getRange(i + 2, h.col.id).setNumberFormat('@').setValue(it.id);
    }
    items.push(it);
  });
  return items;
}

function buscarFila_(h, id) {
  const ultima = h.sh.getLastRow();
  if (ultima < 2) return 0;
  const ids = h.sh.getRange(2, h.col.id, ultima - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === id) return i + 2;
  }
  return 0;
}

function agregarFila_(h, datos) {
  const fila = h.sh.getLastRow() + 1;
  if (fila > h.sh.getMaxRows()) h.sh.insertRowsAfter(h.sh.getMaxRows(), 50);
  const rango = h.sh.getRange(fila, 1, 1, h.ancho);
  const valores = rango.getValues()[0];
  const formatos = rango.getNumberFormats()[0];
  datos.actualizado = new Date();
  COLUMNAS.forEach(function (c) {
    const i = h.col[c.key] - 1;
    formatos[i] = c.formato;
    valores[i] = Object.prototype.hasOwnProperty.call(datos, c.key) ? aCelda_(c, datos[c.key]) : '';
  });
  rango.setNumberFormats([formatos]).setValues([valores]);
}

/** Cambia solo las celdas indicadas (no pisa lo demás de la fila). */
function escribirCeldas_(h, fila, datos) {
  datos.actualizado = new Date();
  Object.keys(datos).forEach(function (k) {
    const c = POR_KEY[k];
    if (!c || k === 'id' || k === 'creado' || !h.col[k]) return;
    h.sh.getRange(fila, h.col[k]).setNumberFormat(c.formato).setValue(aCelda_(c, datos[k]));
  });
}


// ─────────────────────────── Conversión de valores ───────────────────────────

/** Valor de la app → celda. */
function aCelda_(c, v) {
  if (c.key === 'prioridad') return '⭐'.repeat(aPrioridad_(v));
  if (c.key === 'precio') return aPrecio_(v);
  if (c.key === 'estado') return ESTADOS[aEstado_(v)] || '';
  if (c.key === 'creado' || c.key === 'actualizado') return fechaValida_(v) || new Date();
  let s = String(v === null || v === undefined ? '' : v);
  // Evita que Sheets lo interprete como fórmula (=, +, -, @ al inicio).
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

/** Celda → valor de la app. */
function deCelda_(c, v) {
  if (v === '' || v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return isNaN(v.getTime()) ? '' : v.toISOString();
  }
  if (c.key === 'prioridad') return aPrioridad_(v);
  if (c.key === 'precio') return aPrecio_(v);
  if (c.key === 'estado') return aEstado_(v);
  let s = String(v);
  if (/^'[=+\-@]/.test(s)) s = s.slice(1);
  return s;
}

function aPrioridad_(v) {
  const s = String(v === null || v === undefined ? '' : v);
  const estrellas = (s.match(/⭐/g) || []).length;
  const n = estrellas || parseInt(s, 10) || 2;
  return Math.max(1, Math.min(3, n));
}

function aPrecio_(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (typeof v === 'number') return isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : '';
  const n = parsearNumero_(v);
  return n === null ? '' : n;
}

function aEstado_(v) {
  const s = String(v === null || v === undefined ? '' : v).toLowerCase();
  if (s.indexOf('compr') > -1) return 'comprado';
  if (s.indexOf('reserv') > -1) return 'reservado';
  return '';
}

/** Entiende "1.500", "1,500", "12,50", "$ 25", "1.234,56"… */
function parsearNumero_(texto) {
  const s = String(texto).replace(/[^\d.,]/g, '');
  if (!/\d/.test(s)) return null;
  const punto = s.lastIndexOf('.');
  const coma = s.lastIndexOf(',');
  let dec = -1;
  if (punto > -1 && coma > -1) {
    dec = Math.max(punto, coma);
  } else {
    const i = Math.max(punto, coma);
    const separadores = (s.match(/[.,]/g) || []).length;
    if (i > -1 && separadores === 1 && s.length - i - 1 <= 2) dec = i;
  }
  const entero = (dec > -1 ? s.slice(0, dec) : s).replace(/[.,]/g, '');
  const decimales = dec > -1 ? s.slice(dec + 1).replace(/[.,]/g, '') : '';
  const n = Number((entero || '0') + (decimales ? '.' + decimales : ''));
  return isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function fechaValida_(v) {
  if (!v) return null;
  const d = Object.prototype.toString.call(v) === '[object Date]' ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}


// ───────────────────────────────── Utilidades ─────────────────────────────────

function conCandado_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(28000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function responder_(fn) {
  let salida;
  try {
    salida = fn();
    salida.ok = true;
  } catch (err) {
    salida = { ok: false, error: mensaje_(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(salida))
    .setMimeType(ContentService.MimeType.JSON);
}

function mensaje_(err) {
  return String((err && err.message) || err);
}

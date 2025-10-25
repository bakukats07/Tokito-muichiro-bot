import yargs from 'yargs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import fs from 'fs';
import Stream, { Readable } from 'stream';

/** Obtiene la ruta del archivo actual, con opción de remover prefijo file:// */
const __filename = (pathURL = import.meta, rmPrefix = os.platform() !== 'win32') => {
  const p = pathURL.url || pathURL; // Soporta ImportMeta y string
  if (rmPrefix) return /file:\/\/\//.test(p) ? fileURLToPath(p) : p;
  return /file:\/\/\//.test(p) ? p : pathToFileURL(p).href;
};

/** Obtiene el directorio del archivo actual */
const __dirname = (pathURL) => {
  const dir = __filename(pathURL, true);
  const regex = /\/$/;
  if (regex.test(dir)) return dir;
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir.replace(regex, '');
  return path.dirname(dir);
};

/** Función require dinámica para módulos ESM */
const __require = (dir = import.meta) => {
  const p = dir.url || dir;
  return createRequire(p);
};

/** Comprueba si un archivo existe */
const checkFileExists = async (file) => {
  try {
    await fs.promises.access(file, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

/** Construye una URL de API con query y key opcional */
const API = (name, pathStr = '/', query = {}, apikeyName) => {
  const base = name in globalThis.APIs ? globalThis.APIs[name] : name;
  const params = { ...query };
  if (apikeyName) params[apikeyName] = globalThis.APIKeys[base];
  return params && Object.keys(params).length ? `${base}${pathStr}?${new URLSearchParams(params)}` : `${base}${pathStr}`;
};

/** Opciones parseadas de la CLI con yargs */
const opts = yargs(process.argv.slice(2)).exitProcess(false).parse();

/** Prefijo de comandos para el bot */
const prefix = new RegExp(
  `^[${(opts.prefix || '‎xzXZ/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&')}]`
);

/** Guarda un stream en un archivo */
const saveStreamToFile = (stream, file) =>
  new Promise((resolve, reject) => {
    const writable = stream.pipe(fs.createWriteStream(file));
    writable.once('finish', () => {
      resolve();
      writable.destroy();
    });
    writable.once('error', (err) => {
      reject(err);
      writable.destroy();
    });
  });

// --- STREAM UTILITIES ---
const kDestroyed = Symbol('kDestroyed');
const kIsReadable = Symbol('kIsReadable');

const isReadableNodeStream = (obj, strict = false) =>
  !!(
    obj &&
    typeof obj.pipe === 'function' &&
    typeof obj.on === 'function' &&
    (!strict || (typeof obj.pause === 'function' && typeof obj.resume === 'function')) &&
    (!obj._writableState || obj._readableState?.readable !== false) &&
    (!obj._writableState || obj._readableState)
  );

const isNodeStream = (obj) =>
  !!(
    obj &&
    (obj._readableState ||
      obj._writableState ||
      (typeof obj.write === 'function' && typeof obj.on === 'function') ||
      (typeof obj.pipe === 'function' && typeof obj.on === 'function'))
  );

const isDestroyed = (stream) => {
  if (!isNodeStream(stream)) return null;
  const state = stream._writableState || stream._readableState;
  return !!(stream.destroyed || stream[kDestroyed] || state?.destroyed);
};

const isReadableFinished = (stream, strict) => {
  if (!isReadableNodeStream(stream)) return null;
  const rState = stream._readableState;
  if (rState?.errored) return false;
  if (typeof rState?.endEmitted !== 'boolean') return null;
  return !!(rState.endEmitted || (strict === false && rState.ended && rState.length === 0));
};

/** Verifica si un stream es legible */
const isReadableStream = (stream) => {
  if (typeof Stream.isReadable === 'function') return Stream.isReadable(stream);
  if (stream && stream[kIsReadable] != null) return stream[kIsReadable];
  if (typeof stream?.readable !== 'boolean') return null;
  if (isDestroyed(stream)) return false;
  return (isReadableNodeStream(stream) && !!stream.readable && !isReadableFinished(stream)) || stream instanceof fs.ReadStream || stream instanceof Readable;
};

export default {
  __filename,
  __dirname,
  __require,
  checkFileExists,
  API,
  saveStreamToFile,
  isReadableStream,
  opts,
  prefix,
};

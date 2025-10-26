import yargs from 'yargs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import fs from 'fs';
import Stream, { Readable } from 'stream';

/* === UTILIDADES DE RUTA === */
const __filename = (pathURL = import.meta, rmPrefix = os.platform() !== 'win32') => {
  const p = pathURL.url || pathURL;
  if (rmPrefix) return /file:\/\/\//.test(p) ? fileURLToPath(p) : p;
  return /file:\/\/\//.test(p) ? p : pathToFileURL(p).href;
};

const __dirname = (pathURL) => {
  const dir = __filename(pathURL, true);
  const regex = /\/$/;
  if (regex.test(dir)) return dir;
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir.replace(regex, '');
  return path.dirname(dir);
};

const __require = (dir = import.meta) => {
  const p = dir.url || dir;
  return createRequire(p);
};

/* === COMPROBACIÓN DE ARCHIVOS === */
const checkFileExists = async (file) => {
  try {
    await fs.promises.access(file, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

/* === API BUILDER === */
const API = (name, pathStr = '/', query = {}, apikeyName) => {
  const base = name in globalThis.APIs ? globalThis.APIs[name] : name;
  const params = { ...query };
  if (apikeyName) params[apikeyName] = globalThis.APIKeys[base];
  return params && Object.keys(params).length
    ? `${base}${pathStr}?${new URLSearchParams(params)}`
    : `${base}${pathStr}`;
};

/* === CONFIGURACIÓN YARGS === */
const opts = yargs(process.argv.slice(2)).exitProcess(false).parse();

/* === PREFIJOS DEL BOT === */
const prefix = new RegExp(
  `^[${(opts.prefix || '#/!.').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&')}]`
);

/* === STREAMS === */
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

const isReadableStream = (stream) => {
  if (typeof Stream.isReadable === 'function') return Stream.isReadable(stream);
  if (typeof stream?.readable !== 'boolean') return null;
  return (stream instanceof fs.ReadStream || stream instanceof Readable) && !stream.destroyed;
};

/* === ENTORNO === */
const ENV = {
  isTermux: process.env.PREFIX?.includes('com.termux') || fs.existsSync('/data/data/com.termux'),
  isWindows: os.platform() === 'win32',
  isLinux: os.platform() === 'linux',
};

/* === TIEMPO === */
const now = () => {
  const d = new Date();
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
};

/* === IMPORT SEGURO === */
const safeImport = async (pathStr) => {
  try {
    const mod = await import(pathToFileURL(pathStr).href);
    return mod.default || mod;
  } catch (err) {
    console.error(`❌ Error al importar ${pathStr}:`, err.message);
    return null;
  }
};

/* === CREATOR GLOBAL === */
global.CREATOR = {
  name: 'Bakukats07',
  tag: '@Bakukats07',
  version: '1.0.0',
  channel: 'https://whatsapp.com/channel/0029VbBFWP0Lo4hgc1cjlC0M',
};

/* === EXPORTACIONES NOMBRADAS === */
export {
  __filename,
  __dirname,
  __require,
  checkFileExists,
  API,
  saveStreamToFile,
  isReadableStream,
  opts,
  prefix,
  ENV,
  now,
  safeImport,
};

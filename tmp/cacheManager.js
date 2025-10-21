import fs from 'fs';
import path from 'path';

// Carpeta de cache
const CACHE_DIR = path.join('./tmp/cache');

// Crear carpeta si no existe
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// Guardar archivo en cache
export function saveToCache(filename, buffer) {
    const filePath = path.join(CACHE_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

// Revisar si archivo ya existe en cache
export function getFromCache(filename) {
    const filePath = path.join(CACHE_DIR, filename);
    return fs.existsSync(filePath) ? filePath : null;
}

// Limpiar archivos viejos (>30 min)
export function cleanCache() {
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    files.forEach(file => {
        const filePath = path.join(CACHE_DIR, file);
        const stats = fs.statSync(filePath);
        const age = (now - stats.mtimeMs) / 1000 / 60; // en minutos
        if (age > 30) fs.unlinkSync(filePath);
    });
}

// Limpiar cache cada 1 hora
setInterval(cleanCache, 60 * 60 * 1000);

export default {
    saveToCache,
    getFromCache,
    cleanCache,
};
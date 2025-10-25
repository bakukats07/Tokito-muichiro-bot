import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

/**
 * Función genérica para ejecutar FFmpeg
 * @param {Buffer} buffer - El buffer de entrada
 * @param {Array} args - Argumentos adicionales para FFmpeg
 * @param {String} ext - Extensión temporal del archivo de entrada
 * @param {String} ext2 - Extensión de salida
 * @returns {Promise<{data: Buffer, filename: String, delete: Function}>}
 */
async function ffmpeg(buffer, args = [], ext = 'tmp', ext2 = 'out') {
  return new Promise(async (resolve, reject) => {
    try {
      const tmpPath = join(globalThis.__dirname(import.meta.url), 'tmp', `${Date.now()}.${ext}`);
      const outPath = `${tmpPath}.${ext2}`;

      // Guardar buffer temporalmente
      await fs.writeFile(tmpPath, buffer);

      const process = spawn('ffmpeg', ['-y', '-i', tmpPath, ...args, outPath]);

      process.on('error', (err) => reject(err));

      process.on('close', async (code) => {
        try {
          await fs.unlink(tmpPath); // Eliminar archivo temporal de entrada
          if (code !== 0) return reject(new Error(`FFmpeg exited with code ${code}`));

          resolve({
            data: await fs.readFile(outPath),
            filename: outPath,
            delete: () => fs.unlink(outPath),
          });
        } catch (err) {
          reject(err);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Convierte buffer a PTT (voice note) en formato OGG
 */
function toPTT(buffer, ext = 'tmp') {
  return ffmpeg(buffer, [
    '-vn',                // Sin video
    '-c:a', 'libopus',    // Códec Opus
    '-b:a', '128k',       // Bitrate
    '-vbr', 'on',         // Variable Bitrate
  ], ext, 'ogg');
}

/**
 * Convierte buffer a audio en formato OPUS
 */
function toAudio(buffer, ext = 'tmp') {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vbr', 'on',
    '-compression_level', '10',
  ], ext, 'opus');
}

/**
 * Convierte buffer a video en formato MP4
 */
function toVideo(buffer, ext = 'tmp') {
  return ffmpeg(buffer, [
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-crf', '32',
    '-preset', 'slow',
  ], ext, 'mp4');
}

export {
  ffmpeg,
  toPTT,
  toAudio,
  toVideo,
};

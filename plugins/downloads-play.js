import fetch from 'node-fetch';
import yts from 'yt-search';
import fs from 'fs';
import path from 'path';
import cacheManager from '../tmp/cacheManager.js'; // ruta correcta al cache manager

const AUDIO_CMDS = ['play', 'ytaudio', 'audio', 'mp3'];
const VIDEO_CMDS = ['play2', 'mp4', 'video'];

async function handler(m, { conn, command, text }) {
    if (!text) return m.reply('❌ Escribe el nombre o link de la canción/video.');

    const isAudio = AUDIO_CMDS.includes(command.toLowerCase());
    const isVideo = VIDEO_CMDS.includes(command.toLowerCase());

    try {
        const isLink = text.startsWith('http');
        let info;

        if (isLink) {
            const id = extractID(text);
            if (!id) return m.reply('❌ Link inválido.');
            const r = await yts({ videoId: id });
            if (!r?.videos?.length) return m.reply('❌ No encontré resultados.');
            info = r.videos[0];
        } else {
            const r = await yts(text);
            if (!r?.videos?.length) return m.reply('❌ No encontré resultados.');
            info = r.videos[0];
        }

        const title = info.title.replace(/[^a-zA-Z0-9 ]/g, '');
        const filename = `${title}.${isAudio ? 'mp3' : 'mp4'}`;
        const cached = cacheManager.getFromCache(filename);

        if (cached) {
            if (isAudio) {
                await conn.sendMessage(m.chat, { audio: fs.readFileSync(cached), ptt: true }, { quoted: m });
                return m.reply(`🌸 ¡Listo! He enviado la nota de voz de ${title}`);
            } else {
                await conn.sendMessage(m.chat, { video: fs.readFileSync(cached), caption: `🎬 ${title}\n✨ ¡Listo! Aquí está tu video en 360p.` }, { quoted: m });
                return;
            }
        }

        // Descargar contenido (solo highestaudio o 360p)
        const url = info.url; // Aquí puedes integrar tu downloader real
        const buffer = await fetch(url).then(res => res.arrayBuffer());

        const filePath = cacheManager.saveToCache(filename, Buffer.from(buffer));

        if (isAudio) {
            await conn.sendMessage(m.chat, { audio: fs.readFileSync(filePath), ptt: true }, { quoted: m });
            return m.reply(`🌸 ¡Listo! He enviado la nota de voz de ${title}`);
        } else {
            await conn.sendMessage(m.chat, { video: fs.readFileSync(filePath), caption: `🎬 ${title}\n✨ ¡Listo! Aquí está tu video en 360p.` }, { quoted: m });
        }

    } catch (err) {
        console.error(err);
        m.reply('❌ Ocurrió un error al descargar el contenido.');
    }
}

function extractID(url) {
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : null;
}

export default { handler };
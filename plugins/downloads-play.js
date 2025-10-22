import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 📁 Directorios y configuraciones
const tmpDir = path.join(__dirname, 'tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const botPfp = path.join(__dirname, '../media/bot.jpg')
const CREATOR_SIGNATURE = '\n\n🎧 Creado por: Bakukats07 💻'

// 🧩 Manejador principal
let handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!args[0]) return m.reply(`🎵 Ejemplo de uso:\n${usedPrefix + command} Despacito\nO con un link de YouTube.`)

  const text = args.join(' ')
  const isAudio = ['play', 'ytaudio', 'audio', 'mp3'].includes(command)

  // Endpoint RapidAPI
  const endpoint = `https://youtube-downloader.p.rapidapi.com/dl?url=${encodeURIComponent(text)}`

  try {
    await m.reply('🔎 Buscando y descargando contenido...')

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': '82fd1691b8mshd09070ae556cdddp1cb6e2jsnf029e65d5a97', // <--- Pega tu key aquí
        'X-RapidAPI-Host': 'youtube-downloader.p.rapidapi.com'
      }
    })

    const data = await res.json().catch(() => null)
    if (!data || !data.result || !data.result.url) {
      throw new Error('⚠️ No se pudo obtener el contenido de la API.')
    }

    const fileUrl = data.result.url
    const ext = isAudio ? '.mp3' : '.mp4'
    const tmpFile = path.join(tmpDir, `file_${Date.now()}${ext}`)

    // Descargar archivo usando streams
    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error('Error al descargar el archivo desde el enlace.')

    await streamPipeline(response.body, fs.createWriteStream(tmpFile))

    // Miniatura
    const thumbnail = fs.existsSync(botPfp) ? fs.readFileSync(botPfp) : null

    // Enviar al chat
    if (isAudio) {
      await conn.sendMessage(m.chat, {
        audio: { url: tmpFile },
        mimetype: 'audio/mpeg',
        ptt: false,
        contextInfo: {
          externalAdReply: {
            title: `🎧 ${data.result.title || 'Audio Descargado'}`,
            body: `API usada: RapidAPI\n${CREATOR_SIGNATURE}`,
            thumbnail,
            sourceUrl: data.result.url
          }
        }
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        video: { url: tmpFile },
        caption: `🎬 ${data.result.title || 'Video Descargado'}\nAPI usada: RapidAPI${CREATOR_SIGNATURE}`,
        contextInfo: {
          externalAdReply: {
            title: data.result.title || 'Video descargado',
            body: `Tu bot siempre activo 🎵\nAPI usada: RapidAPI`,
            thumbnail,
            sourceUrl: data.result.url
          }
        }
      }, { quoted: m })
    }

    // Eliminar archivo temporal después de enviarlo
    setTimeout(() => { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile) }, 10 * 1000)

    console.log(`✅ Archivo enviado correctamente desde RapidAPI`)
    await m.reply('✅ Descarga completada correctamente 🎶')

  } catch (err) {
    console.error('❌ Error en downloads-play:', err)
    m.reply('⚠️ Hubo un problema al procesar la descarga. Revisa tu key de RapidAPI o intenta con otra canción.')
  }
}

handler.help = ['play', 'ytaudio', 'audio', 'mp3', 'mp4', 'video']
handler.tags = ['descargas']
handler.command = /^(play|ytaudio|audio|mp3|mp4|video)$/i
handler.limit = 1

export default handler

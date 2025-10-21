import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

// Obtener la ruta absoluta del archivo actual
const __dirname = path.dirname(new URL(import.meta.url).pathname)

// Importar dinámicamente main-checkApis.js
const { checkActiveAPI } = await import(`file://${path.join(__dirname, '../main-checkApis.js')}`)

// Rutas absolutas para tmp y thumbnail
const tmpDir = path.join(__dirname, 'tmp')
const botPfp = path.join(__dirname, '../media/bot.jpg') // thumbnail del bot

// Crear carpeta tmp si no existe
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

let handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!args[0]) return m.reply(`🎵 Ejemplo de uso:\n${usedPrefix + command} Despacito\nO también con un link de YouTube.`)

  const text = args.join(' ')
  const apiBase = await checkActiveAPI()
  if (!apiBase) return m.reply('⚠️ Ninguna API está activa en este momento, inténtalo más tarde.')

  try {
    m.reply('🔎 Buscando contenido, por favor espera un momento...')

    let endpoint
    let type

    // Detectar tipo de comando
    if (['play', 'ytaudio', 'audio', 'mp3'].includes(command)) {
      endpoint = `${apiBase}/api/download/ytmp3?url=${encodeURIComponent(text)}`
      type = 'audio'
    } else if (['play2', 'mp4', 'video'].includes(command)) {
      endpoint = `${apiBase}/api/download/ytmp4?url=${encodeURIComponent(text)}`
      type = 'video'
    } else {
      return m.reply('❓ Comando no reconocido.')
    }

    const res = await fetch(endpoint)
    const data = await res.json()

    if (!data || !data.result || !data.result.url) {
      throw new Error('⚠️ No se pudo obtener el contenido del video/audio.')
    }

    const fileUrl = data.result.url
    const ext = type === 'audio' ? '.mp3' : '.mp4'
    const tmpFile = path.join(tmpDir, `file_${Date.now()}${ext}`)

    const response = await fetch(fileUrl)
    const buffer = await response.arrayBuffer()
    fs.writeFileSync(tmpFile, Buffer.from(buffer))

    const thumbnail = fs.existsSync(botPfp) ? fs.readFileSync(botPfp) : null

    if (type === 'audio') {
      await conn.sendMessage(m.chat, {
        audio: fs.readFileSync(tmpFile),
        mimetype: 'audio/mpeg',
        ptt: false,
        contextInfo: {
          externalAdReply: {
            title: `🎧 ${data.result.title || 'Audio Descargado'}`,
            body: '🎶 Enviado por tu bot favorito',
            thumbnail,
            sourceUrl: data.result.url
          }
        }
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        video: fs.readFileSync(tmpFile),
        caption: `🎬 ${data.result.title || 'Video Descargado'}\n📥 Enviado por tu bot`,
        contextInfo: {
          externalAdReply: {
            title: data.result.title || 'Video descargado',
            body: '🎥 Tu bot siempre activo',
            thumbnail,
            sourceUrl: data.result.url
          }
        }
      }, { quoted: m })
    }

    // Eliminar archivo temporal
    setTimeout(() => {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    }, 15 * 1000)

    await m.reply('✅ Descarga completada y enviada correctamente 🎶')

  } catch (err) {
    console.error(err)
    m.reply('⚠️ Error al intentar procesar tu solicitud, intenta nuevamente más tarde.')
  }
}

handler.help = ['play', 'play2', 'ytaudio', 'audio', 'mp3', 'mp4', 'video']
handler.tags = ['descargas']
handler.command = /^(play|play2|ytaudio|audio|mp3|mp4|video)$/i
handler.limit = 1

export default handler

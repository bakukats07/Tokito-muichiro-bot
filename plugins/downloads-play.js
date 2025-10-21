import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import { checkActiveAPI } from './plugins/main-checkApis.js'

let handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!args[0]) return m.reply(`🎵 Ejemplo de uso:\n${usedPrefix + command} Despacito\nO también con un link de YouTube.`)

  const text = args.join(' ')
  const apiBase = await checkActiveAPI()
  if (!apiBase) return m.reply('⚠️ Ninguna API está activa en este momento, inténtalo más tarde.')

  const tmpDir = path.join(process.cwd(), 'plugins', 'tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  try {
    m.reply('🔎 Buscando contenido, por favor espera un momento...')

    let endpoint
    let type

    // Detectar tipo de comando
    if (['play', 'ytaudio', 'audio', 'mp3'].includes(command)) {
      endpoint = `${apiBase}/api/download/ytmp3?query=${encodeURIComponent(text)}`
      type = 'audio'
    } else if (['play2', 'mp4', 'video'].includes(command)) {
      endpoint = `${apiBase}/api/download/ytmp4?query=${encodeURIComponent(text)}`
      type = 'video'
    } else {
      return m.reply('❓ Comando no reconocido.')
    }

    // Llamar API
    const res = await fetch(endpoint)
    const data = await res.json()

    if (!data || !data.result || !data.result.url) {
      throw new Error('⚠️ No se pudo obtener el contenido.')
    }

    const fileUrl = data.result.url
    const ext = type === 'audio' ? '.mp3' : '.mp4'
    const tmpFile = path.join(tmpDir, `file_${Date.now()}${ext}`)

    // Descargar archivo temporal
    const response = await fetch(fileUrl)
    const buffer = await response.arrayBuffer()
    fs.writeFileSync(tmpFile, Buffer.from(buffer))

    // Enviar resultado con el ícono del bot
    const botPfp = './media/bot.jpg' // Usa aquí el ícono del bot (ajusta la ruta si es diferente)

    if (type === 'audio') {
      await conn.sendMessage(m.chat, {
        audio: { url: tmpFile },
        mimetype: 'audio/mpeg',
        ptt: false,
        contextInfo: {
          externalAdReply: {
            title: `🎧 ${data.result.title || 'Audio Descargado'}`,
            body: '🎶 Enviado por tu bot favorito',
            thumbnail: fs.existsSync(botPfp) ? fs.readFileSync(botPfp) : null,
            sourceUrl: data.result.url
          }
        }
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        video: { url: tmpFile },
        caption: `🎬 ${data.result.title || 'Video Descargado'}\n📥 Enviado por tu bot`,
        contextInfo: {
          externalAdReply: {
            title: data.result.title || 'Video descargado',
            body: '🎥 Tu bot siempre activo',
            thumbnail: fs.existsSync(botPfp) ? fs.readFileSync(botPfp) : null,
            sourceUrl: data.result.url
          }
        }
      }, { quoted: m })
    }

    // Eliminar archivo temporal
    setTimeout(() => {
      fs.unlinkSync(tmpFile)
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
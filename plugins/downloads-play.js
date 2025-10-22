import fs from 'fs'
import path from 'path'
import ytdl from 'ytdl-core'
import ytSearch from 'yt-search'
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
  if (!args[0]) return m.reply(`🎵 Ejemplo de uso:\n${usedPrefix + command} Despacito`)

  const text = args.join(' ')
  const isAudio = ['play', 'ytaudio', 'audio', 'mp3'].includes(command)

  try {
    await m.reply('🔎 Buscando videos en YouTube...')

    let url
    if (!ytdl.validateURL(text)) {
      // Buscar los 5 primeros resultados
      const searchResult = await ytSearch(text)
      if (!searchResult || !searchResult.videos || searchResult.videos.length === 0)
        return m.reply('⚠️ No se encontró ningún video con ese nombre.')

      const top5 = searchResult.videos.slice(0, 5)
      let msgText = '🎬 Selecciona el video que quieres descargar:\n\n'
      top5.forEach((vid, i) => {
        msgText += `${i + 1}. ${vid.title} (${vid.timestamp})\n`
      })
      msgText += '\nResponde con el número del video.'

      // Guardamos los videos en memoria para elegir luego
      conn.videoChoices = conn.videoChoices || {}
      conn.videoChoices[m.sender] = top5

      return m.reply(msgText)
    } else {
      url = text
    }

    // Si es URL directa
    const info = await ytdl.getInfo(url)
    const title = info.videoDetails.title || 'VideoDescargado'
    await downloadAndSend(url, title, isAudio, conn, m)
  } catch (err) {
    console.error('❌ Error en downloads-play:', err)
    m.reply('⚠️ Hubo un problema al procesar la descarga.')
  }
}

// Función auxiliar para descargar y enviar
async function downloadAndSend(url, title, isAudio, conn, m) {
  const ext = isAudio ? '.mp3' : '.mp4'
  const tmpFile = path.join(tmpDir, `file_${Date.now()}${ext}`)
  const streamOptions = isAudio ? { filter: 'audioonly' } : { quality: 'highestvideo' }

  await streamPipeline(ytdl(url, streamOptions), fs.createWriteStream(tmpFile))

  const thumbnail = fs.existsSync(botPfp) ? fs.readFileSync(botPfp) : null

  if (isAudio) {
    await conn.sendMessage(m.chat, {
      audio: { url: tmpFile },
      mimetype: 'audio/mpeg',
      ptt: false,
      contextInfo: {
        externalAdReply: {
          title: `🎧 ${title}`,
          body: `Descargado con ytdl-core\n${CREATOR_SIGNATURE}`,
          thumbnail,
          sourceUrl: url
        }
      }
    }, { quoted: m })
  } else {
    await conn.sendMessage(m.chat, {
      video: { url: tmpFile },
      caption: `🎬 ${title}\nDescargado con ytdl-core${CREATOR_SIGNATURE}`,
      contextInfo: {
        externalAdReply: {
          title,
          body: `Tu bot siempre activo 🎵`,
          thumbnail,
          sourceUrl: url
        }
      }
    }, { quoted: m })
  }

  setTimeout(() => { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile) }, 10 * 1000)
}

// 🧩 Manejador para que el usuario elija un video de los resultados
handler.chooseVideo = async (m, conn, choiceNumber, isAudio) => {
  if (!conn.videoChoices || !conn.videoChoices[m.sender]) return m.reply('⚠️ No tienes videos para elegir.')
  const top5 = conn.videoChoices[m.sender]
  const index = choiceNumber - 1
  if (!top5[index]) return m.reply('⚠️ Número inválido.')
  const video = top5[index]
  await downloadAndSend(video.url, video.title, isAudio, conn, m)
  delete conn.videoChoices[m.sender]
}

handler.help = ['play', 'ytaudio', 'audio', 'mp3', 'mp4', 'video']
handler.tags = ['descargas']
handler.command = /^(play|ytaudio|audio|mp3|mp4|video)$/i
handler.limit = 1

export default handler

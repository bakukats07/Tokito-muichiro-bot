import fs from 'fs'
import path from 'path'
import ytSearch from 'yt-search'
import { fileURLToPath } from 'url'
import { promisify } from 'util'
import { pipeline } from 'stream'
import { exec } from 'child_process'
import { ytDlpExec } from 'yt-dlp-exec'

const streamPipeline = promisify(pipeline)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const tmpDir = path.join(__dirname, 'tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const botPfp = path.join(__dirname, '../media/bot.jpg')
const CREATOR_SIGNATURE = '\n\n🎧 Creado por: Bakukats07 💻'

// Almacena resultados de búsqueda por usuario
const searchResults = {}

let handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!args[0]) {
    return m.reply(`🎵 Ejemplo de uso:\n${usedPrefix + command} Despacito\nO también puedes pegar un link de YouTube.`)
  }

  const isAudio = ['play', 'ytaudio', 'audio', 'mp3'].includes(command)
  const text = args.join(' ')

  try {
    let url
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//
    if (!ytRegex.test(text)) {
      // Buscar los 5 primeros videos válidos (no directos, no shorts)
      const search = await ytSearch(text)
      const videos = (search.videos?.length ? search.videos : search.all || [])
        .filter(v => !v.isLive && v.seconds > 0)

      if (!videos.length) return m.reply('⚠️ No se encontró ningún video válido para descargar.')

      const top5 = videos.slice(0, 5)
      searchResults[m.sender] = { videos: top5, isAudio }

      let msg = '🎬 *Selecciona el video que quieres descargar respondiendo con el número:*\n\n'
      top5.forEach((vid, i) => {
        msg += `*${i + 1}.* ${vid.title}\n📺 ${vid.author.name}  ⏱️ ${vid.timestamp}\n\n`
      })

      return m.reply(msg)
    } else {
      url = text
      await downloadVideo(url, isAudio, m, conn)
    }
  } catch (err) {
    console.error('❌ Error en downloads-play:', err)
    m.reply('⚠️ Hubo un error al procesar la descarga. Intenta con otro video.')
  }
}

// 🔽 Función para descargar y enviar audio o video con yt-dlp-exec
async function downloadVideo(url, isAudio, m, conn) {
  try {
    const ext = isAudio ? '.mp3' : '.mp4'
    const infoCmd = `yt-dlp -j ${url}`
    const infoRaw = await execPromise(infoCmd)
    const info = JSON.parse(infoRaw)

    if (!info || info.is_private || info.age_limit || info.playability_status?.status === 'ERROR') {
      return m.reply('❌ Este video no está disponible o tiene restricciones en YouTube.')
    }

    const title = (info.title || 'VideoDescargado').replace(/[^\w\s]/gi, '')
    const tmpFile = path.join(tmpDir, `${Date.now()}_${title}${ext}`)

    await ytDlpExec(url, {
      output: tmpFile,
      format: isAudio ? 'bestaudio/best' : 'bestvideo+bestaudio/best',
      extractAudio: isAudio,
      audioFormat: isAudio ? 'mp3' : undefined,
      audioQuality: '192K',
      quiet: true,
    })

    const thumbnail = fs.existsSync(botPfp) ? fs.readFileSync(botPfp) : null

    if (isAudio) {
      await conn.sendMessage(m.chat, {
        audio: { url: tmpFile },
        mimetype: 'audio/mpeg',
        ptt: false,
        contextInfo: {
          externalAdReply: {
            title: `🎧 ${title}`,
            body: `Descargado con yt-dlp${CREATOR_SIGNATURE}`,
            thumbnail,
            sourceUrl: url
          }
        }
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        video: { url: tmpFile },
        caption: `🎬 ${title}\nDescargado con yt-dlp${CREATOR_SIGNATURE}`,
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

    // Borra archivo temporal después de 15s
    setTimeout(() => {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    }, 15000)

  } catch (err) {
    if (err?.message?.includes('private')) {
      return m.reply('🔒 Este video es privado y no se puede descargar.')
    } else if (err?.message?.includes('unavailable')) {
      return m.reply('❌ Este video no está disponible o tiene restricciones regionales / de edad.')
    } else {
      console.error('⚠️ Error inesperado en downloadVideo:', err)
      return m.reply('⚠️ No se pudo descargar este video. Prueba con otro enlace o título.')
    }
  }
}

// Promesa para ejecutar comandos shell
function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(stderr || error.message)
      else resolve(stdout)
    })
  })
}

// 🧠 Maneja cuando el usuario responde con un número
handler.before = async function (m, { conn }) {
  const text = m.text?.trim()
  const user = m.sender

  if (!searchResults[user]) return
  const data = searchResults[user]
  const number = parseInt(text)

  if (isNaN(number) || number < 1 || number > data.videos.length) return

  const video = data.videos[number - 1]
  await downloadVideo(video.url, data.isAudio, m, conn)

  delete searchResults[user]
  return !0
}

handler.help = ['play', 'ytaudio', 'audio', 'mp3', 'mp4', 'video']
handler.tags = ['descargas']
handler.command = /^(play|ytaudio|audio|mp3|mp4|video)$/i
handler.limit = 1

export default handler

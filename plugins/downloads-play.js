import fs from 'fs'
import path from 'path'
import ytSearch from 'yt-search'
import { Innertube } from 'youtubei.js'
import { fileURLToPath } from 'url'
import { promisify } from 'util'
import { pipeline } from 'stream'

const streamPipeline = promisify(pipeline)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const tmpDir = path.join(__dirname, 'tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const botPfp = path.join(__dirname, '../media/bot.jpg')
const CREATOR_SIGNATURE = '\n\n🎧 Creado por: Bakukats07 💻'

// Almacena resultados de búsqueda por usuario
const searchResults = {}

const youtube = await Innertube.create()

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
      // Buscar los 5 primeros videos
      const search = await ytSearch(text)
      const videos = search.videos?.length ? search.videos : search.all || []

      if (!videos.length) return m.reply('⚠️ No se encontró ningún video.')

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

// 🔽 Función para descargar y enviar audio o video
async function downloadVideo(url, isAudio, m, conn) {
  const video = await youtube.getInfo(url)
  const title = video.basic_info?.title?.replace(/[^\w\s]/gi, '') || 'VideoDescargado'
  const ext = isAudio ? '.mp3' : '.mp4'
  const tmpFile = path.join(tmpDir, `${Date.now()}_${title}${ext}`)

  const stream = await video.download({
    quality: isAudio ? 'best' : 'best',
    type: isAudio ? 'audio' : 'video'
  })

  await streamPipeline(stream, fs.createWriteStream(tmpFile))

  const thumbnail = fs.existsSync(botPfp) ? fs.readFileSync(botPfp) : null

  if (isAudio) {
    await conn.sendMessage(m.chat, {
      audio: { url: tmpFile },
      mimetype: 'audio/mpeg',
      ptt: false,
      contextInfo: {
        externalAdReply: {
          title: `🎧 ${title}`,
          body: `Descargado con youtubei.js${CREATOR_SIGNATURE}`,
          thumbnail,
          sourceUrl: url
        }
      }
    }, { quoted: m })
  } else {
    await conn.sendMessage(m.chat, {
      video: { url: tmpFile },
      caption: `🎬 ${title}\nDescargado con youtubei.js${CREATOR_SIGNATURE}`,
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

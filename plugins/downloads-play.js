import fs from 'fs'
import path from 'path'
import ytSearch from 'yt-search'
import { fileURLToPath } from 'url'
import { promisify } from 'util'
import { exec } from 'child_process'

const execPromise = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const tmpDir = path.join(__dirname, 'tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const botPfp = path.join(__dirname, '../media/bot.jpg')
const CREATOR_SIGNATURE = '\n\n🎧 Creado por: Bakukats07 💻'
const searchResults = {}

// 🧩 Autoactualiza yt-dlp en segundo plano cada 2h
setInterval(async () => {
  try {
    await execPromise('yt-dlp -U')
  } catch {}
}, 7200000)

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

async function downloadVideo(url, isAudio, m, conn) {
  try {
    // ⚙️ Actualiza yt-dlp solo si pasó mucho tiempo desde la última
    execPromise('yt-dlp -U').catch(() => {})

    const infoCmd = `yt-dlp -j ${url}`
    const { stdout: infoStdout } = await execPromise(infoCmd).catch(e => ({ stdout: '', stderr: String(e) }))
    let info
    try { info = infoStdout ? JSON.parse(infoStdout) : null } catch { info = null }

    if (!info || info.is_private || info.age_limit || info.playability_status?.status === 'ERROR') {
      return m.reply('❌ Este video no está disponible o tiene restricciones en YouTube.')
    }

    const title = (info.title || 'VideoDescargado').replace(/[^\w\s]/gi, '')
    const tmpBase = path.join(tmpDir, `${Date.now()}_${title}`)
    const tmpAudio = `${tmpBase}.opus`
    const tmpVideo = `${tmpBase}.mp4`

    // 🕓 Aviso inicial más rápido
    m.reply(`🎧 *Procesando:* ${title}\n> ⏳ Esto puede tardar unos segundos...`)

    // 🚀 Descarga rápida según tipo
    const cmd = isAudio
      ? `yt-dlp -f bestaudio --extract-audio --audio-format opus -o "${tmpAudio}" "${url}" --no-progress`
      : `yt-dlp -f "bestvideo+bestaudio/best" -o "${tmpVideo}" "${url}" --no-progress`

    const { stderr } = await execPromise(cmd).catch(e => ({ stderr: String(e) }))
    if (stderr) console.warn(stderr)

    const thumbnail = fs.existsSync(botPfp) ? fs.readFileSync(botPfp) : null

    if (isAudio) {
      if (!fs.existsSync(tmpAudio) || fs.statSync(tmpAudio).size < 10000) {
        return m.reply('⚠️ No se pudo obtener el audio. Intenta otro video.')
      }

      await conn.sendMessage(m.chat, {
        audio: { url: tmpAudio },
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
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
      if (!fs.existsSync(tmpVideo)) return m.reply('⚠️ No se pudo obtener el video.')
      await conn.sendMessage(m.chat, {
        video: { url: tmpVideo },
        caption: `🎬 ${title}\nDescargado con yt-dlp${CREATOR_SIGNATURE}`,
        contextInfo: {
          externalAdReply: {
            title,
            body: 'Tu bot siempre activo 🎵',
            thumbnail,
            sourceUrl: url
          }
        }
      }, { quoted: m })
    }

    // 🧹 Limpieza rápida
    setTimeout(() => {
      try { fs.unlinkSync(isAudio ? tmpAudio : tmpVideo) } catch {}
    }, 10000)

  } catch (err) {
    console.error('⚠️ Error inesperado:', err)
    m.reply('⚠️ No se pudo descargar este video. Prueba con otro enlace o título.')
  }
}

// 🧠 Manejador de selección
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

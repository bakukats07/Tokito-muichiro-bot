import fs from 'fs'
import path from 'path'
import ytSearch from 'yt-search'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import { promisify } from 'util'
import { exec } from 'child_process'
import fetch from 'node-fetch'

const execPromise = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const tmpDir = path.join(__dirname, 'tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const CREATOR_SIGNATURE = '\n\n🎧 Creado por: Bakukats07 💻'
const searchResults = {}
let cachedBotThumb = null // 🧠 Cache de la miniatura del bot

// 🧩 Autoactualiza yt-dlp cada 12 h
setInterval(async () => {
  try { await execPromise('yt-dlp -U') } catch {}
}, 43200000)

// 🚀 Ejecutar yt-dlp sin shell (más rápido)
function runYtDlp(args = [], useStream = false) {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', args)
    let stderr = ''
    if (!useStream) {
      ytdlp.stderr.on('data', chunk => stderr += chunk.toString())
      ytdlp.on('close', code => {
        if (code === 0) resolve()
        else reject(new Error(stderr))
      })
    } else {
      resolve(ytdlp) // Devuelve el proceso directamente para usar su stdout
    }
  })
}

let handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!args[0]) {
    return m.reply(`🎵 Ejemplo:\n${usedPrefix + command} Despacito\nO pega un link de YouTube.`)
  }

  const isAudio = ['play', 'ytaudio', 'audio', 'mp3'].includes(command.toLowerCase())
  const text = args.join(' ')
  try {
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//
    if (!ytRegex.test(text)) {
      const search = await ytSearch(text)
      const videos = (search.videos?.length ? search.videos : search.all || [])
        .filter(v => !v.isLive && v.seconds > 0)
      if (!videos.length) return m.reply('⚠️ No se encontró ningún video válido para descargar.')

      const top5 = videos.slice(0, 5)
      searchResults[m.sender] = { videos: top5, isAudio }
      let msg = '🎬 *Selecciona el video que quieres descargar respondiendo con el número:*\n\n'
      top5.forEach((v, i) => {
        msg += `*${i + 1}.* ${v.title}\n📺 ${v.author.name}  ⏱️ ${v.timestamp}\n\n`
      })
      return m.reply(msg)
    } else {
      await downloadVideo(text, isAudio, m, conn)
    }
  } catch (err) {
    console.error('❌ Error en downloads-play:', err)
    m.reply('⚠️ Hubo un error al procesar la descarga. Intenta con otro video.')
  }
}

// ⚙️ Descarga optimizada (usa foto de perfil del bot y streams)
async function downloadVideo(url, isAudio, m, conn) {
  try {
    const tmpBase = path.join(tmpDir, `${Date.now()}`)
    const output = `${tmpBase}.%(ext)s`

    m.reply(`🎧 *Procesando:* ${url}\n> ⏳ Esto puede tardar unos segundos...`)

    // 📸 Miniatura del bot (cacheada)
    let botThumb = cachedBotThumb
    if (!botThumb) {
      try {
        const botPicUrl = await conn.profilePictureUrl(conn.user.jid, 'image')
        const res = await fetch(botPicUrl)
        botThumb = Buffer.from(await res.arrayBuffer())
        cachedBotThumb = botThumb // Guardar en caché
      } catch {
        botThumb = null
      }
    }

    // 🧠 Parámetros yt-dlp optimizados
    const baseArgs = ['--no-warnings', '--no-progress', '--no-call-home', '--no-check-certificate']

    if (isAudio) {
      // 🎧 Modo stream directo de audio (sin escribir en disco)
      const args = [
        ...baseArgs,
        '-f', 'bestaudio[ext=webm][abr<=128]',
        '--extract-audio', '--audio-format', 'opus',
        '-o', '-', // salida por stdout
        url
      ]
      const ytdlp = await runYtDlp(args, true)

      await conn.sendMessage(m.chat, {
        audio: { stream: ytdlp.stdout },
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
        contextInfo: {
          externalAdReply: {
            title: '🎧 Audio descargado',
            body: `Descargado con yt-dlp${CREATOR_SIGNATURE}`,
            thumbnail: botThumb,
            sourceUrl: url
          }
        }
      }, { quoted: m })
    } else {
      // 🎬 Video (descarga a archivo por estabilidad)
      const args = [
        ...baseArgs,
        '-f', 'bv*[height<=720]+ba/b[height<=720]',
        '-o', output,
        url
      ]

      await runYtDlp(args)

      const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(path.basename(tmpBase)))
      const downloaded = files.length ? path.join(tmpDir, files[0]) : null
      if (!downloaded) return m.reply('⚠️ No se pudo obtener el archivo descargado.')

      const title = path.basename(downloaded).replace(/\.[^/.]+$/, '')

      await conn.sendMessage(m.chat, {
        video: { url: downloaded },
        caption: `🎬 ${title}\nDescargado con yt-dlp${CREATOR_SIGNATURE}`,
        contextInfo: {
          externalAdReply: {
            title,
            body: 'Tu bot siempre activo 🎵',
            thumbnail: botThumb,
            sourceUrl: url
          }
        }
      }, { quoted: m })

      // 🧹 Limpieza posterior
      setTimeout(() => { try { fs.unlinkSync(downloaded) } catch {} }, 10000)
    }

  } catch (err) {
    console.error('⚠️ Error inesperado:', err)
    m.reply('⚠️ No se pudo descargar este video. Prueba con otro enlace o título.')
  }
}

// 🧠 Selección de resultado
handler.before = async function (m, { conn }) {
  const text = m.text?.trim()
  const user = m.sender
  if (!searchResults[user]) return
  const data = searchResults[user]
  const num = parseInt(text)
  if (isNaN(num) || num < 1 || num > data.videos.length) return
  const vid = data.videos[num - 1]
  await downloadVideo(vid.url, data.isAudio, m, conn)
  delete searchResults[user]
  return !0
}

handler.help = ['play', 'ytaudio', 'audio', 'mp3', 'mp4', 'video']
handler.tags = ['descargas']
handler.command = /^(play|ytaudio|audio|mp3|mp4|video)$/i
handler.limit = 1

export default handler

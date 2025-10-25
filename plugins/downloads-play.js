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
const selectionTimeouts = {}
let cachedBotThumb = null
const SELECTION_TIMEOUT = 20000

// ⚡ Nueva cache de búsquedas para respuestas instantáneas
const searchCache = new Map()

// 🔄 Auto actualización de yt-dlp cada 12h
setInterval(async () => {
  try { await execPromise('yt-dlp -U') } catch {}
}, 43200000)

// 🚀 Función optimizada de búsqueda (usa cache temporal)
async function fastSearch(query) {
  if (searchCache.has(query)) return searchCache.get(query)
  const result = await ytSearch(query)
  searchCache.set(query, result)
  setTimeout(() => searchCache.delete(query), 5 * 60 * 1000) // Cache 5 min
  return result
}

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
      resolve(ytdlp)
    }
  })
}

function getExternalAdReply(title, body, thumbnail) {
  return {
    title,
    body,
    thumbnail,
    sourceUrl: 'https://whatsapp.com/channel/0029VbBFWP0Lo4hgc1cjlC0M'
  }
}

let handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!args[0]) {
    return m.reply(`🎵 Ejemplo:\n${usedPrefix + command} Despacito\nO pega un link de YouTube.`)
  }

  // ⏳ Reacción inicial instantánea
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  const isAudio = ['play', 'ytaudio', 'audio', 'mp3'].includes(command.toLowerCase())
  const text = args.join(' ')
  try {
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//

    // 🚀 Usa búsqueda rápida (cacheada)
    if (!ytRegex.test(text)) {
      const search = await fastSearch(text)
      const videos = (search.videos?.length ? search.videos : search.all || [])
        .filter(v => !v.isLive && v.seconds > 0)

      if (!videos.length) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return m.reply('⚠️ No se encontró ningún video válido para descargar.')
      }

      const top5 = videos.slice(0, 5)
      searchResults[m.sender] = { videos: top5, isAudio }

      let msg = '🎬 *Selecciona el video que quieres descargar respondiendo con el número:*\n\n'
      top5.forEach((v, i) => {
        msg += `*${i + 1}.* ${v.title}\n📺 ${v.author.name}  ⏱️ ${v.timestamp}\n\n`
      })
      await conn.sendMessage(m.chat, { text: msg }, { quoted: m })

      if (selectionTimeouts[m.sender]) clearTimeout(selectionTimeouts[m.sender])
      selectionTimeouts[m.sender] = setTimeout(() => {
        if (searchResults[m.sender]) {
          delete searchResults[m.sender]
          delete selectionTimeouts[m.sender]
          conn.sendMessage(m.chat, { text: '⌛ Tiempo de selección expirado. Por favor, usa el comando nuevamente.' }, { quoted: m })
        }
      }, SELECTION_TIMEOUT)

      // ✅ Reacción de éxito
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } else {
      await downloadVideo(text, isAudio, m, conn)
    }
  } catch (err) {
    console.error('❌ Error en downloads-play:', err)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    m.reply('⚠️ Hubo un error al procesar la descarga. Intenta con otro video.')
  }
}

// ⚙️ Descarga optimizada con ficha + reacciones
async function downloadVideo(url, isAudio, m, conn) {
  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    const tmpBase = path.join(tmpDir, `${Date.now()}`)
    const output = isAudio ? `${tmpBase}.opus` : `${tmpBase}.mp4`

    // ⚡ Miniatura cacheada para no pedirla varias veces
    let botThumb = cachedBotThumb
    if (!botThumb) {
      try {
        const botPicUrl = await conn.profilePictureUrl(conn.user.jid, 'image')
        const res = await fetch(botPicUrl)
        botThumb = Buffer.from(await res.arrayBuffer())
        cachedBotThumb = botThumb
      } catch { botThumb = null }
    }

    // 🔧 Argumentos de yt-dlp optimizados con buffer y menor peso
    const baseArgs = [
      '--no-warnings',
      '--no-progress',
      '--no-call-home',
      '--no-check-certificate',
      '--buffer-size', '16M'
    ]

    let vidInfo = null
    try {
      const infoSearch = await ytSearch(url)
      vidInfo = infoSearch.videos?.[0] || null
    } catch {}

    let thumbBuffer = null
    if (vidInfo?.thumbnail) {
      try {
        const res = await fetch(vidInfo.thumbnail)
        thumbBuffer = Buffer.from(await res.arrayBuffer())
      } catch { thumbBuffer = null }
    }

    let caption = `${isAudio ? '🎧 Procesando audio' : '🎬 Procesando video'}:\n\n`
    if (vidInfo) {
      caption += `📌 *Título:* ${vidInfo.title}\n`
      caption += `👤 *Autor:* ${vidInfo.author?.name || 'Desconocido'}\n`
      caption += `⏱️ *Duración:* ${vidInfo.timestamp || 'N/A'}\n`
      caption += `👁️ *Visualizaciones:* ${vidInfo.views || 'N/A'}\n`
      caption += `📺 *Canal:* ${vidInfo.author?.name || 'Desconocido'}\n`
      caption += `🔗 *Link:* ${vidInfo.url}\n`
    }
    caption += `\nDescargando... MλÐɆ ƗN 스카이클라우드${CREATOR_SIGNATURE}`

    await conn.sendMessage(m.chat, { image: thumbBuffer || botThumb, caption }, { quoted: m })

    // 🚀 Paraleliza preparación y descarga
    if (isAudio) {
      const args = [
        ...baseArgs,
        '-f', 'bestaudio[ext=webm][abr<=128]',
        '--extract-audio', '--audio-format', 'opus',
        '-o', output,
        url
      ]
      const downloadPromise = runYtDlp(args)

      await Promise.all([downloadPromise]) // Mantiene proceso paralelo
      if (!fs.existsSync(output) || fs.statSync(output).size === 0) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return m.reply('⚠️ No se pudo descargar el audio.')
      }

      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

      await conn.sendMessage(m.chat, {
        audio: { url: output },
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
        contextInfo: { externalAdReply: getExternalAdReply(vidInfo?.title || '🎧 Audio', caption, botThumb) }
      }, { quoted: m })
    } else {
      const args = [
        ...baseArgs,
        // ⚡ Resolución ajustada para enviar más rápido
        '-f', 'bestvideo[height<=480]+bestaudio[abr<=96]',
        '-o', output,
        url
      ]
      const downloadPromise = runYtDlp(args)

      await Promise.all([downloadPromise])
      if (!fs.existsSync(output) || fs.statSync(output).size === 0) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return m.reply('⚠️ No se pudo descargar el video.')
      }

      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

      await conn.sendMessage(m.chat, {
        video: { url: output },
        caption,
        contextInfo: { externalAdReply: getExternalAdReply(vidInfo?.title || '🎬 Video', caption, botThumb) }
      }, { quoted: m })
    }

    // 🧹 Limpieza automática
    setTimeout(() => { try { fs.unlinkSync(output) } catch {} }, 30000)

  } catch (err) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    console.error('⚠️ Error inesperado:', err)
    m.reply('⚠️ No se pudo descargar este video. Prueba con otro enlace o título.')
  }
}

handler.before = async function (m, { conn }) {
  const text = m.text?.trim()
  const user = m.sender
  if (!searchResults[user]) return
  const data = searchResults[user]
  const num = parseInt(text)
  if (isNaN(num) || num < 1 || num > data.videos.length) return
  const vid = data.videos[num - 1]

  if (selectionTimeouts[user]) {
    clearTimeout(selectionTimeouts[user])
    delete selectionTimeouts[user]
  }

  await downloadVideo(vid.url, data.isAudio, m, conn)
  delete searchResults[user]
  return !0
}

handler.help = ['play', 'ytaudio', 'audio', 'mp3', 'mp4', 'video']
handler.tags = ['descargas']
handler.command = /^(play|ytaudio|audio|mp3|mp4|video)$/i
handler.limit = 1

export default handler

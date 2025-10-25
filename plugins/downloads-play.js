import fs from 'fs'
import path from 'path'
import ytSearch from 'yt-search'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import { promisify } from 'util'
import fetch from 'node-fetch'

const execPromise = promisify(spawn)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const tmpDir = path.join(__dirname, 'tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const CREATOR_SIGNATURE = '\n\n🎧 Creado por: Bakukats07 💻'
const searchResults = {}
const selectionTimeouts = {}
let cachedBotThumb = null
const SELECTION_TIMEOUT = 20000
const searchCache = new Map()
const MAX_CACHE_ITEMS = 10

// Actualiza yt-dlp cada 12 horas
setInterval(() => execPromise('yt-dlp', ['-U']).catch(() => {}), 43200000)

// Convierte cualquier valor a string seguro
const safeString = (value, fallback = 'N/A') => (value != null ? String(value) : fallback)

// Busca en YouTube con caché
async function fastSearch(query) {
  if (searchCache.has(query)) return searchCache.get(query)
  const resultPromise = ytSearch(query)
  searchCache.set(query, resultPromise)
  if (searchCache.size > MAX_CACHE_ITEMS) {
    const firstKey = searchCache.keys().next().value
    searchCache.delete(firstKey)
  }
  resultPromise.finally(() => setTimeout(() => searchCache.delete(query), 3 * 60 * 1000))
  return resultPromise
}

// Ejecuta yt-dlp con args
function runYtDlp(args = []) {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', args, {
      stdio: ['ignore', 'ignore', 'pipe'],
      detached: false,
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    })
    let stderr = ''
    ytdlp.stderr.on('data', chunk => (stderr += chunk.toString()))
    ytdlp.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(stderr))
    })
  })
}

// Genera info para los enlaces de preview de WhatsApp
function getExternalAdReply(title, body, thumbnail) {
  return {
    title: safeString(title, '🎬 Video'),
    body: safeString(body, ''),
    thumbnail: thumbnail && Buffer.isBuffer(thumbnail) && thumbnail.length ? thumbnail : Buffer.alloc(0),
    sourceUrl: 'https://whatsapp.com/channel/0029VbBFWP0Lo4hgc1cjlC0M'
  }
}

let handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!args[0]) return m.reply(`🎵 Ejemplo:\n${usedPrefix + command} Despacito\nO pega un link de YouTube.`)
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  const isAudio = ['play', 'ytaudio', 'audio', 'mp3'].includes(command.toLowerCase())
  const text = args.join(' ')

  try {
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//

    if (!ytRegex.test(text)) {
      const search = await fastSearch(text)
      const videos = (search.videos?.length ? search.videos : search.all || [])
        .filter(v => !v.isLive && v.seconds > 0)
      if (!videos.length) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return m.reply('⚠️ No se encontró ningún video válido.')
      }

      const top5 = videos.slice(0, 5)
      searchResults[m.sender] = { videos: top5, isAudio }

      let msg = '🎬 *Selecciona el video respondiendo con el número:*\n\n'
      for (const [i, v] of top5.entries()) {
        msg += `*${i + 1}.* ${safeString(v.title)}\n📺 ${safeString(v.author?.name)} ⏱️ ${safeString(v.timestamp)}\n\n`
      }

      await conn.sendMessage(m.chat, { text: msg }, { quoted: m })

      if (selectionTimeouts[m.sender]) clearTimeout(selectionTimeouts[m.sender])
      selectionTimeouts[m.sender] = setTimeout(() => {
        delete searchResults[m.sender]
        delete selectionTimeouts[m.sender]
      }, SELECTION_TIMEOUT)

      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } else {
      await downloadVideoStream(text, isAudio, m, conn)
    }
  } catch (err) {
    console.error('❌ Error en downloads-play:', err)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    m.reply('⚠️ Error al procesar la descarga.')
  }
}

// Función optimizada para descargar y enviar audio/video
async function downloadVideoStream(url, isAudio, m, conn) {
  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    const tmpBase = path.join(tmpDir, `${Date.now()}`)
    const output = isAudio ? `${tmpBase}.opus` : `${tmpBase}.mp4`

    // Cargar thumbnail del bot si no está en caché
    if (!cachedBotThumb) {
      try {
        const botPicUrl = await conn.profilePictureUrl(conn.user.jid, 'image')
        const res = await fetch(botPicUrl)
        cachedBotThumb = Buffer.from(await res.arrayBuffer())
      } catch { cachedBotThumb = Buffer.alloc(0) }
    }

    const baseArgs = [
      '--no-warnings', '--no-progress', '--no-call-home', '--no-check-certificate',
      '--quiet', '--no-cache-dir', '--buffer-size', '8M', '--concurrent-fragments', '2',
      '--downloader', 'ffmpeg'
    ]

    let vidInfo
    try { vidInfo = (await ytSearch(url)).videos?.[0] || null } catch { vidInfo = null }

    // Preparar thumbnail seguro
    let thumbBuffer = cachedBotThumb
    if (vidInfo?.thumbnail) {
      try {
        const res = await fetch(vidInfo.thumbnail)
        const buf = Buffer.from(await res.arrayBuffer())
        if (buf && buf.length) thumbBuffer = buf
      } catch {}
    }
    const safeThumb = thumbBuffer && thumbBuffer.length ? thumbBuffer : Buffer.alloc(0)

    let caption = `${isAudio ? '🎧 Procesando audio' : '🎬 Procesando video'}:\n\n`
    if (vidInfo) {
      caption += `📌 Título: ${safeString(vidInfo.title)}\n`
      caption += `👤 Autor: ${safeString(vidInfo.author?.name, 'Desconocido')}\n`
      caption += `⏱️ Duración: ${safeString(vidInfo.timestamp)}\n`
      caption += `👁️ Visualizaciones: ${safeString(vidInfo.views)}\n`
      caption += `🔗 Link: ${safeString(vidInfo.url)}\n`
    }
    caption += `\nDescargando...${CREATOR_SIGNATURE}`
    const safeCaption = safeString(caption, 'Descargando...')

    // Enviar mensaje previo con info y thumbnail
    await conn.sendMessage(m.chat, { image: safeThumb, caption: safeCaption }, { quoted: m })

    const args = isAudio
      ? [...baseArgs, '-f', 'bestaudio[ext=webm][abr<=128]', '--extract-audio', '--audio-format', 'opus', '-o', output, url]
      : [...baseArgs, '-f', 'bestvideo[height<=480]+bestaudio[abr<=96]', '-o', output, url]

    await runYtDlp(args).catch(e => { throw new Error(`yt-dlp falló: ${e.message}`) })

    if (!fs.existsSync(output) || fs.statSync(output).size === 0)
      return m.reply('⚠️ No se pudo descargar el archivo.')

    const stream = fs.createReadStream(output)

    if (isAudio) {
      await conn.sendMessage(m.chat, {
        audio: stream,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
        contextInfo: { externalAdReply: getExternalAdReply(vidInfo?.title, safeCaption, safeThumb) }
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        video: stream,
        caption: safeCaption,
        contextInfo: { externalAdReply: getExternalAdReply(vidInfo?.title, safeCaption, safeThumb) }
      }, { quoted: m })
    }

    stream.on('close', () => setTimeout(() => fs.promises.unlink(output).catch(() => {}), 5000))
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (err) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    console.error('⚠️ Error inesperado:', err)
    m.reply('⚠️ No se pudo descargar este video.')
  }
}

// Manejo de selección de búsqueda
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

  await downloadVideoStream(vid.url, data.isAudio, m, conn)
  delete searchResults[user]
  return true
}

handler.help = ['play', 'ytaudio', 'audio', 'mp3', 'mp4', 'video']
handler.tags = ['descargas']
handler.command = /^(play|ytaudio|audio|mp3|mp4|video)$/i
handler.limit = 1

export default handler

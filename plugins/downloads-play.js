import { spawn } from 'child_process'
import fetch from 'node-fetch'
import ytSearch from 'yt-search'

const CREATOR_SIGNATURE = '\n\n🎧 Creado por: Bakukats07 💻'
const searchResults = {}
const selectionTimeouts = {}
const SELECTION_TIMEOUT = 20000
const searchCache = new Map()
const MAX_CACHE_ITEMS = 10
let cachedBotThumb = null

// Evita errores de undefined
const safeString = (value, fallback = 'N/A') => {
  try { return (value ?? fallback).toString() } 
  catch { return fallback }
}

// Busqueda rápida con cache
async function fastSearch(query) {
  if (searchCache.has(query)) return searchCache.get(query)
  const resultPromise = ytSearch(query)
  searchCache.set(query, resultPromise)
  if (searchCache.size > MAX_CACHE_ITEMS) searchCache.delete(searchCache.keys().next().value)
  resultPromise.finally(() => setTimeout(() => searchCache.delete(query), 3 * 60 * 1000))
  return resultPromise
}

// Stream directo desde yt-dlp
function streamYtDlp(url, isAudio) {
  const args = isAudio
    ? ['-f', 'bestaudio[ext=webm][abr<=128]', '--extract-audio', '--audio-format', 'opus', '-o', '-', url]
    : ['-f', 'bestvideo[height<=480]+bestaudio[abr<=96]', '-o', '-', url]

  const ytdlp = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] })
  return ytdlp.stdout
}

// Mensaje enriquecido de Baileys
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

  const isAudio = ['play','ytaudio','audio','mp3'].includes(command.toLowerCase())
  const text = args.join(' ')
  const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//

  try {
    if (!ytRegex.test(text)) {
      const search = await fastSearch(text)
      const videos = (search.videos?.length ? search.videos : search.all || []).filter(v => !v.isLive && v.seconds > 0)
      if (!videos.length) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return m.reply('⚠️ No se encontró ningún video válido.')
      }

      const top5 = videos.slice(0,5)
      searchResults[m.sender] = { videos: top5, isAudio }

      let msg = '🎬 *Selecciona el video respondiendo con el número:*\n\n'
      top5.forEach((v,i) => {
        msg += `*${i+1}.* ${safeString(v.title)}\n📺 ${safeString(v.author?.name)} ⏱️ ${safeString(v.timestamp)}\n\n`
      })

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

async function downloadVideoStream(url, isAudio, m, conn) {
  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    // Bot thumbnail
    if (!cachedBotThumb) {
      try {
        const botPicUrl = await conn.profilePictureUrl(conn.user.jid, 'image')
        const res = await fetch(botPicUrl)
        cachedBotThumb = Buffer.from(await res.arrayBuffer())
      } catch { cachedBotThumb = Buffer.alloc(0) }
    }

    // Info del video
    let vidInfo
    try { vidInfo = (await ytSearch(url)).videos?.[0] || null } catch { vidInfo = null }

    const safeThumb = Buffer.isBuffer(cachedBotThumb) && cachedBotThumb.length ? cachedBotThumb : Buffer.alloc(0)

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

    await conn.sendMessage(m.chat, { image: safeThumb, caption: safeCaption }, { quoted: m })

    // Stream directo
    const stream = streamYtDlp(url, isAudio)
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

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } catch (err) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    console.error('⚠️ Error inesperado:', err)
    m.reply('⚠️ No se pudo descargar este video.')
  }
}

handler.before = async (m, { conn }) => {
  const text = m.text?.trim()
  const user = m.sender
  if (!searchResults[user]) return
  const data = searchResults[user]
  const num = parseInt(text)
  if (isNaN(num) || num < 1 || num > data.videos.length) return
  const vid = data.videos[num-1]

  if (selectionTimeouts[user]) {
    clearTimeout(selectionTimeouts[user])
    delete selectionTimeouts[user]
  }

  await downloadVideoStream(vid.url, data.isAudio, m, conn)
  delete searchResults[user]
  return true
}

handler.help = ['play','ytaudio','audio','mp3','mp4','video']
handler.tags = ['descargas']
handler.command = /^(play|ytaudio|audio|mp3|mp4|video)$/i
handler.limit = 1

export default handler

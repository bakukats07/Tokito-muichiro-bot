import fetch from "node-fetch"
import yts from "yt-search"
import { saveToCache, getFromCache, clearOldCache } from "./tmp/cacheManager.js"

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text.trim()) return conn.reply(m.chat, `❀ Por favor, escribe el nombre o link del video.`, m)
    await m.react('🕒')

    const videoMatch = text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/)
    const query = videoMatch ? `https://youtu.be/${videoMatch[1]}` : text
    const search = await yts(query)

    let result
    if (videoMatch) {
      result = search.videos.find(v => v.videoId === videoMatch[1]) || search.all[0]
    } else {
      const top3 = search.videos.slice(0, 3)
      if (top3.length === 0) throw 'ꕥ No se encontraron resultados.'

      let msg = '❀ Se encontraron varios resultados:\n\n'
      top3.forEach((v, i) => {
        msg += `${i + 1}. ${v.title} - ${v.author.name} (${v.timestamp})\n`
      })
      msg += '\nEscribe el número del video que deseas descargar (1-3).'
      await conn.reply(m.chat, msg, m)

      const respuesta = await conn.waitForMessage(m.chat, 30000)
      const index = parseInt(respuesta?.text?.trim())
      if (!index || index < 1 || index > top3.length) throw '⚠ Opción inválida o tiempo agotado.'
      result = top3[index - 1]
    }

    const { title, thumbnail, timestamp, views, ago, url, author, seconds } = result
    if (seconds > 1800) throw '⚠ El video supera los 30 minutos.'

    const vistas = formatViews(views)
    const info = `「✦」Descargando *${title}*\n\n> ❑ Canal » *${author.name}*\n> ♡ Vistas » *${vistas}*\n> ✧︎ Duración » *${timestamp}*\n> ☁︎ Publicado » *${ago}*\n> ➪ Link » ${url}`
    const thumb = (await conn.getFile(thumbnail)).data
    await conn.sendMessage(m.chat, { image: thumb, caption: info }, { quoted: m })

    const isAudio = ['play', 'ytaudio', 'audio', 'mp3'].includes(command)
    const isVideo = ['play2', 'mp4', 'video'].includes(command)

    clearOldCache() // Limpieza automática

    if (isAudio) {
      const cached = await getFromCache(url, "audio")
      if (cached) {
        await sendAudio(conn, m, cached, title)
        return
      }

      const audio = await getAud(url)
      if (!audio?.url) throw '⚠ No se pudo obtener el audio.'
      const filePath = await saveToCache(audio.url, "audio")
      await sendAudio(conn, m, filePath, title)
    }

    if (isVideo) {
      const cached = await getFromCache(url, "video")
      if (cached) {
        await sendVideo(conn, m, cached, title)
        return
      }

      const video = await getVid(url)
      if (!video?.url) throw '⚠ No se pudo obtener el video.'
      const filePath = await saveToCache(video.url, "video")
      await sendVideo(conn, m, filePath, title)
    }

    await m.react('✔️')
  } catch (e) {
    await m.react('✖️')
    return conn.reply(m.chat, typeof e === 'string' ? e : `⚠︎ Error inesperado: ${e.message}`, m)
  }
}

handler.command = handler.help = ['play', 'ytaudio', 'audio', 'mp3', 'play2', 'mp4', 'video']
handler.tags = ['descargas']
handler.group = true

export default handler

// ---------------------- FUNCIONES AUXILIARES ----------------------

async function getAud(url) {
  const apis = [
    { api: 'ZenzzXD', endpoint: `${global.APIs.zenzxz.url}/downloader/ytmp3?url=${encodeURIComponent(url)}`, extractor: res => res.download_url },
    { api: 'Yupra', endpoint: `${global.APIs.yupra.url}/api/downloader/ytmp3?url=${encodeURIComponent(url)}`, extractor: res => res.resultado?.enlace }
  ]
  return await fetchFromApis(apis)
}

async function getVid(url) {
  const apis = [
    { api: 'ZenzzXD', endpoint: `${global.APIs.zenzxz.url}/downloader/ytmp4?url=${encodeURIComponent(url)}&quality=360p`, extractor: res => res.download_url },
    { api: 'Yupra', endpoint: `${global.APIs.yupra.url}/api/downloader/ytmp4?url=${encodeURIComponent(url)}&res=360p`, extractor: res => res.resultado?.formatos?.[0]?.url }
  ]
  return await fetchFromApis(apis)
}

async function fetchFromApis(apis) {
  for (const { endpoint, extractor } of apis) {
    try {
      const res = await fetch(endpoint).then(r => r.json())
      const link = extractor(res)
      if (link) return { url: link }
    } catch {}
  }
  return null
}

async function sendAudio(conn, m, filePath, title) {
  await conn.sendMessage(m.chat, {
    audio: { url: filePath },
    mimetype: 'audio/ogg; codecs=opus',
    ptt: true
  }, { quoted: m })
  await conn.reply(m.chat, `🌸 ¡Listo! He enviado la nota de voz de *${title}* *MλÐɆ ƗN 스카이클라우드*`, m)
}

async function sendVideo(conn, m, filePath, title) {
  await conn.sendMessage(m.chat, {
    video: { url: filePath },
    caption: `🎬 ${title}\n✨ ¡Listo! Aquí está tu video *MλÐɆ ƗN 스카이클라우드*.`,
  }, { quoted: m })
}

function formatViews(views) {
  if (!views) return "No disponible"
  if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B`
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`
  return views.toString()
}
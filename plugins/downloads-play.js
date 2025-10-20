import fetch from "node-fetch"
import yts from 'yt-search'

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text.trim()) return conn.reply(m.chat, `❀ Por favor, ingresa el nombre de la música a descargar.`, m)
    await m.react('🕒')

    const videoMatch = text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/)
    const query = videoMatch ? 'https://youtu.be/' + videoMatch[1] : text
    const search = await yts(query)

    if (videoMatch) {
      const result = search.videos.find(v => v.videoId === videoMatch[1]) || search.all[0]
      return await sendResult(conn, m, result, command)
    }

    const top3 = search.videos.slice(0, 3)
    if (top3.length === 0) throw 'ꕥ No se encontraron resultados.'

    let msg = '❀ Se encontraron varios resultados:\n\n'
    top3.forEach((v, i) => {
      msg += `${i + 1}. ${v.title} - ${v.author.name} (${v.timestamp})\n`
    })
    msg += '\nResponde con el número del video que deseas descargar (1-3).'
    await conn.reply(m.chat, msg, m)

    // Guardar el contexto temporal para este usuario/chat
    conn.tempReply = conn.tempReply || {}
    conn.tempReply[m.sender] = {
      chat: m.chat,
      opciones: top3,
      comando: command,
      tiempo: Date.now()
    }

    await m.react('🕒') // Indicamos que está esperando
  } catch (e) {
    await m.react('✖️')
    return conn.reply(m.chat, typeof e === 'string' ? e : e.message, m)
  }
}

// Handler que capta las respuestas del usuario
handler.before = async (m, { conn }) => {
  if (!conn.tempReply) return
  const ctx = conn.tempReply[m.sender]
  if (!ctx) return

  // Si no responde en 30s, limpiar
  if (Date.now() - ctx.tiempo > 30000) {
    delete conn.tempReply[m.sender]
    return conn.reply(m.chat, '⚠ Tiempo agotado. Vuelve a usar el comando.', m)
  }

  const texto = m.text.trim()
  if (!/^[1-3]$/.test(texto)) return // ignora si no manda un número

  const opcion = parseInt(texto)
  const result = ctx.opciones[opcion - 1]
  const comando = ctx.comando
  delete conn.tempReply[m.sender]

  await sendResult(conn, m, result, comando)
}

async function sendResult(conn, m, result, command) {
  const { title, thumbnail, timestamp, views, ago, url, author, seconds } = result
  if (seconds > 1800) throw '⚠ El video supera el límite de duración (30 minutos).'

  const vistas = formatViews(views)
  const info = `「✦」Descargando *<${title}>*\n\n> ❑ Canal » *${author.name}*\n> ♡ Vistas » *${vistas}*\n> ✧︎ Duración » *${timestamp}*\n> ☁︎ Publicado » *${ago}*\n> ➪ Link » ${url}`
  const thumb = (await conn.getFile(thumbnail)).data
  await conn.sendMessage(m.chat, { image: thumb, caption: info }, { quoted: m })

  if (['play', 'yta', 'ytmp3', 'playaudio'].includes(command)) {
    const audio = await getAud(url)
    if (!audio?.url) throw '⚠ No se pudo obtener el audio.'
    await conn.sendMessage(m.chat, { audio: { url: audio.url }, fileName: `${title}.mp3`, mimetype: 'audio/mpeg' }, { quoted: m })
  } else if (['play2', 'ytv', 'ytmp4', 'mp4'].includes(command)) {
    const video = await getVid(url)
    if (!video?.url) throw '⚠ No se pudo obtener el video.'
    await conn.sendFile(m.chat, video.url, `${title}.mp4`, `> ❀ ${title}`, m)
  }

  await m.react('✔️')
}

handler.command = handler.help = ['play', 'yta', 'ytmp3', 'play2', 'ytv', 'ytmp4', 'playaudio', 'mp4']
handler.tags = ['descargas']
handler.group = true
export default handler

// ================= FUNCIONES AUXILIARES =================
async function getAud(url) {
  const apis = [
    { api: 'ZenzzXD', endpoint: `${global.APIs.zenzxz.url}/downloader/ytmp3?url=${encodeURIComponent(url)}`, extractor: res => res.download_url },
    { api: 'Yupra', endpoint: `${global.APIs.yupra.url}/api/downloader/ytmp3?url=${encodeURIComponent(url)}`, extractor: res => res.resultado?.enlace },
    { api: 'Vreden', endpoint: `${global.APIs.vreden.url}/api/ytmp3?url=${encodeURIComponent(url)}`, extractor: res => res.result?.download?.url }
  ]
  return await fetchFromApis(apis)
}

async function getVid(url) {
  const apis = [
    { api: 'ZenzzXD', endpoint: `${global.APIs.zenzxz.url}/downloader/ytmp4?url=${encodeURIComponent(url)}`, extractor: res => res.download_url },
    { api: 'Yupra', endpoint: `${global.APIs.yupra.url}/api/downloader/ytmp4?url=${encodeURIComponent(url)}`, extractor: res => res.resultado?.formatos?.[0]?.url },
    { api: 'Vreden', endpoint: `${global.APIs.vreden.url}/api/ytmp4?url=${encodeURIComponent(url)}`, extractor: res => res.result?.download?.url }
  ]
  return await fetchFromApis(apis)
}

async function fetchFromApis(apis) {
  for (const { api, endpoint, extractor } of apis) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(endpoint, { signal: controller.signal }).then(r => r.json())
      clearTimeout(timeout)
      const link = extractor(res)
      if (link) return { url: link, api }
    } catch (e) {}
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  return null
}

function formatViews(views) {
  if (views === undefined) return "No disponible"
  if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B (${views.toLocaleString()})`
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M (${views.toLocaleString()})`
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}k (${views.toLocaleString()})`
  return views.toString()
      }

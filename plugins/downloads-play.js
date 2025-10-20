import fetch from 'node-fetch'
import fs from 'fs'
import yts from 'yt-search'
import { getActiveAPI } from './tmp/checkApis.js'

const tmpFolder = 'plugins/tmp/'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`❗ Ingresa el nombre o link de una canción o video.\n\nEjemplo:\n${usedPrefix + command} Enemy - Imagine Dragons`)

  const activeApi = await getActiveAPI()
  if (!activeApi) return m.reply('⚠️ No hay APIs activas por el momento, intenta más tarde.')

  m.react('⏳')

  // Detectar si es link o búsqueda
  const isLink = /youtu\.be|youtube\.com/i.test(text)
  let video
  if (isLink) {
    const info = await yts({ videoId: text.split('v=')[1] })
    video = info
  } else {
    const { videos } = await yts(text)
    if (!videos || !videos.length) return m.reply('❌ No se encontraron resultados.')
    video = videos[0]
  }

  const url = video.url
  const title = video.title
  const isAudio = /play|ytaudio|audio|mp3/i.test(command)
  const isVideo = /play2|video|mp4/i.test(command)

  try {
    const apiBase = activeApi === 'yupra' ? 'https://api.yupra.my.id/api/download' : 'https://api.yupra.my.id/api/download'
    const endpoint = isAudio
      ? `${apiBase}/ytmp3?url=${encodeURIComponent(url)}`
      : `${apiBase}/ytmp4?url=${encodeURIComponent(url)}`
    
    const res = await fetch(endpoint)
    const json = await res.json()
    if (!json || !json.result) throw new Error('Respuesta vacía del servidor.')

    const mediaUrl = isAudio ? json.result.download_url : json.result.download
    const ext = isAudio ? '.mp3' : '.mp4'
    const tmpPath = `${tmpFolder}${Date.now()}${ext}`

    const buffer = await fetch(mediaUrl).then(r => r.arrayBuffer())
    fs.writeFileSync(tmpPath, Buffer.from(buffer))

    if (isAudio) {
      await conn.sendMessage(m.chat, { 
        audio: { url: tmpPath }, 
        mimetype: 'audio/mp4', 
        ptt: true 
      }, { quoted: m })
      await conn.sendMessage(m.chat, { text: '🎧 *Descarga completada correctamente.*' }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, { 
        video: { url: tmpPath }, 
        caption: `🎬 *${title}*\n\n✅ Video enviado con éxito.` 
      }, { quoted: m })
    }

    fs.unlinkSync(tmpPath)
    m.react('✅')
  } catch (e) {
    console.error(e)
    m.reply('⚠️ Error al procesar tu solicitud. Intenta nuevamente.')
  }
}

handler.help = ['play', 'play2', 'ytaudio', 'audio', 'mp3', 'video', 'mp4']
handler.tags = ['downloader']
handler.command = /^play2?|ytaudio|audio|video|mp3|mp4$/i
export default handler
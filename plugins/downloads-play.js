import fetch from 'node-fetch'
import yts from 'yt-search'
import ytdl from 'ytdl-core'
import fs from 'fs'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) return m.reply(`⚠️ Ejemplo: *${usedPrefix + command} nombre o enlace de la canción*`)

  let texto = args.join(' ')
  let result

  // 🔍 Buscar o procesar URL
  if (ytdl.validateURL(texto)) {
    const info = await ytdl.getInfo(texto)
    result = {
      title: info.videoDetails.title,
      author: { name: info.videoDetails.author.name },
      url: info.videoDetails.video_url,
      thumbnail: info.videoDetails.thumbnails[0].url,
      duration: parseInt(info.videoDetails.lengthSeconds)
    }
  } else {
    const search = await yts(texto)
    const top3 = search.videos.slice(0, 3)
    if (top3.length === 0) throw '❌ No se encontraron resultados en YouTube.'

    let msg = '🎧 *Resultados encontrados:*\n\n'
    top3.forEach((v, i) => {
      msg += `${i + 1}. ${v.title}\n🕒 ${v.timestamp}\n📺 ${v.author.name}\n\n`
    })
    msg += '✏️ *Responde con el número (1-3) del video que deseas descargar.*'
    await conn.reply(m.chat, msg, m)

    const filtro = res => res.key.remoteJid === m.chat && /^\d+$/.test(res.message?.conversation?.trim())
    let respuesta
    try {
      respuesta = await conn.awaitMessages(filtro, { time: 25000, max: 1 })
    } catch {
      return m.reply('⏰ Tiempo agotado. No respondiste a tiempo.')
    }

    const index = parseInt(respuesta[0].message.conversation.trim())
    if (!index || index < 1 || index > top3.length)
      return m.reply('⚠️ Opción inválida. Responde solo con 1, 2 o 3.')

    result = top3[index - 1]
  }

  const { title, author, url, thumbnail, duration, timestamp } = result

  // 🎵 Tarjeta informativa
  const info = `🎶 *${title}*\n👤 *Canal:* ${author?.name || 'Desconocido'}\n🕒 *Duración:* ${timestamp || formatDuration(duration)}\n📺 *Link:* ${url}`
  await conn.sendMessage(m.chat, { image: { url: thumbnail }, caption: info }, { quoted: m })

  await m.react('💿')
  const preparando = await conn.reply(m.chat, `📥 *Preparando tu ${['play2', 'mp4', 'video'].includes(command) ? 'video 🎬' : 'audio 🎧'}...*`, m)

  // 📂 Carpeta temporal (para reducir RAM)
  const tempPath = './tmp'
  if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath)

  try {
    // 🎧 AUDIO
    if (['play', 'ytaudio', 'audio', 'mp3'].includes(command)) {
      const audioFile = `${tempPath}/${Date.now()}.mp3`
      await new Promise((resolve, reject) => {
        const stream = ytdl(url, {
          filter: 'audioonly',
          quality: 'lowestaudio', // menor carga de CPU pero buena calidad
          highWaterMark: 1 << 20  // 1 MB de buffer
        })
        .pipe(fs.createWriteStream(audioFile))
        .on('finish', resolve)
        .on('error', reject)
      })

      await conn.sendMessage(
        m.chat,
        { audio: { url: audioFile }, fileName: `${title}.mp3`, mimetype: 'audio/mp4', ptt: true },
        { quoted: m }
      )
      fs.unlinkSync(audioFile)
      await m.react('🎧')
    }

    // 🎬 VIDEO
    else if (['play2', 'mp4', 'video'].includes(command)) {
      const videoFile = `${tempPath}/${Date.now()}.mp4`
      await new Promise((resolve, reject) => {
        const stream = ytdl(url, {
          filter: format => format.container === 'mp4' && parseInt(format.qualityLabel) <= 720,
          quality: 'highest',
          highWaterMark: 1 << 20 // menor uso de memoria
        })
        .pipe(fs.createWriteStream(videoFile))
        .on('finish', resolve)
        .on('error', reject)
      })

      await conn.sendMessage(
        m.chat,
        { video: { url: videoFile }, caption: `🎬 ${title}\n✨ Calidad 720p` },
        { quoted: m }
      )
      fs.unlinkSync(videoFile)
      await m.react('🎬')
    }

    await conn.sendMessage(m.chat, { delete: preparando.key })

  } catch (e) {
    console.error(e)
    await m.react('❌')
    m.reply('⚠️ Ocurrió un error al descargar el archivo. Intenta con otro video o revisa tu conexión.')
  }
}

handler.help = ['play', 'ytaudio', 'audio', 'mp3', 'play2', 'mp4', 'video']
handler.tags = ['descargas']
handler.command = /^(play|ytaudio|audio|mp3|play2|mp4|video)$/i

export default handler

function formatDuration(sec) {
  if (!sec) return 'Desconocida'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
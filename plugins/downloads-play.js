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

// Almacena resultados de búsqueda por usuario
const searchResults = {}

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
      // Buscar los 5 primeros videos válidos (no directos, no shorts)
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

// 🔽 Función para descargar y enviar audio o video
async function downloadVideo(url, isAudio, m, conn) {
  try {
    // 🟢 Actualización ligera en segundo plano de yt-dlp (sin bloquear)
    await execPromise('yt-dlp -U').catch(() => {})

    // Primero obtenemos info del video (para validar disponibilidad)
    const infoCmd = `yt-dlp -j ${url}`
    const { stdout: infoStdout } = await execPromise(infoCmd).catch(e => ({ stdout: '', stderr: String(e) }))
    let info
    try {
      info = infoStdout ? JSON.parse(infoStdout) : null
    } catch (e) {
      console.error('⚠️ No se pudo parsear yt-dlp -j output:', e, 'raw:', infoStdout)
      info = null
    }

    if (!info || info.is_private || info.age_limit || info.playability_status?.status === 'ERROR') {
      return m.reply('❌ Este video no está disponible o tiene restricciones en YouTube.')
    }

    const title = (info.title || 'VideoDescargado').replace(/[^\w\s]/gi, '')
    const tmpBase = path.join(tmpDir, `${Date.now()}_${title}`)
    const tmpInput = `${tmpBase}.temp`
    const tmpOgg = `${tmpBase}.ogg`

    const cmdDownload = isAudio
      ? `yt-dlp -f bestaudio -o "${tmpInput}" "${url}" --no-progress`
      : `yt-dlp -f "bestvideo+bestaudio/best" -o "${tmpInput}.mp4" "${url}" --no-progress`

    await m.reply('⏬ Descargando y preparando tu archivo...')

    try {
      const downloadResult = await execPromise(cmdDownload)
      if (downloadResult.stderr) console.warn('yt-dlp stderr:', downloadResult.stderr)
    } catch (errExec) {
      console.error('❌ Error en yt-dlp:', errExec)
      return m.reply('⚠️ Error descargando el archivo con yt-dlp.')
    }

    if (isAudio) {
      const candidates = fs.readdirSync(tmpDir).filter(f => f.startsWith(path.basename(tmpBase)))
      let realInput = candidates.map(f => path.join(tmpDir, f)).find(p => /\.(m4a|webm|mp4|mkv|opus|aac|flac|temp)$/i.test(p)) || `${tmpInput}`

      if (!fs.existsSync(realInput)) realInput = tmpInput

      // ⚙️ ffmpeg optimizado para velocidad y compatibilidad WhatsApp
      const ffmpegCmd = `ffmpeg -y -i "${realInput}" -vn -ac 2 -ar 48000 -c:a libopus -b:a 96000 -vbr on -compression_level 10 "${tmpOgg}"`

      try {
        const ff = await execPromise(ffmpegCmd)
        if (ff.stderr) console.warn('ffmpeg stderr:', ff.stderr)
      } catch (errFf) {
        console.error('❌ Error en ffmpeg:', errFf)
        const tmpMp3 = `${tmpBase}.mp3`
        try {
          await execPromise(`ffmpeg -y -i "${realInput}" -vn -ar 44100 -ac 2 -b:a 128k "${tmpMp3}"`)
          const thumbnail = fs.existsSync(botPfp) ? fs.readFileSync(botPfp) : null
          await conn.sendMessage(m.chat, {
            audio: { url: tmpMp3 },
            mimetype: 'audio/mpeg',
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
          setTimeout(() => {
            if (fs.existsSync(tmpMp3)) fs.unlinkSync(tmpMp3)
            if (fs.existsSync(realInput)) try { fs.unlinkSync(realInput) } catch {}
          }, 15000)
          return
        } catch (errMp3) {
          console.error('❌ Fallback mp3 también falló:', errMp3)
          return m.reply('⚠️ No se pudo procesar el audio. Intenta otro video por favor.')
        }
      }

      // 🧱 Verificación adicional para evitar audios vacíos
      if (!fs.existsSync(tmpOgg)) {
        console.error('❌ Archivo OGG no encontrado tras ffmpeg')
        return m.reply('⚠️ Hubo un problema convirtiendo el audio.')
      }
      const stats = fs.statSync(tmpOgg)
      if (stats.size < 50000) { // 50 KB mínimo
        console.warn('⚠️ Archivo OGG muy pequeño, posible error de conversión')
        return m.reply('⚠️ El audio se descargó pero parece vacío o dañado. Intenta con otro video.')
      }

      const thumbnail = fs.existsSync(botPfp) ? fs.readFileSync(botPfp) : null
      await conn.sendMessage(m.chat, {
        audio: { url: tmpOgg },
        mimetype: 'audio/ogg',
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

      setTimeout(() => {
        try { if (fs.existsSync(tmpOgg)) fs.unlinkSync(tmpOgg) } catch {}
        try { if (fs.existsSync(realInput)) fs.unlinkSync(realInput) } catch {}
      }, 15000)

      return
    }

    // Si es video
    if (!isAudio) {
      const realVideoFile = `${tmpInput}.mp4`
      const thumbnail = fs.existsSync(botPfp) ? fs.readFileSync(botPfp) : null
      if (!fs.existsSync(realVideoFile)) {
        console.warn('⚠️ Archivo de video no encontrado en salida esperada:', realVideoFile)
      }

      await conn.sendMessage(m.chat, {
        video: { url: realVideoFile },
        caption: `🎬 ${title}\nDescargado con yt-dlp${CREATOR_SIGNATURE}`,
        contextInfo: {
          externalAdReply: {
            title,
            body: `Tu bot siempre activo 🎵`,
            thumbnail,
            sourceUrl: url
          }
        }
      }, { quoted: m })

      setTimeout(() => {
        try { if (fs.existsSync(realVideoFile)) fs.unlinkSync(realVideoFile) } catch {}
      }, 15000)
    }

  } catch (err) {
    if (err?.message?.includes('private')) {
      return m.reply('🔒 Este video es privado y no se puede descargar.')
    } else if (err?.message?.includes('unavailable')) {
      return m.reply('❌ Este video no está disponible o tiene restricciones regionales / de edad.')
    } else {
      console.error('⚠️ Error inesperado en downloadVideo:', err)
      return m.reply('⚠️ No se pudo descargar este video. Prueba con otro enlace o título.')
    }
  }
}

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

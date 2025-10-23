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

// 🔽 Función para descargar y enviar audio o video (convertimos a OGG/Opus para WhatsApp)
async function downloadVideo(url, isAudio, m, conn) {
  try {
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
    // Para audio: descargamos a un archivo contenedor original (webm/m4a) y luego convertimos a ogg/opus
    const tmpBase = path.join(tmpDir, `${Date.now()}_${title}`)
    const tmpInput = `${tmpBase}.temp` // extensión real la pondrá yt-dlp
    const tmpOgg = `${tmpBase}.ogg`    // output para enviar (OGG/Opus)

    // Construir el comando yt-dlp
    // descargamos la mejor pista de audio sin forzar conversión
    const cmdDownload = isAudio
      ? `yt-dlp -f bestaudio -o "${tmpInput}" "${url}" --no-progress`
      : `yt-dlp -f "bestvideo+bestaudio/best" -o "${tmpInput}.mp4" "${url}" --no-progress`

    await m.reply('⏬ Descargando y preparando tu archivo...')

    // Ejecutar descarga
    let downloadResult
    try {
      downloadResult = await execPromise(cmdDownload)
      if (downloadResult.stderr) console.warn('yt-dlp stderr:', downloadResult.stderr)
    } catch (errExec) {
      console.error('❌ Error en yt-dlp:', errExec)
      return m.reply('⚠️ Error descargando el archivo con yt-dlp.')
    }

    // Para audio: convertir a OGG/Opus (voz) con ffmpeg — esto asegura compatibilidad con WhatsApp
    if (isAudio) {
      // Determinar el archivo real creado por yt-dlp: yt-dlp puede añadir extensión real.
      // Intentamos detectar el archivo que exista con el tmpBase prefix.
      const candidates = fs.readdirSync(tmpDir).filter(f => f.startsWith(path.basename(tmpBase)))
      // Preferimos archivos con audio-friendly extensions
      let realInput = candidates.map(f => path.join(tmpDir, f)).find(p => /\.(m4a|webm|mp4|mkv|opus|aac|flac|temp)$/i.test(p)) || `${tmpInput}`

      if (!fs.existsSync(realInput)) {
        // si no lo encontró, intenta tmpInput tal cual
        realInput = tmpInput
      }

      // ffmpeg command: convert to opus in ogg container suitable for WhatsApp ptt
      // bitrate 64k suele ser suficiente para voice notes
      const ffmpegCmd = `ffmpeg -y -i "${realInput}" -map 0:a -c:a libopus -b:a 64000 -vbr on "${tmpOgg}"`

      try {
        const ff = await execPromise(ffmpegCmd)
        if (ff.stderr) console.warn('ffmpeg stderr:', ff.stderr)
      } catch (errFf) {
        console.error('❌ Error en ffmpeg:', errFf)
        // intentamos fallback: convertir a mp3 (si ffmpeg falla con libopus)
        const tmpMp3 = `${tmpBase}.mp3`
        try {
          await execPromise(`ffmpeg -y -i "${realInput}" -vn -ar 44100 -ac 2 -b:a 128k "${tmpMp3}"`)
          // renombrar a ogg no es correcto: enviamos mp3 si fue posible
          // enviar mp3 con mimetype audio/mpeg (fallback)
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
          // cleanup
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

      // Si llegamos aquí, tmpOgg debe existir
      if (!fs.existsSync(tmpOgg)) {
        console.error('❌ Archivo OGG no encontrado tras ffmpeg')
        return m.reply('⚠️ Hubo un problema convirtiendo el audio.')
      }

      const thumbnail = fs.existsSync(botPfp) ? fs.readFileSync(botPfp) : null

      // enviar OGG/Opus — WhatsApp lo reproducirá correctamente como nota de voz
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

      // cleanup: borrar both (input y ogg) después de enviar
      setTimeout(() => {
        try { if (fs.existsSync(tmpOgg)) fs.unlinkSync(tmpOgg) } catch {}
        try { if (fs.existsSync(realInput)) fs.unlinkSync(realInput) } catch {}
      }, 15000)

      return
    }

    // -------------------
    // Si es video (no audio), mantenemos el flujo original (envío mp4)
    if (!isAudio) {
      // el archivo de salida para video normalmente es tmpInput.mp4
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

      // cleanup
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

// 🧠 Maneja cuando el usuario responde con un número
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

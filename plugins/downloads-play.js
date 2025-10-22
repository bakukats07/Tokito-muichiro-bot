// ✅ Módulos principales
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import { fileURLToPath, pathToFileURL } from 'url'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ✅ Importar el verificador de APIs
const mainApisPath = pathToFileURL(path.join(__dirname, './main-checkApis.js')).href
const { checkActiveAPI } = await import(mainApisPath)

const tmpDir = path.join(__dirname, 'tmp')
const botPfp = path.join(__dirname, '../media/bot.jpg')

// Crear carpeta temporal
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const CREATOR_SIGNATURE = '\n\n🎧 Creado por: Bakukats07 💻'

let handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!args[0]) {
    return m.reply(`🎵 Ejemplo:\n${usedPrefix + command} Despacito\nO también con un link de YouTube.`)
  }

  const text = args.join(' ')
  const apiBase = await checkActiveAPI()
  if (!apiBase) return m.reply('⚠️ Ninguna API está activa en este momento.')

  try {
    await m.reply('🔎 Buscando y descargando contenido...')

    // ✅ Nueva lógica: probar varios endpoints
    const endpoints = [
      `${apiBase}/api/download/ytmp3?url=`,
      `${apiBase}/api/downloader/ytmp3?url=`,
      `${apiBase}/api/ytdl?url=`
    ]

    let data = null
    let lastError = null

    for (const base of endpoints) {
      try {
        const res = await fetch(base + encodeURIComponent(text))
        if (!res.ok) continue
        const json = await res.json()
        if (json?.result?.url) {
          data = json
          break
        }
      } catch (e) {
        lastError = e
      }
    }

    if (!data?.result?.url) {
      throw new Error(`Ningún endpoint respondió correctamente.\n${lastError?.message || ''}`)
    }

    const fileUrl = data.result.url
    const tmpFile = path.join(tmpDir, `file_${Date.now()}.mp3`)

    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error('Error al descargar el archivo.')

    await streamPipeline(response.body, fs.createWriteStream(tmpFile))

    const thumbnail = fs.existsSync(botPfp) ? fs.readFileSync(botPfp) : null

    await conn.sendMessage(m.chat, {
      audio: { url: tmpFile },
      mimetype: 'audio/mpeg',
      ptt: false,
      contextInfo: {
        externalAdReply: {
          title: `🎧 ${data.result.title || 'Audio Descargado'}`,
          body: `🎶 Tu bot favorito\n${CREATOR_SIGNATURE}`,
          thumbnail,
          sourceUrl: data.result.url
        }
      }
    }, { quoted: m })

    setTimeout(() => {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    }, 10 * 1000)

    console.log(`✅ Archivo enviado y eliminado: ${tmpFile}`)
    await m.reply('✅ Descarga completada correctamente 🎶')

  } catch (err) {
    console.error('❌ Error en downloads-play:', err)
    m.reply(`⚠️ Error al procesar la descarga:\n${err.message}`)
  }
}

handler.help = ['play', 'ytaudio', 'audio', 'mp3']
handler.tags = ['descargas']
handler.command = /^(play|ytaudio|audio|mp3)$/i
handler.limit = 1

export default handler

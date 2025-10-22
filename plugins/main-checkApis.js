import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'

// 🔑 Agrega aquí tu propia key de RapidAPI (entre comillas)
const RAPIDAPI_KEY = '82fd1691b8mshd09070ae556cdddp1cb6e2jsnf029e65d5a97'

// 📡 Endpoints disponibles (solo uno activo de RapidAPI en este caso)
const apis = {
  youtubeMedia: {
    url: 'https://youtube-media-downloader.p.rapidapi.com/v2/video/details',
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'youtube-media-downloader.p.rapidapi.com'
    }
  }
}

// 📁 Rutas para caché temporal
const tmpDir = path.join(process.cwd(), 'plugins', 'tmp')
const cacheFile = path.join(tmpDir, 'active_api.json')

// 🧠 Verifica si la API responde correctamente
export async function checkActiveAPI() {
  try {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    // Usa cache si existe y no han pasado 10 minutos
    if (fs.existsSync(cacheFile)) {
      const cache = JSON.parse(fs.readFileSync(cacheFile))
      const diff = Date.now() - cache.timestamp
      if (diff < 10 * 60 * 1000 && cache.url) {
        console.log(`✅ Usando API guardada: ${cache.name}`)
        return cache.url
      }
    }

    console.log('🔍 Verificando API activa...')

    for (const [name, { url, headers }] of Object.entries(apis)) {
      try {
        const res = await fetch(`${url}?videoId=dQw4w9WgXcQ`, { headers })
        if (res.ok) {
          console.log(`✅ API activa: ${name}`)
          const data = { name, url, headers, timestamp: Date.now() }
          fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2))
          return url
        }
      } catch {
        console.log(`❌ ${name} no respondió.`)
      }
    }

    console.log('⚠️ Ninguna API respondió correctamente.')
    return null
  } catch (err) {
    console.error('🚨 Error en checkApis:', err)
    return null
  }
}

// ▶️ Ejecutar manualmente con “node main-checkApis.js”
if (import.meta.url === `file://${process.argv[1]}`) {
  checkActiveAPI()
         }

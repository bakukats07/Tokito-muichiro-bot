import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'

/* ════════════════════════════════════════
   🌐 Lista de APIs disponibles
   (puedes agregar o quitar según necesites)
   ════════════════════════════════════════ */
const apis = {
  botcahx: 'https://api.botcahx.biz.id',
  delirius: 'https://api.delirius.store',
  vreden: 'https://api.vreden.me',
  yupra: 'https://api.yupra.my.id',
  lumin: 'https://luminai.my.id/api',
  hiroshi: 'https://hiroshiapi.vercel.app',
  zenz: 'https://api.zenzapis.xyz'
}

/* Endpoints comunes que usaremos para testear */
const endpoints = [
  'api/download/ytmp3',
  'api/downloader/ytmp3',
  'api/ytdl',
  'downloader/yt1'
]

/* Carpeta y archivo para cachear la API activa */
const tmpDir = path.join(process.cwd(), 'plugins', 'tmp')
const cacheFile = path.join(tmpDir, 'active_api.json')

/**
 * 🧠 Lee el archivo active_api.json si existe y sigue siendo válido
 */
function loadActiveAPI() {
  if (fs.existsSync(cacheFile)) {
    try {
      const cache = JSON.parse(fs.readFileSync(cacheFile))
      const diff = Date.now() - cache.timestamp
      if (diff < 5 * 60 * 1000 && cache.url) {
        console.log(`✅ Usando API activa en caché: ${cache.name} (${cache.url})`)
        return cache
      } else {
        console.log('⚠️ Cache vencido, buscando nueva API...')
      }
    } catch {
      console.log('⚠️ Error leyendo active_api.json, se creará nuevo.')
    }
  }
  return null
}

/**
 * 💾 Guarda la API activa en el archivo JSON
 */
function saveActiveAPI(name, url) {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
  const data = { name, url, timestamp: Date.now() }
  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2))
  console.log(`💾 API activa guardada: ${name} → ${url}`)
}

/**
 * 🔍 Verifica cuál API está activa y la guarda
 */
export async function checkActiveAPI() {
  try {
    // Intentar usar la API guardada
    const cached = loadActiveAPI()
    if (cached) return cached.url

    console.log('🔎 Buscando una API funcional...')

    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

    for (const [name, baseUrl] of Object.entries(apis)) {
      for (const ep of endpoints) {
        const fullUrl = `${baseUrl}/${ep}?url=${encodeURIComponent(testUrl)}`
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 6000)
          const res = await fetch(fullUrl, { method: 'GET', signal: controller.signal })
          clearTimeout(timeout)

          if (res.ok) {
            const text = await res.text()
            if (text.includes('mp3') || text.includes('download') || text.includes('url')) {
              console.log(`✅ ${name} responde correctamente → ${baseUrl}/${ep}`)
              saveActiveAPI(name, `${baseUrl}/${ep}`)
              return `${baseUrl}/${ep}`
            }
          }
        } catch {
          // Ignorar errores de timeout o red
        }
      }
      console.log(`❌ ${name} no tiene endpoints válidos.`)
    }

    console.log('⚠️ Ninguna API respondió correctamente.')
    return null
  } catch (err) {
    console.error('🚨 Error en checkApis:', err)
    return null
  }
}

/**
 * 🧽 Limpia manualmente el caché de API activa
 */
export function clearActiveAPI() {
  try {
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile)
      console.log('🧹 Cache de active_api.json eliminado.')
    } else {
      console.log('ℹ️ No hay caché guardado actualmente.')
    }
  } catch (err) {
    console.error('❌ Error al eliminar caché:', err)
  }
}

/* Ejecutar directamente si se corre manualmente con "node plugins/main-checkApis.js" */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧩 Verificando APIs manualmente...')
  checkActiveAPI()
  }

import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'

const apis = {
  delirius: 'https://api.delirius.store',
  vreden: 'https://api.vreden.me',
  yupra: 'https://api.yupra.my.id',
  lumin: 'https://luminai.my.id/api',
  hiroshi: 'https://hiroshiapi.vercel.app',
  zenz: 'https://api.zenzapis.xyz'
}

const tmpDir = path.join(process.cwd(), 'plugins', 'tmp')
const cacheFile = path.join(tmpDir, 'active_api.json')

/**
 * Verifica cuál API responde correctamente y la guarda como activa.
 */
export async function checkActiveAPI() {
  try {
    // Crear carpeta tmp si no existe
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    // Si ya hay un API activa guardada y no han pasado 5 minutos, la usa directamente
    if (fs.existsSync(cacheFile)) {
      const cache = JSON.parse(fs.readFileSync(cacheFile))
      const diff = Date.now() - cache.timestamp
      if (diff < 5 * 60 * 1000 && cache.url) {
        console.log(`✅ Usando API guardada: ${cache.name} (${cache.url})`)
        return cache.url
      }
    }

    console.log('🔍 Buscando API activa...')

    // Probar las APIs una por una
    for (const [name, url] of Object.entries(apis)) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 4000)

        const res = await fetch(url, { method: 'GET', signal: controller.signal })
        clearTimeout(timeout)

        if (res.ok) {
          console.log(`✅ API activa: ${name} (${url})`)

          const data = { name, url, timestamp: Date.now() }
          fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2))
          return url
        }
      } catch {
        console.log(`❌ ${name} no respondió`)
      }
    }

    console.log('⚠️ Ninguna API respondió correctamente.')
    return null
  } catch (err) {
    console.error('🚨 Error en checkApis:', err)
    return null
  }
}

// Ejecutar directamente si se corre manualmente con "node checkApis.js"
if (import.meta.url === `file://${process.argv[1]}`) {
  checkActiveAPI()
}
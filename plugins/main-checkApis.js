import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'

/*
 🔥 Archivo actualizado: main-checkApis.js
 ▪ Verifica automáticamente las APIs disponibles.
 ▪ Guarda la API activa en /plugins/tmp/active_api.json.
 ▪ Compatible con el comando downloads-play.js.
*/

const apis = {
  violetics: 'https://api.violetics.pw',
  hiroshi: 'https://hiroshiapi.vercel.app',
  lolhuman: 'https://api.lolhuman.xyz',
  zenz: 'https://api.zenzapis.xyz',
  delirius: 'https://api.delirius.store',
  yupra: 'https://api.yupra.my.id',
  vreden: 'https://api.vreden.me',
}

const tmpDir = path.join(process.cwd(), 'plugins', 'tmp')
const cacheFile = path.join(tmpDir, 'active_api.json')

// 🔍 Función principal: detectar API activa
export async function checkActiveAPI() {
  try {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    // Si hay una API guardada y tiene menos de 5 minutos, úsala directamente
    if (fs.existsSync(cacheFile)) {
      const cache = JSON.parse(fs.readFileSync(cacheFile))
      const diff = Date.now() - cache.timestamp
      if (diff < 5 * 60 * 1000 && cache.url) {
        console.log(`✅ Usando API guardada: ${cache.name} (${cache.url})`)
        return cache.url
      }
    }

    console.log('🔎 Buscando API activa...')

    // Endpoints comunes donde suelen estar los convertidores de YouTube
    const pathsToTry = [
      '/api/youtube-mp3',
      '/api/ytdl/audio',
      '/api/ytmp3',
      '/api/yt/audio',
      '/api/ytaudio'
    ]

    for (const [name, baseUrl] of Object.entries(apis)) {
      for (const pathSuffix of pathsToTry) {
        const testUrl = `${baseUrl}${pathSuffix}?url=https://youtu.be/dQw4w9WgXcQ`
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 4000)

          const res = await fetch(testUrl, { method: 'GET', signal: controller.signal })
          clearTimeout(timeout)

          if (res.ok) {
            const text = await res.text()
            if (text.includes('result') || text.includes('url') || text.includes('title')) {
              console.log(`✅ API activa: ${name} (${baseUrl}) [ruta: ${pathSuffix}]`)

              const data = { name, url: baseUrl, path: pathSuffix, timestamp: Date.now() }
              fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2))
              return baseUrl
            }
          }
        } catch {
          console.log(`❌ ${name}${pathSuffix} no respondió`)
        }
      }
    }

    console.log('⚠️ Ninguna API respondió correctamente.')
    return null
  } catch (err) {
    console.error('🚨 Error en checkApis:', err)
    return null
  }
}

// Ejecutar directamente si se corre con “node main-checkApis.js”
if (import.meta.url === `file://${process.argv[1]}`) {
  checkActiveAPI()
                }

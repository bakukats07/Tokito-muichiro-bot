import fetch from 'node-fetch'
import fs from 'fs'

const apis = {
  delirius: 'https://api.delirius.store',
  vreden: 'https://api.vreden.me',
  yupra: 'https://api.yupra.my.id',
  lumin: 'https://luminai.my.id/api',
  hiroshi: 'https://hiroshiapi.vercel.app',
  zenz: 'https://api.zenzapis.xyz'
}

export async function getActiveAPI() {
  const tmpFile = 'plugins/tmp/activeApi.txt'
  for (const [name, url] of Object.entries(apis)) {
    try {
      const res = await fetch(url, { method: 'HEAD', timeout: 2500 })
      if (res.ok) {
        fs.writeFileSync(tmpFile, name)
        return name
      }
    } catch { continue }
  }
  fs.writeFileSync(tmpFile, 'none')
  return null
}
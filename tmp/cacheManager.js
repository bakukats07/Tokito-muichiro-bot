import fs from "fs"
import path from "path"
import fetch from "node-fetch"

const CACHE_DIR = path.join(process.cwd(), "plugins", "tmp", "cache")

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })

export async function saveToCache(url, type) {
  const fileName = `${Date.now()}_${type}.${type === "audio" ? "ogg" : "mp4"}`
  const filePath = path.join(CACHE_DIR, fileName)

  const res = await fetch(url)
  const buffer = await res.arrayBuffer()
  fs.writeFileSync(filePath, Buffer.from(buffer))

  return filePath
}

export async function getFromCache(url, type) {
  const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith(type === "audio" ? ".ogg" : ".mp4"))
  const found = files.find(f => f.includes(type))
  return found ? path.join(CACHE_DIR, found) : null
}

export function clearOldCache() {
  const now = Date.now()
  const files = fs.readdirSync(CACHE_DIR)
  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file)
    const stats = fs.statSync(filePath)
    if ((now - stats.mtimeMs) > 30 * 60 * 1000) fs.unlinkSync(filePath)
  }
}
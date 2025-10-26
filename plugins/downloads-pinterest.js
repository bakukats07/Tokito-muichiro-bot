// 🌸 Plugin Pinterest — downloads-pinterest.js
import axios from 'axios'
import * as cheerio from 'cheerio' // ✅ Import seguro ESM
// No necesitas importar baileys aquí, lo recibe como conn

let handler = async (m, { conn, text, args, usedPrefix }) => {
  if (!text) return m.reply(`❀ Por favor, ingresa lo que deseas buscar por Pinterest.`)

  try {
    await m.react('🕒')

    if (text.includes('https://')) {
      const i = await dl(text)
      if (!i.download) return m.reply('⚠️ No se pudo obtener el contenido del enlace.')

      const isVideo = i.download.endsWith('.mp4')
      await conn.sendMessage(
        m.chat,
        { [isVideo ? 'video' : 'image']: { url: i.download }, caption: i.title },
        { quoted: m } // ✅ Aquí ya usamos el mensaje actual
      )
    } else {
      const results = await pins(text)
      if (!results.length) return m.reply(`ꕥ No se encontraron resultados para "${text}".`)

      for (let i = 0; i < Math.min(results.length, 10); i++) {
        const img = results[i]
        await conn.sendMessage(
          m.chat,
          { image: { url: img.image_large_url }, caption: `❀ Pinterest - ${text}` },
          { quoted: m }
        )
      }

      await m.react('✔️')
    }
  } catch (e) {
    console.error(e)
    await m.react('✖️')
    m.reply(`⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n${e.message}`)
  }
}

handler.help = ['pinterest']
handler.command = ['pinterest', 'pin']
handler.tags = ['download']
handler.group = true

export default handler

// 🔹 Función para enlaces directos
async function dl(url) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const $ = cheerio.load(res.data)
    const tag = $('script[data-test-id="video-snippet"]')

    if (tag.length) {
      const result = JSON.parse(tag.text())
      return { title: result.name, download: result.contentUrl }
    }

    const json = JSON.parse($("script[data-relay-response='true']").eq(0).text())
    const result = json.response.data['v3GetPinQuery'].data
    return { title: result.title, download: result.imageLargeUrl }
  } catch (err) {
    console.error(err)
    return { msg: 'Error, inténtalo de nuevo más tarde' }
  }
}

// 🔹 Función de búsqueda por texto
const pins = async (query) => {
  const link = `https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(
    query
  )}%26rs%3Dtyped&data=%7B%22options%22%3A%7B%22query%22%3A%22${encodeURIComponent(query)}%22%2C%22redux_normalize_feed%22%3Atrue%7D%2C%22context%22%3A%7B%7D%7D`

  const headers = {
    accept: 'application/json, text/javascript, */*; q=0.01',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  }

  try {
    const res = await axios.get(link, { headers })
    if (!res.data?.resource_response?.data?.results) return []

    return res.data.resource_response.data.results
      .map((item) => {
        if (!item.images) return null
        return { image_large_url: item.images.orig?.url || null }
      })
      .filter(Boolean)
  } catch (err) {
    console.error('Pinterest search error:', err)
    return []
  }
    }

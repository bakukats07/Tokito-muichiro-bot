import axios from 'axios'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, args, usedPrefix }) => {
  if (!text) return m.reply(`❀ Ingresa algo para buscar en Pinterest.`)
  try {
    await m.react('🕒')

    const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(text)}`
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const $ = cheerio.load(res.data)
    const imgs = []

    $('img').each((i, el) => {
      const src = $(el).attr('src')
      if (src && !imgs.includes(src)) imgs.push(src)
    })

    if (!imgs.length) return m.reply(`⚠️ No se encontraron imágenes para "${text}".`)

    // Solo enviamos las primeras 5 imágenes para no saturar
    for (let i = 0; i < Math.min(imgs.length, 5); i++) {
      await conn.sendMessage(m.chat, {
        image: { url: imgs[i] },
        caption: `❀ Pinterest - Resultado de: "${text}"\nImagen ${i + 1}/${Math.min(imgs.length,5)}`
      }, { quoted: m })
    }

    await m.react('✔️')
  } catch (e) {
    await m.react('✖️')
    conn.reply(m.chat, `⚠︎ Ocurrió un error.\n> Usa *${usedPrefix}report* para informar.\n\n${e}`, m)
  }
}

handler.help = ['pinterest']
handler.command = ['pinterest', 'pin']
handler.tags = ['download']
handler.group = true

export default handler

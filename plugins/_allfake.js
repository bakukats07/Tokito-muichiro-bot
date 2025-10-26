// ============================================================
// 🌫️ Tokito Muichiro Bot - Plugin Global (_alfake.js)
// 🧩 Define variables globales y configuraciones dinámicas
// ============================================================

import pkg from '@whiskeysockets/baileys'
import fs from 'fs'
import fetch from 'node-fetch'
import axios from 'axios'
import moment from 'moment-timezone'

const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = pkg

// ────────────────────────────────────────────────
// Manejador global
var handler = m => m

handler.all = async function (m) {
  try {
    // ────────────────
    // Canales Oficiales
    global.canalIdM = [
      "120363419788579382@newsletter",
      "120363419788579382@newsletter"
    ]

    global.canalNombreM = [
      "⋆.˚༘⋆๓∂ T̴⦏ô⦎ki₮o̷-Boㄒ⋆.˚༘⋆🌫️",
      "⋆.˚༘⋆๓∂ T̴⦏ô⦎ki₮o̷-Boㄒ⋆.˚༘⋆🌫️"
    ]

    // Selección aleatoria de canal
    global.channelRD = await getRandomChannel()

    // ────────────────
    // Fecha y hora
    global.d = new Date(Date.now() + 3600000)
    global.locale = 'es'
    global.dia = d.toLocaleDateString(locale, { weekday: 'long' })
    global.fecha = d.toLocaleDateString('es', { day: 'numeric', month: 'numeric', year: 'numeric' })
    global.mes = d.toLocaleDateString('es', { month: 'long' })
    global.año = d.toLocaleDateString('es', { year: 'numeric' })
    global.tiempo = d.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })

    // ────────────────
    // Redes del bot
    const canal = 'https://whatsapp.com/channel/0029VbBFWP0Lo4hgc1cjlC0M'
    const comunidad = 'https://chat.whatsapp.com/ECZeU9ipYKlIeTxzdjvtgW?mode=wwt'
    const git = 'https://github.com/bakukats07/Tokito-muichiro-bot'
    const correo = 'thekingdestroy507@gmail.com'
    global.redes = pickRandom([canal, comunidad, git, correo])

    // ────────────────
    // Datos del usuario y del bot
    global.nombre = m.pushName || 'Anónimo'
    global.botname = global.botname || 'Tokito-Muichiro-Bot'
    global.dev = global.dev || 'The King Destroy'
    global.icono = global.icono || 'https://i.ibb.co/0f1Kj6B/tokito-icon.png'

    // ────────────────
    // Stickers de autoría
    global.packsticker = `°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°\n` +
      `ᰔᩚ Usuario: ${global.nombre}\n` +
      `❀ Bot: ${global.botname}\n` +
      `✦ Fecha: ${global.fecha}\n` +
      `ⴵ Hora: ${moment.tz('America/Caracas').format('HH:mm:ss')}`

    global.packsticker2 = `\n°.⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸⎯ܴ⎯̶᳞͇ࠝ⎯⃘̶⎯̸.°\n\n${global.dev}`

    // ────────────────
    // Mensaje de contacto falso (para enviar menús, etc.)
    global.fkontak = {
      key: {
        participants: "0@s.whatsapp.net",
        remoteJid: "status@broadcast",
        fromMe: false,
        id: "Halo"
      },
      message: {
        contactMessage: {
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:${global.botname}\n` +
                 `item1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\n` +
                 `item1.X-ABLabel:Ponsel\nEND:VCARD`
        }
      },
      participant: "0@s.whatsapp.net"
    }

    // ────────────────
    // Contexto del canal (para reenviar mensajes con estilo)
    const thumb = await (await fetch(global.icono)).buffer().catch(() => Buffer.alloc(0))
    global.rcanal = {
      contextInfo: {
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: global.channelRD.id,
          serverMessageId: '',
          newsletterName: global.channelRD.name
        },
        externalAdReply: {
          title: global.botname,
          body: global.dev,
          mediaUrl: null,
          description: null,
          previewType: "PHOTO",
          thumbnail: thumb,
          sourceUrl: global.redes,
          mediaType: 1,
          renderLargerThumbnail: false
        },
        mentionedJid: null
      }
    }

  } catch (e) {
    console.error('❌ Error en _alfake.js:', e)
  }
}

export default handler

// ────────────────────────────────────────────────
// Funciones auxiliares
function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

async function getRandomChannel() {
  const randomIndex = Math.floor(Math.random() * global.canalIdM.length)
  const id = global.canalIdM[randomIndex]
  const name = global.canalNombreM[randomIndex]
  return { id, name }
      }

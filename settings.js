// ─────────────────────────────────────────────
// ⚙️ TokitoBot | Configuración Global
// Adaptado a la estructura de Tokito-Muichiro-Bot
// ─────────────────────────────────────────────

import fs from "fs"
import chalk from "chalk"
import { fileURLToPath } from "url"

//────────────────────────────────────────────
// 📞 NÚMEROS Y GRADOS DE USUARIOS
//────────────────────────────────────────────

export const botNumber = '573208204068' // Número del bot (para código de 8 dígitos)
export const owner = ['573004828388']       // Dueño principal
export const sockers = ['573004828388']     // Subdevs / testers
export const mods = ['573004828388']        // Moderadores
export const prems = ['573004828388']       // Premium users

// Método de autenticación: 'qr' para escanear QR, 'pairing' para código de 8 dígitos
export const authMethod = 'qr'

// Número del bot para conexión por código de 8 dígitos
export const phoneNumber = '573218138672'

//────────────────────────────────────────────
// 🤖 INFORMACIÓN DEL BOT
//────────────────────────────────────────────

export const botName = 'Ⓜ︎𝒖𝒾𝒸𝒽𝒾𝒓𝒐-𝑴𝑫'
export const version = '1.0.0'
export const library = 'Baileys Multi Device'
export const prefixes = ['#', '/', '.', '!']
export const textBot = 'Ꮇ𝒖𝒾𝒸𝒽𝒾𝒓𝒐, mᥲძᥱ ᥕі𝗍һ ᑲᥡ 스카이클라우드'
export const author = '© mᥲძᥱ ᥕі𝗍һ ᑲᥡ 스카이클라우드'
export const dev = '© ⍴᥆ᥕᥱrᥱძ ᑲᥡ 스카이클라우드'
export const currency = '¥enes'

//────────────────────────────────────────────
// 🖼️ MULTIMEDIA & ENLACES
//────────────────────────────────────────────

export const banner = 'https://github.com/bakukats07/Mis-Imagenes/raw/main/c6c24dc91a5befb5e6a58e23163ce5f4.jpg'
export const icono = 'https://github.com/bakukats07/Mis-Imagenes/raw/main/f9d15a813993931a4e484f5176da4348.jpg'
export const catalogo = fs.existsSync('./lib/catalogo.jpg')
  ? fs.readFileSync('./lib/catalogo.jpg')
  : null

export const group = 'https://chat.whatsapp.com/E7foYUiRVDQ4FSRwolDNzG?mode=wwt'
export const community = 'https://chat.whatsapp.com/ECZeU9ipYKlIeTxzdjvtgW?mode=wwt'
export const channel = 'https://whatsapp.com/channel/0029VbBFWP0Lo4hgc1cjlC0M'
export const github = 'https://github.com/bakukats07/Tokito-muichiro-bot'
export const gmail = 'thekingdestroy507@gmail.com'

//────────────────────────────────────────────
// 🔑 SESIONES Y OPCIONES DE CONEXIÓN
//────────────────────────────────────────────

export const sessionPrincipal = './sessions'
export const sessionJadi = './Sessions/SubBot'
export const MuichiroJadibots = true // Activa modo subbots

//────────────────────────────────────────────
// ⚙️ COMPORTAMIENTO GENERAL
//────────────────────────────────────────────

export const configBot = {
  autoread: true,
  autoTyping: false,
  autoRecord: false,
  restrict: true,
  antiCall: true,
  antiSpam: true,
  logs: true
}

//────────────────────────────────────────────
// 🕒 SISTEMA DE COOLDOWN (anti spam)
//────────────────────────────────────────────

export const cooldowns = {
  default: 5,
  premium: 2
}

//────────────────────────────────────────────
// 📩 MENSAJES PREDEFINIDOS
//────────────────────────────────────────────

export const mensajes = {
  wait: '⌛ Procesando tu solicitud...',
  error: '❌ Ocurrió un error inesperado.',
  success: '✅ Comando ejecutado correctamente.',
  admin: '🛡️ Solo los administradores pueden usar este comando.',
  owner: '👑 Solo el propietario puede usar este comando.',
  mod: '🧰 Solo los moderadores pueden ejecutar esto.',
  group: '👥 Comando exclusivo para grupos.',
  private: '📩 Solo disponible en chats privados.',
  botAdmin: '🤖 Necesito permisos de administrador para hacerlo.',
  premium: '💎 Solo usuarios premium tienen acceso a este comando.'
}

//────────────────────────────────────────────
// 💬 SALUDOS SEGÚN RANGO
//────────────────────────────────────────────

export const roleText = {
  owner: '👑 Bienvenido, Creador.',
  sockers: '⚙️ Saludos, subdev.',
  mod: '🧰 Modo Moderador activado.',
  prem: '💎 Usuario Premium detectado.',
  user: '👋 Hola, bienvenido.'
}

//────────────────────────────────────────────
// 🌐 APIS DISPONIBLES
//────────────────────────────────────────────

export const APIs = {
  zenz: {
    url: 'https://api.zenzapis.xyz',
    key: '82fd1691b8mshd09070ae556cdddp1cb6e2jsnf029e65d5a97'
  },
}

export const extraAPIs = {
  lolhuman: {
    url: 'https://api.lolhuman.xyz',
    key: 'your-lolhuman-key'
  },
  neko: {
    url: 'https://nekos.best/api/v2',
  },
}

//────────────────────────────────────────────
// 🗂️ DIRECTORIOS TEMPORALES
//────────────────────────────────────────────

export const paths = {
  tmp: './tmp',
  media: './media',
  logs: './logs',
}

//────────────────────────────────────────────
// 🔁 AUTO-RECARGA DE CONFIG
//────────────────────────────────────────────

const file = fileURLToPath(import.meta.url)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright("♻️ Configuración actualizada — recargando settings.js"))
  import(`${file}?update=${Date.now()}`)
})

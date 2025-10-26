// ─────────────────────────────────────────────
// ⚙️ TokitoBot | Configuración Global
// by: Skycloud✨
// ─────────────────────────────────────────────

import fs from "fs"
import chalk from "chalk"
import { fileURLToPath } from "url"

//────────────────────────────────────────────
// 📞 NÚMEROS Y GRADOS DE USUARIOS
//────────────────────────────────────────────

// Número del bot (solo para conexión por código de texto)
global.botNumber = '' // Ejemplo: 573218138672

// Dueños y rangos
global.owner = ['573004828388'] // 👑 Dueño principal
global.sockers = []              // ⚙️ Rango intermedio (subdevs o testers)
global.mods = []                 // 🧰 Moderadores
global.prems = []                // 💎 Premium users

//────────────────────────────────────────────
// 🤖 INFORMACIÓN DEL BOT
//────────────────────────────────────────────

global.botName = 'Ⓜ︎𝒖𝒊𝒄𝒉𝒊𝒓𝒐-𝑴𝑫'
global.version = '1.0.0'
global.library = 'Baileys Multi Device'
global.prefix = '.'
global.textBot = 'Ꮇ𝒖𝒊𝒄𝒉𝒊𝒓𝒐, mᥲძᥱ ᥕі𝗍һ ᑲᥡ 스카이클라우드'
global.author = '© mᥲძᥱ ᥕі𝗍һ ᑲᥡ 스카이클라우드'
global.dev = '© ⍴᥆ᥕᥱrᥱძ ᑲᥡ 스카이클라우드'
global.currency = '¥enes'

//────────────────────────────────────────────
// 🖼️ MULTIMEDIA & ENLACES
//────────────────────────────────────────────

global.banner = 'https://github.com/bakukats07/Mis-Imagenes/raw/main/c6c24dc91a5befb5e6a58e23163ce5f4.jpg'
global.icono = 'https://github.com/bakukats07/Mis-Imagenes/raw/main/f9d15a813993931a4e484f5176da4348.jpg'
global.catalogo = fs.existsSync('./lib/catalogo.jpg')
  ? fs.readFileSync('./lib/catalogo.jpg')
  : null

global.group = 'https://chat.whatsapp.com/E7foYUiRVDQ4FSRwolDNzG?mode=wwt'
global.community = 'https://chat.whatsapp.com/ECZeU9ipYKlIeTxzdjvtgW?mode=wwt'
global.channel = 'https://whatsapp.com/channel/0029VbBFWP0Lo4hgc1cjlC0M'
global.github = 'https://github.com/bakukats07/Tokito-muichiro-bot'
global.gmail = 'thekingdestroy507@gmail.com'

//────────────────────────────────────────────
// 🔑 SESIONES Y OPCIONES DE CONEXIÓN
//────────────────────────────────────────────

global.sessionPrincipal = './session'
global.sessionJadi = './Sessions/SubBot'
global.yukiJadibts = true // Activa modo “subbots”

//────────────────────────────────────────────
// ⚙️ COMPORTAMIENTO GENERAL
//────────────────────────────────────────────

global.configBot = {
  autoread: true,      // Marca los mensajes como leídos automáticamente
  autoTyping: false,   // Simula que el bot está escribiendo
  autoRecord: false,   // Simula grabar audio
  restrict: true,      // Permite funciones de grupo (ban, kick)
  antiCall: true,      // Bloquea llamadas
  antiSpam: true,      // Evita spam de comandos
  logs: true,          // Muestra logs en consola
}

//────────────────────────────────────────────
// 🕒 SISTEMA DE COOLDOWN (anti spam)
//────────────────────────────────────────────

global.cooldowns = {
  default: 5, // segundos
  premium: 2,
}

//────────────────────────────────────────────
// 📩 MENSAJES PREDEFINIDOS
//────────────────────────────────────────────

global.mensajes = {
  wait: '⌛ Procesando tu solicitud...',
  error: '❌ Ocurrió un error inesperado.',
  success: '✅ Comando ejecutado correctamente.',
  admin: '🛡️ Solo los administradores pueden usar este comando.',
  owner: '👑 Solo el propietario puede usar este comando.',
  mod: '🧰 Solo los moderadores pueden ejecutar esto.',
  group: '👥 Comando exclusivo para grupos.',
  private: '📩 Solo disponible en chats privados.',
  botAdmin: '🤖 Necesito permisos de administrador para hacerlo.',
  premium: '💎 Solo usuarios premium tienen acceso a este comando.',
}

//────────────────────────────────────────────
// 💬 SALUDOS SEGÚN RANGO
//────────────────────────────────────────────

global.roleText = {
  owner: '👑 Bienvenido, Creador.',
  sockers: '⚙️ Saludos, subdev.',
  mod: '🧰 Modo Moderador activado.',
  prem: '💎 Usuario Premium detectado.',
  user: '👋 Hola, bienvenido.',
}

//────────────────────────────────────────────
// 🌐 APIS DISPONIBLES
//────────────────────────────────────────────

global.APIs = {
  zenz: {
    url: 'https://api.zenzapis.xyz',
    key: '82fd1691b8mshd09070ae556cdddp1cb6e2jsnf029e65d5a97'
  },
}

global.extraAPIs = {
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

global.paths = {
  tmp: './tmp',
  media: './media',
  logs: './logs',
}

//────────────────────────────────────────────
// 🧩 AUTO-VALIDACIÓN
//────────────────────────────────────────────

if (!global.owner?.length) console.warn(chalk.yellow('⚠️ No hay ningún número de owner definido en config.js'))
if (!global.botName) console.warn(chalk.yellow('⚠️ Falta definir botName'))
if (!global.sessionPrincipal) console.warn(chalk.yellow('⚠️ Falta definir sessionPrincipal'))

//────────────────────────────────────────────
// 🔁 AUTO-RECARGA DE CONFIG
//────────────────────────────────────────────

let file = fileURLToPath(import.meta.url)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright("♻️ Configuración actualizada — recargando config.js"))
  import(`${file}?update=${Date.now()}`)
})

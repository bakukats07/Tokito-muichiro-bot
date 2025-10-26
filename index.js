// 🌫️ Tokito Muichiro Bot — index.js (versión estable universal)
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import pino from 'pino'
import pkg from '@whiskeysockets/baileys'
import { fileURLToPath } from 'url'
import { Boom } from '@hapi/boom'
import { settings } from './settings.js'
import helper from './lib/helper.js'

const { __dirname } = helper
const { 
  makeWASocket, 
  useMultiFileAuthState, 
  makeCacheableSignalKeyStore, 
  fetchLatestBaileysVersion, 
  DisconnectReason 
} = pkg

// Rutas de sesión
const __filename = fileURLToPath(import.meta.url)
const dir = __dirname(import.meta.url)
const sessionPath = path.join(dir, 'sessions')
if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath)

// Función principal
async function startTokito() {
  console.clear()
  console.log(chalk.cyanBright('\n🌫️ Iniciando Tokito-Muichiro-Bot...\n'))

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: 'silent' })

  // Crear conexión
  const conn = makeWASocket({
    version,
    printQRInTerminal: settings.authMethod === 'qr',
    browser: ['Tokito Muichiro Bot', 'Chrome', '10.0'],
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
  })

  // 🔐 Si está en modo “pairing”, genera el código automáticamente
  if (settings.authMethod === 'pairing' && !conn.authState.creds.registered) {
    const phoneNumber = settings.phoneNumber?.replace(/[^0-9]/g, '')
    if (!phoneNumber) {
      console.log(chalk.red('⚠️ No se encontró el número de teléfono en settings.js'))
      process.exit(1)
    }
    try {
      const code = await conn.requestPairingCode(phoneNumber)
      console.log(chalk.greenBright(`\n🔢 Código de vinculación (8 dígitos): ${chalk.yellow(code)}\n`))
      console.log(chalk.gray('👉 En WhatsApp: Dispositivos vinculados → Introducir código\n'))
    } catch (err) {
      console.log(chalk.red('❌ Error al generar código de vinculación:'), err)
      process.exit(1)
    }
  }

  // 🔁 Reintento y reconexión automática
  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      switch (reason) {
        case DisconnectReason.loggedOut:
          console.log(chalk.red('🔴 Sesión cerrada. Elimina /sessions y vuelve a vincular.'))
          process.exit(0)
          break
        default:
          console.log(chalk.yellow('🌀 Reconectando en 3s...'))
          setTimeout(startTokito, 3000)
      }
    } else if (connection === 'open') {
      console.log(chalk.greenBright('✅ Conectado exitosamente a WhatsApp!\n'))
    }
  })

  // 💾 Guardar sesión
  conn.ev.on('creds.update', saveCreds)

  // ⚙️ Cargar plugins
  const pluginFolder = path.join(dir, 'plugins')
  if (!fs.existsSync(pluginFolder)) fs.mkdirSync(pluginFolder)
  const pluginFiles = fs.readdirSync(pluginFolder).filter(f => f.endsWith('.js'))

  console.log(chalk.magenta(`🧩 Cargando ${pluginFiles.length} plugin(s)...`))
  for (let file of pluginFiles) {
    try {
      const plugin = await import(`./plugins/${file}`)
      console.log(chalk.gray(`  ⚙️  Plugin cargado: ${file}`))
    } catch (e) {
      console.error(chalk.red(`❌ Error al cargar ${file}:`), e)
    }
  }

  // 💬 Manejo de mensajes
  conn.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if (!m.message) return

    try {
      const from = m.key.remoteJid
      const text = 
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.imageMessage?.caption ||
        m.message.videoMessage?.caption ||
        ''

      const prefix = settings.prefixes.find(p => text.startsWith(p))
      if (!prefix) return

      const command = text.slice(prefix.length).trim().split(/ +/).shift().toLowerCase()
      const args = text.trim().split(/ +/).slice(1)

      // Buscar plugin que maneje el comando
      for (let file of pluginFiles) {
        try {
          const plugin = await import(`./plugins/${file}`)
          if (plugin.default?.command?.includes(command)) {
            await plugin.default.run(conn, m, { text, args, command, prefix })
            return
          }
        } catch (err) {
          console.error(chalk.red(`❌ Error en ${file}:`), err)
        }
      }
    } catch (err) {
      console.error(chalk.red('Error en el manejador de mensajes:'), err)
    }
  })
}

// Ejecutar bot
startTokito()

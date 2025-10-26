import pkg from '@whiskeysockets/baileys'
import pino from 'pino'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import { settings } from './settings.js'

const { makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function startTokito() {
  const sessionPath = path.join(__dirname, './sessions')
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath)

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: 'silent' })

  console.log(chalk.cyanBright('\n🌫️ Iniciando Tokito-Muichiro-Bot...\n'))

  const conn = makeWASocket({
    version,
    printQRInTerminal: settings.authMethod === 'qr',
    logger,
    browser: ['Tokito-Muichiro-Bot', 'Edge', '10.0'],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
  })

  // 🔐 Si no hay registro, genera el código de 8 dígitos automáticamente
  if (settings.authMethod === 'pairing' && !conn.authState.creds.registered) {
    const phoneNumber = settings.phoneNumber?.replace(/[^0-9]/g, '')
    if (!phoneNumber) {
      console.log(chalk.red('⚠️ No se encontró el número de teléfono en settings.js'))
      process.exit(1)
    }
    const code = await conn.requestPairingCode(phoneNumber)
    console.log(chalk.greenBright(`\n🔢 Código de vinculación (8 dígitos): ${chalk.yellow(code)}\n`))
    console.log(chalk.gray('👉 En tu WhatsApp: Dispositivos vinculados → Introducir código\n'))
  }

  // 🧠 Evento: conexión / reconexión automática
  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (reason === DisconnectReason.loggedOut) {
        console.log(chalk.red('🔴 Sesión cerrada. Elimina la carpeta /sessions y vuelve a vincular.'))
        process.exit(0)
      } else {
        console.log(chalk.yellow('🌀 Reintentando conexión...'))
        startTokito()
      }
    } else if (connection === 'open') {
      console.log(chalk.greenBright('✅ Conectado exitosamente a WhatsApp!'))
    }
  })

  // 💾 Guardar sesión cada vez que cambie
  conn.ev.on('creds.update', saveCreds)

  // 🔄 Cargar plugins dinámicamente
  const pluginFolder = path.join(__dirname, 'plugins')
  const pluginFiles = fs.readdirSync(pluginFolder).filter(f => f.endsWith('.js'))
  for (let file of pluginFiles) {
    const plugin = await import(`./plugins/${file}`)
    console.log(chalk.magenta(`⚙️  Plugin cargado: ${file}`))
  }

  // 💬 Evento de mensaje nuevo
  conn.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const m = messages[0]
      if (!m.message) return

      const from = m.key.remoteJid
      const type = Object.keys(m.message)[0]
      const text = m.message.conversation || m.message.extendedTextMessage?.text || ''
      const prefix = settings.prefixes.find(p => text.startsWith(p))
      if (!prefix) return

      const command = text.slice(prefix.length).trim().split(/ +/).shift().toLowerCase()
      const args = text.trim().split(/ +/).slice(1)

      // Carga plugins por comando
      for (let file of pluginFiles) {
        const plugin = await import(`./plugins/${file}`)
        if (plugin.default?.command?.includes(command)) {
          await plugin.default.run(conn, m, { text, args, command, prefix })
          break
        }
      }
    } catch (e) {
      console.error(chalk.red('Error en message handler:'), e)
    }
  })
}

startTokito()

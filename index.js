// 🌫️ Tokito Muichiro Bot — index.js (versión estable Termux)
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import pino from 'pino'
import pkg from '@whiskeysockets/baileys'
import { fileURLToPath } from 'url'
import { Boom } from '@hapi/boom'
import { authMethod, phoneNumber, prefixes } from './settings.js'
import { isReadableStream, checkFileExists } from './lib/helper.js' // ✅ Import nombrado seguro

const { makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason } = pkg

// ───────────── Rutas de sesión ─────────────
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const sessionPath = path.join(__dirname, 'sessions')
if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })

// ───────────── Función principal ─────────────
async function startTokito() {
  console.clear()
  console.log(chalk.cyanBright('\n🌫️ Iniciando Tokito-Muichiro-Bot...\n'))

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: 'silent' })

  const conn = makeWASocket({
    version,
    printQRInTerminal: authMethod === 'qr',
    browser: ['Tokito Muichiro Bot', 'Chrome', '10.0'],
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
  })

  // 🔁 Reconexión automática y código de vinculación
  let codeSent = false
  conn.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (reason === DisconnectReason.loggedOut) {
        console.log(chalk.red('🔴 Sesión cerrada. Borra /sessions y vuelve a vincular.'))
        process.exit(0)
      } else {
        console.log(chalk.yellow('🌀 Reconectando en 3s...'))
        setTimeout(startTokito, 3000)
      }
    } else if (connection === 'open') {
      console.log(chalk.greenBright('✅ Conectado a WhatsApp correctamente!\n'))

      // 🔐 Código de 8 dígitos solo una vez
      if (authMethod === 'pairing' && !codeSent && !conn.authState.creds.registered) {
        const cleanNumber = phoneNumber?.replace(/[^0-9]/g, '')
        if (!cleanNumber) return
        try {
          const code = await conn.requestPairingCode(cleanNumber)
          console.log(chalk.greenBright(`\n🔢 Código de vinculación: ${chalk.yellow(code)}\n`))
          console.log(chalk.gray('👉 En WhatsApp: Dispositivos vinculados → Introducir código\n'))
          codeSent = true
        } catch (err) {
          console.error(chalk.red('❌ Error al generar código de vinculación:'), err)
        }
      }
    }
  })

  // 💾 Guardar credenciales
  conn.ev.on('creds.update', saveCreds)

  // ⚙️ Plugins
  const pluginFolder = path.join(__dirname, 'plugins')
  if (!fs.existsSync(pluginFolder)) fs.mkdirSync(pluginFolder)
  const pluginFiles = fs.readdirSync(pluginFolder).filter(f => f.endsWith('.js'))
  console.log(chalk.magenta(`🧩 Cargando ${pluginFiles.length} plugin(s)...`))
  const plugins = []
  for (let file of pluginFiles) {
    try {
      const plugin = await import(`./plugins/${file}`)
      if (plugin.default) plugins.push(plugin.default)
      console.log(chalk.gray(`  ⚙️  Plugin cargado: ${file}`))
    } catch (err) {
      console.error(chalk.red(`❌ Error cargando ${file}:`), err)
    }
  }

  // 💬 Manejo de mensajes
  conn.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if (!m.message) return

    try {
      const text =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.imageMessage?.caption ||
        m.message.videoMessage?.caption ||
        ''

      const prefix = prefixes.find(p => text.startsWith(p))
      if (!prefix) return

      const command = text.slice(prefix.length).trim().split(/ +/).shift().toLowerCase()
      const args = text.trim().split(/ +/).slice(1)

      for (let plugin of plugins) {
        try {
          if (!plugin.command) continue
          const cmdRegex = plugin.command instanceof RegExp ? plugin.command.test(command) : plugin.command.includes(command)
          if (cmdRegex && plugin.run) {
            await plugin.run(conn, m, { text, args, command, prefix })
            return
          }
        } catch (err) {
          console.error(chalk.red(`❌ Error ejecutando plugin "${plugin.name || 'sin nombre'}":`), err)
        }
      }
    } catch (err) {
      console.error(chalk.red('❌ Error manejando mensajes:'), err)
    }
  })
}

// ───────────── Ejecutar bot ─────────────
startTokito()

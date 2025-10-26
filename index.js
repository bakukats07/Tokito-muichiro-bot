// 🌫️ Tokito Muichiro Bot — index.js (versión estable Termux)
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import pino from 'pino'
import pkg from '@whiskeysockets/baileys'
import { fileURLToPath } from 'url'
import { Boom } from '@hapi/boom'
import { authMethod, phoneNumber, prefixes } from './settings.js'
import helper from './lib/helper.js'

const { __dirname } = helper
const { makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason } = pkg

// ───────────── Rutas de sesión ─────────────
const __filename = fileURLToPath(import.meta.url)
const dir = __dirname(import.meta.url)
const sessionPath = path.join(dir, 'sessions')
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

  // 🔐 Código de 8 dígitos (pairing)
  if (authMethod === 'pairing' && !conn.authState.creds.registered) {
    const cleanNumber = phoneNumber?.replace(/[^0-9]/g, '')
    if (!cleanNumber) {
      console.log(chalk.red('⚠️ No se encontró número en settings.js'))
      process.exit(1)
    }
    try {
      const code = await conn.requestPairingCode(cleanNumber)
      console.log(chalk.greenBright(`\n🔢 Código de vinculación: ${chalk.yellow(code)}\n`))
      console.log(chalk.gray('👉 En WhatsApp: Dispositivos vinculados → Introducir código\n'))
    } catch (err) {
      console.error(chalk.red('❌ Error al generar código de vinculación:'), err)
      process.exit(1)
    }
  }

  // 🔁 Reconexión automática
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
    }
  })

  // 💾 Guardar credenciales
  conn.ev.on('creds.update', saveCreds)

  // ⚙️ Plugins
  const pluginFolder = path.join(dir, 'plugins')
  if (!fs.existsSync(pluginFolder)) fs.mkdirSync(pluginFolder)
  const pluginFiles = fs.readdirSync(pluginFolder).filter(f => f.endsWith('.js'))
  console.log(chalk.magenta(`🧩 Cargando ${pluginFiles.length} plugin(s)...`))
  for (let file of pluginFiles) {
    try {
      await import(`./plugins/${file}`)
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
      console.error(chalk.red('❌ Error manejando mensajes:'), err)
    }
  })
}

// ───────────── Ejecutar bot ─────────────
startTokito()

/**
 * Tokito Muichiro Bot — v1.8.2
 * Desarrollado y adaptado por: Skycloud🐼
 * Compatible con estructuras remodeladas 2025
 */

import './settings.js'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import fs from 'fs'
import chalk from 'chalk'
import { Boom } from '@hapi/boom'
import P from 'pino'
import pkg from '@whiskeysockets/baileys'
import { smsg } from './lib/simple.js'

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const require = createRequire(import.meta.url)

global.APIKeys = new Map()
global.plugins = {}
global.db = { data: { users: {}, chats: {}, settings: {} } }

global.loadDatabase = async function () {
  const dbFile = './database.json'
  if (fs.existsSync(dbFile)) {
    global.db.data = JSON.parse(fs.readFileSync(dbFile))
  } else {
    fs.writeFileSync(dbFile, JSON.stringify(global.db.data, null, 2))
  }
}

global.saveDatabase = async function () {
  fs.writeFileSync('./database.json', JSON.stringify(global.db.data, null, 2))
}

// Carga dinámica de plugins
async function loadPlugins() {
  const folder = join(__dirname, 'plugins')
  const files = fs.readdirSync(folder).filter(f => f.endsWith('.js'))
  for (const file of files) {
    try {
      const pluginPath = join(folder, file)
      const plugin = (await import(`file://${pluginPath}?update=${Date.now()}`)).default
      global.plugins[file] = plugin
      console.log(chalk.green(`✓ Plugin cargado: ${file}`))
    } catch (e) {
      console.log(chalk.red(`✗ Error al cargar el plugin ${file}:`), e)
    }
  }
}

// Función principal
async function startBot() {
  await global.loadDatabase()
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const { version, isLatest } = await fetchLatestBaileysVersion()
  const logger = P({ level: 'silent' })

  const conn = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
    logger,
    browser: ['Tokito-Muichiro-Bot', 'Safari', '1.8.2']
  })

  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log(chalk.yellowBright('⚠️ Conexión cerrada. Reconectando...'))
      if (shouldReconnect) startBot()
      else console.log(chalk.red('❌ Sesión cerrada definitivamente.'))
    } else if (connection === 'open') {
      console.log(chalk.greenBright('✅ Bot conectado correctamente.'))
    }
  })

  conn.ev.on('creds.update', saveCreds)
  conn.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const m = smsg(conn, messages[0])
      if (!m.message) return
      await (await import('./handler.js')).handler.call(conn, { messages: [m] })
    } catch (err) {
      console.error(chalk.red('Error en mensajes.upsert:'), err)
    }
  })
}

// Observa cambios en archivos para recargar
let files = ['./handler.js', './settings.js']
for (let file of files) {
  fs.watchFile(file, async () => {
    fs.unwatchFile(file)
    console.log(chalk.cyan(`🔄 ${file} actualizado, recargando módulo...`))
    if (file === './handler.js') {
      delete import.cache[file]
      await import(`file://${join(__dirname, 'handler.js')}?update=${Date.now()}`)
    } else {
      await import(`file://${join(__dirname, 'settings.js')}?update=${Date.now()}`)
    }
  })
}

await loadPlugins()
startBot()

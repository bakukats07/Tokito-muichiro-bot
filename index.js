// 🌫️ Tokito Muichiro Bot — index.js final seguro
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import pino from 'pino'
import pkg from '@whiskeysockets/baileys'
import { fileURLToPath } from 'url'
import { Boom } from '@hapi/boom'
import { authMethod, phoneNumber } from './settings.js'

const { makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const sessionPath = path.join(__dirname, 'sessions')
if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })

async function startTokito() {
  console.clear()

  const title = `
╔════════════════════════════════╗
║ 🌫️  TOKITO-MUICHIRO BOT  🌫️ ║
╚════════════════════════════════╝
`
  console.log(chalk.hex('#00bfff').bold(title))

  // ⏳ Animación de carga
  const loadingText = '⚡ Iniciando el bot, por favor espera '
  const loadingFrames = ['.  ', '.. ', '...']
  for (let i = 0; i < 6; i++) {
    process.stdout.write(chalk.hex('#00bfff').bold(`\r${loadingText}${loadingFrames[i % loadingFrames.length]}`))
    await new Promise(r => setTimeout(r, 400))
  }
  console.log('\n')

  // Si ya hay sesión guardada, evita generar nuevo código
  const stateFile = path.join(sessionPath, 'state.json')
  if (fs.existsSync(stateFile)) {
    console.log(chalk.greenBright('✅ Sesión existente encontrada. Conectando sin generar código...\n'))
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: 'silent' })

  const conn = makeWASocket({
    version,
    printQRInTerminal: authMethod === 'qr' && !fs.existsSync(stateFile),
    browser: ['Tokito Muichiro Bot', 'Chrome', '10.0'],
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
  })

  // 🔄 Reconexión automática solo si la sesión se cierra
  conn.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (reason === DisconnectReason.loggedOut) {
        console.log(chalk.red('🔴 Sesión cerrada. Borra /sessions y vuelve a vincular.'))
        process.exit(0)
      }
    } else if (connection === 'open') {
      console.log(chalk.greenBright('✅ Conectado a WhatsApp correctamente!\n'))
    }
  })

  // 💾 Guardar credenciales automáticamente
  conn.ev.on('creds.update', saveCreds)

  // 🔑 Generar código solo si no hay sesión
  if (!fs.existsSync(stateFile) && authMethod === 'pairing' && !conn.authState.creds.registered) {
    const cleanNumber = phoneNumber?.replace(/[^0-9]/g, '')
    if (!cleanNumber) {
      console.log(chalk.red('⚠️ No se encontró número en settings.js'))
      process.exit(1)
    }

    try {
      const code = await conn.requestPairingCode(cleanNumber)
      const instructions = '👉 En WhatsApp: Dispositivos vinculados → Introducir código'
      const termWidth = process.stdout.columns || 80

      let connected = false
      conn.ev.on('connection.update', ({ connection }) => {
        if (connection === 'open') connected = true
      })

      // 💡 Neón + contador 60s hasta conectar
      async function neonCountdownInfinite(text, duration = 60) {
        let remaining = duration
        while (!connected) {
          process.stdout.write('\x1b[2J\x1b[0f')
          console.log(chalk.hex('#00bfff').bold('='.repeat(termWidth)))
          console.log(chalk.hex('#00bfff').bold(text.padStart(Math.floor((termWidth + text.length)/2))))
          console.log(chalk.hex('#00bfff').bold(instructions.padStart(Math.floor((termWidth + instructions.length)/2))))
          console.log(chalk.hex('#00bfff').bold(`⏱️ Tiempo restante: ${remaining}s`.padStart(Math.floor((termWidth + (`⏱️ Tiempo restante: ${remaining}s`).length)/2))))
          console.log(chalk.hex('#00bfff').bold('='.repeat(termWidth)))
          await new Promise(r => setTimeout(r, 500))

          process.stdout.write('\x1b[2J\x1b[0f')
          console.log(chalk.white.bold('='.repeat(termWidth)))
          console.log(chalk.white.bold(text.padStart(Math.floor((termWidth + text.length)/2))))
          console.log(chalk.white.bold(instructions.padStart(Math.floor((termWidth + instructions.length)/2))))
          console.log(chalk.white.bold(`⏱️ Tiempo restante: ${remaining}s`.padStart(Math.floor((termWidth + (`⏱️ Tiempo restante: ${remaining}s`).length)/2))))
          console.log(chalk.white.bold('='.repeat(termWidth)))
          await new Promise(r => setTimeout(r, 500))

          remaining--
          if (remaining < 0) remaining = duration
        }

        process.stdout.write('\x1b[2J\x1b[0f')
        console.log(chalk.greenBright(`✅ Código ${text} ingresado correctamente. Bot listo!`))
      }

      await neonCountdownInfinite(code)
    } catch (err) {
      console.error(chalk.red('❌ Error al generar código de vinculación:'), err)
      process.exit(1)
    }
  }
}

// 🚀 Iniciar bot
startTokito()

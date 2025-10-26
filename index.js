// 🌫️ Tokito Muichiro Bot — index.js versión con contador 60s
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

  // 🌟 Inicio llamativo
  const title = `
╔════════════════════════════════╗
║ 🌫️  TOKITO-MUICHIRO BOT  🌫️ ║
╚════════════════════════════════╝
`
  console.log(chalk.hex('#00bfff').bold(title))

  // Animación de carga
  const loadingText = '⚡ Iniciando el bot, por favor espera '
  const loadingFrames = ['.  ', '.. ', '...']
  for (let i = 0; i < 6; i++) {
    process.stdout.write(chalk.hex('#00bfff').bold(`\r${loadingText}${loadingFrames[i % loadingFrames.length]}`))
    await new Promise(r => setTimeout(r, 400))
  }
  console.log('\n')

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

  // 🔁 Reconexión automática
  conn.ev.on('connection.update', ({ connection, lastDisconnect }) => {
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

  // 🔐 Código de vinculación solo una vez
  if (!global.globalCodeSent) global.globalCodeSent = false
  if (authMethod === 'pairing' && !conn.authState.creds.registered && !global.globalCodeSent) {
    const cleanNumber = phoneNumber?.replace(/[^0-9]/g, '')
    if (!cleanNumber) {
      console.log(chalk.red('⚠️ No se encontró número en settings.js'))
      process.exit(1)
    }

    try {
      const code = await conn.requestPairingCode(cleanNumber)
      global.globalCodeSent = true
      const instructions = '👉 En WhatsApp: Dispositivos vinculados → Introducir código'
      const termWidth = process.stdout.columns || 80

      // 💡 Función efecto neón con contador 60s
      let stopNeon = false
      conn.ev.on('connection.update', ({ connection }) => {
        if (connection === 'open') stopNeon = true
      })

      async function neonCountdown(text, duration = 60) {
        let remaining = duration
        while (!stopNeon && remaining >= 0) {
          // Celeste fuerte
          process.stdout.write('\x1b[2J\x1b[0f')
          console.log(chalk.hex('#00bfff').bold('='.repeat(termWidth)))
          console.log(chalk.hex('#00bfff').bold(text.padStart(Math.floor((termWidth + text.length)/2))))
          console.log(chalk.hex('#00bfff').bold(instructions.padStart(Math.floor((termWidth + instructions.length)/2))))
          console.log(chalk.hex('#00bfff').bold(`⏱️ Tiempo restante: ${remaining}s`.padStart(Math.floor((termWidth + (`⏱️ Tiempo restante: ${remaining}s`).length)/2))))
          console.log(chalk.hex('#00bfff').bold('='.repeat(termWidth)))
          await new Promise(r => setTimeout(r, 1000))
          remaining--

          // Blanco brillante alternando
          process.stdout.write('\x1b[2J\x1b[0f')
          console.log(chalk.white.bold('='.repeat(termWidth)))
          console.log(chalk.white.bold(text.padStart(Math.floor((termWidth + text.length)/2))))
          console.log(chalk.white.bold(instructions.padStart(Math.floor((termWidth + instructions.length)/2))))
          console.log(chalk.white.bold(`⏱️ Tiempo restante: ${remaining}s`.padStart(Math.floor((termWidth + (`⏱️ Tiempo restante: ${remaining}s`).length)/2))))
          console.log(chalk.white.bold('='.repeat(termWidth)))
          await new Promise(r => setTimeout(r, 1000))
        }

        // ✅ Una vez ingresado el código o tiempo terminado
        process.stdout.write('\x1b[2J\x1b[0f')
        if (stopNeon) {
          console.log(chalk.greenBright(`✅ Código ${text} ingresado correctamente. Bot listo!`))
        } else {
          console.log(chalk.yellowBright(`⚠️ Tiempo de espera agotado. Reconectando...`))
          setTimeout(startTokito, 3000)
        }
      }

      await neonCountdown(code, 60)

    } catch (err) {
      console.error(chalk.red('❌ Error al generar código de vinculación:'), err)
      process.exit(1)
    }
  }
}

startTokito()

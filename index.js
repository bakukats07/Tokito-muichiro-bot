// ─────────────────────────────────────────────
// TokitoBot | Base modular con Baileys MD
// by: Skycloud ✨
// ─────────────────────────────────────────────

import fs from "fs"
import path from "path"
import chalk from "chalk"
import { execSync } from "child_process"
import { fileURLToPath } from "url"
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys"
import Pino from "pino"
import { config } from "./config.js"
import { Boom } from "@hapi/boom"

// ─────────────────────────────────────────────
// 🧭 VARIABLES BASE
// ─────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const { prefix: PREFIX, owner: OWNER, botName, autoread, autoTyping } = config

// ─────────────────────────────────────────────
// 🧩 AUTO-CREAR CARPETAS NECESARIAS
// ─────────────────────────────────────────────
const folders = ["./session", "./plugins", "./lib", "./tmp", "./data"]
for (const dir of folders) if (!fs.existsSync(dir)) fs.mkdirSync(dir)
if (!fs.existsSync("./data/banned.json")) fs.writeFileSync("./data/banned.json", "[]")

// ─────────────────────────────────────────────
// 🔧 AUTO-INSTALADOR DE DEPENDENCIAS
// ─────────────────────────────────────────────
const pkg = ["@whiskeysockets/baileys", "chalk", "pino", "@hapi/boom"]
for (const p of pkg) {
  try {
    require.resolve(p)
  } catch {
    console.log(chalk.yellow(`📦 Instalando dependencia faltante: ${p}`))
    execSync(`npm install ${p}`, { stdio: "inherit" })
  }
}

// ─────────────────────────────────────────────
// 📂 CARGADOR DE PLUGINS
// ─────────────────────────────────────────────
const plugins = new Map()
const loadPlugins = () => {
  plugins.clear()
  const files = fs.readdirSync("./plugins").filter(f => f.endsWith(".js"))
  for (const file of files) {
    import(`./plugins/${file}?update=${Date.now()}`)
      .then(p => plugins.set(file, p.default))
      .catch(err => console.log(chalk.red(`❌ Error cargando ${file}:`), err))
  }
  console.log(chalk.green(`✅ ${plugins.size} plugins cargados.`))
}
loadPlugins()

// Reload automático si cambias un plugin
fs.watch("./plugins", (event, filename) => {
  if (filename && filename.endsWith(".js")) {
    console.log(chalk.yellow(`♻️ Plugin actualizado: ${filename}`))
    loadPlugins()
  }
})

// ─────────────────────────────────────────────
// 🤖 INICIO DEL BOT
// ─────────────────────────────────────────────
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session")

  const conn = makeWASocket({
    printQRInTerminal: true,
    auth: state,
    logger: Pino({ level: "silent" }),
    browser: [botName, "Chrome", "1.0.0"]
  })

  // Guardar sesión
  conn.ev.on("creds.update", saveCreds)

  // Manejo de desconexiones
  conn.ev.on("connection.update", async update => {
    const { connection, lastDisconnect } = update
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      console.log(chalk.red(`⚠️ Desconexión detectada — código: ${reason}`))
      if (reason !== DisconnectReason.loggedOut) {
        console.log(chalk.cyan("🔄 Reintentando conexión..."))
        startBot()
      } else {
        console.log(chalk.red("🔒 Sesión cerrada. Escanea el QR nuevamente."))
      }
    } else if (connection === "open") {
      console.log(chalk.green(`✅ ${botName} conectado exitosamente.`))
    }
  })

  // ─────────────────────────────────────────────
  // 💬 MANEJO DE MENSAJES
  // ─────────────────────────────────────────────
  conn.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const sender = msg.key.remoteJid
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      ""

    // ─────────────────────────────────────────────
    // 🏷️ DETECCIÓN DE PREFIJOS MÚLTIPLES
    // ─────────────────────────────────────────────
    const prefixes = Array.isArray(PREFIX) ? PREFIX : [PREFIX]
    const usedPrefix = prefixes.find(p => body.startsWith(p)) || null
    const isCmd = !!usedPrefix
    const command = isCmd ? body.slice(usedPrefix.length).trim().split(/ +/).shift().toLowerCase() : ""
    const args = body.trim().split(/ +/).slice(1)

    // Auto leer o escribir
    if (autoread) await conn.readMessages([msg.key])
    if (autoTyping) await conn.sendPresenceUpdate("composing", sender)

    if (!isCmd) return

    // Verificar si está baneado
    const banned = JSON.parse(fs.readFileSync("./data/banned.json"))
    if (banned.includes(sender)) return

    // ─────────────────────────────────────────────
    // ⚡ EJECUTAR PLUGIN CORRESPONDIENTE
    // ─────────────────────────────────────────────
    for (const [name, plugin] of plugins) {
      if (plugin.command?.includes(command)) {
        if (plugin.ownerOnly && !OWNER.includes(sender))
          return conn.sendMessage(sender, { text: "🚫 Solo el propietario puede usar este comando." })

        try {
          await plugin.run(msg, { conn, args, sender, usedPrefix, command })
        } catch (err) {
          console.error(chalk.red(`❌ Error en ${name}:`), err)
          conn.sendMessage(sender, { text: "⚠️ Error ejecutando comando." })
        }
        return
      }
    }
  })
}

startBot()

// ─────────────────────────────────────────────
// 🛡️ MANEJO GLOBAL DE ERRORES
// ─────────────────────────────────────────────
process.on("uncaughtException", err => {
  console.error(chalk.red("❌ Error no controlado:"), err)
})

process.on("unhandledRejection", err => {
  console.error(chalk.red("⚠️ Promesa rechazada sin capturar:"), err)
}) que 

// Auto reinicio en cambios del index
fs.watchFile(__filename, () => {
  console.log(chalk.yellow("♻️ Reiniciando el bot por cambios en index.js..."))
  process.exit()
})

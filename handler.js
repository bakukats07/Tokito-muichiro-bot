// ============================================================
// 🌀 Tokito Muichiro Bot - Handler Principal
// 🧠 Compatible con settings.js, roles, prefijos y estructura actual
// ============================================================

import { smsg } from "./lib/simple.js"
import { fileURLToPath } from "url"
import { join, dirname } from "path"
import fs, { watchFile, unwatchFile } from "fs"
import chalk from "chalk"
import fetch from "node-fetch"
import ws from "ws"
import { format } from "util"

// ────────────────────────────────────────────────
const isNumber = x => typeof x === "number" && !isNaN(x)
const delay = ms => new Promise(res => setTimeout(res, ms))

// ────────────────────────────────────────────────
export async function handler(chatUpdate) {
  this.msgqueque = this.msgqueque || []
  this.uptime = this.uptime || Date.now()
  if (!chatUpdate) return
  this.pushMessage(chatUpdate.messages).catch(console.error)
  
  let m = chatUpdate.messages?.[chatUpdate.messages.length - 1]
  if (!m) return
  if (!global.db?.data) await global.loadDatabase()
  try {
    m = smsg(this, m) || m
    if (!m || !m.sender) return
    m.exp = 0
    const user = global.db.data.users[m.sender] ??= {}
    const chat = global.db.data.chats[m.chat] ??= {}
    const settings = global.db.data.settings[this.user.jid] ??= {}

    // Valores predeterminados del usuario
    Object.assign(user, {
      name: user.name || m.pushName || await this.getName(m.sender),
      exp: user.exp ?? 0,
      coin: user.coin ?? 0,
      bank: user.bank ?? 0,
      level: user.level ?? 0,
      health: user.health ?? 100,
      genre: user.genre || "",
      marry: user.marry || "",
      description: user.description || "",
      premium: user.premium ?? false,
      premiumTime: user.premiumTime ?? 0,
      banned: user.banned ?? false,
      bannedReason: user.bannedReason || "",
      commands: user.commands ?? 0,
      warn: user.warn ?? 0,
      afk: user.afk ?? -1,
      afkReason: user.afkReason || "",
      role: user.role || "user", // Nueva propiedad de rol
    })

    // Valores predeterminados del chat
    Object.assign(chat, {
      isBanned: chat.isBanned ?? false,
      modoadmin: chat.modoadmin ?? false,
      antiLink: chat.antiLink ?? true,
      welcome: chat.welcome ?? false,
      nsfw: chat.nsfw ?? false,
      detect: chat.detect ?? true,
      gacha: chat.gacha ?? true,
      economy: chat.economy ?? true,
      primaryBot: chat.primaryBot || null
    })

    // Valores predeterminados globales
    Object.assign(settings, {
      self: settings.self ?? false,
      restrict: settings.restrict ?? true,
      gponly: settings.gponly ?? false,
      jadibotmd: settings.jadibotmd ?? true,
      antiPrivate: settings.antiPrivate ?? false
    })

    // ────────────────────────────────────────────────
    // Roles & permisos
    const isROwner = global.owner.map(v => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net").includes(m.sender)
    const isOwner = isROwner || m.fromMe
    const isPrem = user.premium === true
    const isSockers = global.sockers?.includes?.(m.sender)
    const isMods = global.mods?.includes?.(m.sender)
    const isAdmins = global.admins?.includes?.(m.sender)
    const isUser = !isOwner && !isPrem && !isMods && !isSockers

    const isAllowed = !settings.self || isOwner
    if (!isAllowed) return

    // ────────────────────────────────────────────────
    // Prefijos personalizados
    const prefixes = global.prefix || ["#", "/", ".", "!"]
    const strRegex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")
    const prefixRegex = new RegExp(`^(${prefixes.map(strRegex).join("|")})`, "i")

    if (!m.text) return
    const match = prefixRegex.exec(m.text)
    const usedPrefix = match ? match[0] : ""
    const noPrefix = m.text.slice(usedPrefix.length).trim()
    let [command, ...args] = noPrefix.split(" ")
    command = (command || "").toLowerCase()
    const text = args.join(" ")

    // ────────────────────────────────────────────────
    // Carga de plugins
    const ___dirname = join(dirname(fileURLToPath(import.meta.url)), "./plugins")

    for (const name in global.plugins) {
      const plugin = global.plugins[name]
      if (!plugin || plugin.disabled) continue

      // All handler global (por si el plugin escucha todo)
      if (typeof plugin.all === "function") {
        try {
          await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, user, chat, settings })
        } catch (e) {
          console.error(e)
        }
      }

      // Validación de comandos
      const isAccept =
        plugin.command instanceof RegExp
          ? plugin.command.test(command)
          : Array.isArray(plugin.command)
          ? plugin.command.some(cmd => (cmd instanceof RegExp ? cmd.test(command) : cmd === command))
          : plugin.command === command

      if (!isAccept) continue

      // ────────────────────────────────────────────────
      // Validación de roles
      const fail = plugin.fail || global.dfail
      const perms = {
        rowner: isROwner,
        owner: isOwner,
        sockers: isSockers,
        mods: isMods,
        prem: isPrem,
        group: m.isGroup,
        private: !m.isGroup
      }

      if (plugin.rowner && !perms.rowner) return fail("rowner", m, this)
      if (plugin.owner && !perms.owner) return fail("owner", m, this)
      if (plugin.sockers && !perms.sockers) return fail("sockers", m, this)
      if (plugin.mods && !perms.mods) return fail("mods", m, this)
      if (plugin.premium && !perms.prem) return fail("premium", m, this)
      if (plugin.group && !m.isGroup) return fail("group", m, this)
      if (plugin.private && m.isGroup) return fail("private", m, this)

      // ────────────────────────────────────────────────
      // Ejecución del plugin
      m.isCommand = true
      user.commands++
      try {
        await plugin.call(this, m, {
          conn: this,
          args,
          text,
          command,
          usedPrefix,
          user,
          chat,
          settings
        })
      } catch (e) {
        console.error(`❌ Error en ${name}:`, e)
        m.reply(`⚠️ Ocurrió un error en ${name}\n> ${e.message}`)
      }
    }
  } catch (err) {
    console.error(err)
  }
}

// ────────────────────────────────────────────────
// Mensajes de error según rol o permiso
global.dfail = (type, m, conn) => {
  const msg = {
    rowner: `🚫 El comando *${global.comando}* solo puede usarlo el *Creador Principal*.`,
    owner: `🚫 Solo los *desarrolladores* pueden usar *${global.comando}*.`,
    sockers: `🚫 Este comando es exclusivo para *Sockers*.`,
    mods: `🚫 Este comando es exclusivo para *Moderadores*.`,
    premium: `🚫 Este comando requiere *Usuario Premium*.`,
    group: `🚫 Este comando solo funciona en grupos.`,
    private: `🚫 Este comando solo funciona en chats privados.`,
  }[type]
  if (msg) return conn.reply(m.chat, msg, m).then(_ => m.react("✖️"))
}

// ────────────────────────────────────────────────
// Hot reload
let file = fileURLToPath(import.meta.url)
watchFile(file, async () => {
  unwatchFile(file)
  console.log(chalk.cyanBright("🔁 Se actualizó 'handler.js'"))
  if (global.reloadHandler) console.log(await global.reloadHandler())
})

// 📦 plugins/owner-update.js
// ─────────────────────────────────────────────
// Comando: update / fix / actualizar
// Función: Permite al owner actualizar el bot desde Git
// Autor: Tokito / skycloud
// ─────────────────────────────────────────────

import { execSync } from "child_process"
import chalk from "chalk"

const handler = async (m, { conn, text, sender }) => {
  const isROwner = global.config.owner?.includes(sender) || false
  if (!isROwner) return conn.sendMessage(m.chat, { text: "🚫 Solo el propietario puede usar este comando." })

  await conn.sendMessage(m.chat, { text: "🕒 *Procesando actualización...*" })

  try {
    // ─────────────────────────────────────────────
    // Ejecutar git pull
    // ─────────────────────────────────────────────
    const stdout = execSync("git pull" + (text ? " " + text : ""))
    let output = stdout.toString()

    if (output.includes("Already up to date")) output = "❀ Los datos ya están actualizados a la última versión."
    if (output.includes("Updating")) output = "ꕥ Procesando, espere un momento mientras me actualizo...\n\n" + stdout.toString()

    await conn.sendMessage(m.chat, { text: output })
    console.log(chalk.green("✅ Actualización completada correctamente."))
  } catch (err) {
    // ─────────────────────────────────────────────
    // Si falla el git pull, revisar conflictos
    // ─────────────────────────────────────────────
    try {
      const status = execSync("git status --porcelain")
      if (status.length > 0) {
        const conflictedFiles = status
          .toString()
          .split("\n")
          .filter(line => line.trim() !== "")
          .map(line => {
            if (
              line.includes(".npm/") ||
              line.includes(".cache/") ||
              line.includes("tmp/") ||
              line.includes("database.json") ||
              line.includes("sessions/Principal/") ||
              line.includes("npm-debug.log")
            ) return null
            return "→ *" + line.slice(3) + "*"
          })
          .filter(Boolean)

        if (conflictedFiles.length > 0) {
          const errorMessage = `⚠️ *No se pudo realizar la actualización:*\n\n> Se han encontrado *cambios locales* que entran en conflicto con las nuevas actualizaciones del repositorio.\n\n${conflictedFiles.join("\n")}`
          await conn.sendMessage(m.chat, { text: errorMessage })
          return
        }
      }
    } catch (innerErr) {
      console.error(chalk.red("❌ Error interno en update:"), innerErr)
    }

    // ─────────────────────────────────────────────
    // Error general
    // ─────────────────────────────────────────────
    let msg = "⚠️ Ocurrió un error inesperado al intentar actualizar.\n"
    if (err.message) msg += "\n🧩 *Error:* " + err.message
    await conn.sendMessage(m.chat, { text: msg })
  }
}

handler.help = ["update", "fix", "actualizar"]
handler.tags = ["owner"]
handler.command = ["update", "fix", "actualizar"]
handler.ownerOnly = true

export default handler

async function downloadVideo(url, isAudio, m, conn) {
  try {
    const tmpBase = path.join(tmpDir, `${Date.now()}`)
    const output = isAudio ? `${tmpBase}.opus` : `${tmpBase}.mp4`

    // 🕓 Estado inicial: esperando proceso
    let statusMsg = await conn.sendMessage(m.chat, { text: '⏳' }, { quoted: m })

    // 📸 Miniatura del bot (cacheada)
    let botThumb = cachedBotThumb
    if (!botThumb) {
      try {
        const botPicUrl = await conn.profilePictureUrl(conn.user.jid, 'image')
        const res = await fetch(botPicUrl)
        botThumb = Buffer.from(await res.arrayBuffer())
        cachedBotThumb = botThumb
      } catch { botThumb = null }
    }

    const baseArgs = ['--no-warnings', '--no-progress', '--no-call-home', '--no-check-certificate']

    if (isAudio) {
      const args = [
        ...baseArgs,
        '-f', 'bestaudio[ext=webm][abr<=128]',
        '--extract-audio', '--audio-format', 'opus',
        '-o', output,
        url
      ]

      await runYtDlp(args)

      if (!fs.existsSync(output) || fs.statSync(output).size === 0) return m.reply('⚠️ No se pudo descargar el audio.')

      // ✅ Estado final: proceso completado
      await conn.sendMessage(m.chat, { text: '✅' }, { quoted: statusMsg })

      await conn.sendMessage(m.chat, {
        audio: { url: output },
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
        contextInfo: { externalAdReply: getExternalAdReply('🎧 Audio descargado', `MλÐɆ ƗN 스카이클라우드${CREATOR_SIGNATURE}`, botThumb) }
      }, { quoted: m })

      setTimeout(() => { try { fs.unlinkSync(output) } catch {} }, 30000)

    } else {
      const args = [
        ...baseArgs,
        '-f', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/mp4',
        '-o', output,
        url
      ]

      await runYtDlp(args)

      if (!fs.existsSync(output) || fs.statSync(output).size === 0) return m.reply('⚠️ No se pudo descargar el video.')

      // ✅ Estado final: proceso completado
      await conn.sendMessage(m.chat, { text: '✅' }, { quoted: statusMsg })

      const title = path.basename(output).replace(/\.[^/.]+$/, '')

      await conn.sendMessage(m.chat, {
        video: { url: output },
        caption: `🎬 ${title}\nDescargado con yt-dlp${CREATOR_SIGNATURE}`,
        contextInfo: { externalAdReply: getExternalAdReply(title, 'Tu bot siempre activo 🎵', botThumb) }
      }, { quoted: m })

      setTimeout(() => { try { fs.unlinkSync(output) } catch {} }, 30000)
    }

  } catch (err) {
    console.error('⚠️ Error inesperado:', err)
    m.reply('⚠️ No se pudo descargar este video. Prueba con otro enlace o título.')
  }
          }

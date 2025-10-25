process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'

// Imports básicos
import './settings.js'
import './plugins/_allfake.js'
import cfonts from 'cfonts'
import { createRequire } from 'module'
import { fileURLToPath, pathToFileURL } from 'url'
import { platform } from 'process'
import * as ws from 'ws'
import fs, { readdirSync, unlinkSync, existsSync, mkdirSync, watch } from 'fs'
import yargs from 'yargs'
import { spawn } from 'child_process'
import lodash from 'lodash'
import chalk from 'chalk'
import syntaxerror from 'syntax-error'
import pino from 'pino'
import path, { join } from 'path'
import { Boom } from '@hapi/boom'
import { makeWASocket, protoType, serialize } from './lib/simple.js'
import { Low, JSONFile } from 'lowdb'
import store from './lib/store.js'
import { yukiJadiBot } from './plugins/sockets-serbot.js'
import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()
const { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser } = await import('@whiskeysockets/baileys')
import readline from 'readline'
import NodeCache from 'node-cache'

// Proto + serialize helpers
protoType()
serialize()

// Colores y estilo de consola
cfonts.say('Tokito Muichiro', { font: 'simple', align: 'left', gradient: ['green','white'] })
cfonts.say('Made with love by Destroy', { font: 'console', align: 'center', colors: ['cyan','magenta','yellow'] })

// Globals: paths y require helpers
global.__filename = (pathURL = import.meta.url, rmPrefix = platform !== 'win32') => rmPrefix 
    ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL 
    : pathToFileURL(pathURL).toString()

global.__dirname = pathURL => path.dirname(global.__filename(pathURL, true))
global.__require = dir => createRequire(dir)

// Globals: options y prefix
global.opts = yargs(process.argv.slice(2)).exitProcess(false).parse()
global.prefix = new RegExp('^[#!./-]')

// DB
global.db = new Low(new JSONFile('database.json'))
global.DATABASE = global.db
global.loadDatabase = async () => {
  if(global.db.READ) return new Promise(resolve => setInterval(async function(){
    if(!global.db.READ){ clearInterval(this); resolve(global.db.data ?? global.loadDatabase()) }
  },1000))
  if(global.db.data) return
  global.db.READ = true
  await global.db.read().catch(console.error)
  global.db.READ = null
  global.db.data = { users:{}, chats:{}, settings:{}, ...(global.db.data || {}) }
  global.db.chain = lodash.chain(global.db.data)
}
await global.loadDatabase()

// Auth state Baileys
const { state, saveState, saveCreds } = await useMultiFileAuthState('sessions')

// Cachés
const msgRetryCounterCache = new NodeCache({ stdTTL:0, checkperiod:0 })
const userDevicesCache = new NodeCache({ stdTTL:0, checkperiod:0 })

// Fetch latest Baileys version
const { version } = await fetchLatestBaileysVersion()

// Readline y opciones de login
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (txt) => new Promise(res => rl.question(txt,res))

let opcion
const methodCodeQR = process.argv.includes('qr')
const methodCode = !!global.botNumber || process.argv.includes('code')
if(methodCodeQR) opcion = '1'

// Función principal para conectar el bot
async function startBot(){
  let phoneNumber = global.botNumber

  if(!fs.existsSync('./sessions/creds.json')){
    if(!methodCodeQR && !methodCode){
      do{
        opcion = await question(chalk.bold.white('Seleccione opción:\n1. QR\n2. Código de 8 dígitos\n--> '))
      }while(!/^[1-2]$/.test(opcion))
    }
  }

  // Configuración conexión
  const connOptions = {
    logger: pino({ level:'silent' }),
    printQRInTerminal: opcion=='1',
    browser: ['MacOs','Safari'],
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level:'fatal' }).child({ level:'fatal' })) },
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    msgRetryCounterCache,
    userDevicesCache,
    version,
    getMessage: async key => { try { let jid = jidNormalizedUser(key.remoteJid); let msg = await store.loadMessage(jid,key.id); return msg?.message||'' } catch { return '' } },
  }

  global.conn = makeWASocket(connOptions)
  conn.ev.on('creds.update', saveCreds)

  // Events
  conn.handler = (await import('./handler.js')).default.bind(global.conn)
  conn.ev.on('messages.upsert', conn.handler)
  conn.ev.on('connection.update', connectionUpdate)
  conn.ev.on('creds.update', saveCreds)

  console.log(chalk.green('[Bot] Conectado'))
}
await startBot()

// Conexión y reconexión
async function connectionUpdate(update){
  const { connection, lastDisconnect, isNewLogin } = update
  if(isNewLogin) conn.isInit = true
  if(connection==='close'){
    const code = lastDisconnect?.error?.output?.statusCode
    if([401,440,428,405].includes(code)) console.log(chalk.red(`[Bot] Cierra la sesión principal`))
    console.log(chalk.yellow('[Bot] Reconectando...'))
    await global.reloadHandler(true)
  }
}

// Helpers: limpieza TMP
setInterval(() => {
  const tmpDir = join(global.__dirname(import.meta.url),'tmp')
  if(!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir,{recursive:true})
  readdirSync(tmpDir).forEach(f=>unlinkSync(join(tmpDir,f)))
}, 30*1000)

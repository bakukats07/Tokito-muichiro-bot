import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import fs from 'fs'

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

//BETA: Si quiere evitar escribir el número que será bot en la consola, agregué desde aquí entonces:
//Sólo aplica para opción 2 (ser bot con código de texto de 8 digitos)
global.botNumber = '' //Ejemplo: 573218138672

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

global.owner = [
'573004828388'
]

global.suittag = ['573004828388' ] 
global.prems = []

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

global.libreria = 'Baileys Multi Device' 
global.vs = '1.0.0' 
global.nameqr = 'Muichiro-MD'
global.sessions = 'Sessions/Principal'
global.jadi = 'Sessions/SubBot'
global.yukiJadibts = true

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

global.botname = 'Muichiro-MD'
global.textbot = 'Muichiro, mᥲძᥱ ᥕі𝗍һ ᑲᥡ skycloud' 
global.dev = '© ⍴᥆ᥕᥱrᥱძ ᑲᥡ skycloud'
global.author = '© mᥲძᥱ ᥕі𝗍һ ᑲᥡ skycloud'
global.etiqueta = 'Skycloud'
global.currency = '¥enes'
global.banner = 'https://github.com/bakukats07/Mis-Imagenes/raw/main/c6c24dc91a5befb5e6a58e23163ce5f4.jpg'
global.icono = 'https://raw.githubusercontent.com/The-King-Destroy/Adiciones/main/Contenido/1742678797993.jpeg'
global.catalogo = fs.readFileSync('./lib/catalogo.jpg')

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

global.group = 'https://chat.whatsapp.com/E7foYUiRVDQ4FSRwolDNzG?mode=wwt'
global.community = 'https://chat.whatsapp.com/ECZeU9ipYKlIeTxzdjvtgW?mode=wwt'
global.channel = 'https://whatsapp.com/channel/0029VbBFWP0Lo4hgc1cjlC0M'
global.github = 'https://bakukats07/Tokito-muichiro-bot'
global.gmail = 'thekingdestroy507@gmail.com'
global.ch = {
ch1: '120363401404146384@newsletter'
}

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

global.APIs = {
xyro: { url: 'https://xyro.site' , key: null },
yupra: { url: 'https://api.yupra.my.id' , key: null },
vreden: { url: 'https://api.vreden.web.id' , key: null },
delirius: { url: 'https://api.delirius.store' , key: null },
zenzxz: { url: 'https://api.zenzxz.my.id' , key: null },
siputzx: { url: 'https://api.siputzx.my.id' , key: null }
}

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
unwatchFile(file)
console.log(chalk.redBright("Update 'settings.js'"))
import(`${file}?update=${Date.now()}`)
})

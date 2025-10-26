#!/data/data/com.termux/files/usr/bin/bash
# 🌫️ Tokito Muichiro Bot — Script de arranque Termux con logs y control de errores

clear
echo "🌫️ Iniciando Tokito Muichiro Bot..."
echo "─────────────────────────────────────"
echo

# ──────────────── 1️⃣ CONFIGURACIÓN ────────────────
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/termux.log"
mkdir -p "$LOG_DIR"

log() {
  echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# ──────────────── 2️⃣ VERIFICAR HERRAMIENTAS ────────────────
for pkg in nodejs-lts git ffmpeg; do
  if ! command -v ${pkg%%-*} &> /dev/null; then
    log "⚠️ Instalando dependencia del sistema: $pkg"
    pkg install $pkg -y
  fi
done

# ──────────────── 3️⃣ CREAR CARPETAS ────────────────
for folder in tmp sessions plugins lib; do
  if [ ! -d "$folder" ]; then
    mkdir -p "$folder"
    log "📁 Carpeta creada: $folder"
  fi
done

# ──────────────── 4️⃣ DEPENDENCIAS NODE ────────────────
log "📦 Verificando dependencias npm..."
npm install --no-fund --no-audit > /dev/null 2>&1
log "✅ Dependencias actualizadas."

# ──────────────── 5️⃣ INFORMACIÓN DEL SISTEMA ────────────────
log "📡 Entorno: Termux"
log "💻 Node.js: $(node -v)"
log "📂 Carpeta actual: $(pwd)"
echo "──────────────────────────────"
echo

# ──────────────── 6️⃣ DETECTAR SESIÓN ────────────────
if [ -d "sessions" ] && [ "$(ls -A sessions)" ]; then
  MODE="normal"
  log "🔑 Sesión detectada: inicio normal."
else
  echo "🔐 No se detectó sesión activa."
  echo
  echo "Elige el modo de conexión:"
  echo "  1️⃣ Escanear código QR"
  echo "  2️⃣ Ingresar código de 8 dígitos"
  echo
  read -p "👉 Escribe 1 o 2 y presiona Enter: " OPCION
  if [ "$OPCION" = "2" ]; then
    MODE="codigo"
  else
    MODE="normal"
  fi
fi

# ──────────────── 7️⃣ FUNCIÓN PRINCIPAL ────────────────
while true; do
  echo
  log "🚀 Iniciando el bot en modo: ${MODE^^}"

  if [ "$MODE" = "codigo" ]; then
    node index.js --code 2>&1 | tee -a "$LOG_FILE"
  else
    node index.js 2>&1 | tee -a "$LOG_FILE"
  fi

  EXIT_CODE=${PIPESTATUS[0]}
  if [ $EXIT_CODE -eq 0 ]; then
    log "🟢 El bot finalizó correctamente."
    break
  else
    log "❌ El bot se cerró con error (código $EXIT_CODE)."
    log "🪶 Últimos errores del registro:"
    tail -n 10 "$LOG_FILE"
    echo
    echo "⚠️ El bot se detuvo inesperadamente."
    echo
    read -p "👉 ¿Deseas reiniciar (r) o salir (s)? " OPCION
    case "$OPCION" in
      [Rr]* ) log "🔁 Reiniciando en 3 segundos..."; sleep 3 ;;
      [Ss]* ) log "👋 Bot detenido manualmente."; exit 0 ;;
      * ) log "❓ Opción no válida, reiniciando por defecto en 5 segundos..."; sleep 5 ;;
    esac
  fi
done

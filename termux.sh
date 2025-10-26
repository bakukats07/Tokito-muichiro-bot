# ==========================================================
# 🌀 Tokito Muichiro Bot - Gestor interactivo Termux
# 💻 Autor original: @gata_dios | Remodelado por ChatGPT
# 🧩 Con modo automático para arranque directo
# ==========================================================

#!/data/data/com.termux/files/usr/bin/bash
BOT_DIR="Tokito-muichiro-bot"
BOT_REPO="https://github.com/bakukats07/Tokito-muichiro-bot.git"
DB_FILE="database.json"

GREEN='\033[32m'
RED='\033[31m'
YELLOW='\033[33m'
BOLD='\033[1m'
RESET='\033[0m'

# ────────────────────────────────────────────────
check_dependencies() {
  echo -e "${YELLOW}🔍 Verificando dependencias...${RESET}"
  for pkg in git nodejs yarn; do
    if ! command -v $pkg >/dev/null 2>&1; then
      echo -e "${RED}❌ $pkg no está instalado. Instalando...${RESET}"
      pkg install -y $pkg
    else
      echo -e "${GREEN}✅ $pkg instalado.${RESET}"
    fi
  done
}

# ────────────────────────────────────────────────
clone_bot() {
  echo -e "${GREEN}🌐 Clonando el repositorio...${RESET}"
  cd "$HOME" || exit 1
  rm -rf "$BOT_DIR"
  git clone "$BOT_REPO" "$BOT_DIR" || {
    echo -e "${RED}❌ Error al clonar el repositorio.${RESET}"
    exit 1
  }
  cd "$BOT_DIR" || exit 1
  echo -e "${GREEN}📦 Instalando dependencias...${RESET}"
  yarn --ignore-scripts && npm install
}

# ────────────────────────────────────────────────
update_bot() {
  if [ -d "$HOME/$BOT_DIR" ]; then
    echo -e "${GREEN}♻️ Actualizando $BOT_DIR...${RESET}"
    cd "$HOME/$BOT_DIR" || exit 1
    git pull
    echo -e "${GREEN}📦 Reinstalando dependencias...${RESET}"
    yarn --ignore-scripts && npm install
  else
    echo -e "${RED}⚠️ No se encontró $BOT_DIR. Clonando...${RESET}"
    clone_bot
  fi
}

# ────────────────────────────────────────────────
start_bot() {
  if [ ! -d "$HOME/$BOT_DIR" ]; then
    echo -e "${RED}⚠️ El bot no está instalado. Clonando primero...${RESET}"
    clone_bot
  fi
  cd "$HOME/$BOT_DIR" || exit 1
  echo -e "${GREEN}🚀 Iniciando Tokito Muichiro Bot...${RESET}"
  npm start
}

# ────────────────────────────────────────────────
backup_db() {
  if [ -f "$HOME/$BOT_DIR/$DB_FILE" ]; then
    mv "$HOME/$BOT_DIR/$DB_FILE" "$HOME/"
    echo -e "${GREEN}💾 Base de datos respaldada en $HOME.${RESET}"
  else
    echo -e "${RED}⚠️ No se encontró $DB_FILE dentro de $BOT_DIR.${RESET}"
  fi
}

# ────────────────────────────────────────────────
restore_db() {
  if [ -f "$HOME/$DB_FILE" ]; then
    mv "$HOME/$DB_FILE" "$HOME/$BOT_DIR/"
    echo -e "${GREEN}📁 Base de datos restaurada al bot.${RESET}"
  else
    echo -e "${RED}⚠️ No hay $DB_FILE en $HOME.${RESET}"
  fi
}

# ────────────────────────────────────────────────
auto_mode() {
  echo -e "${BOLD}${YELLOW}⚙️  Modo automático activado...${RESET}"
  check_dependencies
  update_bot
  restore_db
  start_bot
}

# ────────────────────────────────────────────────
show_menu() {
  clear
  echo -e "${BOLD}${GREEN}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🌀 TOKITO MUICHIRO BOT - PANEL TERMUX"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
  echo "1️⃣  Instalar Bot"
  echo "2️⃣  Actualizar Bot"
  echo "3️⃣  Iniciar Bot"
  echo "4️⃣  Respaldar Base de Datos"
  echo "5️⃣  Restaurar Base de Datos"
  echo "6️⃣  Salir"
  echo ""
  echo -ne "${YELLOW}Selecciona una opción [1-6]: ${RESET}"
  read -r opcion
  echo ""

  case $opcion in
    1) check_dependencies && clone_bot && restore_db ;;
    2) update_bot ;;
    3) start_bot ;;
    4) backup_db ;;
    5) restore_db ;;
    6) echo -e "${GREEN}👋 Saliendo del panel...${RESET}"; exit 0 ;;
    *) echo -e "${RED}❌ Opción inválida.${RESET}" ;;
  esac

  echo ""
  read -p "Presiona ENTER para volver al menú..." temp
  show_menu
}

# ────────────────────────────────────────────────
# 🏁 Arranque: detecta si usar modo automático o menú
if [ "$1" = "auto" ]; then
  auto_mode
else
  check_dependencies
  show_menu
fi

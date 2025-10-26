# ==========================================================
# 🌀 Tokito Muichiro Bot - Instalador y Lanzador Automático
# 💻 Autor original: skycloud
# ==========================================================

#!/data/data/com.termux/files/usr/bin/bash
BOT_DIR="Tokito-muichiro-bot"
BOT_REPO="https://github.com/bakukats07/Tokito-muichiro-bot.git"
DB_FILE="database.json"

# ===== 🎨 Colores y estilo =====
GREEN='\033[32m'
RED='\033[31m'
YELLOW='\033[33m'
CYAN='\033[36m'
BOLD='\033[1m'
RESET='\033[0m'

clear
echo -e "${CYAN}${BOLD}"
echo "╔════════════════════════════════════════╗"
echo "║      🌀 TOKITO MUICHIRO BOT v1.8.2      ║"
echo "║        Instalador Automático Termux     ║"
echo "╚════════════════════════════════════════╝"
echo -e "${RESET}"

# ==========================================
# ⚙️ Verificación de dependencias básicas
# ==========================================
check_and_install() {
  local pkg=$1
  if ! command -v "$pkg" &> /dev/null; then
    echo -e "${YELLOW}⚙️ Instalando ${pkg}...${RESET}"
    pkg install -y "$pkg" || {
      echo -e "${RED}❌ Error instalando ${pkg}.${RESET}"
      exit 1
    }
  else
    echo -e "${GREEN}✅ ${pkg} ya está instalado.${RESET}"
  fi
}

echo -e "${BOLD}${GREEN}🔍 Verificando dependencias...${RESET}"
for p in git nodejs yarn; do
  check_and_install "$p"
done

# ==========================================
# 🗂️ Preparación del entorno del bot
# ==========================================
cd "$HOME" || exit 1

if [ -d "$BOT_DIR" ]; then
  echo -e "${YELLOW}📂 Carpeta $BOT_DIR encontrada. Actualizando...${RESET}"
  cd "$BOT_DIR" || exit 1

  # Backup de la base de datos si existe
  if [ -f "$DB_FILE" ]; then
    echo -e "${YELLOW}💾 Guardando base de datos temporalmente...${RESET}"
    mv "$DB_FILE" "$HOME/"
  fi

  cd "$HOME"
  rm -rf "$BOT_DIR"
else
  echo -e "${GREEN}🆕 No existe carpeta del bot, clonando nueva...${RESET}"
fi

# ==========================================
# 📦 Clonación del repositorio
# ==========================================
echo -e "${CYAN}🌐 Clonando repositorio desde GitHub...${RESET}"
git clone "$BOT_REPO" "$BOT_DIR" || {
  echo -e "${RED}❌ Error al clonar el repositorio.${RESET}"
  exit 1
}

cd "$BOT_DIR" || exit 1

# ==========================================
# 🧩 Instalación de dependencias
# ==========================================
echo -e "${GREEN}📦 Instalando dependencias...${RESET}"
yarn --ignore-scripts && npm install

# ==========================================
# 💾 Restaurar base de datos (si existe)
# ==========================================
if [ -f "$HOME/$DB_FILE" ]; then
  echo -e "${GREEN}📁 Restaurando base de datos...${RESET}"
  mv "$HOME/$DB_FILE" "$BOT_DIR/"
fi

# ==========================================
# 🚀 Inicio del bot
# ==========================================
echo -e "${BOLD}${GREEN}✅ Instalación completada. Iniciando Tokito Muichiro Bot...${RESET}"
npm start

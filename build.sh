#!/usr/bin/env bash

# Автоматизированный сборщик расширения tSearch под Manifest V3
# Среда выполнения: MSYS2 (UCRT64) с автоматической загрузкой оригинальных иконок

# Завершать выполнение при критических ошибках
set -e

# ==============================================================================
# БЛОК 1: КОНСТАНТЫ, НАСТРОЙКИ И ПАРСИНГ АРГУМЕНТОВ
# ==============================================================================
EXTENSION_NAME="tSearch-MV3"
OUTPUT_DIR="build_dist"
ZIP_FILE="${OUTPUT_DIR}/${EXTENSION_NAME}.zip"
CRX_FILE="${OUTPUT_DIR}/${EXTENSION_NAME}.crx"
PEM_FILE="${EXTENSION_NAME}.pem"

# Определение целевой ОС из аргументов командной строки (по умолчанию windows)
TARGET_OS="${1:-windows}"
TARGET_OS=$(echo "$TARGET_OS" | tr '[:upper:]' '[:lower:]')

# Цвета для красивого вывода в консоль MSYS2
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Ссылки на оригинальные иконки бинокля из репозитория
URL_ICON16="https://raw.githubusercontent.com/Feverqwe/tSearch/master/src/assets/img/icon_16.png"
URL_ICON48="https://raw.githubusercontent.com/Feverqwe/tSearch/master/src/assets/img/icon_48.png"
URL_ICON128="https://raw.githubusercontent.com/Feverqwe/tSearch/master/src/assets/img/icon_128.png"

# ==============================================================================
# БЛОК 2: ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (ОБЩИЙ ЛОГИЧЕСКИЙ БЛОК)
# ==============================================================================

# Валидация переданного аргумента целевой ОС
validate_arguments() {
    if [[ "$TARGET_OS" != "windows" && "$TARGET_OS" != "linux" ]]; then
        echo -e "${RED}Критическая ошибка: Неверная целевая архитектура '${TARGET_OS}'!${NC}"
        echo -e "${YELLOW}Допустимые аргументы: 'windows' или 'linux' (Пример: ./build.sh linux)${NC}"
        exit 1
    fi
}

# Проверка и интерактивная установка системных пакетов MSYS2
check_and_install_dependencies() {
    local missing_packages=()
    echo -e "${BLUE}[1/7] Проверка системных зависимостей...${NC}"
    
    if ! command -v zip &> /dev/null; then missing_packages+=("zip"); fi
    if ! command -v openssl &> /dev/null; then missing_packages+=("openssl"); fi
    if ! command -v curl &> /dev/null; then missing_packages+=("curl"); fi

    if [ ${#missing_packages[@]} -ne 0 ]; then
        echo -e "${YELLOW}В системе отсутствуют необходимые пакеты: ${missing_packages[*]}${NC}"
        read -p "Хотите установить их автоматически через pacman прямо сейчас? (y/n): " confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            local pacman_packages=()
            for pkg in "${missing_packages[@]}"; do
                pacman_packages+=("mingw-w64-ucrt-x86_64-${pkg}")
            done
            pacman -S "${pacman_packages[@]}" --noconfirm
            echo -e "${GREEN}✔ Все пакеты успешно установлены.${NC}"
        else
            echo -e "${RED}Ошибка: Сборка невозможна без утилит ${missing_packages[*]}.${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✔ Все системные утилиты (zip, openssl, curl) уже установлены.${NC}"
    fi
}

# Автоматическое создание папки icons и загрузка графических ресурсов из сети
download_icons_if_missing() {
    echo -e "${BLUE}[2/7] Синхронизация графических ресурсов (иконок)...${NC}"
    
    # Автоматическое создание целевой папки
    if [ ! -d "icons" ]; then
        mkdir -p icons
        echo "Папка 'icons/' успешно создана."
    fi

    # Скачивание иконки 16x16
    if [ ! -f "icons/icon16.png" ]; then
        echo "Загрузка icon16.png..."
        curl -sS -L -o icons/icon16.png "$URL_ICON16"
    fi

    # Скачивание иконки 48x48
    if [ ! -f "icons/icon48.png" ]; then
        echo "Загрузка icon48.png..."
        curl -sS -L -o icons/icon48.png "$URL_ICON48"
    fi

    # Скачивание иконки 128x128
    if [ ! -f "icons/icon128.png" ]; then
        echo "Загрузка icon128.png..."
        curl -sS -L -o icons/icon128.png "$URL_ICON128"
    fi

    echo -e "${GREEN}✔ Все иконки успешно синхронизированы в папку icons/.${NC}"
}

# Валидация структуры текстовых и программных файлов плагина tSearch
validate_project_structure() {
    echo -e "${BLUE}[3/7] Проверка структуры кода расширения...${NC}"
    local required_files=("manifest.json" "background.js" "trackerRegistry.js" "trackerParsers.js" "search.html" "search.js" "popup.html" "popup.js")

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}Критическая ошибка: Файл '${file}' не найден! Запуск должен быть из корня проекта.${NC}"
            exit 1
        fi
    done
    echo -e "${GREEN}✔ Структура кода проекта подтверждена.${NC}"
}

# Поиск исполняемого файла Google Chrome в зависимости от выбранной ОС
find_chrome_binary() {
    local paths=()
    if [ "$TARGET_OS" == "windows" ]; then
        paths=(
            "/c/Program Files/Google/Chrome/Application/chrome.exe"
            "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
            "/c/Users/$USER/AppData/Local/Google/Chrome/Application/chrome.exe"
            "/c/Program Files/Yandex/YandexBrowser/Application/browser.exe"
        )
    elif [ "$TARGET_OS" == "linux" ]; then
        paths=(
            "/usr/bin/google-chrome"
            "/usr/bin/chrome"
            "/usr/bin/chromium"
            "/usr/bin/chromium-browser"
        )
    fi

    for path in "${paths[@]}"; do
        if [ -f "$path" ]; then echo "$path"; return 0; fi
    done
    echo ""
}

# Подготовка выходной директории
prepare_build_directory() {
    if [ -d "$OUTPUT_DIR" ]; then rm -rf "$OUTPUT_DIR"; fi
    mkdir -p "$OUTPUT_DIR"
}

# Проверка или генерация RSA-ключа подписи (.pem) на уровень ВЫШЕ папки расширения
handle_digital_signature() {
    echo -e "${BLUE}[5/7] Проверка цифровой подписи...${NC}"
    
    # Миграция: если старый pem-файл лежал внутри расширения, перемещаем его наружу
    if [ ! -f "../$PEM_FILE" ] && [ -f "$PEM_FILE" ]; then
        mv "$PEM_FILE" "../$PEM_FILE"
    fi
    
    if [ ! -f "../$PEM_FILE" ]; then
        echo "Закрытый ключ не найден. Генерация нового приватного RSA-ключа в родительской папке..."
        openssl genrsa -out "../$PEM_FILE" 2048 > /dev/null 2>&1
        echo -e "${GREEN}✔ Создан уникальный ключ подписи: ../${PEM_FILE}${NC}"
    else
        echo -e "${GREEN}✔ Обнаружен существующий ключ подписи ../${PEM_FILE}.${NC}"
    fi
}

# ==============================================================================
# БЛОК 3: ОСНОВНОЙ КОНВЕЙЕР СБОРКИ (MAIN EXECUTION)
# ==============================================================================

main() {
    validate_arguments
    echo -e "${YELLOW}=== СТАРТ СБОРКИ ${EXTENSION_NAME} ДЛЯ АРХИТЕКТУРЫ: ${TARGET_OS^^} ===${NC}"
    
    # Шаги проверок общего кода и автоматической загрузки ассетов
    check_and_install_dependencies
    download_icons_if_missing
    validate_project_structure
    prepare_build_directory

    # Этап генерации ZIP-архива для Chrome Web Store
    echo -e "${BLUE}[4/7] Упаковка исходного кода в ZIP-архив...${NC}"
    zip -r "$ZIP_FILE" . -x "build.sh" "build_dist/*" "*.pem" "../*.pem" "*.git*" "*.DS_Store*" > /dev/null
    echo -e "${GREEN}✔ ZIP-архив успешно создан: ${ZIP_FILE}${NC}"

    # Настройка цифровой подписи
    handle_digital_signature

    # Этап поиска компилятора под целевую ОС
    local chrome_bin
    chrome_bin=$(find_chrome_binary)

    if [ -z "$chrome_bin" ]; then
        echo -e "${YELLOW}[Предупреждение] Браузер под архитектуру ${TARGET_OS^^} не найден в стандартных путях.${NC}"
        echo -e "${YELLOW}Компиляция файла .crx пропущена. Используйте сгенерированный .zip архив.${NC}"
        echo -e "${GREEN}=== Сборка успешно завершена (Только ZIP) ===${NC}"
        exit 0
    fi

    # Кросс-платформенная компиляция и подписание пакета CRX через CLI браузера
    echo -e "${BLUE}[6/7] Подписание и компиляция пакета CRX под архитектуру ${TARGET_OS^^}...${NC}"
    
    local abs_extension_dir
    local abs_pem_file

    if [ "$TARGET_OS" == "windows" ]; then
        abs_extension_dir=$(pwd -W)
        # Получаем нативный Windows-путь к PEM, который лежит уровнем выше
        cd ..
        abs_pem_file="$(pwd -W)/${PEM_FILE}"
        cd "$abs_extension_dir"
    else
        abs_extension_dir=$(pwd)
        abs_pem_file="$(dirname "$abs_extension_dir")/${PEM_FILE}"
    fi

    # Программный запуск сборщика выбранной ОС без открытия графического окна браузера
    "$chrome_bin" --pack-extension="${abs_extension_dir}" --pack-extension-key="${abs_pem_file}" --no-message-box > /dev/null 2>&1 || true

    # Даем Windows 800мс на то, чтобы файловая система успела физически записать данные на диск
    sleep 0.8

    # Валидация результатов упаковки
    echo -e "${BLUE}[7/7] Проверка результатов компиляции...${NC}"
    
    # На всякий случай проверяем наличие файла в корневой директории
    if [ -f "${EXTENSION_NAME}.crx" ]; then
        mv "${EXTENSION_NAME}.crx" "$CRX_FILE"
        echo -e "${GREEN}✔ Финальный бинарный пакет CRX под ${TARGET_OS^^} успешно собран: ${CRX_FILE}${NC}"
    elif [ -f "../${EXTENSION_NAME}.crx" ]; then
        # Иногда нативный Chrome складывает файл рядом с .pem ключом на уровень выше
        mv "../${EXTENSION_NAME}.crx" "$CRX_FILE"
        echo -e "${GREEN}✔ Финальный бинарный пакет CRX под ${TARGET_OS^^} успешно собран: ${CRX_FILE}${NC}"
    else
        echo -e "${RED}Ошибка: Браузеру под ${TARGET_OS^^} не удалось упаковать CRX файл.${NC}"
        echo -e "${YELLOW}Убедитесь, что Google Chrome полностью закрыт (включая фоновые процессы) и в пути к проекту нет пробелов или кириллицы.${NC}"
        exit 1
    fi

    echo -e "${GREEN}=== СБОРКА РАСШИРЕНИЯ ДЛЯ ${TARGET_OS^^} ПОЛНОСТЬЮ ЗАВЕРШЕНА! ===${NC}"
}

# Запуск основного конвейера скрипта
main

import { TRACKER_REGISTRY } from './trackerRegistry.js';
import { TRACKER_PARSERS, ParserUtils } from './trackerParsers.js';

let allResults = [];
let discoveredTrackersMap = new Map(); // Хранит ID трекера и количество найденных раздач
let trackerAuthStatus = new Map();     // Статусы авторизации (true = ОК, false = требуется вход)
let selectedTrackerId = null;          // Текущий изолированный трекер (null = показать все)
let currentSortColumn = 'seedsCount';  // Полноценная сортировка по сидам при старте
let isAscending = false;               // По убыванию (от большего к меньшему)

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("query");

  if (!query) {
    showError("Поисковый запрос пуст.");
    return;
  }

  // Настраиваем текстовые элементы шапки страницы
  document.getElementById("search-title").textContent = `Глобальный мультипоиск tSearch`;
  document.getElementById("meta-info").textContent = `Запрос: "${query}"`;
  document.getElementById("status-text").innerHTML = `Параллельный опрос трекеров... <span id="progress-counter">0/0</span>`;

  // Инициализируем интерактивные клики по заголовкам таблицы и инпутам фильтров
  setupSortListeners();
  setupFilterListeners();

  // Получаем список активных источников из настроек расширения
  const stored = await chrome.storage.local.get({ activeEngines: [] });
  const activeTrackers = stored.activeEngines.filter(item => item.type === "tracker");

  if (activeTrackers.length === 0) {
    showError("Нет активных трекеров. Кликните на иконку плагина и отметьте нужные сайты галочками.");
    return;
  }

  const progressCounter = document.getElementById("progress-counter");
  let completedCount = 0;
  progressCounter.textContent = `${completedCount}/${activeTrackers.length}`;
  
  // Показываем таблицу результатов, она будет наполняться динамически
  document.getElementById("results-table").style.display = "table";

  // Запуск параллельного асинхронного конвейера опроса источников
  const searchPromises = activeTrackers.map(async (item) => {
    const trackerId = item.id;
    const tracker = TRACKER_REGISTRY[trackerId];
    const parserConfig = TRACKER_PARSERS[trackerId];

    if (!tracker || !parserConfig) {
      completedCount++;
      progressCounter.textContent = `${completedCount}/${activeTrackers.length}`;
      return;
    }

    try {
      const cleanQuery = encodeURIComponent(query);
      const suffix = tracker.suffix || "";
      const targetUrl = tracker.method === "GET" ? `${tracker.url}${tracker.query}${cleanQuery}${suffix}` : tracker.url;

      // Отправляем команду в background.js открыть скрытую вкладку
      const loadResponse = await chrome.runtime.sendMessage({
        action: "loadTrackerInShadow",
        url: targetUrl,
        tracker: tracker,
        query: query
      });

      if (loadResponse && loadResponse.success) {
        // Запрашиваем у фонового воркера безопасный парсинг DOM структуры
        const parseResponse = await chrome.runtime.sendMessage({
          action: "parseShadowTab",
          tabId: loadResponse.tabId,
          trackerId: trackerId
        });

        if (parseResponse && parseResponse.success && parseResponse.data.length > 0) {
          // Нормализуем полученные сырые текстовые данные в типизированный вид
          const normalized = parseResponse.data.map(row => ({
            ...row,
            trackerId: trackerId,
            trackerName: tracker.name,
            sizeBytes: ParserUtils.parseSize(row.size),
            dateTimeStamp: ParserUtils.parseDate(row.date),
            seedsCount: parseInt(row.seeds.replace(/[^0-9]/g, '')) || 0,
            peersCount: parseInt(row.peers.replace(/[^0-9]/g, '')) || 0
          }));

          // Агрегируем в общий массив ОЗУ
          allResults = allResults.concat(normalized);
          
          // Записываем количество раздач и перерисовываем интерфейс сайдбара и таблицы
          discoveredTrackersMap.set(trackerId, (discoveredTrackersMap.get(trackerId) || 0) + normalized.length);
          renderTrackerButtons();
          renderTableData();
        }
      }
    } catch (err) {
      console.error(`[tSearch] Ошибка опроса ${tracker.name}:`, err);
    } finally {
      completedCount++;
      progressCounter.textContent = `${completedCount}/${activeTrackers.length}`;
      if (completedCount === activeTrackers.length) {
        document.getElementById("status-text").innerHTML = `✨ Поиск завершен. Всего найдено раздач: <b>${allResults.length}</b>`;
      }
    }
  });

  // Дожидаемся выполнения всех потоков (даже если часть сайтов заблокирована или выдала ошибку)
  await Promise.allSettled(searchPromises);
});

// Слушатель межскриптовых оповещений авторизации от background.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "setTrackerUnauthorized") {
    trackerAuthStatus.set(message.trackerId, false);
    renderTrackerButtons();
  }
  if (message.action === "setTrackerAuthorized") {
    trackerAuthStatus.set(message.trackerId, true);
    renderTrackerButtons();
  }
});

// Настройка слушателей ввода фильтров в левой панели
function setupFilterListeners() {
  const inputs = ['filter-keywords', 'filter-exclude', 'filter-size-min', 'filter-size-max', 'filter-date', 'filter-min-seeds'];
  inputs.forEach(id => {
    document.getElementById(id).addEventListener("input", renderTableData);
    document.getElementById(id).addEventListener("change", renderTableData);
  });
}

// Настройка интерактивных кликов по заголовкам колок таблицы
function setupSortListeners() {
  document.querySelectorAll("#results-table th[data-sort]").forEach(header => {
    header.addEventListener("click", () => {
      const targetColumn = header.dataset.sort;
      if (currentSortColumn === targetColumn) {
        isAscending = !isAscending; // Смена направления
      } else {
        currentSortColumn = targetColumn;
        isAscending = targetColumn === 'title' ? true : false; // Текст по алфавиту, числа — сверху вниз
      }
      updateSortArrows(header);
      renderTableData();
    });
  });
}

// Переключение CSS классов для стрелочек ▲ / ▼
function updateSortArrows(clickedHeader) {
  document.querySelectorAll("#results-table th[data-sort]").forEach(th => th.classList.remove("sort-asc", "sort-desc"));
  clickedHeader.classList.add(isAscending ? "sort-asc" : "sort-desc");
}

// Рендеринг кнопок-вкладок трекеров в левой панели сайдбара
function renderTrackerButtons() {
  const container = document.getElementById("tracker-toggles");
  container.innerHTML = "";

  discoveredTrackersMap.forEach((count, trackerId) => {
    const trackerInfo = TRACKER_REGISTRY[trackerId];
    if (!trackerInfo) return;

    const btn = document.createElement("div");
    btn.className = "tracker-toggle-btn";
    if (selectedTrackerId === trackerId) {
      btn.classList.add("active");
    }

    // Рендерим имя трекера, бейдж количества и интерактивную кнопку логина
    const isAuthorized = trackerAuthStatus.get(trackerId) !== false;
    const lockIcon = isAuthorized ? "🟢" : "🔑";
    const lockTitle = isAuthorized ? "Авторизован (Сессия кэширована)" : "Сессия отсутствует. Кликните для входа на сайт.";

    btn.innerHTML = `
      <span class="tracker-click-zone" style="flex-grow: 1; display: flex; justify-content: space-between; align-items: center; margin-right: 10px;">
        <span>${trackerInfo.name}</span>
        <span class="tracker-count-badge">${count}</span>
      </span>
      <button class="login-trigger-btn ${isAuthorized ? 'authorized' : ''}" title="${lockTitle}">
        ${lockIcon}
      </button>
    `;

    // Клик по названию — изоляция результатов трекера в правой панели результатов
    btn.querySelector(".tracker-click-zone").addEventListener("click", () => {
      selectedTrackerId = (selectedTrackerId === trackerId) ? null : trackerId;
      renderTrackerButtons();
      renderTableData();
    });

    // Клик по замку/ключу — открытие прямой страницы входа на сайт для кэширования кук
    btn.querySelector(".login-trigger-btn").addEventListener("click", async (e) => {
      e.stopPropagation(); // Изолируем клик от фильтрации таба
      await chrome.tabs.create({ 
        url: trackerInfo.url.substring(0, trackerInfo.url.lastIndexOf('/')) + '/index.php', 
        active: true 
      });
    });

    container.appendChild(btn);
  });
}

// Расчет и генерация цветных HTML-бейджей старости раздачи
function formatAgeHTML(timestamp) {
  if (!timestamp) return `<span class="age-badge age-old">[—]</span>`;
  
  const diffMs = Date.now() - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return `<span class="age-badge age-today">[Сегодня]</span>`;
  if (diffDays === 1) return `<span class="age-badge age-yesterday">[Вчера]</span>`;
  if (diffDays < 30) return `<span class="age-badge age-old">[${diffDays} дн.]</span>`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `<span class="age-badge age-old">[${diffMonths} мес.]</span>`;
  
  const diffYears = Math.floor(diffMonths / 12);
  return `<span class="age-badge age-old">[${diffYears} г.]</span>`;
}

// Фильтрация, сортировка и финальная отрисовка сводной таблицы раздач
function renderTableData() {
  const tbody = document.getElementById("results-body");
  tbody.innerHTML = "";

  // Считываем значения фильтров из интерфейса левой панели сайдбара
  const keywords = document.getElementById("filter-keywords").value.toLowerCase().trim();
  const excludeWords = document.getElementById("filter-exclude").value.toLowerCase().trim();
  const sizeMin = parseFloat(document.getElementById("filter-size-min").value) || 0;
  const sizeMax = parseFloat(document.getElementById("filter-size-max").value) || Infinity;
  const dateFilter = document.getElementById("filter-date").value;
  const minSeeds = parseInt(document.getElementById("filter-min-seeds").value) || 0;

  // 1. Применяем реактивный конвейер фильтрации данных
  const filtered = allResults.filter(item => {
    // Если на левой панели нажат конкретный трекер, отсекаем результаты других сайтов
    if (selectedTrackerId && item.trackerId !== selectedTrackerId) return false;

    if (item.seedsCount < minSeeds) return false;
    if (keywords && !item.title.toLowerCase().includes(keywords)) return false;
    if (excludeWords && item.title.toLowerCase().includes(excludeWords)) return false;

    const GB = 1024 * 1024 * 1024;
    if (item.sizeBytes < sizeMin * GB || item.sizeBytes > sizeMax * GB) return false;

    if (dateFilter !== 'all') {
      const msLimit = parseInt(dateFilter) * 24 * 60 * 60 * 1000;
      if (Date.now() - (item.dateTimeStamp || Date.now()) > msLimit) return false;
    }

    return true;
  });

  // 2. Выполняем сортировку по текущему выбранному заголовку колонки
  const sorted = filtered.sort((a, b) => {
    let valA = a[currentSortColumn];
    let valB = b[currentSortColumn];
    if (typeof valA === 'string') {
      valA = valA.toLowerCase(); 
      valB = valB.toLowerCase();
    }
    if (valA < valB) return isAscending ? -1 : 1;
    if (valA > valB) return isAscending ? 1 : -1;
    return 0;
  });

  // 3. Формируем HTML строки для вывода результатов в правую панель
  sorted.forEach(item => {
    const tr = document.createElement("tr");
    const categoryText = item.category || "Открыть раздачу на форуме";
    const ageBadgeHTML = formatAgeHTML(item.dateTimeStamp);

    tr.innerHTML = `
      <td>
        <span class="title-text">${ageBadgeHTML}${item.title}</span>
        <a href="${item.url}" target="_blank" class="category-link">🔗 ${categoryText}</a>
      </td>
      <td class="size">${item.size || "—"}</td>
      <td class="seed">${item.seedsCount}</td>
      <td class="leech">${item.peersCount}</td>
    `;
    tbody.appendChild(tr);
  });
}

function showError(msg) {
  document.getElementById("status-text").style.display = "none";
  const container = document.querySelector(".main-content");
  const errDiv = document.createElement("div");
  errDiv.className = "error-msg";
  errDiv.textContent = msg;
  container.appendChild(errDiv);
}

import { TRACKER_REGISTRY, REMOTE_PARSER_URL } from './trackerRegistry.js';
import { TRACKER_PARSERS } from './trackerParsers.js';

// Инициализация при установке или обновлении расширения
chrome.runtime.onInstalled.addListener(async () => {
  await rebuildContextMenus();
  
  // Создаем фоновый будильник (Alarms API) для проверки обновлений раз в 6 часов (360 минут)
  chrome.alarms.create("fetchRemoteParsers", { periodInMinutes: 360 });
  
  // Запускаем немедленную первичную синхронизацию правил
  await updateParsersFromRemote();
});

// Слушатель фоновых будильников браузера
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "fetchRemoteParsers") {
    await updateParsersFromRemote();
  }
});

// Функция асинхронной загрузки и валидации декларативного JSON-файла с селекторами
async function updateParsersFromRemote() {
  try {
    const response = await fetch(REMOTE_PARSER_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const remoteParsers = await response.json();
    
    // Валидация: проверяем, что пришел объект, а не пустая строка или массив
    if (remoteParsers && typeof remoteParsers === 'object' && !Array.isArray(remoteParsers)) {
      await chrome.storage.local.set({ cachedParsers: remoteParsers, lastUpdate: Date.now() });
      console.log("[tSearch] База селекторов парсеров успешно синхронизирована с сервером.");
    }
  } catch (err) {
    console.error("[tSearch] Ошибка скачивания удаленных правил. Используются локальные селекторы:", err);
  }
}

// Асинхронное построение контекстного меню браузера
async function rebuildContextMenus() {
  chrome.contextMenus.removeAll(async () => {
    chrome.contextMenus.create({
      id: "tSearch_root",
      title: "Искать '%s' в tSearch",
      contexts: ["selection"]
    });

    const stored = await chrome.storage.local.get({ activeEngines: [] });
    let activeList = stored.activeEngines;

    if (activeList.length === 0) {
      activeList = [
        { id: "rutracker", type: "tracker" },
        { id: "rutor", type: "tracker" },
        { id: "kinozal", type: "tracker" },
        { id: "nnmclub", type: "tracker" }
      ];
      await chrome.storage.local.set({ activeEngines: activeList });
    }

    activeList.forEach((item) => {
      if (item.type === "tracker" && TRACKER_REGISTRY[item.id]) {
        chrome.contextMenus.create({
          id: `tSearch__tracker__${item.id}`,
          parentId: "tSearch_root",
          title: TRACKER_REGISTRY[item.id].name,
          contexts: ["selection"]
        });
      }
    });
  });
}

// Слушатель кликов контекстного меню мыши
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText) return;
  const textQuery = info.selectionText.trim();
  const internalSearchUrl = chrome.runtime.getURL(`search.html?query=${encodeURIComponent(textQuery)}`);
  
  await chrome.tabs.create({
    url: internalSearchUrl,
    index: tab ? tab.index + 1 : undefined,
    active: true
  });
});

// Диспетчер сообщений межскриптового взаимодействия
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "loadTrackerInShadow") {
    handleShadowLoading(message.url, message.tracker, message.query)
      .then(tabId => sendResponse({ success: true, tabId: tabId }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; 
  }

  if (message.action === "parseShadowTab") {
    monitorAndParseTab(message.tabId, message.trackerId)
      .then(results => {
        sendResponse({ success: true, data: results });
        chrome.tabs.remove(message.tabId);
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
        chrome.tabs.remove(message.tabId);
      });
    return true;
  }

  // Обработчик команды принудительного ручного обновления базы из popup.js
  if (message.action === "forceUpdateParsers") {
    updateParsersFromRemote()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Функция скрытой фоновой загрузки страниц трекеров (GET и POST методы)
async function handleShadowLoading(url, tracker, query) {
  if (tracker.method === "GET") {
    const tab = await chrome.tabs.create({ url: url, active: false });
    await new Promise((resolve) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });
    return tab.id;
  } else {
    const tab = await chrome.tabs.create({ url: "about:blank", active: false });
    const paramName = tracker.query.replace("=", "");
    const suffix = tracker.suffix || "";

    const injectPostForm = (actionUrl, key, val, extra) => {
      const form = document.createElement('form');
      form.method = 'POST'; form.action = actionUrl;
      const input = document.createElement('input');
      input.type = 'hidden'; input.name = key; input.value = val;
      form.appendChild(input);
      if (extra) {
        const params = new URLSearchParams(extra);
        for (const [pK, pV] of params.entries()) {
          const extInp = document.createElement('input');
          extInp.type = 'hidden'; extInp.name = pK; extInp.value = pV;
          form.appendChild(extInp);
        }
      }
      document.body.appendChild(form);
      form.submit();
    };

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectPostForm,
      args: [tracker.url, paramName, query, suffix.replace("&", "")]
    });

    await new Promise(resolve => setTimeout(resolve, 3500));
    return tab.id;
  }
}

// Интеллектуальный парсер с поддержкой удаленного кэша правил и детектором капчи
async function monitorAndParseTab(tabId, trackerId) {
  // Сначала проверяем наличие динамических правил в кэше storage, иначе откатываемся на локальные
  const storedParsers = await chrome.storage.local.get({ cachedParsers: null });
  const activeParsersMap = storedParsers.cachedParsers || TRACKER_PARSERS;
  const parserConfig = activeParsersMap[trackerId];
  
  if (!parserConfig) return [];

  const checkCaptcha = async () => {
    try {
      const res = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (selector) => !!document.querySelector(selector),
        args: [parserConfig.captchaSelector || '.__never_exists__']
      });
      return !!res?.[0]?.result;
    } catch (e) {
      return false;
    }
  };

  let hasCaptchaOrLogin = await checkCaptcha();

  if (hasCaptchaOrLogin) {
    await chrome.tabs.update(tabId, { active: true });
    try {
      await chrome.runtime.sendMessage({ action: "setTrackerUnauthorized", trackerId: trackerId });
    } catch (e) {}

    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "tSearch: Действие требуется",
      message: `Необходимо войти или решить капчу на сайте трекера. Сессия будет сохранена.`
    });

    let attempts = 0;
    while (hasCaptchaOrLogin && attempts < 40) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      hasCaptchaOrLogin = await checkCaptcha();
      attempts++;
    }

    if (attempts >= 40) throw new Error("Истекло время ожидания авторизации.");
  }

  try {
    await chrome.runtime.sendMessage({ action: "setTrackerAuthorized", trackerId: trackerId });
  } catch (e) {}

  // Запуск скрапинга по динамически подгруженным CSS-селекторам
  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (config) => {
      const rows = document.querySelectorAll(config.rowSelector);
      const items = [];
      rows.forEach(row => {
        try {
          const item = {};
          Object.keys(config.fields).forEach(f => {
            const cfg = config.fields[f];
            if (typeof cfg === 'string') {
              item[f] = row.querySelector(cfg)?.textContent.trim() || '';
            } else {
              const el = row.querySelector(cfg.selector);
              item[f] = el ? (cfg.attr === 'href' ? el.href : el.getAttribute(cfg.attr)) : '';
            }
          });
          if (item.title && item.url) items.push(item);
        } catch (e) {}
      });
      return items;
    },
    args: [parserConfig]
  });

  return injectionResults?.[0]?.result || [];
}

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "local" && changes.activeEngines) {
    await rebuildContextMenus();
  }
});

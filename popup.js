import { TRACKER_REGISTRY, DEFAULT_SEARCH_ENGINES } from './trackerRegistry.js';

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("selectors-container");
  const saveBtn = document.getElementById("save-btn");
  const updateParsersBtn = document.getElementById("update-parsers-btn");

  // Асинхронно считываем текущие сохраненные настройки из локального хранилища
  const stored = await chrome.storage.local.get({ activeEngines: [] });
  
  // Создаем карту быстрого поиска Set для выставления галочек
  const activeMap = new Set(stored.activeEngines.map(item => `${item.type}:${item.id}`));

  // 1. Рендерим секцию веб-поисковиков
  createSectionHeader(container, "Поисковые системы");
  DEFAULT_SEARCH_ENGINES.forEach(eng => {
    createCheckbox(
      container, 
      eng.id, 
      eng.name, 
      "engine", 
      activeMap.has(`engine:${eng.id}`)
    );
  });

  // 2. Рендерим секцию торрент-трекеров (все 38+ источников из базы данных)
  createSectionHeader(container, "Торрент-трекеры");
  Object.keys(TRACKER_REGISTRY).forEach(id => {
    createCheckbox(
      container, 
      id, 
      TRACKER_REGISTRY[id].name, 
      "tracker", 
      activeMap.has(`tracker:${id}`)
    );
  });

  // 3. Обработчик события клика по кнопке «Сохранить настройки»
  saveBtn.addEventListener("click", async () => {
    // Собираем все отмеченные пользователем элементы
    const checkedInputs = container.querySelectorAll("input:checked");
    const newActiveList = Array.from(checkedInputs).map(input => ({
      id: input.dataset.id,
      type: input.dataset.type
    }));

    // Сохраняем массив в хранилище (background.js автоматически перестроит контекстное меню)
    await chrome.storage.local.set({ activeEngines: newActiveList });
    
    // Анимация успешного сохранения
    saveBtn.textContent = "Успешно сохранено!";
    saveBtn.style.backgroundColor = "#28a745";
    saveBtn.disabled = true;

    setTimeout(() => {
      saveBtn.textContent = "Сохранить настройки";
      saveBtn.style.backgroundColor = "#007bff";
      saveBtn.disabled = false;
    }, 1500);
  });

  // 4. ТРЕБОВАНИЕ: Обработчик принудительной ручной синхронизации селекторов с сервером
  if (updateParsersBtn) {
    updateParsersBtn.addEventListener("click", async () => {
      updateParsersBtn.textContent = "Синхронизация...";
      updateParsersBtn.disabled = true;

      try {
        // Отправляем команду в background.js на немедленный fetch удаленного JSON
        const response = await chrome.runtime.sendMessage({ action: "forceUpdateParsers" });
        
        if (response && response.success) {
          updateParsersBtn.textContent = "База успешно обновлена!";
          updateParsersBtn.style.backgroundColor = "#28a745";
        } else {
          throw new Error(response?.error || "Ошибка ответа");
        }
      } catch (e) {
        console.error("[tSearch] Ручной апдейт провален:", e);
        updateParsersBtn.textContent = "Ошибка обновления";
        updateParsersBtn.style.backgroundColor = "#dc3545";
      }

      setTimeout(() => {
        updateParsersBtn.textContent = "🔄 Обновить селекторы трекеров";
        updateParsersBtn.style.backgroundColor = "#6c757d";
        updateParsersBtn.disabled = false;
      }, 2000);
    });
  }
});

/**
 * Создает текстовый заголовок для секции настроек
 * @param {HTMLElement} parent - Родительский контейнер
 * @param {string} text - Текст заголовка
 */
function createSectionHeader(parent, text) {
  const header = document.createElement("div");
  header.className = "section-title";
  header.textContent = text;
  parent.appendChild(header);
}

/**
 * Безопасно генерирует HTML-структуру чекбокса для предотвращения XSS
 * @param {HTMLElement} parent - Родительский контейнер
 * @param {string} id - Уникальный идентификатор сайта
 * @param {string} name - Отображаемое имя сайта
 * @param {string} type - Тип источника ("engine" или "tracker")
 * @param {boolean} isChecked - Активен ли элемент по умолчанию
 */
function createCheckbox(parent, id, name, type, isChecked) {
  const label = document.createElement("label");
  label.className = "checkbox-item";
  
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.dataset.id = id;
  checkbox.dataset.type = type;
  checkbox.checked = isChecked;

  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(name));
  parent.appendChild(label);
}

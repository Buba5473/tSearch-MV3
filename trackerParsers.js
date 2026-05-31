// tSearch — Карта базовых декларативных DOM-селекторов и утилит нормализации данных

export const ParserUtils = {
  /**
   * Переводит строковые размеры файлов (например, "1.47 GB", "500 МБ") в чистые байты
   * @param {string} sizeStr - Исходная строка размера с сайта
   * @returns {number} Размер в байтах для точной сортировки
   */
  parseSize: (sizeStr) => {
    if (!sizeStr) return 0;
    const num = parseFloat(sizeStr.replace(/[^0-9.]/g, ''));
    const str = sizeStr.toLowerCase();
    if (isNaN(num)) return 0;

    if (str.includes('gb') || str.includes('гб')) return num * 1024 * 1024 * 1024;
    if (str.includes('mb') || str.includes('мб')) return num * 1024 * 1024;
    if (str.includes('kb') || str.includes('кб')) return num * 1024;
    return num;
  },

  /**
   * Очищает текст от лишних пробельных символов и переносов строки
   * @param {string} text - Исходный текст
   * @returns {string} Очищенная строка
   */
  cleanText: (text) => text ? text.replace(/\s+/g, ' ').trim() : '',

  /**
   * Преобразует разнородные даты трекеров во временной штамп (Timestamp)
   * @param {string} dateStr - Строка даты со страницы раздач
   * @returns {number} Время в миллисекундах (Timestamp)
   */
  parseDate: (dateStr) => {
    if (!dateStr) return Date.now();
    let clean = dateStr.toLowerCase().trim();
    
    // Обработка относительных дат форумов
    if (clean.includes('сегодня') || clean.includes('today')) return Date.now();
    if (clean.includes('вчера') || clean.includes('yesterday')) return Date.now() - (24 * 60 * 60 * 1000);

    // Карта месяцев для текстовых русскоязычных дат
    const months = {
      'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'май': 4, 'июн': 5,
      'июл': 6, 'ввг': 7, 'сен': 8, 'окт': 9, 'ноя': 10, 'дек': 11
    };
    
    // Разбиваем строку по любым нецифровым и нетекстовым разделителям
    let parts = clean.split(/[^a-zа-я0-9]/).filter(p => p.length > 0);
    if (parts.length >= 3) {
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10) - 1; // В JS месяцы идут от 0 до 11

      // Если месяц указан буквами (например, "май" или "мая")
      for (let key in months) {
        if (clean.includes(key)) { 
          month = months[key]; 
          break; 
        }
      }
      
      let year = parseInt(parts[2], 10);
      if (!isNaN(year) && year < 100) year += 2000; // Превращаем "26" в "2026"
      
      if (isNaN(day) || isNaN(month) || isNaN(year)) return Date.now();

      let d = new Date(year, month, day);
      return isNaN(d.getTime()) ? Date.now() : d.getTime();
    }
    
    return Date.now();
  }
};

// Декларативная карта селекторов под различные типы верстки сайтов
export const TRACKER_PARSERS = {
  "rutracker": {
    "rowSelector": "#tor-tbl > tbody > tr",
    "captchaSelector": "#captcha-form, .js-captcha, #login-form", 
    "fields": {
      "title": "td.t-title a",
      "url": { "selector": "td.t-title a", "attr": "href" },
      "category": "td.f-name a",
      "size": "td.tor-size u",
      "seeds": "td.seedmed b",
      "peers": "td.leechmed b",
      "date": "td.small.nowrap:last-child"
    }
  },
  "nnmclub": {
    "rowSelector": "table.forumline tbody tr[align='center']",
    "captchaSelector": "#captcha_block, form[action='login.php'], #login-form",
    "fields": {
      "title": "td:nth-child(3) a.topictitle",
      "url": { "selector": "td:nth-child(3) a.topictitle", "attr": "href" },
      "category": "td:nth-child(2) a",
      "size": "td:nth-child(4) u",
      "seeds": "td:nth-child(6) font[color='green'] b",
      "peers": "td:nth-child(6) font[color='red'] b",
      "date": "td:nth-child(10)"
    }
  },
  "tapochek": {
    "rowSelector": "#tor-tbl > tbody > tr",
    "captchaSelector": "#login-form, form[action='login.php']",
    "fields": {
      "title": "td.t-title a",
      "url": { "selector": "td.t-title a", "attr": "href" },
      "category": "td.f-name a",
      "size": "td.tor-size u",
      "seeds": "td.seedmed b",
      "peers": "td.leechmed b",
      "date": "td.small.nowrap:last-child"
    }
  },
  "piratbit": {
    "rowSelector": "#tracker > tbody > tr.tRow",
    "captchaSelector": "form[action='login.php'], #login-form",
    "fields": {
      "title": "td.tr-title a",
      "url": { "selector": "td.tr-title a", "attr": "href" },
      "category": "td.f-name a",
      "size": "td.tor-size",
      "seeds": "td.seedmed b",
      "peers": "td.leechmed b",
      "date": "td.small:last-child"
    }
  },
  "lostfilm": {
    "rowSelector": "div.series-search-list > div.row",
    "captchaSelector": "form[action='https://lostfilm.tv'], #login-form",
    "fields": {
      "title": "div.title",
      "url": { "selector": "a.play-btn", "attr": "href" },
      "category": "div.content-text",
      "size": "div.file-size",
      "seeds": "span.seed-count",
      "peers": "span.leech-count",
      "date": "div.date"
    }
  },
  "anilibria": {
    "rowSelector": "table.search-table > tbody > tr",
    "captchaSelector": "#login-form, .login-box",
    "fields": {
      "title": "td.release-title a",
      "url": { "selector": "td.release-title a", "attr": "href" },
      "category": "td.genre-cell",
      "size": "td.size-cell",
      "seeds": "td.seeders-num",
      "peers": "td.leechers-num",
      "date": "td.date-cell"
    }
  },
  "teamhd": {
    "rowSelector": "table.torrenttable tbody tr:not(.header)",
    "captchaSelector": "form[action='takelogin.php'], #login-form",
    "fields": {
      "title": "a[href^='details.php'] b",
      "url": { "selector": "a[href^='details.php']", "attr": "href" },
      "category": "td.category-name",
      "size": "td:nth-child(5)",
      "seeds": "td.seeders b",
      "peers": "td.leechers b",
      "date": "td:nth-child(7)"
    }
  },
  "nyaasi": {
    "rowSelector": "table.torrent-list tbody tr",
    "captchaSelector": "#cf-challenge-running, #turnstile-wrapper",
    "fields": {
      "title": "td[colspan='2'] a:not(.comments)",
      "url": { "selector": "td[colspan='2'] a:not(.comments)", "attr": "href" },
      "category": "td.text-center a",
      "size": "td:nth-child(4)",
      "seeds": "td:nth-child(6)",
      "peers": "td:nth-child(7)",
      "date": "td:nth-child(5)"
    }
  },
  "rutor": {
    "rowSelector": "#index tr:not(.header)",
    "captchaSelector": "#cf-wrapper, #turnstile-wrapper",
    "fields": {
      "title": "td:nth-child(2) a:nth-child(3)",
      "url": { "selector": "td:nth-child(2) a:nth-child(3)", "attr": "href" },
      "category": "td:nth-child(2) a:nth-child(1)",
      "size": "td:nth-child(3)",
      "seeds": "td:nth-child(4) .green",
      "peers": "td:nth-child(4) .red",
      "date": "td:nth-child(1)"
    }
  },
  "kinozal": {
    "rowSelector": "table.t_peer > tbody > tr.bg",
    "captchaSelector": "input[name='captcha'], form[action='takelogin.php'], #login-form",
    "fields": {
      "title": "td.nam a",
      "url": { "selector": "td.nam a", "attr": "href" },
      "size": "td:nth-child(4)",
      "seeds": "td.sl_s",
      "peers": "td.sl_p",
      "date": "td:nth-child(5)"
    }
  },
  "1337x": {
    "rowSelector": "div.table-list-wrap > table > tbody > tr",
    "captchaSelector": "#cf-challenge-running, #turnstile-wrapper",
    "fields": {
      "title": "td.coll-1.name a:nth-child(2)",
      "url": { "selector": "td.coll-1.name a:nth-child(2)", "attr": "href" },
      "size": "td.coll-4.size",
      "seeds": "td.coll-2.seeds",
      "peers": "td.coll-3.leeches",
      "date": "td.coll-date"
    }
  },
  "pornolab": {
    "rowSelector": "#tor-tbl > tbody > tr",
    "captchaSelector": "#captcha-form, #login-form",
    "fields": {
      "title": "td.row4.med.tLeft.u > div > a",
      "url": { "selector": "td.row4.med.tLeft.u > div > a", "attr": "href" },
      "category": "td.f-name a",
      "size": "td.row4.small.nowrap:nth-child(5) u",
      "seeds": "td.row4.seedmed > b",
      "peers": "td.row4.leechmed > b",
      "date": "td.small.nowrap:last-child"
    }
  }
};

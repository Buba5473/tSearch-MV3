// tSearch — Максимальный реестр торрент-трекеров (База: Feverqwe + TorrentMonitor + Jackett)
export const TRACKER_REGISTRY = {
  // === КРУПНЕЙШИЕ ОБЩИЕ ТРЕКЕРЫ (TorrentMonitor База) ===
  "rutracker": { "name": "RuTracker.org", "url": "https://rutracker.org", "query": "nm=", "method": "POST" },
  "rutor": { "name": "Rutor", "url": "http://rutor.info", "query": "", "method": "GET" },
  "rustorka": { "name": "Rustorka", "url": "http://rustorka.com", "query": "nm=", "method": "POST" },
  "nnmclub": { "name": "NNM-Club (NoNaMe)", "url": "https://nnmclub.to", "query": "nm=", "method": "POST" },
  "piratbit": { "name": "Piratbit (Pirat.ca)", "url": "https://piratbit.live", "query": "nm=", "method": "POST" },
  "tapochek": { "name": "Tapochek.net", "url": "https://tapochek.net", "query": "nm=", "method": "POST" },
  
  // === КИНО, СЕРИАЛЫ И АНИМЕ (Добавлены релизные группы из форков) ===
  "lostfilm": { "name": "LostFilm.tv", "url": "https://lostfilm.tv", "query": "", "method": "GET" },
  "anilibria": { "name": "AniLibria", "url": "https://anilibria.tv", "query": "search=", "method": "POST" },
  "kravacast": { "name": "KravaCast", "url": "http://kravacast.com", "query": "nm=", "method": "POST" },
  "teamhd": { "name": "TeamHD.org", "url": "https://teamhd.org", "query": "search=", "method": "GET" },
  "kinozal": { "name": "Кинозал.ТВ", "url": "http://kinozal.tv", "query": "s=", "method": "GET" },
  "hdclub": { "name": "HDclub (Архив)", "url": "http://hdclub.org", "query": "search=", "method": "GET" },
  "hdreactor": { "name": "HDReactor.org", "url": "http://hdreactor.org", "query": "story=", "suffix": "&subaction=search", "method": "POST" },
  "newstudio": { "name": "NewStudio", "url": "http://newstudio.tv", "query": "nm=", "method": "POST" },
  "nyaasi": { "name": "Nyaa.si (Anime)", "url": "https://nyaa.si", "query": "", "method": "GET" },
  
  // === КНИЖНЫЕ И МУЗЫКАЛЬНЫЕ ===
  "abook": { "name": "Abook-Club", "url": "http://abook-club.ru", "query": "nm=", "method": "POST" },
  "metaltracker": { "name": "Metal-Tracker", "url": "https://metal-tracker.com", "query": "search=", "method": "GET" },
  "booktracker": { "name": "Книжный трекер", "url": "https://booktracker.org", "query": "nm=", "method": "POST" },
  
  // === ЗАРУБЕЖНЫЕ И КАТЕГОРИЙНЫЕ ===
  "1337x": { "name": "1337x", "url": "http://1337x.to", "query": "", "suffix": "/1/", "method": "GET" },
  "thepiratebay": { "name": "The Pirate Bay", "url": "https://thepiratebay.org", "query": "q=", "method": "GET" },
  "limetorrents": { "name": "LimeTorrents", "url": "https://limetorrents.cc", "query": "", "suffix": "/", "method": "GET" },
  "torrentdownloads": { "name": "Torrent Downloads", "url": "http://torrentdownloads.me", "query": "?search=", "method": "GET" },
  "extratorrent": { "name": "ExtraTorrent", "url": "https://extratorrent.st", "query": "?search=", "method": "GET" },
  "eztv": { "name": "EZTV", "url": "https://eztv.io", "query": "", "method": "GET" },
  "tokyotosho": { "name": "Tokyo Toshokan", "url": "http://tokyotosho.info", "query": "terms=", "suffix": "&type=0", "method": "GET" },
  "cgpeers": { "name": "CGPeers", "url": "http://cgpeers.com", "query": "searchstr=", "suffix": "&order_by=time&order_way=desc&searchsubmit=1", "method": "GET" },
  "empornium": { "name": "Empornium", "url": "http://empornium.me", "query": "searchtext=", "suffix": "&search_type=1", "method": "GET" },
  "pornolab": { "name": "Pornolab", "url": "http://pornolab.net", "query": "nm=", "method": "POST" },
  
  // === СПОРТ, ИГРЫ И СООБЩЕСТВА ===
  "rgfootball": { "name": "rgFootball", "url": "http://rgfootball.net", "query": "nm=", "method": "POST" },
  "torrent_games": { "name": "Torrent-Games", "url": "http://torrent-games.net", "query": "q=", "method": "GET" },
  "torrent_soft": { "name": "Torrent-Soft", "url": "http://torrent-soft.net", "query": "story=", "suffix": "&subaction=search", "method": "POST" },
  "uniongang": { "name": "UnionGang.tv", "url": "http://uniongang.tv", "query": "search=", "suffix": "&incldDead=0&cat=0&dsearch=", "method": "GET" },
  "hurtom": { "name": "Hurtom (Toloka)", "url": "http://toloka.to", "query": "nm=", "method": "GET" },
  
  // === АЛЬТЕРНАТИВНЫЕ РЕСУРСЫ ===
  "vtracker": { "name": "vtracker.org", "url": "http://vtracker.org", "query": "nm=", "suffix": "&allw=1&submit=%C8%F1%EA%E0%F2%FC", "method": "POST" },
  "kaztorka": { "name": "Kaztorka.org", "url": "http://kaztorka.org", "query": "torrentName=", "method": "POST" },
  "zoneland": { "name": "zoneland.ru", "url": "http://zoneland.ru", "query": "nm=", "suffix": "&max=1&to=1", "method": "POST" },
  "avgclub": { "name": "avg.club", "url": "http://avg.club", "query": "nm=", "suffix": "&max=1&to=1", "method": "POST" },
  "stereotraker": { "name": "stereotraker.ru", "url": "http://stereotraker.ru", "query": "story=", "suffix": "&subaction=search&titleonly=0&sortby=date&resorder=desc&showposts=1", "method": "POST" },
  "newteam": { "name": "New-Team.Org", "url": "http://new-team.org", "query": "nm=", "suffix": "&max=1&to=1", "method": "POST" },
  "7tor": { "name": "7tor.org", "url": "http://7tor.org", "suffix": "&sf=titleonly&sr=topics", "method": "GET" },
  "emtrek": { "name": "Emtrek.org", "url": "http://emtrek.org", "query": "nm=", "method": "GET" },
  "tracker_name": { "name": "tracker.name", "url": "http://tracker.name", "query": "search=", "suffix": "&page=torrents&category=0&active=1", "method": "GET" }
};

export const DEFAULT_SEARCH_ENGINES = [
  { id: "google", name: "Google", url: "https://google.com" },
  { id: "yandex", name: "Яндекс", url: "https://yandex.ru" }
];

// УКАЖИТЕ СВОЙ АДРЕС ДЛЯ ДИНАМИЧЕСКОГО ОБНОВЛЕНИЯ ПАРСЕРОВ НА СЕРВЕРЕ
export const REMOTE_PARSER_URL = "https://githubusercontent.com";

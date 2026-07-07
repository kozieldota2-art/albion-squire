// ═══════════════════════════════════════════════════
// ALBION SQUIRE — api.js
// Camada de acesso a todas as APIs externas
// ═══════════════════════════════════════════════════

const AlbionAPI = (() => {

  // ── Cache simples em memória ──
  const _cache = {};
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  function _cached(key, fn) {
    const now = Date.now();
    if (_cache[key] && now - _cache[key].ts < CACHE_TTL) return Promise.resolve(_cache[key].data);
    return fn().then(data => { _cache[key] = { data, ts: now }; return data; });
  }

  // ── Fetch com timeout ──
  async function _fetch(url, timeout = 10000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  // ═══════════════════════════════════════════════
  // MARKET — albion-online-data.com
  // ═══════════════════════════════════════════════

  /**
   * Retorna preços atuais de múltiplos itens em múltiplas cidades
   * @param {string[]} itemIds - ex: ["T6_MAIN_SWORD", "T6_METALBAR"]
   * @param {string[]} cities  - ex: ["Lymhurst","Martlock"]
   * @returns {Object[]} array de MarketResponse
   */
  async function getPrices(itemIds, cities = CITIES) {
    const cityStr = cities.join(",");
    const chunks  = [];
    // Quebrar em chunks de ~60 itens pra não passar 4096 chars na URL
    for (let i = 0; i < itemIds.length; i += 60) chunks.push(itemIds.slice(i, i + 60));

    const results = [];
    for (const chunk of chunks) {
      const ids = chunk.join(",");
      const url = `${API.MARKET}/prices/${ids}.json?locations=${cityStr}&qualities=1`;
      const key = `prices:${ids}:${cityStr}`;
      const data = await _cached(key, () => _fetch(url));
      results.push(...data);
    }
    return results;
  }

  /**
   * Retorna preço de um único item (min sell / max buy) em todas as cidades
   */
  async function getItemPrice(itemId) {
    const url  = `${API.MARKET}/prices/${itemId}.json?locations=${CITIES.join(",")}&qualities=1,2,3`;
    const data = await _cached(`item:${itemId}`, () => _fetch(url));
    return data;
  }

  /**
   * Histórico de preços (time-scale: 1=hora, 6=6h, 24=dia)
   */
  async function getPriceHistory(itemId, city, timeScale = 6) {
    const url = `${API.MARKET}/history/${itemId}.json?locations=${city}&time-scale=${timeScale}`;
    return _fetch(url);
  }

  /**
   * Preço do gold
   */
  async function getGoldPrice() {
    return _cached("gold", () => _fetch(`${API.MARKET}/gold.json?count=1`));
  }

  // ─── Helpers de preço ───────────────────────────

  /**
   * Do array de MarketResponse, pega o melhor sell_price_min em qualquer cidade
   */
  function getBestSellPrice(priceArray, itemId) {
    const rows = priceArray.filter(r => r.item_id === itemId && r.sell_price_min > 0);
    if (!rows.length) return 0;
    return Math.min(...rows.map(r => r.sell_price_min));
  }

  function getBestBuyPrice(priceArray, itemId) {
    const rows = priceArray.filter(r => r.item_id === itemId && r.buy_price_max > 0);
    if (!rows.length) return 0;
    return Math.max(...rows.map(r => r.buy_price_max));
  }

  function getPriceInCity(priceArray, itemId, city) {
    const row = priceArray.find(r => r.item_id === itemId && r.city === city);
    return row || null;
  }

  // ─── Render de imagem ────────────────────────────

  function itemImageUrl(itemId, quality = 1) {
    return `${API.RENDER}/${itemId}.png?count=1&quality=${quality}`;
  }

  // ═══════════════════════════════════════════════
  // GAMEINFO — gameinfo.albiononline.com
  // ═══════════════════════════════════════════════

  /**
   * Busca info de um player por nome
   */
  async function searchPlayer(name) {
    const url  = `${API.GAME}/search?q=${encodeURIComponent(name)}`;
    const data = await _fetch(url);
    return data.players || [];
  }

  /**
   * Dados de um player por ID
   */
  async function getPlayer(playerId) {
    return _cached(`player:${playerId}`, () => _fetch(`${API.GAME}/players/${playerId}`));
  }

  /**
   * Kills recentes de um player
   */
  async function getPlayerKills(playerId, limit = 20) {
    return _fetch(`${API.GAME}/players/${playerId}/kills?offset=0&limit=${limit}`);
  }

  /**
   * Mortes recentes de um player
   */
  async function getPlayerDeaths(playerId, limit = 20) {
    return _fetch(`${API.GAME}/players/${playerId}/deaths?offset=0&limit=${limit}`);
  }

  /**
   * Batalhas recentes (globais ou de uma guild)
   */
  async function getBattles(guildId = null, limit = 20, offset = 0) {
    let url = `${API.GAME}/battles?offset=${offset}&limit=${limit}&sort=recent`;
    if (guildId) url += `&guildId=${guildId}`;
    return _cached(`battles:${guildId}:${offset}`, () => _fetch(url));
  }

  /**
   * Detalhe de uma batalha
   */
  async function getBattle(battleId) {
    return _cached(`battle:${battleId}`, () => _fetch(`${API.GAME}/battles/${battleId}`));
  }

  /**
   * Kill events recentes
   */
  async function getKillEvents(guildId = null, limit = 51, offset = 0) {
    let url = `${API.GAME}/events?offset=${offset}&limit=${limit}&sort=recent`;
    if (guildId) url += `&guildId=${guildId}`;
    return _cached(`events:${guildId}:${offset}`, () => _fetch(url));
  }

  /**
   * Dados de uma guild
   */
  async function getGuild(guildId) {
    return _cached(`guild:${guildId}`, () => _fetch(`${API.GAME}/guilds/${guildId}/data`));
  }

  /**
   * Stats de uma guild
   */
  async function getGuildStats(guildId) {
    return _cached(`guildstats:${guildId}`, () => _fetch(`${API.GAME}/guilds/${guildId}/topKills?range=week&offset=0&limit=11`));
  }

  // ═══════════════════════════════════════════════
  // KILL EVENT — helpers pra regear automático
  // ═══════════════════════════════════════════════

  /**
   * Calcula o valor estimado de um kit a partir do evento de morte
   * Usa os preços de mercado do equipamento
   * @param {Object} deathEvent - evento do gameinfo API
   * @param {Object[]} marketPrices - array de preços já carregados
   */
  async function calcKitValue(deathEvent) {
    const victim = deathEvent.Victim;
    if (!victim?.Equipment) return { total: 0, items: [] };

    const slots = ['MainHand','OffHand','Head','Armor','Shoes','Cape','Bag','Mount'];
    const items = [];
    const itemIds = [];

    for (const slot of slots) {
      const eq = victim.Equipment[slot];
      if (eq?.Type) itemIds.push(eq.Type);
    }

    if (!itemIds.length) return { total: 0, items: [] };

    const prices = await getPrices(itemIds);
    let total = 0;

    for (const slot of slots) {
      const eq = victim.Equipment[slot];
      if (!eq?.Type) continue;
      const price = getBestSellPrice(prices, eq.Type);
      items.push({ slot, itemId: eq.Type, quality: eq.Quality, price });
      total += price;
    }

    return { total, items };
  }

  /**
   * Busca mortes recentes de um player e retorna com valor calculado
   */
  async function getRecentDeathsWithValue(playerId) {
    const deaths = await getPlayerDeaths(playerId, 10);
    const results = [];
    for (const d of deaths) {
      const kit = await calcKitValue(d);
      results.push({ ...d, kitValue: kit.total, kitItems: kit.items });
    }
    return results;
  }

  // ═══════════════════════════════════════════════
  // Expor API pública
  // ═══════════════════════════════════════════════
  return {
    // Market
    getPrices, getItemPrice, getPriceHistory, getGoldPrice,
    getBestSellPrice, getBestBuyPrice, getPriceInCity,
    itemImageUrl,
    // GameInfo
    searchPlayer, getPlayer, getPlayerKills, getPlayerDeaths,
    getBattles, getBattle, getKillEvents, getGuild, getGuildStats,
    // Regear
    calcKitValue, getRecentDeathsWithValue,
  };
})();

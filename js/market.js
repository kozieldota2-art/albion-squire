// ═══════════════════════════════════════════════════
// ALBION SQUIRE — market.js
// 5 módulos de mercado: Craft · Refino · Encantamento · Transporte · Black Market
// ═══════════════════════════════════════════════════

const MarketModule = (() => {

  // ── Estado ──────────────────────────────────────
  let state = {
    activeTab:  'craft',
    mount:      'ox8',
    useFocus:   true,
    filterTier: [6, 7, 8],
    loaded:     {},
  };

  // ── Pesos por tier (kg/unidade) ─────────────────
  const W = {
    raw:     { 4:0.2,  5:0.4,  6:0.8,   7:1.6,   8:3.2  },
    refined: { 4:0.4,  5:0.8,  6:1.6,   7:3.2,   8:6.4  },
    item:    { 4:3.4,  5:6.8,  6:13.6,  7:27.2,  8:54.4 },
  };

  // ── Mounts ──────────────────────────────────────
  const MOUNTS = [
    { id:'horse4', label:'Cavalo T4',    cap:270   },
    { id:'horse8', label:'Cavalo T8',    cap:490   },
    { id:'ox4',    label:'Ox T4',        cap:660   },
    { id:'ox8',    label:'Ox T8',        cap:1370  },
    { id:'tox',    label:'Transport Ox', cap:2750  },
    { id:'mammoth',label:'Mammoth',      cap:8000  },
  ];

  const ALL_CITIES   = ['Fort Sterling','Lymhurst','Bridgewatch','Martlock','Thetford','Caerleon','Brecilien','Black Market'];
  const ROYAL_CITIES = ['Fort Sterling','Lymhurst','Bridgewatch','Martlock','Thetford','Caerleon','Brecilien'];
  const TIERS_IDX    = [4, 5, 6, 7, 8];

  // ── Itens craftáveis — lista completa com nomes oficiais ──
  const CRAFT_ITEMS = [
    // ── SWORDS
    {id:'MAIN_SWORD',          mat:'METALBAR',qty:[16,20,24,28,32],cat:'SWORD',       bestCity:'Lymhurst'     },
    {id:'2H_CLAYMORE',         mat:'METALBAR',qty:[20,24,28,32,36],cat:'SWORD',       bestCity:'Lymhurst'     },
    {id:'2H_DUALSWORD',        mat:'METALBAR',qty:[20,24,28,32,36],cat:'SWORD',       bestCity:'Lymhurst'     },
    // ── AXES
    {id:'MAIN_AXE',            mat:'METALBAR',qty:[16,20,24,28,32],cat:'AXE',         bestCity:'Martlock'     },
    {id:'2H_AXE',              mat:'METALBAR',qty:[20,24,28,32,36],cat:'AXE',         bestCity:'Martlock'     },
    // ── MACES / HAMMERS
    {id:'MAIN_MACE',           mat:'METALBAR',qty:[16,20,24,28,32],cat:'MACE',        bestCity:'Thetford'     },
    {id:'MAIN_HAMMER',         mat:'METALBAR',qty:[16,20,24,28,32],cat:'HAMMER',      bestCity:'Fort Sterling'},
    {id:'2H_FLAIL',            mat:'METALBAR',qty:[20,24,28,32,36],cat:'MACE',        bestCity:'Thetford'     },
    {id:'2H_HAMMER',           mat:'METALBAR',qty:[20,24,28,32,36],cat:'HAMMER',      bestCity:'Fort Sterling'},
    {id:'2H_POLEHAMMER',       mat:'METALBAR',qty:[20,24,28,32,36],cat:'HAMMER',      bestCity:'Fort Sterling'},
    // ── SPEARS
    {id:'MAIN_SPEAR',          mat:'METALBAR',qty:[16,20,24,28,32],cat:'SPEAR',       bestCity:'Fort Sterling'},
    {id:'2H_GLAIVE',           mat:'METALBAR',qty:[20,24,28,32,36],cat:'SPEAR',       bestCity:'Fort Sterling'},
    {id:'2H_HALBERD',          mat:'METALBAR',qty:[20,24,28,32,36],cat:'SPEAR',       bestCity:'Fort Sterling'},
    // ── DAGGERS
    {id:'MAIN_DAGGER',         mat:'METALBAR',qty:[16,20,24,28,32],cat:'DAGGER',      bestCity:'Bridgewatch'  },
    {id:'2H_DAGGERPAIR',       mat:'METALBAR',qty:[20,24,28,32,36],cat:'DAGGER',      bestCity:'Bridgewatch'  },
    {id:'2H_CLAWPAIR',         mat:'METALBAR',qty:[20,24,28,32,36],cat:'DAGGER',      bestCity:'Bridgewatch'  },
    // ── QUARTERSTAVES
    {id:'2H_QUARTERSTAFF',     mat:'PLANKS',  qty:[20,24,28,32,36],cat:'QUARTERSTAFF',bestCity:'Martlock'     },
    {id:'2H_IRONCLADEDSTAFF',  mat:'PLANKS',  qty:[20,24,28,32,36],cat:'QUARTERSTAFF',bestCity:'Martlock'     },
    {id:'2H_DOUBLEBLADEDSTAFF',mat:'PLANKS',  qty:[20,24,28,32,36],cat:'QUARTERSTAFF',bestCity:'Martlock'     },
    // ── BOWS
    {id:'2H_BOW',              mat:'PLANKS',  qty:[20,24,28,32,36],cat:'BOW',         bestCity:'Lymhurst'     },
    {id:'2H_WARBOW',           mat:'PLANKS',  qty:[20,24,28,32,36],cat:'BOW',         bestCity:'Lymhurst'     },
    {id:'2H_LONGBOW',          mat:'PLANKS',  qty:[20,24,28,32,36],cat:'BOW',         bestCity:'Lymhurst'     },
    // ── CROSSBOWS
    {id:'MAIN_1HCROSSBOW',     mat:'PLANKS',  qty:[16,20,24,28,32],cat:'CROSSBOW',    bestCity:'Bridgewatch'  },
    {id:'2H_CROSSBOW',         mat:'PLANKS',  qty:[20,24,28,32,36],cat:'CROSSBOW',    bestCity:'Bridgewatch'  },
    {id:'2H_CROSSBOWLARGE',    mat:'PLANKS',  qty:[20,24,28,32,36],cat:'CROSSBOW',    bestCity:'Bridgewatch'  },
    // ── ARCANE STAFFS
    {id:'MAIN_ARCANESTAFF',    mat:'PLANKS',  qty:[16,20,24,28,32],cat:'ARCANE',      bestCity:'Lymhurst'     },
    {id:'2H_ARCANESTAFF',      mat:'PLANKS',  qty:[20,24,28,32,36],cat:'ARCANE',      bestCity:'Lymhurst'     },
    {id:'2H_ENIGMATICSTAFF',   mat:'PLANKS',  qty:[20,24,28,32,36],cat:'ARCANE',      bestCity:'Lymhurst'     },
    // ── CURSED STAFFS
    {id:'MAIN_CURSEDSTAFF',    mat:'PLANKS',  qty:[16,20,24,28,32],cat:'CURSED',      bestCity:'Bridgewatch'  },
    {id:'2H_CURSEDSTAFF',      mat:'PLANKS',  qty:[20,24,28,32,36],cat:'CURSED',      bestCity:'Bridgewatch'  },
    {id:'2H_DEMONICSTAFF',     mat:'PLANKS',  qty:[20,24,28,32,36],cat:'CURSED',      bestCity:'Bridgewatch'  },
    // ── FIRE STAFFS
    {id:'MAIN_FIRESTAFF',      mat:'PLANKS',  qty:[16,20,24,28,32],cat:'FIRE',        bestCity:'Thetford'     },
    {id:'2H_FIRESTAFF',        mat:'PLANKS',  qty:[20,24,28,32,36],cat:'FIRE',        bestCity:'Thetford'     },
    {id:'2H_INFERNOSTAFF',     mat:'PLANKS',  qty:[20,24,28,32,36],cat:'FIRE',        bestCity:'Thetford'     },
    // ── FROST STAFFS
    {id:'MAIN_FROSTSTAFF',     mat:'PLANKS',  qty:[16,20,24,28,32],cat:'FROST',       bestCity:'Martlock'     },
    {id:'2H_FROSTSTAFF',       mat:'PLANKS',  qty:[20,24,28,32,36],cat:'FROST',       bestCity:'Martlock'     },
    {id:'2H_GLACIALSTAFF',     mat:'PLANKS',  qty:[20,24,28,32,36],cat:'FROST',       bestCity:'Martlock'     },
    // ── HOLY STAFFS
    {id:'MAIN_HOLYSTAFF',      mat:'PLANKS',  qty:[16,20,24,28,32],cat:'HOLY',        bestCity:'Fort Sterling'},
    {id:'2H_HOLYSTAFF',        mat:'PLANKS',  qty:[20,24,28,32,36],cat:'HOLY',        bestCity:'Fort Sterling'},
    {id:'2H_DIVINESTAFF',      mat:'PLANKS',  qty:[20,24,28,32,36],cat:'HOLY',        bestCity:'Fort Sterling'},
    // ── NATURE STAFFS
    {id:'MAIN_NATURESTAFF',    mat:'PLANKS',  qty:[16,20,24,28,32],cat:'NATURE',      bestCity:'Thetford'     },
    {id:'2H_NATURESTAFF',      mat:'PLANKS',  qty:[20,24,28,32,36],cat:'NATURE',      bestCity:'Thetford'     },
    {id:'2H_WILDSTAFF',        mat:'PLANKS',  qty:[20,24,28,32,36],cat:'NATURE',      bestCity:'Thetford'     },
    // ── WAR GLOVES
    {id:'2H_KNUCKLES_SET1',    mat:'METALBAR',qty:[20,24,28,32,36],cat:'WAR_GLOVES',  bestCity:'Caerleon'     },
    {id:'2H_KNUCKLES_SET2',    mat:'METALBAR',qty:[20,24,28,32,36],cat:'WAR_GLOVES',  bestCity:'Caerleon'     },
    {id:'2H_KNUCKLES_SET3',    mat:'METALBAR',qty:[20,24,28,32,36],cat:'WAR_GLOVES',  bestCity:'Caerleon'     },
    // ── PLATE ARMOR (SET1, SET2, SET3)
    {id:'HEAD_PLATE_SET1',     mat:'METALBAR',qty:[12,15,18,21,24],cat:'HEAD_PLATE',  bestCity:'Fort Sterling'},
    {id:'ARMOR_PLATE_SET1',    mat:'METALBAR',qty:[16,20,24,28,32],cat:'ARMOR_PLATE', bestCity:'Bridgewatch'  },
    {id:'SHOES_PLATE_SET1',    mat:'METALBAR',qty:[12,15,18,21,24],cat:'SHOES_PLATE', bestCity:'Martlock'     },
    {id:'HEAD_PLATE_SET2',     mat:'METALBAR',qty:[12,15,18,21,24],cat:'HEAD_PLATE',  bestCity:'Fort Sterling'},
    {id:'ARMOR_PLATE_SET2',    mat:'METALBAR',qty:[16,20,24,28,32],cat:'ARMOR_PLATE', bestCity:'Bridgewatch'  },
    {id:'SHOES_PLATE_SET2',    mat:'METALBAR',qty:[12,15,18,21,24],cat:'SHOES_PLATE', bestCity:'Martlock'     },
    {id:'HEAD_PLATE_SET3',     mat:'METALBAR',qty:[12,15,18,21,24],cat:'HEAD_PLATE',  bestCity:'Fort Sterling'},
    {id:'ARMOR_PLATE_SET3',    mat:'METALBAR',qty:[16,20,24,28,32],cat:'ARMOR_PLATE', bestCity:'Bridgewatch'  },
    {id:'SHOES_PLATE_SET3',    mat:'METALBAR',qty:[12,15,18,21,24],cat:'SHOES_PLATE', bestCity:'Martlock'     },
    // ── LEATHER ARMOR (SET1, SET2, SET3)
    {id:'HEAD_LEATHER_SET1',   mat:'LEATHER', qty:[12,15,18,21,24],cat:'HEAD_LEATHER',bestCity:'Lymhurst'     },
    {id:'ARMOR_LEATHER_SET1',  mat:'LEATHER', qty:[16,20,24,28,32],cat:'ARMOR_LEATHER',bestCity:'Thetford'   },
    {id:'SHOES_LEATHER_SET1',  mat:'LEATHER', qty:[12,15,18,21,24],cat:'SHOES_LEATHER',bestCity:'Lymhurst'   },
    {id:'HEAD_LEATHER_SET2',   mat:'LEATHER', qty:[12,15,18,21,24],cat:'HEAD_LEATHER',bestCity:'Lymhurst'     },
    {id:'ARMOR_LEATHER_SET2',  mat:'LEATHER', qty:[16,20,24,28,32],cat:'ARMOR_LEATHER',bestCity:'Thetford'   },
    {id:'SHOES_LEATHER_SET2',  mat:'LEATHER', qty:[12,15,18,21,24],cat:'SHOES_LEATHER',bestCity:'Lymhurst'   },
    {id:'HEAD_LEATHER_SET3',   mat:'LEATHER', qty:[12,15,18,21,24],cat:'HEAD_LEATHER',bestCity:'Lymhurst'     },
    {id:'ARMOR_LEATHER_SET3',  mat:'LEATHER', qty:[16,20,24,28,32],cat:'ARMOR_LEATHER',bestCity:'Thetford'   },
    {id:'SHOES_LEATHER_SET3',  mat:'LEATHER', qty:[12,15,18,21,24],cat:'SHOES_LEATHER',bestCity:'Lymhurst'   },
    // ── CLOTH ARMOR (SET1, SET2, SET3)
    {id:'HEAD_CLOTH_SET1',     mat:'CLOTH',   qty:[12,15,18,21,24],cat:'HEAD_CLOTH',  bestCity:'Thetford'     },
    {id:'ARMOR_CLOTH_SET1',    mat:'CLOTH',   qty:[16,20,24,28,32],cat:'ARMOR_CLOTH', bestCity:'Fort Sterling'},
    {id:'SHOES_CLOTH_SET1',    mat:'CLOTH',   qty:[12,15,18,21,24],cat:'SHOES_CLOTH', bestCity:'Bridgewatch'  },
    {id:'HEAD_CLOTH_SET2',     mat:'CLOTH',   qty:[12,15,18,21,24],cat:'HEAD_CLOTH',  bestCity:'Thetford'     },
    {id:'ARMOR_CLOTH_SET2',    mat:'CLOTH',   qty:[16,20,24,28,32],cat:'ARMOR_CLOTH', bestCity:'Fort Sterling'},
    {id:'SHOES_CLOTH_SET2',    mat:'CLOTH',   qty:[12,15,18,21,24],cat:'SHOES_CLOTH', bestCity:'Bridgewatch'  },
    {id:'HEAD_CLOTH_SET3',     mat:'CLOTH',   qty:[12,15,18,21,24],cat:'HEAD_CLOTH',  bestCity:'Thetford'     },
    {id:'ARMOR_CLOTH_SET3',    mat:'CLOTH',   qty:[16,20,24,28,32],cat:'ARMOR_CLOTH', bestCity:'Fort Sterling'},
    {id:'SHOES_CLOTH_SET3',    mat:'CLOTH',   qty:[12,15,18,21,24],cat:'SHOES_CLOTH', bestCity:'Bridgewatch'  },
  ];

  // ── Refino BOM real ─────────────────────────────
  // T4: 2x T3_refined + 3x T4_raw → 1x T4
  // T5: 2x T4_refined + 4x T5_raw → 1x T5
  // T6: 2x T5_refined + 5x T6_raw → 1x T6
  // T7: 2x T6_refined + 6x T7_raw → 1x T7
  // T8: 2x T7_refined + 7x T8_raw → 1x T8
  const REFINE_ITEMS = [
    { refined:'METALBAR',   raw:'ORE',   label:'Barra Metal',   city:'Thetford',      cat:'METALBAR',   rawQty:[3,4,5,6,7], subQty:2 },
    { refined:'LEATHER',    raw:'HIDE',  label:'Couro',         city:'Martlock',      cat:'LEATHER',    rawQty:[3,4,5,6,7], subQty:2 },
    { refined:'CLOTH',      raw:'FIBER', label:'Tecido',        city:'Lymhurst',      cat:'CLOTH',      rawQty:[3,4,5,6,7], subQty:2 },
    { refined:'PLANKS',     raw:'WOOD',  label:'Tábua',         city:'Fort Sterling', cat:'PLANKS',     rawQty:[3,4,5,6,7], subQty:2 },
    { refined:'STONEBLOCK', raw:'ROCK',  label:'Bloco Pedra',   city:'Bridgewatch',   cat:'STONEBLOCK', rawQty:[3,4,5,6,7], subQty:2 },
  ];

  const RAW_IDS      = ['ORE','HIDE','FIBER','WOOD','ROCK'];
  const REFINED_IDS  = ['METALBAR','LEATHER','CLOTH','PLANKS','STONEBLOCK'];

  // ── Nome oficial do item ─────────────────────────
  function getItemName(itemId) {
    if (!itemId) return itemId;
    // Remove enchant suffix
    const base = itemId.replace(/@\d$/, '');
    // Try exact match
    if (typeof ITEM_NAMES !== 'undefined') {
      if (ITEM_NAMES[base]) return ITEM_NAMES[base];
      // Try with T4 prefix (names are tier-independent)
      const t4key = base.replace(/^T\d_/, 'T4_');
      if (ITEM_NAMES[t4key]) return ITEM_NAMES[t4key];
    }
    // Fallback: clean up the ID
    return base.replace(/^T\d_/, '').replace(/_/g, ' ');
  }

  // ── Helpers ─────────────────────────────────────
  function fmt(n) {
    if (!n || n <= 0) return '—';
    if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(2)+'M';
    if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(0)+'K';
    return Math.round(n).toLocaleString('pt-BR');
  }
  function fmtPct(n) { return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'; }

  function liqBadge(vol) {
    if (vol > 50) return '<span class="badge green">🟢 Alta</span>';
    if (vol > 10) return '<span class="badge gold">🟡 Média</span>';
    return '<span class="badge red">🔴 Baixa</span>';
  }
  function spreadBadge(s) {
    if (s < 15) return `<span class="badge green">🟢 ${s.toFixed(0)}%</span>`;
    if (s < 40) return `<span class="badge gold">🟡 ${s.toFixed(0)}%</span>`;
    return `<span class="badge red">🔴 ${s.toFixed(0)}%</span>`;
  }
  function scoreStar(s) {
    if (s >= 70) return '⭐⭐⭐';
    if (s >= 40) return '⭐⭐';
    return '⭐';
  }

  function weightedPrice(min, max, avg) {
    if (!avg || avg <= 0) avg = (min + max) / 2 || min;
    return (avg * 0.50) + (min * 0.30) + (max * 0.20);
  }

  function calcScore(profitPerKg, volume, spread) {
    const ps = Math.min(profitPerKg / 2000 * 40, 40);
    const vs = Math.min((volume || 20) / 50 * 35, 35);
    const ss = spread < 15 ? 25 : spread < 40 ? 15 : 5;
    return Math.round(ps + vs + ss);
  }

  function bestBuyRow(prices, itemId) {
    const rows = prices.filter(p => p.item_id === itemId && p.sell_price_min > 0);
    if (!rows.length) return null;
    return rows.reduce((a,b) => b.sell_price_min < a.sell_price_min ? b : a);
  }

  function bestSellRow(prices, itemId, excludeCity) {
    const rows = prices.filter(p =>
      p.item_id === itemId && p.buy_price_max > 0 &&
      (!excludeCity || p.city !== excludeCity)
    );
    if (!rows.length) return null;
    return rows.reduce((a,b) => b.buy_price_max > a.buy_price_max ? b : a);
  }

  function itemWeight(itemId, tier) {
    const t = tier || parseInt(itemId.match(/T(\d)/)?.[1] || '6');
    if (RAW_IDS.some(r => itemId.includes('_'+r))) return W.raw[t] || 0.8;
    if (REFINED_IDS.some(r => itemId.includes('_'+r))) return W.refined[t] || 1.6;
    return W.item[t] || 13.6;
  }

  // ── API fetch ───────────────────────────────────
  async function fetchPrices(itemIds, cities) {
    const cityStr = cities.join(',');
    const unique  = [...new Set(itemIds)];
    const chunks  = [];
    for (let i = 0; i < unique.length; i += 50) chunks.push(unique.slice(i, i+50));

    const results = [];
    for (const chunk of chunks) {
      try {
        const url  = `${API.MARKET}/prices/${chunk.join(',')}.json?locations=${cityStr}&qualities=1`;
        const data = await fetch(url).then(r => r.json());
        results.push(...(Array.isArray(data) ? data : []));
      } catch(e) { console.warn('Price fetch:', e.message); }
    }
    return results;
  }

  // Fetch history (avg_price + item_count) for top candidates
  async function fetchHistory(itemIds, cities) {
    const histMap = {}; // key: "itemId:city" → {avgPrice, volume}
    const unique  = [...new Set(itemIds)];
    const chunks  = [];
    for (let i = 0; i < unique.length; i += 20) chunks.push(unique.slice(i, i+20));

    for (const chunk of chunks) {
      for (const city of cities) {
        try {
          const url  = `${API.MARKET}/history/${chunk.join(',')}.json?locations=${city}&time-scale=24&qualities=1`;
          const data = await fetch(url).then(r => r.json());
          if (!Array.isArray(data)) continue;
          for (const row of data) {
            if (!row.data?.length) continue;
            const recent = row.data.slice(-3); // last 3 data points (last 72h)
            const avgPrice = recent.reduce((s,d) => s + d.avg_price, 0) / recent.length;
            const volume   = recent.reduce((s,d) => s + d.item_count, 0);
            histMap[`${row.item_id}:${row.location}`] = { avgPrice: Math.round(avgPrice), volume };
          }
        } catch(e) { /* silent */ }
      }
    }
    return histMap;
  }

  // Get weighted price: avg×0.5 + min×0.3 + max×0.2
  function wPrice(min, max, avg) {
    if (!avg || avg <= 0) avg = min;
    return Math.round(avg * 0.5 + min * 0.3 + max * 0.2);
  }

  // Spread: (max-min)/avg × 100
  function calcSpread(min, max, avg) {
    if (!avg || avg <= 0 || !min) return 999;
    return ((max - min) / avg) * 100;
  }

  // ── Loading UI ──────────────────────────────────
  function setLoading(tbodyId, cols) {
    const el = document.getElementById(tbodyId);
    if (el) el.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:40px;color:var(--teal);font-size:12px;letter-spacing:1px;">
      <i class="ti ti-loader" style="font-size:20px;display:block;margin-bottom:8px;" aria-hidden="true"></i>
      Buscando preços na API...</td></tr>`;
  }

  function setError(tbodyId, cols, msg) {
    const el = document.getElementById(tbodyId);
    if (el) el.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:24px;color:var(--red);">${msg}</td></tr>`;
  }

  // ═══════════════════════════════════════════════
  // TAB 1 — RANK CRAFT
  // ═══════════════════════════════════════════════
  async function loadCraft() {
    setLoading('market-craft-tbody', 13);
    const tiers = state.filterTier;

    const ids = [];
    for (const item of CRAFT_ITEMS) {
      for (const t of tiers) {
        ids.push(`T${t}_${item.id}`, `T${t}_${item.mat}`);
        for (const e of [1,2,3]) ids.push(`T${t}_${item.id}@${e}`);
      }
    }

    try {
      const prices = await fetchPrices([...new Set(ids)], ALL_CITIES);

      // Collect top candidates first (quick pass)
      const candidates = [];
      for (const item of CRAFT_ITEMS) {
        for (const tier of tiers) {
          const ti = TIERS_IDX.indexOf(tier);
          if (ti < 0) continue;

          for (const enchant of [0,1,2,3]) {
            const eSfx   = enchant > 0 ? `@${enchant}` : '';
            const itemId = `T${tier}_${item.id}${eSfx}`;
            const matId  = `T${tier}_${item.mat}`;

            const matRow  = bestBuyRow(prices, matId);
            if (!matRow || !matRow.sell_price_min) continue;

            const sellRow = bestSellRow(prices, itemId);
            if (!sellRow || !sellRow.buy_price_max) continue;

            candidates.push({ item, tier, ti, enchant, itemId, matId, matRow, sellRow });
          }
        }
      }

      // Fetch history for top item IDs only (limit API calls)
      const topItemIds = [...new Set(candidates.map(c => c.itemId))].slice(0, 60);
      const topMatIds  = [...new Set(candidates.map(c => c.matId))].slice(0, 20);
      const hist = await fetchHistory([...topItemIds, ...topMatIds], ROYAL_CITIES.slice(0,5));

      const results = [];
      for (const c of candidates) {
        const { item, tier, ti, enchant, itemId, matId, matRow, sellRow } = c;
        const qty = item.qty[ti];

        // Material price detail
        const matMin   = matRow.sell_price_min;
        const matMax   = matRow.sell_price_max || matMin;
        const matHist  = hist[`${matId}:${matRow.city}`] || {};
        const matAvg   = matHist.avgPrice || matMin;
        const matVol   = matHist.volume   || 0;
        const matSprd  = calcSpread(matMin, matMax, matAvg);
        const matWP    = wPrice(matMin, matMax, matAvg);

        // Sell price detail
        const sellMin  = sellRow.sell_price_min || sellRow.buy_price_max;
        const sellMax  = sellRow.sell_price_max || sellRow.buy_price_max;
        const sellHist = hist[`${itemId}:${sellRow.city}`] || {};
        const sellAvg  = sellHist.avgPrice || sellRow.buy_price_max;
        const sellVol  = sellHist.volume   || 0;
        const sellSprd = calcSpread(sellMin, sellMax, sellAvg);
        const sellWP   = wPrice(sellRow.buy_price_max, sellMax, sellAvg);

        const matCost  = matWP * qty;
        const { profit, margin, rrr } = calcProfit(
          sellWP, matCost, item.bestCity, item.cat, false, state.useFocus
        );

        // Score: weight profit by volume and stability
        const volScore  = Math.min(sellVol / 30, 1);
        const stabScore = sellSprd < 40 ? 1 : 0.5;
        const score     = calcScore(profit / (W.item[tier] || 13.6), sellVol, sellSprd);

        results.push({
          itemId, matId, tier, enchant,
          name: getItemName(itemId),
          matName: getItemName(matId),
          craftCity: item.bestCity,
          matCity: matRow.city, matMin, matMax, matAvg, matVol, matSprd, matWP,
          sellCity: sellRow.city, sellMin, sellMax, sellAvg, sellVol, sellSprd, sellWP,
          matCost, profit, margin, rrr, score,
          img: AlbionAPI.itemImageUrl(itemId),
        });
      }

      results.sort((a,b) => b.profit - a.profit);
      const tbody = document.getElementById('market-craft-tbody');
      if (!tbody) return;

      if (!results.length) {
        tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;padding:24px;color:var(--text-muted);">Nenhum item lucrativo nos tiers selecionados.</td></tr>`;
        return;
      }

      tbody.innerHTML = results.slice(0,100).map((r,i) => {
        const enchStr = r.enchant > 0 ? ` .${r.enchant}` : '';
        return `
        <tr>
          <td class="rank${i===0?' top1':''}">${i+1}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <img src="${r.img}" width="28" height="28" style="border-radius:3px;background:var(--surface-3);" onerror="this.style.display='none'">
              <div>
                <div class="item-name">T${r.tier}${enchStr} ${r.name}</div>
                <div class="item-sub">Craft: ${r.craftCity} · RRR ${(r.rrr*100).toFixed(1)}%</div>
              </div>
            </div>
          </td>
          <td style="font-size:10px;color:var(--text-2);">${r.matCity}</td>
          <td class="right" style="font-size:11px;">
            <div style="color:var(--green);">${fmt(r.matMin)}</div>
            <div style="color:var(--text-muted);font-size:9px;">${fmt(r.matAvg)} avg · ${fmt(r.matMax)} max</div>
          </td>
          <td class="right" style="font-size:10px;">${spreadBadge(r.matSprd)}</td>
          <td class="right">${liqBadge(r.matVol)}</td>
          <td class="right muted">${fmt(r.matCost)}</td>
          <td style="font-size:10px;color:var(--text-2);">${r.sellCity}</td>
          <td class="right" style="font-size:11px;">
            <div style="color:var(--gold);">${fmt(r.sellWP)}</div>
            <div style="color:var(--text-muted);font-size:9px;">${fmt(r.sellAvg)} avg · ${fmt(r.sellMax)} max</div>
          </td>
          <td class="right" style="font-size:10px;">${spreadBadge(r.sellSprd)}</td>
          <td class="right">${liqBadge(r.sellVol)}</td>
          <td class="right" style="color:${r.profit>=0?'var(--gold)':'var(--red)'};font-weight:700;">${fmt(r.profit)}</td>
          <td class="right"><span class="badge ${r.margin>=0?'green':'red'}">${fmtPct(r.margin)}</span></td>
        </tr>`;
      }).join('');
    } catch(e) {
      console.error(e);
      setError('market-craft-tbody', 13, 'Erro: ' + e.message);
    }
  }

    const ids = [];
    for (const item of CRAFT_ITEMS) {
      for (const t of tiers) {
        ids.push(`T${t}_${item.id}`, `T${t}_${item.mat}`);
      }
    }

    try {
      const prices  = await fetchPrices(ids, ALL_CITIES);
      const results = [];

      for (const item of CRAFT_ITEMS) {
        for (const tier of tiers) {
          const ti     = TIERS_IDX.indexOf(tier);
          if (ti < 0) continue;
          const itemId = `T${tier}_${item.id}`;
          const matId  = `T${tier}_${item.mat}`;
          const qty    = item.qty[ti];

          const matRow = bestBuyRow(prices, matId);
          if (!matRow) continue;

          const matCost = matRow.sell_price_min * qty;

          // Vender no melhor destino
          const sellRow = bestSellRow(prices, itemId);
          if (!sellRow) continue;

          const { profit, margin, rrr } = calcProfit(
            sellRow.buy_price_max, matCost, item.city, item.cat, false, state.useFocus
          );
          if (profit <= 0) continue;

          const weight  = W.item[tier] || 13.6;
          const ppkg    = profit / weight;
          const matSprd = matRow.sell_price_max > 0
            ? ((matRow.sell_price_max - matRow.sell_price_min) / matRow.sell_price_min * 100)
            : 30;

          results.push({
            itemId, label: item.label, tier,
            craftCity: item.city, matCity: matRow.city, sellCity: sellRow.city,
            matPrice: matRow.sell_price_min, matCost,
            sellPrice: sellRow.buy_price_max,
            profit, margin, rrr, weight, ppkg,
            spread: matSprd, score: calcScore(ppkg, 30, matSprd),
            img: AlbionAPI.itemImageUrl(itemId),
          });
        }
      }

      results.sort((a,b) => b.profit - a.profit);
      const tbody = document.getElementById('market-craft-tbody');
      if (!tbody) return;

      tbody.innerHTML = results.slice(0,100).map((r,i) => `
      <tr>
        <td class="rank${i===0?' top1':''}">${i+1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <img src="${r.img}" width="28" height="28" style="border-radius:3px;background:var(--surface-3);" onerror="this.style.display='none'">
            <div><div class="item-name">T${r.tier} ${r.label}</div>
            <div class="item-sub">Craftar: ${r.craftCity} · RRR ${(r.rrr*100).toFixed(1)}%</div></div>
          </div>
        </td>
        <td style="font-size:11px;color:var(--text-2);">${r.matCity}</td>
        <td class="right muted">${fmt(r.matPrice)}</td>
        <td class="right muted">${fmt(r.matCost)}</td>
        <td style="font-size:11px;color:var(--text-2);">${r.sellCity}</td>
        <td class="right muted">${fmt(r.sellPrice)}</td>
        <td class="right gold">${fmt(r.profit)}</td>
        <td class="right"><span class="badge ${r.margin>=0?'green':'red'}">${fmtPct(r.margin)}</span></td>
        <td class="right" style="font-size:11px;color:var(--text-muted);">${fmt(r.ppkg)}/kg</td>
      </tr>`).join('') || `<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--text-muted);">Nenhum item lucrativo nos tiers selecionados.</td></tr>`;
    } catch(e) {
      setError('market-craft-tbody', 10, 'Erro ao buscar dados: ' + e.message);
    }
  }

  // ═══════════════════════════════════════════════
  // TAB 2 — RANK REFINO
  // ═══════════════════════════════════════════════
  async function loadRefining() {
    setLoading('market-refine-tbody', 10);
    const tiers = state.filterTier;
    const ids   = [];

    for (const item of REFINE_ITEMS) {
      for (const t of tiers) {
        ids.push(`T${t}_${item.refined}`, `T${t}_${item.raw}`);
        if (t > 4) ids.push(`T${t-1}_${item.refined}`);
        for (const e of [1,2,3]) {
          ids.push(`T${t}_${item.raw}@${e}`, `T${t}_${item.refined}@${e}`);
          if (t > 4) ids.push(`T${t-1}_${item.refined}@${e}`);
        }
      }
    }

    try {
      const prices  = await fetchPrices(ids, ALL_CITIES);
      const results = [];

      for (const item of REFINE_ITEMS) {
        for (const tier of tiers) {
          const ti = TIERS_IDX.indexOf(tier);
          if (ti < 0) continue;

          for (const enchant of [0,1,2,3]) {
            const eSfx      = enchant > 0 ? `@${enchant}` : '';
            const eSubSfx   = enchant > 0 ? `@${enchant}` : '';
            const refinedId = `T${tier}_${item.refined}${eSfx}`;
            const rawId     = `T${tier}_${item.raw}${eSfx}`;
            const subId     = tier > 4 ? `T${tier-1}_${item.refined}${eSubSfx}` : null;

            const rawRow  = bestBuyRow(prices, rawId);
            const subRow  = subId ? bestBuyRow(prices, subId) : null;
            const sellRow = bestSellRow(prices, refinedId);

            if (!rawRow || !sellRow) continue;

            const rawQty  = item.rawQty[ti];
            const rawCost = rawRow.sell_price_min * rawQty;
            const subCost = subRow ? subRow.sell_price_min * item.subQty : 0;
            const total   = rawCost + subCost;

            const { profit, margin, rrr } = calcProfit(
              sellRow.buy_price_max, total, item.city, item.cat, true, state.useFocus
            );
            if (profit <= 0) continue;

            const weight = W.refined[tier] || 1.6;
            const ppkg   = profit / weight;
            const spread = rawRow.sell_price_max > 0
              ? ((rawRow.sell_price_max - rawRow.sell_price_min) / (rawRow.sell_price_min || 1) * 100)
              : 30;

            results.push({
              refinedId, label: `${item.label}${enchant>0?' .'+enchant:''}`, tier, enchant,
              refineCity: item.city, rawCity: rawRow.city,
              subCity: subRow?.city || '—', sellCity: sellRow.city,
              rawPrice: rawRow.sell_price_min, rawQty, subCost, total,
              sellPrice: sellRow.buy_price_max,
              profit, margin, rrr, weight, ppkg,
              spread, score: calcScore(ppkg, 40, spread),
              img: AlbionAPI.itemImageUrl(refinedId),
            });
          }
        }
      }

      results.sort((a,b) => b.profit - a.profit);
      const tbody = document.getElementById('market-refine-tbody');
      if (!tbody) return;

      tbody.innerHTML = results.slice(0,100).map((r,i) => `
      <tr>
        <td class="rank${i===0?' top1':''}">${i+1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <img src="${r.img}" width="28" height="28" style="border-radius:3px;background:var(--surface-3);" onerror="this.style.display='none'">
            <div><div class="item-name">T${r.tier} ${r.label}</div>
            <div class="item-sub">Refinar: ${r.refineCity} · RRR ${(r.rrr*100).toFixed(1)}%</div></div>
          </div>
        </td>
        <td style="font-size:11px;color:var(--text-2);">${r.rawCity}</td>
        <td class="right muted">${fmt(r.rawPrice)}</td>
        <td class="right muted">×${r.rawQty} + ${fmt(r.subCost)}</td>
        <td class="right muted">${fmt(r.total)}</td>
        <td style="font-size:11px;color:var(--text-2);">${r.sellCity}</td>
        <td class="right muted">${fmt(r.sellPrice)}</td>
        <td class="right gold">${fmt(r.profit)}</td>
        <td class="right"><span class="badge ${r.margin>=0?'green':'red'}">${fmtPct(r.margin)}</span></td>
      </tr>`).join('') || `<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--text-muted);">Nenhum refino lucrativo.</td></tr>`;
    } catch(e) {
      setError('market-refine-tbody', 10, 'Erro: ' + e.message);
    }
  }

  // ═══════════════════════════════════════════════
  // TAB 3 — RANK ENCANTAMENTO
  // runes/souls/relics = craft_mats × 6
  // ═══════════════════════════════════════════════
  async function loadEnchanting() {
    setLoading('market-enchant-tbody', 10);
    const tiers = state.filterTier;
    const ids   = [];

    for (const item of CRAFT_ITEMS) {
      for (const t of tiers) {
        ids.push(`T${t}_${item.id}`);
        for (const e of [1,2,3]) ids.push(`T${t}_${item.id}@${e}`);
      }
    }
    for (const t of tiers) {
      ids.push(`T${t}_RUNE`, `T${t}_SOUL`, `T${t}_RELIC`);
    }

    const STEPS = [
      { from:0, to:1, mat:'RUNE',  label:'.0 → .1' },
      { from:1, to:2, mat:'SOUL',  label:'.1 → .2' },
      { from:2, to:3, mat:'RELIC', label:'.2 → .3' },
    ];

    try {
      const prices  = await fetchPrices(ids, ALL_CITIES);
      const results = [];

      for (const item of CRAFT_ITEMS) {
        for (const tier of tiers) {
          const ti    = TIERS_IDX.indexOf(tier);
          if (ti < 0) continue;
          const mats  = item.qty[ti];
          const rQty  = mats * 6;

          for (const step of STEPS) {
            const fromId = step.from === 0 ? `T${tier}_${item.id}` : `T${tier}_${item.id}@${step.from}`;
            const toId   = `T${tier}_${item.id}@${step.to}`;
            const matId  = `T${tier}_${step.mat}`;

            const fromRow = bestBuyRow(prices, fromId);
            const matRow  = bestBuyRow(prices, matId);
            const toRow   = bestSellRow(prices, toId);

            if (!fromRow || !matRow || !toRow) continue;

            const inputCost = fromRow.sell_price_min + matRow.sell_price_min * rQty;
            const netSell   = toRow.buy_price_max * 0.97;
            const profit    = netSell - inputCost;
            if (profit <= 0) continue;

            const margin = (profit / inputCost) * 100;
            const weight = W.item[tier] || 13.6;
            const ppkg   = profit / weight;

            results.push({
              toId, label: `${item.label} T${tier} ${step.label}`, tier, step: step.label,
              fromCity: fromRow.city, fromPrice: fromRow.sell_price_min,
              matCity: matRow.city,  matPrice: matRow.sell_price_min, rQty, matId,
              toCity: toRow.city,    toPrice: toRow.buy_price_max,
              inputCost, profit, margin, weight, ppkg,
              score: calcScore(ppkg, 20, 20),
              img: AlbionAPI.itemImageUrl(toId),
            });
          }
        }
      }

      results.sort((a,b) => b.profit - a.profit);
      const tbody = document.getElementById('market-enchant-tbody');
      if (!tbody) return;

      tbody.innerHTML = results.slice(0,100).map((r,i) => `
      <tr>
        <td class="rank${i===0?' top1':''}">${i+1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <img src="${r.img}" width="28" height="28" style="border-radius:3px;background:var(--surface-3);" onerror="this.style.display='none'">
            <div><div class="item-name">${r.label}</div>
            <div class="item-sub">${r.rQty}× ${r.matId.split('_').pop()}</div></div>
          </div>
        </td>
        <td style="font-size:11px;color:var(--text-2);">${r.fromCity}</td>
        <td class="right muted">${fmt(r.fromPrice)}</td>
        <td style="font-size:11px;color:var(--text-2);">${r.matCity}</td>
        <td class="right muted">${fmt(r.matPrice * r.rQty)}</td>
        <td class="right muted">${fmt(r.inputCost)}</td>
        <td style="font-size:11px;color:var(--text-2);">${r.toCity}</td>
        <td class="right gold">${fmt(r.profit)}</td>
        <td class="right"><span class="badge ${r.margin>=0?'green':'red'}">${fmtPct(r.margin)}</span></td>
      </tr>`).join('') || `<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--text-muted);">Nenhuma oportunidade de encantamento.</td></tr>`;
    } catch(e) {
      setError('market-enchant-tbody', 10, 'Erro: ' + e.message);
    }
  }

  // ═══════════════════════════════════════════════
  // TAB 4 — RANK TRANSPORTE
  // ═══════════════════════════════════════════════
  async function loadTransport() {
    setLoading('market-transport-tbody', 17);
    const tiers = state.filterTier;
    const mount = MOUNTS.find(m => m.id === state.mount) || MOUNTS[3];
    const ids   = [];

    for (const t of tiers) {
      for (const r of RAW_IDS)     ids.push(`T${t}_${r}`);
      for (const r of REFINED_IDS) ids.push(`T${t}_${r}`);
      for (const item of CRAFT_ITEMS) ids.push(`T${t}_${item.id}`);
    }

    try {
      const prices  = await fetchPrices([...new Set(ids)], ROYAL_CITIES);
      const results = [];
      const unique  = [...new Set(ids)];

      for (const itemId of unique) {
        const tier = parseInt(itemId.match(/T(\d)/)?.[1] || '6');
        const rows  = prices.filter(p => p.item_id === itemId);
        if (rows.length < 2) continue;

        const buyRows  = rows.filter(p => p.sell_price_min > 0).sort((a,b) => a.sell_price_min - b.sell_price_min);
        const sellRows = rows.filter(p => p.buy_price_max  > 0).sort((a,b) => b.buy_price_max  - a.buy_price_max);
        if (!buyRows.length || !sellRows.length) continue;

        const buy  = buyRows[0];
        const sell = sellRows[0];
        if (buy.city === sell.city) continue;

        const buyMin = buy.sell_price_min;
        const buyMax = buy.sell_price_max || buyMin;
        const buyAvg = buyMin; // will enrich with history if needed

        const sellMax = sell.sell_price_max || sell.buy_price_max;
        const sellMin = sell.sell_price_min || sell.buy_price_max;
        const sellAvg = sell.buy_price_max;

        const profit = sellAvg * 0.97 - buyMin;
        if (profit <= 0) continue;

        const buySprd  = calcSpread(buyMin, buyMax, buyAvg);
        const sellSprd = calcSpread(sellMin, sellMax, sellAvg);
        if (buySprd > 200 || sellSprd > 200) continue;

        const spread = ((sellAvg - buyMin) / buyMin) * 100;
        if (spread < 5) continue;

        const weight     = itemWeight(itemId, tier);
        const ppkg       = profit / weight;
        const perTrip    = Math.floor(mount.cap / weight);
        const tripProfit = profit * perTrip;

        results.push({
          itemId, tier,
          name: getItemName(itemId),
          buyCity: buy.city, buyMin, buyMax, buyAvg, buySprd, buyVol: 0,
          sellCity: sell.city, sellMin, sellMax, sellAvg, sellSprd, sellVol: 0,
          profit, ppkg, weight, perTrip, tripProfit,
          img: AlbionAPI.itemImageUrl(itemId),
        });
      }

      results.sort((a,b) => b.tripProfit - a.tripProfit);
      const top = results.slice(0, 100);

      // Enrich top results with history
      const histIds = [...new Set(top.map(r => r.itemId))];
      const hist = await fetchHistory(histIds, ROYAL_CITIES.slice(0,5));
      for (const r of top) {
        const bh = hist[`${r.itemId}:${r.buyCity}`]  || {};
        const sh = hist[`${r.itemId}:${r.sellCity}`] || {};
        if (bh.avgPrice) r.buyAvg  = bh.avgPrice;
        if (sh.avgPrice) r.sellAvg = sh.avgPrice;
        r.buyVol  = bh.volume || 0;
        r.sellVol = sh.volume || 0;
        r.buySprd  = calcSpread(r.buyMin,  r.buyMax,  r.buyAvg);
        r.sellSprd = calcSpread(r.sellMin, r.sellMax, r.sellAvg);
        // Recalc with better prices
        r.profit     = r.sellAvg * 0.97 - r.buyMin;
        r.perTrip    = Math.floor(mount.cap / r.weight);
        r.tripProfit = r.profit * r.perTrip;
      }
      top.sort((a,b) => b.tripProfit - a.tripProfit);

      const tbody = document.getElementById('market-transport-tbody');
      if (!tbody) return;

      tbody.innerHTML = top.map((r,i) => `
      <tr>
        <td class="rank${i===0?' top1':''}">${i+1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <img src="${r.img}" width="28" height="28" style="border-radius:3px;background:var(--surface-3);" onerror="this.style.display='none'">
            <div>
              <div class="item-name">T${r.tier} ${r.name}</div>
              <div class="item-sub">${r.weight}kg · ${r.perTrip} unid/${mount.label}</div>
            </div>
          </div>
        </td>
        <td><span class="badge teal" style="font-size:9px;">${r.buyCity}</span></td>
        <td class="right" style="color:var(--green);font-size:11px;">${fmt(r.buyMin)}</td>
        <td class="right" style="color:var(--text-2);font-size:11px;">${fmt(r.buyAvg)}</td>
        <td class="right muted">${fmt(r.buyMax)}</td>
        <td>${spreadBadge(r.buySprd)}</td>
        <td>${liqBadge(r.buyVol)}</td>
        <td><span class="badge teal" style="font-size:9px;">${r.sellCity}</span></td>
        <td class="right" style="color:var(--green);font-size:11px;">${fmt(r.sellMin)}</td>
        <td class="right" style="color:var(--text-2);font-size:11px;">${fmt(r.sellAvg)}</td>
        <td class="right muted">${fmt(r.sellMax)}</td>
        <td>${spreadBadge(r.sellSprd)}</td>
        <td>${liqBadge(r.sellVol)}</td>
        <td class="right" style="color:var(--teal);font-weight:700;">${fmt(r.profit)}</td>
        <td class="right" style="font-size:11px;color:var(--text-muted);">${fmt(r.ppkg)}/kg</td>
        <td class="right" style="color:var(--gold);font-weight:700;">${fmt(r.tripProfit)}</td>
      </tr>`).join('') || `<tr><td colspan="17" style="text-align:center;padding:24px;color:var(--text-muted);">Nenhuma rota lucrativa.</td></tr>`;
    } catch(e) {
      console.error(e);
      setError('market-transport-tbody', 17, 'Erro: ' + e.message);
    }
  }
    setLoading('market-transport-tbody', 11);
    const tiers = state.filterTier;
    const mount = MOUNTS.find(m => m.id === state.mount) || MOUNTS[3];
    const ids   = [];

    for (const t of tiers) {
      for (const r of RAW_IDS)     ids.push(`T${t}_${r}`);
      for (const r of REFINED_IDS) ids.push(`T${t}_${r}`);
      for (const item of CRAFT_ITEMS) ids.push(`T${t}_${item.id}`);
    }

    try {
      const prices  = await fetchPrices(ids, ROYAL_CITIES);
      const results = [];
      const unique  = [...new Set(ids)];

      for (const itemId of unique) {
        const tier = parseInt(itemId.match(/T(\d)/)?.[1] || '6');
        const rows  = prices.filter(p => p.item_id === itemId);
        if (rows.length < 2) continue;

        const buyRows  = rows.filter(p => p.sell_price_min > 0).sort((a,b) => a.sell_price_min - b.sell_price_min);
        const sellRows = rows.filter(p => p.buy_price_max  > 0).sort((a,b) => b.buy_price_max  - a.buy_price_max);
        if (!buyRows.length || !sellRows.length) continue;

        const buy  = buyRows[0];
        const sell = sellRows[0];
        if (buy.city === sell.city) continue;

        const profit = sell.buy_price_max * 0.97 - buy.sell_price_min;
        if (profit <= 0) continue;

        const spread = buy.sell_price_min > 0
          ? ((sell.buy_price_max - buy.sell_price_min) / buy.sell_price_min * 100)
          : 0;
        if (spread < 5) continue;

        const weight     = itemWeight(itemId, tier);
        const ppkg       = profit / weight;
        const perTrip    = Math.floor(mount.cap / weight);
        const tripProfit = profit * perTrip;

        const craftItem  = CRAFT_ITEMS.find(c => itemId.includes(c.id));
        const refItem    = REFINE_ITEMS.find(r => itemId.includes(r.refined));
        const rawItem    = REFINE_ITEMS.find(r => itemId.includes('_'+r.raw));
        const label      = craftItem?.label || refItem?.label || rawItem?.label || itemId.replace(/T\d_/,'');

        results.push({
          itemId, label, tier,
          buyCity: buy.city,  buyPrice: buy.sell_price_min,
          sellCity: sell.city, sellPrice: sell.buy_price_max,
          profit, ppkg, weight, perTrip, tripProfit,
          spread, score: calcScore(ppkg, 30, spread),
          img: AlbionAPI.itemImageUrl(itemId),
        });
      }

      results.sort((a,b) => b.tripProfit - a.tripProfit);
      const tbody = document.getElementById('market-transport-tbody');
      if (!tbody) return;

      tbody.innerHTML = results.slice(0,100).map((r,i) => `
      <tr>
        <td class="rank${i===0?' top1':''}">${i+1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <img src="${r.img}" width="28" height="28" style="border-radius:3px;background:var(--surface-3);" onerror="this.style.display='none'">
            <div><div class="item-name">T${r.tier} ${r.label}</div>
            <div class="item-sub">${r.weight}kg · ${r.perTrip} unid/${mount.label}</div></div>
          </div>
        </td>
        <td><span class="badge teal" style="font-size:9px;">${r.buyCity}</span></td>
        <td class="right muted">${fmt(r.buyPrice)}</td>
        <td><span class="badge teal" style="font-size:9px;">${r.sellCity}</span></td>
        <td class="right muted">${fmt(r.sellPrice)}</td>
        <td class="right gold">${fmt(r.profit)}</td>
        <td class="right" style="color:var(--teal);font-weight:700;">${fmt(r.ppkg)}/kg</td>
        <td class="right" style="color:var(--green);font-weight:700;">${fmt(r.tripProfit)}</td>
        <td class="right">${spreadBadge(r.spread)}</td>
        <td class="right" style="font-size:13px;">${scoreStar(r.score)}</td>
      </tr>`).join('') || `<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--text-muted);">Nenhuma rota lucrativa.</td></tr>`;
    } catch(e) {
      setError('market-transport-tbody', 11, 'Erro: ' + e.message);
    }
  }

  // ═══════════════════════════════════════════════
  // TAB 5 — BLACK MARKET
  // ═══════════════════════════════════════════════
  async function loadBlackMarket() {
    setLoading('market-bm-tbody', 12);
    const tiers = state.filterTier;
    const mount = MOUNTS.find(m => m.id === state.mount) || MOUNTS[3];
    const ids   = [];

    for (const item of CRAFT_ITEMS) {
      for (const t of tiers) {
        ids.push(`T${t}_${item.id}`);
        for (const e of [1,2,3]) ids.push(`T${t}_${item.id}@${e}`);
      }
    }

    try {
      const prices  = await fetchPrices([...new Set(ids)], [...ROYAL_CITIES, 'Black Market']);
      const results = [];

      for (const item of CRAFT_ITEMS) {
        for (const tier of tiers) {
          const ti = TIERS_IDX.indexOf(tier);
          if (ti < 0) continue;

          for (const enchant of [0,1,2,3]) {
            const eSfx   = enchant > 0 ? `@${enchant}` : '';
            const itemId = `T${tier}_${item.id}${eSfx}`;

            const royalRows = prices
              .filter(p => p.item_id === itemId && p.sell_price_min > 0 && p.city !== 'Black Market')
              .sort((a,b) => a.sell_price_min - b.sell_price_min);
            if (!royalRows.length) continue;

            const bmRow = prices.find(p => p.item_id === itemId && p.city === 'Black Market' && p.buy_price_max > 0);
            if (!bmRow) continue;

            const cheapest = royalRows[0];
            const buyMin   = cheapest.sell_price_min;
            const buyMax   = cheapest.sell_price_max || buyMin;
            const buyAvg   = buyMin;
            const buySprd  = calcSpread(buyMin, buyMax, buyAvg);

            const bmPrice  = bmRow.buy_price_max;
            const netBM    = bmPrice * 0.97;
            const profit   = netBM - buyMin;
            if (profit <= 0) continue;

            const margin    = (profit / buyMin) * 100;
            const weight    = W.item[tier] || 13.6;
            const perTrip   = Math.floor(mount.cap / weight);
            const tripProfit = profit * perTrip;

            results.push({
              itemId, tier, enchant,
              name: getItemName(itemId),
              buyCity: cheapest.city, buyMin, buyMax, buyAvg, buySprd, buyVol: 0,
              bmPrice, netBM, profit, margin, weight, perTrip, tripProfit,
              img: AlbionAPI.itemImageUrl(itemId),
            });
          }
        }
      }

      results.sort((a,b) => b.tripProfit - a.tripProfit);
      const top = results.slice(0, 100);

      // Enrich with history
      const histIds = [...new Set(top.map(r => r.itemId))];
      const hist = await fetchHistory(histIds, ROYAL_CITIES.slice(0,4));
      for (const r of top) {
        const bh = hist[`${r.itemId}:${r.buyCity}`] || {};
        if (bh.avgPrice) r.buyAvg = bh.avgPrice;
        r.buyVol  = bh.volume || 0;
        r.buySprd = calcSpread(r.buyMin, r.buyMax, r.buyAvg);
      }

      const tbody = document.getElementById('market-bm-tbody');
      if (!tbody) return;

      tbody.innerHTML = top.map((r,i) => {
        const enchStr = r.enchant > 0 ? `.${r.enchant}` : '';
        return `
        <tr>
          <td class="rank${i===0?' top1':''}">${i+1}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <img src="${r.img}" width="28" height="28" style="border-radius:3px;background:var(--surface-3);" onerror="this.style.display='none'">
              <div>
                <div class="item-name">T${r.tier}${enchStr} ${r.name}</div>
                <div class="item-sub">${r.weight}kg · ${r.perTrip} unid/${mount.label}</div>
              </div>
            </div>
          </td>
          <td><span class="badge teal" style="font-size:9px;">${r.buyCity}</span></td>
          <td class="right" style="color:var(--green);font-size:11px;">${fmt(r.buyMin)}</td>
          <td class="right" style="color:var(--text-2);font-size:11px;">${fmt(r.buyAvg)}</td>
          <td class="right muted">${fmt(r.buyMax)}</td>
          <td>${spreadBadge(r.buySprd)}</td>
          <td>${liqBadge(r.buyVol)}</td>
          <td><span class="badge red" style="font-size:9px;">Black Market</span></td>
          <td class="right" style="color:var(--gold);font-weight:700;">${fmt(r.profit)}</td>
          <td class="right"><span class="badge ${r.margin>=0?'green':'red'}">${fmtPct(r.margin)}</span></td>
          <td class="right" style="color:var(--green);font-weight:700;">${fmt(r.tripProfit)}</td>
        </tr>`;
      }).join('') || `<tr><td colspan="12" style="text-align:center;padding:24px;color:var(--text-muted);">Black Market sem oportunidades.</td></tr>`;
    } catch(e) {
      console.error(e);
      setError('market-bm-tbody', 12, 'Erro: ' + e.message);
    }
  }
    setLoading('market-bm-tbody', 10);
    const tiers = state.filterTier;
    const mount = MOUNTS.find(m => m.id === state.mount) || MOUNTS[3];
    const ids   = [];

    for (const item of CRAFT_ITEMS) {
      for (const t of tiers) {
        ids.push(`T${t}_${item.id}`);
        for (const e of [1,2,3]) ids.push(`T${t}_${item.id}@${e}`);
      }
    }

    try {
      const prices  = await fetchPrices(ids, [...ROYAL_CITIES, 'Black Market']);
      const results = [];

      for (const item of CRAFT_ITEMS) {
        for (const tier of tiers) {
          const ti = TIERS_IDX.indexOf(tier);
          if (ti < 0) continue;

          for (const enchant of [0,1,2,3]) {
            const eSfx  = enchant > 0 ? `@${enchant}` : '';
            const itemId = `T${tier}_${item.id}${eSfx}`;

            // Mais barato nas cidades normais
            const royalBuy = prices
              .filter(p => p.item_id === itemId && p.sell_price_min > 0 && p.city !== 'Black Market')
              .sort((a,b) => a.sell_price_min - b.sell_price_min)[0];
            if (!royalBuy) continue;

            // BM buy price
            const bmRow = prices.find(p => p.item_id === itemId && p.city === 'Black Market' && p.buy_price_max > 0);
            if (!bmRow) continue;

            const buyPrice = royalBuy.sell_price_min;
            const bmPrice  = bmRow.buy_price_max;
            const netBM    = bmPrice * 0.97;
            const profit   = netBM - buyPrice;
            if (profit <= 0) continue;

            const margin   = (profit / buyPrice) * 100;
            const weight   = W.item[tier] || 13.6;
            const ppkg     = profit / weight;
            const perTrip  = Math.floor(mount.cap / weight);
            const tripProfit = profit * perTrip;

            results.push({
              itemId, label: `T${tier}${enchant>0?'.'+enchant:''} ${item.label}`, tier, enchant,
              buyCity: royalBuy.city, buyPrice, bmPrice, netBM,
              profit, margin, ppkg, weight, perTrip, tripProfit,
              score: calcScore(ppkg, 30, 20),
              img: AlbionAPI.itemImageUrl(itemId),
            });
          }
        }
      }

      results.sort((a,b) => b.tripProfit - a.tripProfit);
      const tbody = document.getElementById('market-bm-tbody');
      if (!tbody) return;

      tbody.innerHTML = results.slice(0,100).map((r,i) => `
      <tr>
        <td class="rank${i===0?' top1':''}">${i+1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <img src="${r.img}" width="28" height="28" style="border-radius:3px;background:var(--surface-3);" onerror="this.style.display='none'">
            <div><div class="item-name">${r.label}</div>
            <div class="item-sub">${r.weight}kg · ${r.perTrip} unid/${mount.label}</div></div>
          </div>
        </td>
        <td><span class="badge teal" style="font-size:9px;">${r.buyCity}</span></td>
        <td class="right muted">${fmt(r.buyPrice)}</td>
        <td><span class="badge red" style="font-size:9px;">Black Market</span></td>
        <td class="right muted">${fmt(r.bmPrice)}</td>
        <td class="right gold">${fmt(r.profit)}</td>
        <td class="right"><span class="badge ${r.margin>=0?'green':'red'}">${fmtPct(r.margin)}</span></td>
        <td class="right" style="color:var(--green);font-weight:700;">${fmt(r.tripProfit)}/viagem</td>
        <td class="right" style="font-size:13px;">${scoreStar(r.score)}</td>
      </tr>`).join('') || `<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--text-muted);">Black Market sem oportunidades nos tiers selecionados.</td></tr>`;
    } catch(e) {
      setError('market-bm-tbody', 10, 'Erro: ' + e.message);
    }
  }

  // ═══════════════════════════════════════════════
  // RENDER DA PÁGINA
  // ═══════════════════════════════════════════════
  function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.mkt-tab-btn').forEach(b => {
      const on = b.dataset.tab === tabId;
      b.style.borderBottomColor = on ? 'var(--teal)' : 'transparent';
      b.style.color = on ? 'var(--teal)' : 'var(--text-muted)';
    });
    document.querySelectorAll('.mkt-tab-pane').forEach(p => {
      p.style.display = p.id === `mkt-pane-${tabId}` ? 'block' : 'none';
    });
    if (!state.loaded[tabId]) {
      state.loaded[tabId] = true;
      ({ craft: loadCraft, refine: loadRefining, enchant: loadEnchanting,
         transport: loadTransport, bm: loadBlackMarket })[tabId]?.();
    }
  }

  function init() {
    const el = document.getElementById('market-content');
    if (!el) return;

    const TABS = [
      { id:'craft',     label:'Rank Craft',       icon:'ti-hammer'          },
      { id:'refine',    label:'Rank Refino',       icon:'ti-flame'           },
      { id:'enchant',   label:'Rank Encantamento', icon:'ti-sparkles'        },
      { id:'transport', label:'Rank Transporte',   icon:'ti-truck'           },
      { id:'bm',        label:'Black Market',      icon:'ti-building-store'  },
    ];

    const tableHeaders = {
      craft:     `<th>#</th><th>Item</th><th>Mat. cidade</th><th class="right">Mat. Min/Avg/Max</th><th>Spread</th><th>Volume</th><th class="right">Custo total</th><th>Vender em</th><th class="right teal">Venda Min/Avg/Max</th><th>Spread</th><th>Volume</th><th class="right gold">Lucro</th><th class="right">Margem</th>`,
      refine:    `<th>#</th><th>Material</th><th>Raw cidade</th><th class="right">Raw Min/Avg/Max</th><th>Spread</th><th>Volume</th><th class="right">Custo total</th><th>Vender em</th><th class="right teal">Venda Min/Avg/Max</th><th>Spread</th><th>Volume</th><th class="right gold">Lucro</th><th class="right">Margem</th>`,
      enchant:   `<th>#</th><th>Item + Passo</th><th>Comprar em</th><th class="right">Preço item</th><th>Mat. cidade</th><th class="right">Custo mat.</th><th class="right">Custo total</th><th>Vender em</th><th class="right teal">Venda Avg</th><th>Volume</th><th class="right gold">Lucro</th><th class="right">Margem</th>`,
      transport: `<th>#</th><th>Item</th><th>Comprar em</th><th class="right">Min</th><th class="right">Avg</th><th class="right">Max</th><th>Spread</th><th>Vol</th><th>Vender em</th><th class="right">Min</th><th class="right">Avg</th><th class="right">Max</th><th>Spread</th><th>Vol</th><th class="right teal">Lucro/unid</th><th class="right">Lucro/kg</th><th class="right gold">Lucro/viagem</th>`,
      bm:        `<th>#</th><th>Item</th><th>Comprar em</th><th class="right">Min</th><th class="right">Avg</th><th class="right">Max</th><th>Spread</th><th>Vol</th><th>BM paga</th><th class="right teal">Lucro/unid</th><th class="right">Margem</th><th class="right gold">Lucro/viagem</th>`,
    };

    el.innerHTML = `
    <!-- Controles -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center;">
      <div class="btn-group" id="mkt-tier-group">
        ${[4,5,6,7,8].map(t => `<button data-tier="${t}" class="${state.filterTier.includes(t)?'active':''}">T${t}</button>`).join('')}
      </div>
      <button class="toggle-chip on" id="mkt-focus-toggle">
        <i class="ti ti-focus" style="font-size:13px;" aria-hidden="true"></i>Com foco
        <div class="toggle-track on"><div class="toggle-thumb"></div></div>
      </button>
      <select class="sq-input" id="mkt-mount" style="width:auto;">
        ${MOUNTS.map(m => `<option value="${m.id}" ${m.id===state.mount?'selected':''}>${m.label} — ${m.cap}kg</option>`).join('')}
      </select>
      <div style="flex:1;"></div>
      <button class="sq-btn" id="mkt-refresh">↻ Atualizar</button>
    </div>

    <!-- Tab headers -->
    <div style="display:flex;border-bottom:1px solid var(--border);margin-bottom:14px;overflow-x:auto;">
      ${TABS.map(t => `
      <button class="mkt-tab-btn" data-tab="${t.id}"
        style="display:flex;align-items:center;gap:6px;padding:8px 14px;background:transparent;border:none;
               border-bottom:2px solid transparent;color:var(--text-muted);white-space:nowrap;
               font-family:var(--font-ui);font-size:12px;font-weight:700;letter-spacing:.5px;cursor:pointer;transition:all .15s;">
        <i class="ti ${t.icon}" style="font-size:13px;" aria-hidden="true"></i>${t.label}
      </button>`).join('')}
    </div>

    <!-- BM warning -->
    <div id="mkt-bm-warning" style="display:none;background:var(--red-muted);border:1px solid var(--red);border-radius:3px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--red);">
      ⚠️ Caerleon fica em zona vermelha/preta. Risco de gank. Nunca leve mais do que pode perder.
    </div>

    <!-- Tab panes -->
    ${TABS.map(t => `
    <div id="mkt-pane-${t.id}" class="mkt-tab-pane" style="display:none;">
      <div class="sq-table-wrap"><table class="sq-table">
        <thead><tr>${tableHeaders[t.id]}</tr></thead>
        <tbody id="market-${t.id}-tbody">
          <tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted);">Clique na aba pra carregar.</td></tr>
        </tbody>
      </table></div>
    </div>`).join('')}`;

    // Events
    el.querySelectorAll('.mkt-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
        const bmWarn = document.getElementById('mkt-bm-warning');
        if (bmWarn) bmWarn.style.display = btn.dataset.tab === 'bm' ? 'block' : 'none';
      });
    });

    el.querySelector('#mkt-tier-group')?.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      btn.classList.toggle('active');
      const active = [...el.querySelectorAll('#mkt-tier-group button.active')].map(b => parseInt(b.dataset.tier));
      state.filterTier = active.length ? active : [6,7,8];
      state.loaded = {};
      switchTab(state.activeTab);
    });

    el.querySelector('#mkt-focus-toggle')?.addEventListener('click', function() {
      state.useFocus = !state.useFocus;
      this.classList.toggle('on', state.useFocus);
      this.querySelector('.toggle-track')?.classList.toggle('on', state.useFocus);
      state.loaded = {};
      switchTab(state.activeTab);
    });

    el.querySelector('#mkt-mount')?.addEventListener('change', function() {
      state.mount = this.value;
      if (['transport','bm'].includes(state.activeTab)) {
        state.loaded[state.activeTab] = false;
        switchTab(state.activeTab);
      }
    });

    el.querySelector('#mkt-refresh')?.addEventListener('click', () => {
      state.loaded = {};
      switchTab(state.activeTab);
    });

    // Ativar primeira aba
    switchTab('craft');
  }

  return { init };
})();

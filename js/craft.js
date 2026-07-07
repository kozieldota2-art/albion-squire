// ═══════════════════════════════════════════════════
// ALBION SQUIRE — craft.js
// Módulo de Ranking de Craft com dados reais da API
// ═══════════════════════════════════════════════════

const CraftModule = (() => {

  // ── Estado ──────────────────────────────────────
  let state = {
    useFocus:     true,
    filterCat:    "todos",
    filterTiers:  [6],
    filterCity:   "todas",
    sortBy:       "profit",
    loading:      false,
    results:      [],
    lastUpdate:   null,
  };

  // ── Gerar lista de item IDs pra buscar ──────────
  function buildItemIdList() {
    const ids = [];
    const tiers = state.filterTiers.length ? state.filterTiers : TIERS;

    for (const [type, bom] of Object.entries(CRAFT_BOM)) {
      for (const tier of tiers) {
        const ti = TIERS.indexOf(tier);
        if (ti < 0) continue;
        const itemId = `T${tier}_${type}`;
        const matId  = `T${tier}_${bom.mat}`;
        ids.push(itemId, matId);
      }
    }

    // Refino
    for (const [refined, bom] of Object.entries(REFINE_BOM)) {
      for (const tier of tiers) {
        if (tier < 5) continue; // T4 refino tem formula diferente
        const ti = TIERS.indexOf(tier);
        ids.push(`T${tier}_${refined}`, `T${tier}_${bom.raw}`, `T${tier - 1}_${refined}`);
      }
    }

    return [...new Set(ids)];
  }

  // ── Calcular ranking ────────────────────────────
  function computeRanking(prices) {
    const results = [];
    const tiers = state.filterTiers.length ? state.filterTiers : TIERS;

    // ── Craft de equipamentos ──
    for (const [type, bom] of Object.entries(CRAFT_BOM)) {
      if (state.filterCat !== "todos" && bom.cat2.toLowerCase() !== state.filterCat) continue;

      for (const tier of tiers) {
        const ti = TIERS.indexOf(tier);
        if (ti < 0) continue;

        for (const enchant of ENCHANTS) {
          const itemId = enchant === 0 ? `T${tier}_${type}` : `T${tier}_${type}@${enchant}`;
          const matId  = enchant === 0 ? `T${tier}_${bom.mat}` : `T${tier}_${bom.mat}@${enchant}`;

          // Tentar sell do item
          const sellRow = prices.find(p => p.item_id === itemId && p.sell_price_min > 0);
          const matRow  = prices.find(p => p.item_id === `T${tier}_${bom.mat}` && p.sell_price_min > 0);
          if (!sellRow || !matRow) continue;

          const sellPrice = sellRow.sell_price_min;
          const matPrice  = matRow.sell_price_min;
          const qty       = bom.qty[ti];

          // Calcular pra cada cidade (ou melhor cidade)
          const citiesToCalc = state.filterCity !== "todas"
            ? [state.filterCity]
            : [bom.bestCity, "Caerleon"];

          for (const city of citiesToCalc) {
            const { profit, margin, rrr, bonus, effectiveCost, netSell } =
              calcProfit(sellPrice, matPrice * qty, city, bom.cat, false, state.useFocus);

            if (profit <= 0 && state.filterCat === "todos") continue; // esconder itens negativos quando mostrando tudo

            results.push({
              id:          itemId,
              matId:       `T${tier}_${bom.mat}`,
              name:        bom.label,
              tier,
              enchant,
              category:    bom.cat2,
              city,
              sellPrice,
              matPrice,
              matQty:      qty,
              rawMatCost:  matPrice * qty,
              effectiveCost,
              netSell,
              profit,
              margin,
              rrr,
              bonus,
              useFocus:    state.useFocus,
              imageUrl:    AlbionAPI.itemImageUrl(itemId),
            });
          }
        }
      }
    }

    // ── Refino ──
    if (state.filterCat === "todos" || state.filterCat === "refino") {
      for (const [refined, bom] of Object.entries(REFINE_BOM)) {
        for (const tier of tiers) {
          if (tier < 5) continue;
          const refinedId  = `T${tier}_${refined}`;
          const rawId      = `T${tier}_${bom.raw}`;
          const subMatId   = `T${tier - 1}_${refined}`;

          const sellRow   = prices.find(p => p.item_id === refinedId && p.sell_price_min > 0);
          const rawRow    = prices.find(p => p.item_id === rawId     && p.sell_price_min > 0);
          const subRow    = prices.find(p => p.item_id === subMatId  && p.sell_price_min > 0);
          if (!sellRow || !rawRow || !subRow) continue;

          const sellPrice = sellRow.sell_price_min;
          const rawCost   = rawRow.sell_price_min * bom.rawQty;
          const subCost   = subRow.sell_price_min * bom.subQty;
          const totalMat  = rawCost + subCost;

          const city = state.filterCity !== "todas" ? state.filterCity : bom.bestCity;
          const { profit, margin, rrr, bonus, effectiveCost, netSell } =
            calcProfit(sellPrice, totalMat, city, bom.cat, true, state.useFocus);

          if (profit <= 0) continue;

          results.push({
            id:          refinedId,
            matId:       rawId,
            name:        `Refino ${bom.label} T${tier}`,
            tier,
            enchant:     0,
            category:    "Refino",
            city,
            sellPrice,
            matPrice:    rawRow.sell_price_min,
            matQty:      bom.rawQty,
            rawMatCost:  totalMat,
            effectiveCost,
            netSell,
            profit,
            margin,
            rrr,
            bonus,
            useFocus:    state.useFocus,
            imageUrl:    AlbionAPI.itemImageUrl(refinedId),
          });
        }
      }
    }

    // Ordenar
    results.sort((a, b) => {
      if (state.sortBy === "margin") return b.margin - a.margin;
      return b.profit - a.profit;
    });

    return results;
  }

  // ── Formatar números ────────────────────────────
  function fmt(n) {
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + "K";
    return Math.round(n).toLocaleString("pt-BR");
  }

  function fmtPct(n) { return (n >= 0 ? "+" : "") + n.toFixed(1) + "%"; }

  // ── Renderizar tabela ───────────────────────────
  function renderTable(results) {
    const tbody = document.getElementById("craft-tbody");
    if (!tbody) return;

    if (!results.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">
        Nenhum item lucrativo encontrado com esses filtros.</td></tr>`;
      return;
    }

    tbody.innerHTML = results.slice(0, 100).map((r, i) => {
      const pClass = r.profit >= 0 ? "gold" : "red";
      const mClass = r.margin >= 0 ? "green" : "red";
      const enchStr = r.enchant > 0 ? `.${r.enchant}` : "";
      const enchBadge = r.enchant > 0
        ? `<span class="badge gold" style="font-size:9px;padding:1px 4px;">+${r.enchant}</span>`
        : "";

      return `
      <tr>
        <td class="rank${i === 0 ? " top1" : ""}">${i + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${r.imageUrl}" alt="${r.name}" width="32" height="32"
              style="border-radius:3px;background:var(--surface-3);"
              onerror="this.style.display='none'">
            <div>
              <div class="item-name">T${r.tier}${enchStr} ${r.name} ${enchBadge}</div>
              <div class="item-sub">${r.city} · ${r.useFocus ? "com foco" : "sem foco"} · RRR ${(r.rrr * 100).toFixed(1)}%</div>
            </div>
          </div>
        </td>
        <td><span class="badge teal" style="font-size:10px;">${r.city}</span></td>
        <td class="right muted">${fmt(r.rawMatCost)}</td>
        <td class="right muted">${fmt(r.sellPrice)}</td>
        <td class="right ${pClass}">${fmt(r.profit)}</td>
        <td class="right"><span class="badge ${mClass}">${fmtPct(r.margin)}</span></td>
        <td class="right" style="font-size:10px;color:var(--text-muted);">${r.category}</td>
      </tr>`;
    }).join("");
  }

  // ── Renderizar stat cards ────────────────────────
  function renderStats(results) {
    const profitable = results.filter(r => r.profit > 0);
    const top        = results[0];

    const el = id => document.getElementById(id);
    if (el("craft-stat-top"))    el("craft-stat-top").innerHTML    = top ? `${fmt(top.profit)} <small>silver</small>` : "—";
    if (el("craft-stat-topit"))  el("craft-stat-topit").textContent = top ? `${top.name} T${top.tier} · ${top.city}` : "—";
    if (el("craft-stat-margin")) el("craft-stat-margin").textContent = profitable.length
      ? fmtPct(profitable.reduce((a, b) => a + b.margin, 0) / profitable.length) : "—";
    if (el("craft-stat-count"))  el("craft-stat-count").innerHTML  = `${profitable.length} <small>/ ${results.length}</small>`;
    if (el("craft-stat-bestcat"))el("craft-stat-bestcat").textContent = top?.category || "—";

    const sub = document.getElementById("craft-subtitle");
    if (sub && state.lastUpdate)
      sub.textContent = `Atualizado às ${state.lastUpdate.toLocaleTimeString("pt-BR")} · ${results.length} itens analisados · T${state.filterTiers.join("/")}`;
  }

  // ── Carregar dados ───────────────────────────────
  async function load() {
    if (state.loading) return;
    state.loading = true;

    const loadBtn = document.getElementById("craft-refresh");
    if (loadBtn) { loadBtn.disabled = true; loadBtn.textContent = "Carregando..."; }

    const tbody = document.getElementById("craft-tbody");
    if (tbody) tbody.innerHTML = `
      <tr><td colspan="8" style="text-align:center;padding:40px;">
        <div style="color:var(--teal);font-size:12px;letter-spacing:1px;text-transform:uppercase;">Buscando preços na API...</div>
      </td></tr>`;

    try {
      const ids    = buildItemIdList();
      const prices = await AlbionAPI.getPrices(ids);
      state.results    = computeRanking(prices);
      state.lastUpdate = new Date();
      renderTable(state.results);
      renderStats(state.results);
    } catch (e) {
      console.error("Craft load error:", e);
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--red);">
        Erro ao carregar dados da API. Verifique conexão. ${e.message}</td></tr>`;
    } finally {
      state.loading = false;
      if (loadBtn) { loadBtn.disabled = false; loadBtn.textContent = "Atualizar"; }
    }
  }

  // ── Inicializar módulo ──────────────────────────
  function init() {
    // Toggle foco
    const toggleBtn = document.getElementById("toggle-foco");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        state.useFocus = !state.useFocus;
        const track = toggleBtn.querySelector(".toggle-track");
        if (track) { track.classList.toggle("on", state.useFocus); }
        toggleBtn.classList.toggle("on", state.useFocus);
        if (state.results.length) {
          // Recalcular sem nova requisição
          const prices = state._lastPrices;
          if (prices) { state.results = computeRanking(prices); renderTable(state.results); renderStats(state.results); }
          else load();
        }
      });
    }

    // Filtros de categoria
    const catGroup = document.getElementById("filter-cat");
    if (catGroup) {
      catGroup.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
          catGroup.querySelectorAll("button").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          state.filterCat = btn.dataset.val;
          load();
        });
      });
    }

    // Filtros de tier (múltipla seleção)
    const tierGroup = document.getElementById("filter-tier");
    if (tierGroup) {
      tierGroup.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
          const t = parseInt(btn.dataset.val.replace("T", ""));
          btn.classList.toggle("active");
          if (btn.classList.contains("active")) {
            if (!state.filterTiers.includes(t)) state.filterTiers.push(t);
          } else {
            state.filterTiers = state.filterTiers.filter(x => x !== t);
          }
          load();
        });
      });
    }

    // Filtro de cidade
    const cityGroup = document.getElementById("filter-city");
    if (cityGroup) {
      cityGroup.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
          cityGroup.querySelectorAll("button").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          state.filterCity = btn.dataset.val;
          if (state.results.length) { state.results = computeRanking(state._lastPrices || []); renderTable(state.results); }
        });
      });
    }

    // Sort
    const sortGroup = document.getElementById("filter-sort");
    if (sortGroup) {
      sortGroup.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
          sortGroup.querySelectorAll("button").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          state.sortBy = btn.dataset.val;
          state.results.sort((a, b) => state.sortBy === "margin" ? b.margin - a.margin : b.profit - a.profit);
          renderTable(state.results);
        });
      });
    }

    // Botão refresh
    const refreshBtn = document.getElementById("craft-refresh");
    if (refreshBtn) refreshBtn.addEventListener("click", load);

    // Carregar ao iniciar
    load();

    // Auto-refresh a cada 5 minutos
    setInterval(load, 5 * 60 * 1000);
  }

  return { init, load };
})();

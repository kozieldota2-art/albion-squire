// ═══════════════════════════════════════════════════
// ALBION SQUIRE — masscall.js
// Sistema de Mass Call / CTA
// Firebase: db.ref('masscalls'), db.ref('attendance')
// ═══════════════════════════════════════════════════

const MassCallModule = (() => {

  // ── Estado local ────────────────────────────────
  let state = {
    activeCalls: [],
    currentCall: null,
    attendance:  {},
    user:        null,
  };

  // ── Firebase refs (inicializadas após firebase.initializeApp) ──
  let DB = null;
  function getDB() {
    if (!DB && typeof firebase !== "undefined" && firebase.apps.length)
      DB = firebase.database();
    return DB;
  }

  // ── Helpers ─────────────────────────────────────
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function fmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
    return Math.round(n).toLocaleString("pt-BR");
  }

  // ─────────────────────────────────────────────────
  // CRIAR MASS CALL
  // ─────────────────────────────────────────────────
  function buildCompositionTemplate(slots) {
    // slots = [{role, weapon, count}]
    const comp = {};
    for (const s of slots) {
      for (let i = 0; i < s.count; i++) {
        const slotId = `${s.role}_${i}`;
        comp[slotId] = { role: s.role, weapon: s.weapon, playerId: null, playerName: null, discordId: null };
      }
    }
    return comp;
  }

  async function createMassCall(data) {
    // data: { title, type, date, maxPlayers, slots, requireVod, regearEnabled, splitEnabled }
    const id   = generateId();
    const call = {
      id,
      ...data,
      status:      "open",
      createdAt:   Date.now(),
      createdBy:   state.user?.name || "Officer",
      attendance:  {},
      composition: buildCompositionTemplate(data.slots || []),
      loot:        { items: [], totalValue: 0 },
      result:      null,
    };

    const db = getDB();
    if (db) {
      await db.ref(`masscalls/${id}`).set(call);
      // Enviar webhook pra Discord
      await sendDiscordAnnouncement(call);
    } else {
      // Modo offline: armazenar localmente
      state.activeCalls.unshift(call);
    }
    state.currentCall = call;
    renderCallDashboard(call);
    renderCallList();
    return call;
  }

  // ─────────────────────────────────────────────────
  // DISCORD WEBHOOK ANNOUNCEMENT
  // ─────────────────────────────────────────────────
  async function sendDiscordAnnouncement(call) {
    if (!GUILD.webhookUrl || GUILD.webhookUrl.includes("YOUR_")) return;

    const slotsText = Object.values(call.composition)
      .reduce((acc, s) => {
        const key = `${s.role}:${s.weapon}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

    const fields = Object.entries(slotsText).map(([key, n]) => {
      const [role, weapon] = key.split(":");
      const roleData = ZVZ_ROLES.find(r => r.id === role) || { label: role };
      return { name: `${roleData.label}`, value: `${weapon} x${n}`, inline: true };
    });

    const embed = {
      title:       `⚔️ MASS CALL — ${call.title}`,
      description: `**Tipo:** ${call.type}\n**Horário:** ${new Date(call.date).toLocaleString("pt-BR")}\n**Slots:** ${Object.keys(call.composition).length}`,
      color:       0x1DA898,
      fields,
      footer:      { text: `Use !join [arma] pra se inscrever · albionsquire.netlify.app` },
      timestamp:   new Date().toISOString(),
    };

    try {
      await fetch(GUILD.webhookUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ embeds: [embed] }),
      });
    } catch (e) { console.warn("Webhook error:", e); }
  }

  // ─────────────────────────────────────────────────
  // SIGN UP / SIGN OUT
  // ─────────────────────────────────────────────────
  async function signUp(callId, playerId, playerName, preferredWeapon) {
    const db = getDB();
    const entry = { playerId, playerName, weapon: preferredWeapon, ts: Date.now(), status: "pending" };

    if (db) {
      await db.ref(`masscalls/${callId}/attendance/${playerId}`).set(entry);
    } else if (state.currentCall?.id === callId) {
      state.currentCall.attendance[playerId] = entry;
    }
    renderAttendanceList(state.currentCall);
  }

  function autoAssign(call) {
    // Tenta encaixar jogadores nos slots com base na arma preferida
    const unassigned = Object.entries(call.attendance || {})
      .filter(([,v]) => v.status === "pending")
      .map(([k, v]) => ({ ...v, id: k }));

    for (const slot of Object.values(call.composition)) {
      if (slot.playerId) continue; // já tem alguém
      const match = unassigned.find(p => p.weapon === slot.weapon);
      if (match) {
        slot.playerId   = match.id;
        slot.playerName = match.playerName;
        const idx = unassigned.indexOf(match);
        unassigned.splice(idx, 1);
      }
    }

    // Quem sobrou sem slot → reserva
    for (const p of unassigned) {
      call.attendance[p.id].status = "reserve";
    }

    renderCallDashboard(call);
  }

  function reassignPlayer(callId, slotId, playerId, playerName) {
    if (state.currentCall?.id === callId) {
      // Limpar slot anterior do player
      for (const [sid, s] of Object.entries(state.currentCall.composition)) {
        if (s.playerId === playerId) {
          state.currentCall.composition[sid].playerId   = null;
          state.currentCall.composition[sid].playerName = null;
        }
      }
      // Atribuir no novo slot
      if (state.currentCall.composition[slotId]) {
        state.currentCall.composition[slotId].playerId   = playerId;
        state.currentCall.composition[slotId].playerName = playerName;
      }
      const db = getDB();
      if (db) db.ref(`masscalls/${callId}/composition`).set(state.currentCall.composition);
      renderCallDashboard(state.currentCall);
    }
  }

  // ─────────────────────────────────────────────────
  // LOOT & SPLIT
  // ─────────────────────────────────────────────────
  function addLootItem(callId, item) {
    // item: { name, quantity, priceEach }
    if (!state.currentCall || state.currentCall.id !== callId) return;
    const lootItem = { ...item, total: item.quantity * item.priceEach, id: generateId() };
    state.currentCall.loot.items.push(lootItem);
    state.currentCall.loot.totalValue = state.currentCall.loot.items.reduce((s, i) => s + i.total, 0);

    const db = getDB();
    if (db) db.ref(`masscalls/${callId}/loot`).set(state.currentCall.loot);
    renderLootPanel(state.currentCall);
  }

  function removeLootItem(callId, itemId) {
    if (!state.currentCall) return;
    state.currentCall.loot.items = state.currentCall.loot.items.filter(i => i.id !== itemId);
    state.currentCall.loot.totalValue = state.currentCall.loot.items.reduce((s, i) => s + i.total, 0);
    renderLootPanel(state.currentCall);
  }

  function calcSplit(call) {
    const total       = call.loot.totalValue;
    const guildFee    = total * (GUILD.guildFeePercent / 100);
    const repairFee   = total * (GUILD.repairFeePercent / 100);
    const distributable = total - guildFee - repairFee;

    const players = Object.values(call.composition)
      .filter(s => s.playerId)
      .reduce((acc, s) => { acc[s.playerId] = s.playerName; return acc; }, {});

    const playerCount = Object.keys(players).length;
    if (!playerCount) return null;

    const perPlayer = distributable / playerCount;
    const splits = Object.entries(players).map(([id, name]) => ({
      playerId: id, playerName: name, amount: perPlayer
    }));

    return { total, guildFee, repairFee, distributable, perPlayer, playerCount, splits };
  }

  async function finalizeSplit(callId) {
    const call = state.currentCall;
    if (!call || call.id !== callId) return;

    const split = calcSplit(call);
    if (!split) return;

    call.result = { ...split, finalizedAt: Date.now(), finalizedBy: state.user?.name };
    call.status = "done";

    const db = getDB();
    if (db) {
      await db.ref(`masscalls/${callId}`).update({ result: call.result, status: "done" });
      // Creditar saldos dos players
      for (const s of split.splits) {
        await db.ref(`balances/${s.playerId}`).transaction(curr => (curr || 0) + s.amount);
      }
      // Creditar caixa da guild
      await db.ref("guildBalance").transaction(curr => (curr || 0) + split.guildFee);
    }

    renderSplitResult(split);
  }

  // ─────────────────────────────────────────────────
  // RENDER: Lista de Mass Calls
  // ─────────────────────────────────────────────────
  function renderCallList() {
    const el = document.getElementById("masscall-list");
    if (!el) return;

    const calls = state.activeCalls;
    if (!calls.length) {
      el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">
        Nenhum mass call ativo. Crie um novo acima.</div>`;
      return;
    }

    el.innerHTML = calls.map(c => {
      const filled  = Object.values(c.composition || {}).filter(s => s.playerId).length;
      const total   = Object.keys(c.composition || {}).length;
      const pct     = total ? Math.round((filled / total) * 100) : 0;

      return `
      <div class="call-card" data-id="${c.id}" onclick="MassCallModule.openCall('${c.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text);">${c.title}</div>
            <div style="font-size:11px;color:var(--text-muted);">${c.type} · ${new Date(c.date).toLocaleString("pt-BR")}</div>
          </div>
          <span class="badge ${c.status === "open" ? "teal" : c.status === "done" ? "green" : "gold"}">${c.status === "open" ? "Aberto" : c.status === "done" ? "Finalizado" : "Em andamento"}</span>
        </div>
        <div style="background:var(--border);border-radius:2px;height:4px;overflow:hidden;">
          <div style="width:${pct}%;background:var(--teal);height:100%;border-radius:2px;transition:width 0.3s;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;">
          <span style="font-size:10px;color:var(--text-muted);">${filled}/${total} slots</span>
          <span style="font-size:10px;color:var(--teal);">${pct}% preenchido</span>
        </div>
      </div>`;
    }).join("");
  }

  // ─────────────────────────────────────────────────
  // RENDER: Dashboard de um Mass Call
  // ─────────────────────────────────────────────────
  function renderCallDashboard(call) {
    const el = document.getElementById("masscall-dashboard");
    if (!el || !call) return;

    const roles = ZVZ_ROLES;
    const slotsByRole = {};
    for (const [sid, slot] of Object.entries(call.composition || {})) {
      if (!slotsByRole[slot.role]) slotsByRole[slot.role] = [];
      slotsByRole[slot.role].push({ ...slot, slotId: sid });
    }

    const attendees = Object.values(call.attendance || {});
    const assigned  = Object.values(call.composition || {}).filter(s => s.playerId).length;
    const total     = Object.keys(call.composition || {}).length;

    el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:12px;">
      <div>
        <h2 style="font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--text);text-transform:uppercase;">${call.title}</h2>
        <div style="font-size:11px;color:var(--text-muted);">${call.type} · ${new Date(call.date).toLocaleString("pt-BR")} · ${assigned}/${total} slots</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="sq-btn" onclick="MassCallModule.autoAssignNow()">Auto-encaixar</button>
        ${call.status === "open" ? `<button class="sq-btn-primary" onclick="MassCallModule.startContent()">Iniciar Conteúdo</button>` : ""}
        ${call.status === "active" ? `<button class="sq-btn-danger" onclick="MassCallModule.endContent()">Encerrar</button>` : ""}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 280px;gap:16px;">
      <!-- Comp grid -->
      <div>
        <div class="stat-label" style="margin-bottom:10px;">Composição</div>
        ${roles.map(role => {
          const slots = slotsByRole[role.id] || [];
          if (!slots.length) return "";
          return `
          <div style="margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
              <i class="ti ${role.icon}" style="color:${role.color};font-size:13px;" aria-hidden="true"></i>
              <span style="font-size:11px;font-weight:700;color:${role.color};letter-spacing:1px;text-transform:uppercase;">${role.label}</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${slots.map(s => `
              <div class="comp-slot ${s.playerId ? "filled" : "empty"}" data-slot="${s.slotId}"
                draggable="true" ondragover="event.preventDefault()" ondrop="MassCallModule.onSlotDrop(event,'${s.slotId}')">
                <div style="font-size:10px;font-weight:600;color:${s.playerId ? "var(--text)" : "var(--text-muted)"};">
                  ${s.playerName || s.weapon || "Vazio"}
                </div>
                <div style="font-size:9px;color:var(--text-muted);">${s.weapon}</div>
              </div>`).join("")}
            </div>
          </div>`;
        }).join("")}
      </div>

      <!-- Attendance list -->
      <div>
        <div class="stat-label" style="margin-bottom:10px;">Inscritos (${attendees.length})</div>
        <div style="max-height:320px;overflow-y:auto;" id="masscall-attendance">
          ${attendees.length ? attendees.map(a => `
          <div class="attendee-row" draggable="true" data-playerid="${a.playerId}" data-name="${a.playerName}"
            ondragstart="MassCallModule.onPlayerDragStart(event,'${a.playerId}','${a.playerName}')">
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="user-avatar" style="width:22px;height:22px;font-size:11px;">${a.playerName?.[0]?.toUpperCase() || "?"}</div>
              <div>
                <div style="font-size:12px;font-weight:600;color:var(--text);">${a.playerName}</div>
                <div style="font-size:10px;color:var(--text-muted);">${a.weapon}</div>
              </div>
            </div>
            <span class="badge ${a.status === "confirmed" ? "green" : a.status === "reserve" ? "gold" : "teal"}" style="font-size:9px;">
              ${a.status === "confirmed" ? "OK" : a.status === "reserve" ? "Reserva" : "Aguard."}
            </span>
          </div>`).join("") : `<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px;">Aguardando inscrições...</div>`}
        </div>

        <!-- Quick sign-up (pra testes sem discord) -->
        <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px;">
          <div class="stat-label" style="margin-bottom:6px;">Inscrever manualmente</div>
          <input id="manual-name"   class="sq-input" placeholder="Nome do player" style="margin-bottom:4px;">
          <select id="manual-weapon" class="sq-input" style="margin-bottom:6px;">
            ${Object.entries(CRAFT_BOM).filter(([k]) => k.includes("STAFF") || k.includes("SWORD") || k.includes("BOW") || k.includes("AXE") || k.includes("HAMMER"))
              .map(([k,v]) => `<option value="${k}">${v.label}</option>`).join("")}
          </select>
          <button class="sq-btn" style="width:100%;" onclick="MassCallModule.manualSignUp()">Inscrever</button>
        </div>
      </div>
    </div>`;
  }

  // ─────────────────────────────────────────────────
  // RENDER: Painel de Loot
  // ─────────────────────────────────────────────────
  function renderLootPanel(call) {
    const el = document.getElementById("masscall-loot");
    if (!el) return;

    const loot  = call.loot || { items: [], totalValue: 0 };
    const split = calcSplit(call);

    el.innerHTML = `
    <div class="stat-label" style="margin-bottom:10px;">Loot do Conteúdo</div>

    <!-- Adicionar item -->
    <div style="display:grid;grid-template-columns:1fr 80px 120px auto;gap:6px;margin-bottom:12px;">
      <input id="loot-name"  class="sq-input" placeholder="Nome do item">
      <input id="loot-qty"   class="sq-input" type="number" placeholder="Qtd" value="1">
      <input id="loot-price" class="sq-input" type="number" placeholder="Preço/unid">
      <button class="sq-btn-primary" onclick="MassCallModule.addLoot()">+</button>
    </div>

    <!-- Lista de loot -->
    ${loot.items.length ? `
    <div class="sq-table-wrap" style="margin-bottom:12px;">
      <table class="sq-table">
        <thead><tr>
          <th>Item</th><th class="right">Qtd</th><th class="right">Preço</th><th class="right">Total</th><th></th>
        </tr></thead>
        <tbody>
          ${loot.items.map(i => `
          <tr>
            <td class="item-name">${i.name}</td>
            <td class="right muted">${i.quantity}</td>
            <td class="right muted">${fmt(i.priceEach)}</td>
            <td class="right gold">${fmt(i.total)}</td>
            <td><button onclick="MassCallModule.removeLoot('${i.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;">×</button></td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>` : `<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:16px;border:1px dashed var(--border);border-radius:3px;margin-bottom:12px;">Nenhum loot adicionado</div>`}

    <!-- Resumo do Split -->
    ${split ? `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:3px;padding:12px;">
      <div class="stat-label" style="margin-bottom:8px;">Resumo do Split</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;">
        <span style="color:var(--text-muted);">Total bruto</span>    <span class="right" style="color:var(--text);">${fmt(split.total)}</span>
        <span style="color:var(--text-muted);">Taxa da guild (${GUILD.guildFeePercent}%)</span> <span class="right" style="color:var(--red);">-${fmt(split.guildFee)}</span>
        <span style="color:var(--text-muted);">Reparo (${GUILD.repairFeePercent}%)</span>        <span class="right" style="color:var(--red);">-${fmt(split.repairFee)}</span>
        <span style="color:var(--teal);">Distribuível</span>          <span class="right" style="color:var(--teal);">${fmt(split.distributable)}</span>
        <span style="color:var(--text-muted);">Players</span>         <span class="right" style="color:var(--text);">${split.playerCount}</span>
        <span style="color:var(--gold);font-weight:700;">Por player</span> <span class="right" style="color:var(--gold);font-weight:700;">${fmt(split.perPlayer)}</span>
      </div>
      <button class="sq-btn-primary" style="width:100%;margin-top:10px;" onclick="MassCallModule.finalizeSplit()">
        Finalizar e Distribuir Silver
      </button>
    </div>` : ""}`;
  }

  // ─────────────────────────────────────────────────
  // RENDER: Resultado do Split
  // ─────────────────────────────────────────────────
  function renderSplitResult(split) {
    const el = document.getElementById("masscall-split-result");
    if (!el) return;

    el.innerHTML = `
    <div style="border:1px solid var(--teal-dim);border-radius:3px;background:var(--teal-muted);padding:16px;">
      <div style="font-family:var(--font-display);color:var(--teal);font-size:14px;font-weight:700;letter-spacing:1px;margin-bottom:12px;">✓ SPLIT FINALIZADO</div>
      ${split.splits.map(s => `
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:13px;color:var(--text);">${s.playerName}</span>
        <span style="font-size:13px;font-weight:700;color:var(--gold);">${fmt(s.amount)}</span>
      </div>`).join("")}
      <div style="margin-top:8px;font-size:11px;color:var(--text-muted);">
        Guild recebeu: ${fmt(split.guildFee)} · Finalizado em ${new Date().toLocaleString("pt-BR")}
      </div>
    </div>`;
  }

  // ─────────────────────────────────────────────────
  // RENDER: Formulário de criação
  // ─────────────────────────────────────────────────
  function renderCreateForm() {
    const el = document.getElementById("masscall-create");
    if (!el) return;

    el.innerHTML = `
    <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:3px;padding:16px;margin-bottom:16px;">
      <div class="stat-label" style="margin-bottom:12px;">Criar Mass Call</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div>
          <label class="sq-label">Título do Conteúdo</label>
          <input id="mc-title" class="sq-input" placeholder="ex: Chall, HCE, ZvZ Terça">
        </div>
        <div>
          <label class="sq-label">Tipo</label>
          <select id="mc-type" class="sq-input">
            <option value="ZvZ">ZvZ</option>
            <option value="Chall">Chall</option>
            <option value="HCE">HCE</option>
            <option value="Raid">Raid</option>
            <option value="Gather">Gather</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div>
          <label class="sq-label">Data e Hora</label>
          <input id="mc-date" class="sq-input" type="datetime-local">
        </div>
        <div>
          <label class="sq-label">Max Players</label>
          <input id="mc-max" class="sq-input" type="number" value="20" min="1" max="100">
        </div>
      </div>

      <div class="stat-label" style="margin-bottom:8px;">Composição de Slots</div>
      <div id="mc-slots-list" style="margin-bottom:8px;"></div>
      <button class="sq-btn" onclick="MassCallModule.addSlot()">+ Adicionar Slot</button>

      <div style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);cursor:pointer;">
          <input type="checkbox" id="mc-vod" style="accent-color:var(--teal);">VOD Obrigatório
        </label>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);cursor:pointer;">
          <input type="checkbox" id="mc-regear" style="accent-color:var(--teal);"> Regear Habilitado
        </label>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);cursor:pointer;">
          <input type="checkbox" id="mc-split" checked style="accent-color:var(--teal);"> Split de Loot
        </label>
      </div>

      <button class="sq-btn-primary" style="width:100%;margin-top:12px;" onclick="MassCallModule.submitCreate()">
        <i class="ti ti-speakerphone" aria-hidden="true"></i> Anunciar no Discord
      </button>
    </div>`;

    // Inicializar data pra próxima hora
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const dateEl = document.getElementById("mc-date");
    if (dateEl) dateEl.value = now.toISOString().slice(0, 16);

    renderSlotsBuilder();
  }

  // ─────────────────────────────────────────────────
  // Slots builder
  // ─────────────────────────────────────────────────
  let tempSlots = [
    { role: "mainhealer", weapon: "MAIN_HOLYSTAFF", count: 2 },
    { role: "offhealer",  weapon: "2H_NATURESTAFF", count: 2 },
    { role: "maindps",    weapon: "2H_FROSTSTAFF",  count: 5 },
    { role: "frontline",  weapon: "2H_HAMMER",      count: 4 },
    { role: "backline",   weapon: "MAIN_CROSSBOW",  count: 4 },
    { role: "cc",         weapon: "2H_CURSEDSTAFF", count: 3 },
  ];

  function renderSlotsBuilder() {
    const el = document.getElementById("mc-slots-list");
    if (!el) return;
    el.innerHTML = tempSlots.map((s, i) => {
      const role = ZVZ_ROLES.find(r => r.id === s.role);
      return `
      <div style="display:grid;grid-template-columns:1fr 1fr 60px auto;gap:6px;margin-bottom:4px;">
        <select class="sq-input" onchange="MassCallModule.updateSlot(${i},'role',this.value)">
          ${ZVZ_ROLES.map(r => `<option value="${r.id}" ${r.id === s.role ? "selected" : ""}>${r.label}</option>`).join("")}
        </select>
        <select class="sq-input" onchange="MassCallModule.updateSlot(${i},'weapon',this.value)">
          ${Object.entries(CRAFT_BOM).filter(([k]) => !k.includes("SET1")).map(([k,v]) => `<option value="${k}" ${k === s.weapon ? "selected" : ""}>${v.label}</option>`).join("")}
        </select>
        <input class="sq-input" type="number" min="1" max="20" value="${s.count}"
          onchange="MassCallModule.updateSlot(${i},'count',parseInt(this.value))">
        <button onclick="MassCallModule.removeSlot(${i})"
          style="background:none;border:1px solid var(--border);border-radius:3px;color:var(--red);cursor:pointer;padding:0 8px;">×</button>
      </div>`;
    }).join("");
  }

  // ─────────────────────────────────────────────────
  // API pública do módulo
  // ─────────────────────────────────────────────────
  function addSlot() {
    tempSlots.push({ role:"maindps", weapon:"MAIN_SWORD", count:1 });
    renderSlotsBuilder();
  }

  function removeSlot(i) {
    tempSlots.splice(i, 1);
    renderSlotsBuilder();
  }

  function updateSlot(i, key, val) {
    tempSlots[i][key] = val;
  }

  function submitCreate() {
    const title    = document.getElementById("mc-title")?.value?.trim();
    const type     = document.getElementById("mc-type")?.value;
    const date     = document.getElementById("mc-date")?.value;
    const maxP     = parseInt(document.getElementById("mc-max")?.value || 20);
    const vodReq   = document.getElementById("mc-vod")?.checked;
    const regearEn = document.getElementById("mc-regear")?.checked;
    const splitEn  = document.getElementById("mc-split")?.checked;

    if (!title) { alert("Preencha o título."); return; }

    createMassCall({
      title, type,
      date:           new Date(date).getTime(),
      maxPlayers:     maxP,
      slots:          tempSlots,
      requireVod:     vodReq,
      regearEnabled:  regearEn,
      splitEnabled:   splitEn,
    });
  }

  function openCall(id) {
    const call = state.activeCalls.find(c => c.id === id) || state.currentCall;
    if (!call) return;
    state.currentCall = call;
    renderCallDashboard(call);
    renderLootPanel(call);
    document.getElementById("masscall-dashboard-wrapper")?.scrollIntoView({ behavior: "smooth" });
  }

  function autoAssignNow() {
    if (state.currentCall) {
      autoAssign(state.currentCall);
      renderCallDashboard(state.currentCall);
    }
  }

  function startContent() {
    if (!state.currentCall) return;
    state.currentCall.status = "active";
    const db = getDB();
    if (db) db.ref(`masscalls/${state.currentCall.id}/status`).set("active");
    renderCallDashboard(state.currentCall);
  }

  function endContent() {
    if (!state.currentCall) return;
    state.currentCall.status = "ended";
    renderLootPanel(state.currentCall);
  }

  function addLoot() {
    const name  = document.getElementById("loot-name")?.value?.trim();
    const qty   = parseInt(document.getElementById("loot-qty")?.value || 1);
    const price = parseInt(document.getElementById("loot-price")?.value || 0);
    if (!name || !price) return;
    addLootItem(state.currentCall?.id, { name, quantity: qty, priceEach: price });
  }

  function removeLoot(itemId) {
    removeLootItem(state.currentCall?.id, itemId);
  }

  function finalizeSplit() {
    finalizeSplit(state.currentCall?.id);
  }

  function manualSignUp() {
    const name   = document.getElementById("manual-name")?.value?.trim();
    const weapon = document.getElementById("manual-weapon")?.value;
    if (!name || !state.currentCall) return;
    const pid = "player_" + name.toLowerCase().replace(/\s/g, "_");
    signUp(state.currentCall.id, pid, name, weapon);
    document.getElementById("manual-name").value = "";
  }

  let _dragPlayerId   = null;
  let _dragPlayerName = null;

  function onPlayerDragStart(ev, pid, name) {
    _dragPlayerId   = pid;
    _dragPlayerName = name;
  }

  function onSlotDrop(ev, slotId) {
    ev.preventDefault();
    if (_dragPlayerId && state.currentCall)
      reassignPlayer(state.currentCall.id, slotId, _dragPlayerId, _dragPlayerName);
  }

  // ─────────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────────
  function init() {
    renderCreateForm();
    renderCallList();

    // Ouvir Firebase em tempo real
    const db = getDB();
    if (db) {
      db.ref("masscalls").orderByChild("createdAt").limitToLast(20).on("value", snap => {
        state.activeCalls = [];
        snap.forEach(child => state.activeCalls.unshift(child.val()));
        renderCallList();
      });
    }
  }

  return {
    init, openCall, addSlot, removeSlot, updateSlot, submitCreate,
    autoAssignNow, startContent, endContent, addLoot, removeLoot,
    finalizeSplit, manualSignUp, onPlayerDragStart, onSlotDrop,
  };
})();

// ═══════════════════════════════════════════════════
// ALBION SQUIRE — guild.js
// Regear · Split · Membros · Stats · VOD · Saldo
// ═══════════════════════════════════════════════════

const GuildModule = (() => {

  let DB = null;
  function getDB() {
    if (!DB && typeof firebase !== "undefined" && firebase.apps.length)
      DB = firebase.database();
    return DB;
  }

  function fmt(n) {
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + "K";
    return Math.round(n).toLocaleString("pt-BR");
  }

  // ═══════════════════════════════════════════════
  // REGEAR
  // ═══════════════════════════════════════════════

  const RegearModule = (() => {
    let pendingRegeares = [];

    // Busca mortes recentes da guild no Killboard e calcula regear
    async function fetchGuildDeaths() {
      if (!GUILD.albionId || GUILD.albionId.includes("YOUR_")) return useMockDeaths();

      try {
        // Busca kill events da guild (mortes = o player está como vítima)
        const events = await AlbionAPI.getKillEvents(GUILD.albionId, 51);
        const deaths  = events.filter(e => e.Victim?.GuildName === GUILD.name);

        const regeares = [];
        for (const d of deaths.slice(0, 20)) {
          const kit   = await AlbionAPI.calcKitValue(d);
          const age   = Date.now() - new Date(d.TimeStamp).getTime();
          if (age > 7 * 24 * 60 * 60 * 1000) continue; // só últimos 7 dias

          regeares.push({
            id:          d.EventId,
            playerName:  d.Victim?.Name || "Desconhecido",
            playerId:    d.Victim?.Id,
            killedBy:    d.Killer?.Name || "Mob",
            zone:        d.TotalVictimKillFame > 0 ? "ZvZ/PvP" : "PvE",
            kitValue:    kit.total,
            kitItems:    kit.items,
            timestamp:   d.TimeStamp,
            status:      "pending",
            eventUrl:    `https://albiononline.com/killboard/kill/${d.EventId}`,
          });
        }
        return regeares;
      } catch (e) {
        console.warn("Falha ao buscar mortes:", e);
        return useMockDeaths();
      }
    }

    function useMockDeaths() {
      return [
        { id:"mock1", playerName:"Koziel",   killedBy:"BobCaller",  zone:"ZvZ",  kitValue:2450000, status:"pending", timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id:"mock2", playerName:"XiaoPvP",  killedBy:"GuildInimiga",zone:"ZvZ", kitValue:1820000, status:"pending", timestamp: new Date(Date.now() - 7200000).toISOString() },
        { id:"mock3", playerName:"Healer1",  killedBy:"Mob",        zone:"PvE",  kitValue:940000,  status:"approved",timestamp: new Date(Date.now() - 86400000).toISOString() },
      ];
    }

    async function approveRegear(regearId, approverId) {
      const reg = pendingRegeares.find(r => r.id === regearId);
      if (!reg) return;
      reg.status     = "approved";
      reg.approvedBy = approverId;
      reg.approvedAt = Date.now();

      const db = getDB();
      if (db) {
        await db.ref(`regeares/${regearId}`).update(reg);
        // Creditár saldo do player
        await db.ref(`balances/${reg.playerId}`).transaction(curr => (curr || 0) + reg.kitValue);
        // Debitar caixa da guild
        await db.ref("guildBalance").transaction(curr => (curr || 0) - reg.kitValue);
      }
      renderRegearList();
    }

    function rejectRegear(regearId, reason) {
      const reg = pendingRegeares.find(r => r.id === regearId);
      if (!reg) return;
      reg.status = "rejected";
      reg.reason = reason;
      const db = getDB();
      if (db) db.ref(`regeares/${regearId}`).update(reg);
      renderRegearList();
    }

    function renderRegearList() {
      const el = document.getElementById("regear-list");
      if (!el) return;

      if (!pendingRegeares.length) {
        el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">
          Nenhuma morte registrada nos últimos 7 dias.</div>`;
        return;
      }

      el.innerHTML = pendingRegeares.map(r => `
      <div class="regear-card" style="background:var(--surface-2);border:1px solid var(--border);border-radius:3px;padding:14px;margin-bottom:8px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span style="font-size:14px;font-weight:700;color:var(--text);">${r.playerName}</span>
              <span class="badge ${r.zone === "ZvZ" ? "teal" : "gold"}">${r.zone}</span>
              <span class="badge ${r.status === "approved" ? "green" : r.status === "rejected" ? "red" : "gold"}">${r.status === "approved" ? "Aprovado" : r.status === "rejected" ? "Recusado" : "Pendente"}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);">Morto por: ${r.killedBy} · ${new Date(r.timestamp).toLocaleString("pt-BR")}</div>
            ${r.kitItems?.length ? `
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
              ${r.kitItems.filter(i => i.price > 0).map(i => `
              <div style="display:flex;align-items:center;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:2px;padding:2px 6px;">
                <img src="${AlbionAPI.itemImageUrl(i.itemId)}" width="16" height="16" style="border-radius:2px;" onerror="this.style.display='none'">
                <span style="font-size:10px;color:var(--text-muted);">${fmt(i.price)}</span>
              </div>`).join("")}
            </div>` : ""}
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:20px;font-weight:700;color:var(--gold);">${fmt(r.kitValue)}</div>
            <div style="font-size:10px;color:var(--text-muted);">valor do kit</div>
            ${r.status === "pending" ? `
            <div style="display:flex;gap:6px;margin-top:8px;">
              <button class="sq-btn-danger"   onclick="GuildModule.rejectRegear('${r.id}','Não elegível')" style="font-size:11px;padding:4px 8px;">Recusar</button>
              <button class="sq-btn-primary"  onclick="GuildModule.approveRegear('${r.id}')" style="font-size:11px;padding:4px 8px;">Aprovar</button>
            </div>` : ""}
          </div>
        </div>
        ${r.approvedBy ? `<div style="font-size:10px;color:var(--text-muted);margin-top:6px;border-top:1px solid var(--border);padding-top:6px;">Aprovado por: ${r.approvedBy}</div>` : ""}
      </div>`).join("");
    }

    async function init() {
      pendingRegeares = await fetchGuildDeaths();
      renderRegearList();
    }

    return { init, approveRegear: (id) => approveRegear(id, "Officer"), rejectRegear, renderRegearList };
  })();

  // ═══════════════════════════════════════════════
  // MEMBROS
  // ═══════════════════════════════════════════════

  const MembrosModule = (() => {
    let members = [];

    async function fetchMembers() {
      const db = getDB();
      if (db) {
        const snap = await db.ref("members").once("value");
        members = [];
        snap.forEach(c => members.push(c.val()));
        if (members.length) return members;
      }
      // Mock
      members = [
        { id:"p1", name:"Koziel",   role:"Líder",   ip:1550, kills:142, deaths:18, attendance:92, weapons:["2H_FROSTSTAFF","2H_HAMMER"],         balance:4200000 },
        { id:"p2", name:"XiaoPvP",  role:"Officer", ip:1480, kills:98,  deaths:31, attendance:85, weapons:["MAIN_AXE","MAIN_DAGGER"],             balance:1800000 },
        { id:"p3", name:"HealerTop",role:"Officer", ip:1510, kills:12,  deaths:22, attendance:97, weapons:["MAIN_HOLYSTAFF","2H_NATURESTAFF"],    balance:3100000 },
        { id:"p4", name:"CursedGuy",role:"Membro",  ip:1420, kills:76,  deaths:28, attendance:71, weapons:["2H_CURSEDSTAFF"],                     balance:950000  },
        { id:"p5", name:"CrossbowX",role:"Membro",  ip:1395, kills:54,  deaths:19, attendance:68, weapons:["MAIN_CROSSBOW"],                      balance:620000  },
        { id:"p6", name:"FrostBot",  role:"Membro", ip:1460, kills:89,  deaths:24, attendance:79, weapons:["2H_FROSTSTAFF"],                      balance:1250000 },
        { id:"p7", name:"Frontline1",role:"Membro", ip:1380, kills:31,  deaths:35, attendance:60, weapons:["2H_HAMMER","2H_QUARTERSTAFF"],         balance:340000  },
        { id:"p8", name:"NatureHeal",role:"Membro", ip:1440, kills:8,   deaths:15, attendance:88, weapons:["2H_NATURESTAFF"],                     balance:2100000 },
      ];
      return members;
    }

    function renderMemberTable() {
      const el = document.getElementById("membros-tbody");
      if (!el) return;

      el.innerHTML = members.map((m, i) => {
        const kd = m.deaths ? (m.kills / m.deaths).toFixed(2) : m.kills.toFixed(1);
        return `
        <tr>
          <td class="rank${i < 3 ? " top1" : ""}">${i + 1}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="user-avatar">${m.name[0].toUpperCase()}</div>
              <div>
                <div class="item-name">${m.name}</div>
                <div class="item-sub">${m.weapons?.map(w => CRAFT_BOM[w]?.label || w).join(", ") || "—"}</div>
              </div>
            </div>
          </td>
          <td><span class="badge ${m.role === "Líder" ? "gold" : m.role === "Officer" ? "teal" : "green"}">${m.role}</span></td>
          <td class="right" style="color:var(--teal);font-weight:700;">${m.ip.toLocaleString()}</td>
          <td class="right" style="color:var(--green);">${m.kills}</td>
          <td class="right" style="color:var(--red);">${m.deaths}</td>
          <td class="right" style="color:var(--text-2);">${kd}</td>
          <td class="right">
            <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;">
              <div style="width:50px;height:4px;background:var(--border);border-radius:2px;">
                <div style="width:${m.attendance}%;height:100%;background:${m.attendance >= 80 ? "var(--green)" : m.attendance >= 60 ? "var(--gold)" : "var(--red)"};border-radius:2px;"></div>
              </div>
              <span style="font-size:11px;color:var(--text-muted);">${m.attendance}%</span>
            </div>
          </td>
          <td class="right" style="color:var(--gold);">${fmt(m.balance)}</td>
        </tr>`;
      }).join("");
    }

    async function init() {
      await fetchMembers();
      renderMemberTable();
    }

    return { init, members: () => members };
  })();

  // ═══════════════════════════════════════════════
  // VOD REVIEW
  // ═══════════════════════════════════════════════

  const VodModule = (() => {
    let vods = [];

    function submitVod(playerName, videoUrl, callId) {
      const vod = {
        id:         Date.now().toString(36),
        playerName,
        videoUrl,
        callId:     callId || "manual",
        submittedAt: Date.now(),
        status:     "pending",
        scores:     {},
        finalScore: null,
      };
      vods.unshift(vod);
      const db = getDB();
      if (db) db.ref(`vods/${vod.id}`).set(vod);
      renderVodQueue();
    }

    function scoreVod(vodId, scores) {
      const vod = vods.find(v => v.id === vodId);
      if (!vod) return;

      let totalScore = 0;
      let totalWeight = 0;
      for (const criterion of VOD_MATRIX) {
        const s = scores[criterion.id] || 5;
        totalScore  += s * criterion.weight;
        totalWeight += criterion.weight;
      }
      vod.finalScore = (totalScore / totalWeight).toFixed(1);
      vod.scores     = scores;
      vod.status     = "reviewed";
      vod.reviewedAt = Date.now();

      const db = getDB();
      if (db) db.ref(`vods/${vodId}`).update(vod);
      renderVodQueue();
    }

    function renderVodQueue() {
      const el = document.getElementById("vod-list");
      if (!el) return;

      const pending  = vods.filter(v => v.status === "pending");
      const reviewed = vods.filter(v => v.status === "reviewed");

      if (!vods.length) {
        el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">Nenhum VOD submetido ainda.</div>`;
        return;
      }

      el.innerHTML = `
      ${pending.length ? `<div class="stat-label" style="margin-bottom:8px;">Para Review (${pending.length})</div>
      ${pending.map(v => renderVodCard(v)).join("")}` : ""}
      ${reviewed.length ? `<div class="stat-label" style="margin:12px 0 8px;">Revisados</div>
      ${reviewed.map(v => renderVodCard(v)).join("")}` : ""}`;
    }

    function renderVodCard(v) {
      const isYt = v.videoUrl?.includes("youtube") || v.videoUrl?.includes("youtu.be");
      const isTw = v.videoUrl?.includes("twitch");

      return `
      <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:3px;padding:12px;margin-bottom:8px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span style="font-size:14px;font-weight:700;color:var(--text);">${v.playerName}</span>
              <span class="badge ${v.status === "reviewed" ? "green" : "gold"}">${v.status === "reviewed" ? "Revisado" : "Pendente"}</span>
              ${isYt ? `<span class="badge red">YouTube</span>` : isTw ? `<span class="badge teal">Twitch</span>` : ""}
            </div>
            <a href="${v.videoUrl}" target="_blank" style="font-size:11px;color:var(--teal);">${v.videoUrl}</a>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Enviado em ${new Date(v.submittedAt).toLocaleString("pt-BR")}</div>
          </div>
          ${v.finalScore ? `
          <div style="text-align:center;flex-shrink:0;">
            <div style="font-size:28px;font-weight:700;color:${v.finalScore >= 8 ? "var(--green)" : v.finalScore >= 6 ? "var(--gold)" : "var(--red)"};">${v.finalScore}</div>
            <div style="font-size:9px;color:var(--text-muted);letter-spacing:1px;">NOTA</div>
          </div>` : `
          <button class="sq-btn" onclick="GuildModule.openVodReview('${v.id}')" style="flex-shrink:0;">Revisar</button>`}
        </div>
        ${v.scores && Object.keys(v.scores).length ? `
        <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px;display:flex;flex-wrap:wrap;gap:8px;">
          ${VOD_MATRIX.map(c => `
          <div style="font-size:10px;color:var(--text-muted);">
            ${c.label}: <span style="color:var(--text);font-weight:700;">${v.scores[c.id] || "—"}/10</span>
          </div>`).join("")}
        </div>` : ""}
      </div>`;
    }

    function openVodReview(vodId) {
      const vod = vods.find(v => v.id === vodId);
      if (!vod) return;

      const modal = document.getElementById("vod-review-modal");
      if (!modal) return;

      modal.style.display = "flex";
      modal.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:20px;width:100%;max-width:500px;max-height:80vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="font-family:var(--font-display);font-size:14px;color:var(--text);text-transform:uppercase;">Review: ${vod.playerName}</h3>
          <button onclick="document.getElementById('vod-review-modal').style.display='none'" style="background:none;border:none;color:var(--text-muted);font-size:20px;cursor:pointer;">×</button>
        </div>
        <a href="${vod.videoUrl}" target="_blank" style="display:block;color:var(--teal);font-size:12px;margin-bottom:16px;">▶ Abrir vídeo</a>
        ${VOD_MATRIX.map(c => `
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <label style="font-size:12px;font-weight:700;color:var(--text);">${c.label} <span style="color:var(--text-muted);font-weight:400;">(${c.weight}%)</span></label>
            <span id="score-val-${c.id}" style="font-size:12px;font-weight:700;color:var(--teal);">5</span>
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;">${c.desc}</div>
          <input type="range" min="1" max="10" value="5" class="sq-range" id="score-${c.id}"
            oninput="document.getElementById('score-val-${c.id}').textContent=this.value">
        </div>`).join("")}
        <button class="sq-btn-primary" style="width:100%;margin-top:8px;"
          onclick="GuildModule.submitVodScores('${vodId}')">Salvar Review</button>
      </div>`;
    }

    function submitVodScores(vodId) {
      const scores = {};
      for (const c of VOD_MATRIX) {
        scores[c.id] = parseInt(document.getElementById(`score-${c.id}`)?.value || 5);
      }
      scoreVod(vodId, scores);
      document.getElementById("vod-review-modal").style.display = "none";
    }

    function init() {
      // Mock vods
      vods = [
        { id:"v1", playerName:"XiaoPvP",   videoUrl:"https://youtu.be/example1", submittedAt: Date.now() - 3600000, status:"pending" },
        { id:"v2", playerName:"FrostBot",   videoUrl:"https://youtu.be/example2", submittedAt: Date.now() - 7200000, status:"reviewed", finalScore:"7.8", scores:{ positioning:8, rotation:7, target:8, survival:7, engage:9 } },
      ];

      const db = getDB();
      if (db) {
        db.ref("vods").on("value", snap => {
          vods = [];
          snap.forEach(c => vods.push(c.val()));
          vods.sort((a, b) => b.submittedAt - a.submittedAt);
          renderVodQueue();
        });
      } else {
        renderVodQueue();
      }

      // Form submit
      const btn = document.getElementById("vod-submit-btn");
      if (btn) {
        btn.addEventListener("click", () => {
          const name = document.getElementById("vod-player-name")?.value?.trim();
          const url  = document.getElementById("vod-url")?.value?.trim();
          if (!name || !url) return;
          submitVod(name, url);
          document.getElementById("vod-player-name").value = "";
          document.getElementById("vod-url").value = "";
        });
      }
    }

    return { init, submitVodScores, openVodReview };
  })();

  // ═══════════════════════════════════════════════
  // BUILDS EDITOR
  // ═══════════════════════════════════════════════

  const BuildsModule = (() => {
    let comps = [];

    function defaultComps() {
      return [
        {
          id: "comp-zvz-standard",
          name: "ZvZ Standard 20v20",
          type: "ZvZ",
          updatedBy: "Koziel",
          updatedAt: Date.now(),
          slots: [
            { role:"mainhealer", weapon:"MAIN_HOLYSTAFF",  count:2, build:{ helmet:"HEAD_CLOTH_SET1", chest:"ARMOR_CLOTH_SET1", boots:"SHOES_CLOTH_SET1", cape:"T8_CAPEITEM_GUARDIAN", notes:"Full CDR cloth. Prioridade no healer sagrado." } },
            { role:"offhealer",  weapon:"2H_NATURESTAFF",  count:2, build:{ helmet:"HEAD_CLOTH_SET1", chest:"ARMOR_CLOTH_SET1", boots:"SHOES_CLOTH_SET1", cape:"T8_CAPEITEM_GUARDIAN", notes:"Root + heal backup." } },
            { role:"maindps",    weapon:"2H_FROSTSTAFF",   count:5, build:{ helmet:"HEAD_CLOTH_SET1", chest:"ARMOR_CLOTH_SET1", boots:"SHOES_CLOTH_SET1", cape:"T8_CAPEITEM_AVALONIAN", notes:"Q Icicle + W Frost Nova + E Glacial Spike. Full CC." } },
            { role:"offdps",     weapon:"2H_CURSEDSTAFF",  count:4, build:{ helmet:"HEAD_CLOTH_SET1", chest:"ARMOR_CLOTH_SET1", boots:"SHOES_CLOTH_SET1", cape:"T8_CAPEITEM_AVALONIAN", notes:"Debuff stack pra reduzir res dos inimigos." } },
            { role:"frontline",  weapon:"2H_HAMMER",       count:4, build:{ helmet:"HEAD_PLATE_SET1", chest:"ARMOR_PLATE_SET1", boots:"SHOES_PLATE_SET1", cape:"T8_CAPEITEM_GUARDIAN", notes:"Ground Shaker pra iniciar engages." } },
            { role:"cc",         weapon:"MAIN_ARCANESTAFF",count:3, build:{ helmet:"HEAD_CLOTH_SET1", chest:"ARMOR_CLOTH_SET1", boots:"SHOES_CLOTH_SET1", cape:"T8_CAPEITEM_AVALONIAN", notes:"Purge de buffs do healer inimigo." } },
          ],
        },
      ];
    }

    function renderBuildList() {
      const el = document.getElementById("builds-list");
      if (!el) return;

      el.innerHTML = comps.map(c => `
      <div class="build-card" style="background:var(--surface-2);border:1px solid var(--border);border-radius:3px;padding:14px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div>
            <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--text);text-transform:uppercase;">${c.name}</div>
            <div style="font-size:11px;color:var(--text-muted);">Tipo: ${c.type} · Atualizado por ${c.updatedBy} · ${new Date(c.updatedAt).toLocaleDateString("pt-BR")}</div>
          </div>
          <button class="sq-btn" onclick="GuildModule.editBuild('${c.id}')">Editar</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${c.slots.map(s => {
            const role = ZVZ_ROLES.find(r => r.id === s.role);
            const bom  = CRAFT_BOM[s.weapon];
            return `
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:3px;padding:8px 10px;min-width:120px;">
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
                <i class="ti ${role?.icon || "ti-user"}" style="font-size:12px;color:${role?.color || "var(--text-muted)"};" aria-hidden="true"></i>
                <span style="font-size:10px;font-weight:700;color:${role?.color || "var(--text-muted)"};">${role?.label || s.role}</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <img src="${AlbionAPI.itemImageUrl(`T8_${s.weapon}`)}" width="24" height="24" style="border-radius:2px;" onerror="this.style.display='none'">
                <div>
                  <div style="font-size:11px;font-weight:700;color:var(--text);">x${s.count} ${bom?.label || s.weapon}</div>
                  ${s.build?.notes ? `<div style="font-size:9px;color:var(--text-muted);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.build.notes}</div>` : ""}
                </div>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>`).join("");
    }

    function init() {
      const db = getDB();
      if (db) {
        db.ref("comps").on("value", snap => {
          comps = [];
          snap.forEach(c => comps.push(c.val()));
          if (!comps.length) comps = defaultComps();
          renderBuildList();
        });
      } else {
        comps = defaultComps();
        renderBuildList();
      }
    }

    return { init };
  })();

  // ═══════════════════════════════════════════════
  // SALDOS
  // ═══════════════════════════════════════════════

  function renderBalances() {
    const el = document.getElementById("balances-tbody");
    if (!el) return;

    const members = MembrosModule.members();
    el.innerHTML = members.map((m, i) => `
    <tr>
      <td class="rank${i === 0 ? " top1" : ""}">${i + 1}</td>
      <td><div class="item-name">${m.name}</div></td>
      <td><span class="badge ${m.role === "Líder" ? "gold" : m.role === "Officer" ? "teal" : "green"}">${m.role}</span></td>
      <td class="right" style="color:var(--${m.balance >= 0 ? "gold" : "red"});font-weight:700;">${fmt(m.balance)}</td>
      <td class="right"><button class="sq-btn" style="font-size:10px;padding:3px 8px;">Ajustar</button></td>
    </tr>`).join("");
  }

  // ═══════════════════════════════════════════════
  // EXPOR
  // ═══════════════════════════════════════════════

  async function init() {
    await MembrosModule.init();
    await RegearModule.init();
    VodModule.init();
    BuildsModule.init();
    renderBalances();
  }

  return {
    init,
    approveRegear: RegearModule.approveRegear,
    rejectRegear:  RegearModule.rejectRegear,
    openVodReview: VodModule.openVodReview,
    submitVodScores: VodModule.submitVodScores,
    editBuild: (id) => console.log("Edit build:", id), // TODO: modal editor
  };
})();

// ═══════════════════════════════════════════════════
// ALBION SQUIRE — boards.js
// Battle Boards — kills, battles, leaderboards
// ═══════════════════════════════════════════════════

const BoardsModule = (() => {

  let battles = [];
  let killEvents = [];

  function fmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
    return Math.round(n).toLocaleString("pt-BR");
  }

  function fmtAge(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000)   return "agora";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000)return `${Math.floor(diff / 3600000)}h atrás`;
    return `${Math.floor(diff / 86400000)}d atrás`;
  }

  // ── Renderizar Battle Card ───────────────────────
  function renderBattleCard(b) {
    const alliances   = b.AlliancesText || "";
    const guilds      = b.GuildsText    || [];
    const guildData   = b.guilds || {};
    const ourGuild    = guildData[GUILD.name] || null;

    const totalKills  = b.TotalKills  || 0;
    const totalFame   = b.TotalFame   || 0;
    const duration    = b.duration    || 0;

    // Calcular top healer e top killer do nosso lado
    let topKiller = null, topHealer = null;

    if (b.players) {
      const ourPlayers = Object.values(b.players).filter(p => p.GuildName === GUILD.name);
      topKiller = ourPlayers.reduce((a, b) => (b.Kills || 0) > (a?.Kills || 0) ? b : a, null);
      // Healer = maior heal (não disponível diretamente; usamos menor mortes + mais presença)
      topHealer = ourPlayers
        .filter(p => p.Deaths === 0)
        .sort((a, b) => (b.FameContribution || 0) - (a.FameContribution || 0))[0] || null;
    }

    const weWon = ourGuild?.Kills > ourGuild?.Deaths;

    return `
    <div class="battle-card" onclick="BoardsModule.openBattle('${b.id || ""}')"
      style="background:var(--surface-2);border:1px solid ${weWon ? "var(--teal-dim)" : "var(--border)"};border-radius:3px;padding:14px;margin-bottom:10px;cursor:pointer;transition:border-color 0.15s;">

      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
            <span class="badge ${weWon ? "green" : "red"}">${weWon ? "VITÓRIA" : "DERROTA"}</span>
            <span class="badge gold">${b.type || "Battle"}</span>
            <span style="font-size:11px;color:var(--text-muted);">${fmtAge(b.startTime || Date.now())}</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);">${b.location || "Zona Desconhecida"}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:var(--text-muted);">Fama total</div>
          <div style="font-size:16px;font-weight:700;color:var(--gold);">${fmt(totalFame)}</div>
        </div>
      </div>

      <!-- Scoreboard tipo Albion BB -->
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;padding:10px;background:var(--surface);border-radius:3px;margin-bottom:10px;">
        <div style="text-align:left;">
          <div style="font-size:13px;font-weight:700;color:${weWon ? "var(--teal)" : "var(--text-muted)"};">${GUILD.name}</div>
          <div style="font-size:11px;color:var(--text-muted);">${ourGuild?.MemberCount || "?"} players</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:24px;font-weight:700;color:var(--text);">
            <span style="color:${weWon ? "var(--green)" : "var(--red)"};">${ourGuild?.Kills || 0}</span>
            <span style="color:var(--text-muted);font-size:18px;"> : </span>
            <span style="color:${!weWon ? "var(--green)" : "var(--red)"};">${ourGuild?.Deaths || 0}</span>
          </div>
          <div style="font-size:9px;color:var(--text-faint);letter-spacing:2px;text-transform:uppercase;">K/D</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:13px;font-weight:700;color:var(--text-muted);">${guilds.filter(g => g !== GUILD.name).slice(0, 2).join(", ") || "Inimigos"}</div>
        </div>
      </div>

      <!-- MVP row -->
      <div style="display:flex;gap:12px;">
        ${topKiller ? `
        <div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:3px;padding:8px;">
          <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--red);margin-bottom:4px;">⚔ Top Killer</div>
          <div style="font-size:12px;font-weight:700;color:var(--text);">${topKiller.Name || "?"}</div>
          <div style="font-size:10px;color:var(--text-muted);">${topKiller.Kills || 0} kills</div>
        </div>` : ""}
        ${topHealer ? `
        <div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:3px;padding:8px;">
          <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--green);margin-bottom:4px;">💚 Top Healer</div>
          <div style="font-size:12px;font-weight:700;color:var(--text);">${topHealer.Name || "?"}</div>
          <div style="font-size:10px;color:var(--text-muted);">0 mortes no conteúdo</div>
        </div>` : ""}
        <div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:3px;padding:8px;">
          <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold);margin-bottom:4px;">📊 Total</div>
          <div style="font-size:12px;font-weight:700;color:var(--text);">${totalKills} kills</div>
          <div style="font-size:10px;color:var(--text-muted);">${fmt(totalFame)} fama</div>
        </div>
      </div>
    </div>`;
  }

  // ── Renderizar Kill Event ────────────────────────
  function renderKillEvent(e) {
    const killer = e.Killer;
    const victim = e.Victim;
    const isOurKill  = killer?.GuildName === GUILD.name;
    const isOurDeath = victim?.GuildName === GUILD.name;
    if (!isOurKill && !isOurDeath) return "";

    const fame = e.TotalVictimKillFame || 0;
    const mainWeapon = killer?.Equipment?.MainHand?.Type;
    const imgUrl = mainWeapon ? AlbionAPI.itemImageUrl(mainWeapon) : null;

    return `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:3px;margin-bottom:5px;">
      ${imgUrl ? `<img src="${imgUrl}" width="28" height="28" style="border-radius:3px;" onerror="this.style.display='none'">` : `<div style="width:28px;height:28px;background:var(--surface);border-radius:3px;"></div>`}
      <div style="flex:1;">
        <div style="font-size:13px;">
          <span style="font-weight:700;color:${isOurKill ? "var(--teal)" : "var(--text)"};">${killer?.Name || "?"}</span>
          <span style="color:var(--text-muted);"> matou </span>
          <span style="font-weight:700;color:${isOurDeath ? "var(--red)" : "var(--text-muted)"};">${victim?.Name || "?"}</span>
        </div>
        <div style="font-size:10px;color:var(--text-muted);">${fmtAge(e.TimeStamp)} · ${killer?.GuildName || "Sem guild"}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:13px;font-weight:700;color:var(--gold);">${fmt(fame)}</div>
        <span class="badge ${isOurKill ? "green" : "red"}" style="font-size:9px;">${isOurKill ? "Kill" : "Death"}</span>
      </div>
    </div>`;
  }

  // ── Renderizar Leaderboard ───────────────────────
  function renderLeaderboard(events) {
    const el = document.getElementById("boards-leaderboard");
    if (!el) return;

    const stats = {};
    for (const e of events) {
      // Nossos kills
      if (e.Killer?.GuildName === GUILD.name) {
        const n = e.Killer.Name;
        if (!stats[n]) stats[n] = { name:n, kills:0, deaths:0, fame:0 };
        stats[n].kills++;
        stats[n].fame += e.TotalVictimKillFame || 0;
      }
      // Nossas mortes
      if (e.Victim?.GuildName === GUILD.name) {
        const n = e.Victim.Name;
        if (!stats[n]) stats[n] = { name:n, kills:0, deaths:0, fame:0 };
        stats[n].deaths++;
      }
    }

    const sorted = Object.values(stats).sort((a, b) => b.kills - a.kills).slice(0, 10);

    el.innerHTML = `
    <div class="stat-label" style="margin-bottom:8px;">Top Killers da Semana</div>
    <div class="sq-table-wrap">
      <table class="sq-table">
        <thead><tr>
          <th>#</th><th>Player</th><th class="right">Kills</th><th class="right">Mortes</th><th class="right teal">K/D</th><th class="right">Fama</th>
        </tr></thead>
        <tbody>
          ${sorted.map((p, i) => `
          <tr>
            <td class="rank${i === 0 ? " top1" : ""}">${i + 1}</td>
            <td class="item-name">${p.name}</td>
            <td class="right" style="color:var(--green);">${p.kills}</td>
            <td class="right" style="color:var(--red);">${p.deaths}</td>
            <td class="right" style="color:var(--teal);font-weight:700;">${p.deaths ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(1)}</td>
            <td class="right gold">${fmt(p.fame)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
  }

  // ── Carregar dados ───────────────────────────────
  async function load() {
    const el = document.getElementById("boards-battles");
    const kl = document.getElementById("boards-kills");
    if (el) el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--teal);font-size:12px;letter-spacing:1px;">Carregando battle boards...</div>`;

    try {
      const guildId = GUILD.albionId && !GUILD.albionId.includes("YOUR_") ? GUILD.albionId : null;

      // Kill events
      let events = [];
      try {
        events = await AlbionAPI.getKillEvents(guildId, 51);
        killEvents = events;
      } catch (e) { events = getMockEvents(); }

      // Batalhas
      let bats = [];
      try {
        bats = await AlbionAPI.getBattles(guildId, 20);
        battles = bats;
      } catch (e) { bats = getMockBattles(); }

      // Renderizar
      if (el) el.innerHTML = bats.length
        ? bats.map(renderBattleCard).join("")
        : `<div style="text-align:center;padding:40px;color:var(--text-muted);">Nenhuma batalha encontrada.</div>`;

      if (kl) kl.innerHTML = events.length
        ? events.filter(e => e.Killer?.GuildName === GUILD.name || e.Victim?.GuildName === GUILD.name)
              .slice(0, 30).map(renderKillEvent).join("") ||
          `<div style="text-align:center;padding:20px;color:var(--text-muted);">Nenhum kill/death da guild nos eventos recentes.</div>`
        : `<div style="text-align:center;padding:20px;color:var(--text-muted);">Sem dados de kills.</div>`;

      renderLeaderboard(events);

    } catch (e) {
      console.error("Boards load error:", e);
      if (el) el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--red);">Erro ao carregar battles: ${e.message}</div>`;
    }
  }

  function openBattle(id) {
    if (id) window.open(`https://albiononline.com/en/battleboard?id=${id}`, "_blank");
  }

  // ── Mock data ────────────────────────────────────
  function getMockBattles() {
    return [
      {
        id: "battle1", type: "ZvZ", location: "Caerleon Outskirts",
        startTime: new Date(Date.now() - 7200000).toISOString(),
        TotalKills: 47, TotalFame: 18500000,
        guilds: [GUILD.name, "GuildInimiga"],
        players: {},
        guilds: { [GUILD.name]: { Kills: 31, Deaths: 16, MemberCount: 20 } },
      },
      {
        id: "battle2", type: "Chall", location: "Hellgate Portal",
        startTime: new Date(Date.now() - 86400000).toISOString(),
        TotalKills: 18, TotalFame: 6200000,
        guilds: { [GUILD.name]: { Kills: 8, Deaths: 10, MemberCount: 10 } },
      },
    ];
  }

  function getMockEvents() {
    return [
      { EventId: "e1", TimeStamp: new Date().toISOString(), TotalVictimKillFame: 4200000,
        Killer: { Name:"Koziel", GuildName: GUILD.name, Equipment:{ MainHand:{ Type:"T8_2H_FROSTSTAFF" } } },
        Victim: { Name:"EnemyCaller", GuildName:"InimiguinhoGuild" } },
      { EventId: "e2", TimeStamp: new Date(Date.now()-3600000).toISOString(), TotalVictimKillFame: 1800000,
        Killer: { Name:"BobEnemy", GuildName:"InimiguinhoGuild", Equipment:{ MainHand:{ Type:"T8_2H_HAMMER" } } },
        Victim: { Name:"XiaoPvP", GuildName: GUILD.name } },
      { EventId: "e3", TimeStamp: new Date(Date.now()-7200000).toISOString(), TotalVictimKillFame: 3100000,
        Killer: { Name:"XiaoPvP", GuildName: GUILD.name, Equipment:{ MainHand:{ Type:"T8_MAIN_AXE" } } },
        Victim: { Name:"Enemy2", GuildName:"InimiguinhoGuild" } },
    ];
  }

  function init() {
    load();
    const btn = document.getElementById("boards-refresh");
    if (btn) btn.addEventListener("click", load);
  }

  return { init, openBattle };
})();

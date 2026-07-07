// ═══════════════════════════════════════════════════
// ALBION SQUIRE — buildstudy.js
// Analisador de Builds — stats, IP scaling, combos
// ═══════════════════════════════════════════════════

const BuildStudyModule = (() => {

  let selectedWeapons = [];
  let currentIP = 1500;

  // Escala de dano por IP (fórmula simplificada do Albion)
  // IP 900 = base, cada 100 IP ~ +8% de stats
  function ipScale(baseDmg, ip) {
    const baseIP = 900;
    const factor = 1 + ((ip - baseIP) / 100) * 0.065;
    return Math.round(baseDmg * factor);
  }

  function getWeaponFullId(weaponKey, tier = 8, enchant = 0) {
    return enchant > 0 ? `T${tier}_${weaponKey}@${enchant}` : `T${tier}_${weaponKey}`;
  }

  // ── Synergy Engine ───────────────────────────────
  // Analisa combinações de armas e aponta sinergias/fraquezas
  const SYNERGIES = [
    { weapons: ["2H_FROSTSTAFF", "2H_HAMMER"],   score: 10, label:"⭐ Combo clássico ZvZ",     desc:"Frost Root + Hammer Stun = lock total do inimigo." },
    { weapons: ["2H_CURSEDSTAFF", "2H_FROSTSTAFF"], score:9,label:"⭐ Debuff + CC",             desc:"Cursed reduz resistência, Frost finaliza." },
    { weapons: ["MAIN_ARCANESTAFF", "MAIN_HOLYSTAFF"], score:9, label:"⭐ Anti-healer + Heal",  desc:"Purge no healer inimigo enquanto o seu heala." },
    { weapons: ["2H_HAMMER", "MAIN_HOLYSTAFF"],   score: 8, label:"Frontline sustentada",      desc:"Stun do Hammer mantém o healer vivo na linha." },
    { weapons: ["MAIN_CROSSBOW", "2H_FROSTSTAFF"],score: 8, label:"Poke + CC",                 desc:"Salvo de crossbow abre brechas pro Frost fechar." },
    { weapons: ["2H_NATURESTAFF", "2H_FROSTSTAFF"],score:7, label:"Root duplo",                desc:"Root da Natureza + Root do Frost = CC encadeado." },
    { weapons: ["MAIN_AXE", "2H_CURSEDSTAFF"],    score: 7, label:"Burst + Debuff",            desc:"Bleed do Machado + Debuff do Cursed = execução." },
    { weapons: ["MAIN_DAGGER", "2H_CURSEDSTAFF"], score: 6, label:"Assassino + Suporte",       desc:"Dagger entra no healer, Cursed amplifica o dano." },
  ];

  function detectSynergies(weapons) {
    const found = [];
    for (const syn of SYNERGIES) {
      if (syn.weapons.every(w => weapons.includes(w))) found.push(syn);
    }
    return found;
  }

  // ── Fraquezas ────────────────────────────────────
  function detectWeaknesses(weapons) {
    const roles = weapons.map(w => WEAPON_STATS[w]?.role || "");
    const warnings = [];
    if (!roles.some(r => r.includes("Healer"))) warnings.push("⚠️ Sem healer — a comp vai morrer rápido");
    if (!roles.some(r => r.includes("Tank") || r.includes("Frontline"))) warnings.push("⚠️ Sem frontline — a comp fica exposta");
    if (!roles.some(r => r.includes("CC"))) warnings.push("⚠️ Sem CC — difícil travar o inimigo");
    if (roles.filter(r => r.includes("DPS")).length > weapons.length * 0.7) warnings.push("⚠️ Muitos DPS — comp pode ser muito frágil");
    return warnings;
  }

  // ── Render: Weapon Picker ────────────────────────
  function renderWeaponPicker() {
    const el = document.getElementById("buildstudy-picker");
    if (!el) return;

    const groups = {
      "Cajados Mágicos": Object.entries(WEAPON_STATS).filter(([k]) => k.includes("STAFF")),
      "Armas de Combate": Object.entries(WEAPON_STATS).filter(([k]) => !k.includes("STAFF") && !k.includes("BOW") && !k.includes("CROSSBOW")),
      "Arco / Besta":    Object.entries(WEAPON_STATS).filter(([k]) => k.includes("BOW") || k.includes("CROSSBOW")),
    };

    el.innerHTML = Object.entries(groups).map(([groupName, weapons]) => `
    <div style="margin-bottom:16px;">
      <div class="stat-label" style="margin-bottom:8px;">${groupName}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${weapons.map(([key, stats]) => {
          const bom = CRAFT_BOM[key] || {};
          const selected = selectedWeapons.includes(key);
          return `
          <div class="weapon-chip ${selected ? "selected" : ""}" onclick="BuildStudyModule.toggleWeapon('${key}')"
            style="display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid ${selected ? "var(--teal)" : "var(--border)"};border-radius:3px;cursor:pointer;background:${selected ? "var(--teal-muted)" : "var(--surface)"};transition:all 0.15s;">
            <img src="${AlbionAPI.itemImageUrl(`T8_${key}`)}" width="24" height="24" style="border-radius:2px;" onerror="this.style.display='none'">
            <div>
              <div style="font-size:12px;font-weight:${selected ? "700" : "500"};color:${selected ? "var(--teal)" : "var(--text-2)"};">${bom.label || key}</div>
              <div style="font-size:9px;color:var(--text-muted);">${stats.role}</div>
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>`).join("");
  }

  // ── Render: Análise da seleção ───────────────────
  function renderAnalysis() {
    const el = document.getElementById("buildstudy-analysis");
    if (!el) return;

    if (!selectedWeapons.length) {
      el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);opacity:0.5;">
        <i class="ti ti-sword" style="font-size:32px;display:block;margin-bottom:8px;" aria-hidden="true"></i>
        Selecione armas ao lado para analisar</div>`;
      return;
    }

    const synergies  = detectSynergies(selectedWeapons);
    const weaknesses = detectWeaknesses(selectedWeapons);

    // Stats das armas selecionadas escalados pelo IP
    const weaponRows = selectedWeapons.map(key => {
      const stats = WEAPON_STATS[key] || {};
      const bom   = CRAFT_BOM[key] || {};
      return { key, bom, stats, scaledDmg: stats.dmg ? ipScale(stats.dmg, currentIP) : 0 };
    });

    el.innerHTML = `
    <!-- IP Slider -->
    <div style="margin-bottom:16px;padding:12px;background:var(--surface-2);border:1px solid var(--border);border-radius:3px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <label style="font-size:12px;font-weight:700;color:var(--text);">Item Power</label>
        <span style="font-size:14px;font-weight:700;color:var(--teal);" id="ip-display">${currentIP}</span>
      </div>
      <input type="range" min="900" max="1700" step="10" value="${currentIP}" class="sq-range"
        oninput="BuildStudyModule.setIP(parseInt(this.value))">
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-muted);margin-top:2px;">
        <span>900</span><span>1100</span><span>1300</span><span>1500</span><span>1700</span>
      </div>
    </div>

    <!-- Stats das armas -->
    <div class="stat-label" style="margin-bottom:8px;">Armas Selecionadas (${selectedWeapons.length})</div>
    <div class="sq-table-wrap" style="margin-bottom:14px;">
      <table class="sq-table">
        <thead><tr>
          <th>Arma</th><th>Role</th><th class="right">Dano Base</th><th class="right teal">Dano@${currentIP}IP</th>
          <th>CC</th><th class="right">Range</th><th>AoE</th>
        </tr></thead>
        <tbody>
          ${weaponRows.map(r => `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:8px;">
                <img src="${AlbionAPI.itemImageUrl(`T8_${r.key}`)}" width="28" height="28" style="border-radius:3px;" onerror="this.style.display='none'">
                <div class="item-name">${r.bom.label || r.key}</div>
              </div>
            </td>
            <td><span class="badge teal" style="font-size:9px;">${r.stats.role || "?"}</span></td>
            <td class="right muted">${r.stats.dmg || "—"}</td>
            <td class="right" style="color:var(--gold);font-weight:700;">${r.scaledDmg || "—"}</td>
            <td style="font-size:11px;color:var(--text-2);">${r.stats.cc || "—"}</td>
            <td class="right" style="font-size:11px;color:var(--text-2);">${r.stats.range ? r.stats.range + "m" : "—"}</td>
            <td style="text-align:center;">${r.stats.aoe ? "✓" : "—"}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>

    <!-- Sinergias -->
    ${synergies.length ? `
    <div class="stat-label" style="margin-bottom:8px;">Sinergias Detectadas</div>
    ${synergies.map(s => `
    <div style="background:var(--green-muted);border:1px solid var(--green);border-radius:3px;padding:10px 12px;margin-bottom:6px;">
      <div style="font-size:13px;font-weight:700;color:var(--green);">${s.label}</div>
      <div style="font-size:11px;color:var(--text-2);margin-top:2px;">${s.desc}</div>
    </div>`).join("")}` : ""}

    <!-- Fraquezas -->
    ${weaknesses.length ? `
    <div class="stat-label" style="margin:12px 0 8px;">Avisos</div>
    ${weaknesses.map(w => `
    <div style="background:var(--red-muted);border:1px solid var(--red);border-radius:3px;padding:10px 12px;margin-bottom:6px;font-size:12px;color:var(--red);">${w}</div>`).join("")}` : ""}

    <!-- Notas das armas -->
    <div class="stat-label" style="margin:12px 0 8px;">Notas ZvZ</div>
    ${weaponRows.map(r => r.stats.notes ? `
    <div style="padding:8px 12px;border-left:2px solid var(--teal);margin-bottom:6px;">
      <div style="font-size:11px;font-weight:700;color:var(--text);">${r.bom.label || r.key}</div>
      <div style="font-size:11px;color:var(--text-2);">${r.stats.notes}</div>
    </div>` : "").join("")}

    <button class="sq-btn" onclick="BuildStudyModule.clearSelection()" style="margin-top:12px;width:100%;">Limpar seleção</button>`;
  }

  // ── API pública ──────────────────────────────────
  function toggleWeapon(key) {
    const idx = selectedWeapons.indexOf(key);
    if (idx >= 0) selectedWeapons.splice(idx, 1);
    else selectedWeapons.push(key);
    renderWeaponPicker();
    renderAnalysis();
  }

  function setIP(ip) {
    currentIP = ip;
    const d = document.getElementById("ip-display");
    if (d) d.textContent = ip;
    renderAnalysis();
  }

  function clearSelection() {
    selectedWeapons = [];
    renderWeaponPicker();
    renderAnalysis();
  }

  function init() {
    renderWeaponPicker();
    renderAnalysis();
  }

  return { init, toggleWeapon, setIP, clearSelection };
})();

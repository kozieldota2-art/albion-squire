// ═══════════════════════════════════════════════════
// ALBION SQUIRE — config.js
// Preencha as variáveis marcadas com ⚙️ antes do deploy
// ═══════════════════════════════════════════════════

// ── ⚙️ Firebase ──────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// ── ⚙️ Discord OAuth ─────────────────────────────────
const DISCORD_CLIENT_ID   = "YOUR_DISCORD_CLIENT_ID";
const DISCORD_REDIRECT    = window.location.origin + "/auth/callback";
const DISCORD_SCOPE       = "identify guilds";

// ── ⚙️ Guild ─────────────────────────────────────────
const GUILD = {
  name:                 "Nome da Guild",
  albionId:             "YOUR_ALBION_GUILD_ID",
  discordServerId:      "YOUR_DISCORD_SERVER_ID",
  massCallChannelId:    "YOUR_MASS_CALL_CHANNEL_ID",
  boardChannelId:       "YOUR_BOARDS_CHANNEL_ID",
  webhookUrl:           "YOUR_DISCORD_WEBHOOK_URL",
  guildFeePercent:      10,   // % que vai pro caixa da guild
  repairFeePercent:     3,    // % deduzido pra reparo
  regearMaxTier:        8,    // tier máximo reageado automaticamente
  officerRoles:         ["Líder", "Officer", "Oficial"],
};

// ── Albion APIs ──────────────────────────────────────
const API = {
  MARKET:  "https://west.albion-online-data.com/api/v2/stats",
  RENDER:  "https://render.albiononline.com/v1/item",
  GAME:    "https://gameinfo.albiononline.com/api/gameinfo",
  LEDGER:  "https://murderledger.albiononline.com/api/v2",
};

// ── Cidades ──────────────────────────────────────────
const CITIES = [
  "Fort Sterling","Lymhurst","Bridgewatch","Martlock","Thetford","Caerleon","Brecilien"
];

const CITY_API_NAMES = {
  "Fort Sterling": "Fort Sterling",
  "Lymhurst":      "Lymhurst",
  "Bridgewatch":   "Bridgewatch",
  "Martlock":      "Martlock",
  "Thetford":      "Thetford",
  "Caerleon":      "Caerleon",
  "Brecilien":     "Brecilien",
};

// ── Bônus de Cidade ──────────────────────────────────
// Refino: +40% na especialidade / Craft: +15% na especialidade / Base: +18% sempre
const CITY_BONUS = {
  "Fort Sterling": { refining:["PLANKS"],      crafting:["HAMMER","SPEAR","HOLY","HEAD_PLATE","ARMOR_CLOTH"] },
  "Lymhurst":      { refining:["CLOTH"],       crafting:["SWORD","BOW","ARCANE","HEAD_LEATHER","SHOES_LEATHER"] },
  "Bridgewatch":   { refining:["STONEBLOCK"],  crafting:["CROSSBOW","DAGGER","CURSED","ARMOR_PLATE","SHOES_CLOTH"] },
  "Martlock":      { refining:["LEATHER"],     crafting:["AXE","QUARTERSTAFF","FROST","SHOES_PLATE","OFFHAND"] },
  "Thetford":      { refining:["METALBAR"],    crafting:["MACE","FIRE","NATURE","ARMOR_LEATHER","HEAD_CLOTH"] },
  "Caerleon":      { refining:[],              crafting:["FOOD","GATHERING","TOOL","WAR_GLOVES","SHAPESHIFTER"] },
  "Brecilien":     { refining:[],              crafting:["CAPE","BAG","POTION"] },
};

// ── Craft BOM ────────────────────────────────────────
// qty: [T4,T5,T6,T7,T8] | cat: categoria pra match de bônus | bestCity: cidade com bônus
const CRAFT_BOM = {
  // ── Armas 1H
  MAIN_SWORD:         { mat:"METALBAR",  qty:[16,20,24,28,32], cat:"SWORD",        bestCity:"Lymhurst",      label:"Espada",          cat2:"Armas" },
  MAIN_AXE:           { mat:"METALBAR",  qty:[16,20,24,28,32], cat:"AXE",          bestCity:"Martlock",      label:"Machado",         cat2:"Armas" },
  MAIN_MACE:          { mat:"METALBAR",  qty:[16,20,24,28,32], cat:"MACE",         bestCity:"Thetford",      label:"Maça",            cat2:"Armas" },
  MAIN_SPEAR:         { mat:"METALBAR",  qty:[16,20,24,28,32], cat:"SPEAR",        bestCity:"Fort Sterling", label:"Lança",           cat2:"Armas" },
  MAIN_DAGGER:        { mat:"METALBAR",  qty:[16,20,24,28,32], cat:"DAGGER",       bestCity:"Bridgewatch",   label:"Adaga",           cat2:"Armas" },
  MAIN_ARCANESTAFF:   { mat:"PLANKS",    qty:[16,20,24,28,32], cat:"ARCANE",       bestCity:"Lymhurst",      label:"Cajado Arcano",   cat2:"Armas" },
  MAIN_FIRESTAFF:     { mat:"PLANKS",    qty:[16,20,24,28,32], cat:"FIRE",         bestCity:"Thetford",      label:"Cajado de Fogo",  cat2:"Armas" },
  MAIN_HOLYSTAFF:     { mat:"PLANKS",    qty:[16,20,24,28,32], cat:"HOLY",         bestCity:"Fort Sterling", label:"Cajado Sagrado",  cat2:"Armas" },
  MAIN_CROSSBOW:      { mat:"PLANKS",    qty:[16,20,24,28,32], cat:"CROSSBOW",     bestCity:"Bridgewatch",   label:"Besta",           cat2:"Armas" },
  // ── Armas 2H
  "2H_HAMMER":        { mat:"METALBAR",  qty:[20,24,28,32,36], cat:"HAMMER",       bestCity:"Fort Sterling", label:"Martelo 2H",      cat2:"Armas" },
  "2H_QUARTERSTAFF":  { mat:"PLANKS",    qty:[20,24,28,32,36], cat:"QUARTERSTAFF", bestCity:"Martlock",      label:"Bastão",          cat2:"Armas" },
  "2H_BOW":           { mat:"PLANKS",    qty:[20,24,28,32,36], cat:"BOW",          bestCity:"Lymhurst",      label:"Arco",            cat2:"Armas" },
  "2H_CURSEDSTAFF":   { mat:"PLANKS",    qty:[20,24,28,32,36], cat:"CURSED",       bestCity:"Bridgewatch",   label:"Cajado Amaldiç.", cat2:"Armas" },
  "2H_FROSTSTAFF":    { mat:"PLANKS",    qty:[20,24,28,32,36], cat:"FROST",        bestCity:"Martlock",      label:"Cajado de Gelo",  cat2:"Armas" },
  "2H_NATURESTAFF":   { mat:"PLANKS",    qty:[20,24,28,32,36], cat:"NATURE",       bestCity:"Thetford",      label:"Cajado Natureza", cat2:"Armas" },
  // ── Armaduras
  HEAD_PLATE_SET1:    { mat:"METALBAR",  qty:[12,15,18,21,24], cat:"HEAD_PLATE",   bestCity:"Fort Sterling", label:"Elmo de Placa",   cat2:"Armaduras" },
  ARMOR_PLATE_SET1:   { mat:"METALBAR",  qty:[16,20,24,28,32], cat:"ARMOR_PLATE",  bestCity:"Bridgewatch",   label:"Peitoral Placa",  cat2:"Armaduras" },
  SHOES_PLATE_SET1:   { mat:"METALBAR",  qty:[12,15,18,21,24], cat:"SHOES_PLATE",  bestCity:"Martlock",      label:"Botas de Placa",  cat2:"Armaduras" },
  HEAD_LEATHER_SET1:  { mat:"LEATHER",   qty:[12,15,18,21,24], cat:"HEAD_LEATHER", bestCity:"Lymhurst",      label:"Elmo de Couro",   cat2:"Armaduras" },
  ARMOR_LEATHER_SET1: { mat:"LEATHER",   qty:[16,20,24,28,32], cat:"ARMOR_LEATHER",bestCity:"Thetford",      label:"Peitoral Couro",  cat2:"Armaduras" },
  SHOES_LEATHER_SET1: { mat:"LEATHER",   qty:[12,15,18,21,24], cat:"SHOES_LEATHER",bestCity:"Lymhurst",      label:"Sapato de Couro", cat2:"Armaduras" },
  HEAD_CLOTH_SET1:    { mat:"CLOTH",     qty:[12,15,18,21,24], cat:"HEAD_CLOTH",   bestCity:"Thetford",      label:"Elmo de Tecido",  cat2:"Armaduras" },
  ARMOR_CLOTH_SET1:   { mat:"CLOTH",     qty:[16,20,24,28,32], cat:"ARMOR_CLOTH",  bestCity:"Fort Sterling", label:"Peitoral Tecido", cat2:"Armaduras" },
  SHOES_CLOTH_SET1:   { mat:"CLOTH",     qty:[12,15,18,21,24], cat:"SHOES_CLOTH",  bestCity:"Bridgewatch",   label:"Sapato de Tecido",cat2:"Armaduras" },
};

// ── Refino BOM ───────────────────────────────────────
// Para T5+: 3x raw atual + 1x refined anterior → 1x refined atual
// Para T4:  4x T4_RAW → 1x T4_REFINED (sem sub-material)
const REFINE_BOM = {
  METALBAR:   { raw:"ORE",   subMat:"METALBAR",   rawQty:3, subQty:1, cat:"METALBAR",   bestCity:"Thetford",      label:"Barra de Metal" },
  LEATHER:    { raw:"HIDE",  subMat:"LEATHER",    rawQty:3, subQty:1, cat:"LEATHER",    bestCity:"Martlock",      label:"Couro" },
  CLOTH:      { raw:"FIBER", subMat:"CLOTH",      rawQty:3, subQty:1, cat:"CLOTH",      bestCity:"Lymhurst",      label:"Tecido" },
  PLANKS:     { raw:"WOOD",  subMat:"PLANKS",     rawQty:3, subQty:1, cat:"PLANKS",     bestCity:"Fort Sterling", label:"Tábua" },
  STONEBLOCK: { raw:"ROCK",  subMat:"STONEBLOCK", rawQty:3, subQty:1, cat:"STONEBLOCK", bestCity:"Bridgewatch",   label:"Bloco de Pedra" },
};

// ── Fórmula RRR ─────────────────────────────────────
function getProductionBonus(city, itemCat, isRefining, useFocus) {
  let bonus = 18;
  const cb = CITY_BONUS[city];
  if (cb) {
    if (isRefining && cb.refining.includes(itemCat)) bonus += 40;
    if (!isRefining && cb.crafting.includes(itemCat)) bonus += 15;
  }
  if (useFocus) bonus += 59;
  return bonus;
}

function calcRRR(productionBonus) {
  return 1 - 1 / (1 + productionBonus / 100);
}

function calcProfit(sellPrice, matCost, city, itemCat, isRefining, useFocus, taxRate = 0.03) {
  const bonus = getProductionBonus(city, itemCat, isRefining, useFocus);
  const rrr   = calcRRR(bonus);
  const effectiveCost = matCost * (1 - rrr);
  const netSell       = sellPrice * (1 - taxRate);
  const profit        = netSell - effectiveCost;
  const margin        = effectiveCost > 0 ? (profit / effectiveCost) * 100 : 0;
  return { profit, margin, rrr, bonus, effectiveCost, netSell };
}

// ── Tiers e encantamentos ────────────────────────────
const TIERS     = [4, 5, 6, 7, 8];
const ENCHANTS  = [0, 1, 2, 3, 4];

// ── Weapon stats pra Build Study ─────────────────────
// Valores base no T8 qualidade normal (simplificado para ZvZ)
const WEAPON_STATS = {
  "2H_FROSTSTAFF":   { dmg:945,  cc:"Slow/Root", range:12, role:"DPS/CC",   aoe:true,  notes:"Melhor CC do jogo, excelente em ZvZ" },
  "2H_CURSEDSTAFF":  { dmg:880,  cc:"Debuff",    range:11, role:"DPS/Debuf",aoe:true,  notes:"Enfraquece o inimigo, ótimo em zerg" },
  MAIN_FIRESTAFF:    { dmg:1020, cc:"-",          range:13, role:"DPS",      aoe:true,  notes:"Alto burst AoE, frágil" },
  "2H_BOW":          { dmg:760,  cc:"Slow",       range:14, role:"DPS/Kite", aoe:false, notes:"Excelente pra anti-kite e poking" },
  "2H_HAMMER":       { dmg:820,  cc:"Stun",       range:3,  role:"Tanque/CC",aoe:true,  notes:"Stun essencial, ainda muito usado" },
  MAIN_MACE:         { dmg:700,  cc:"Disarm",     range:3,  role:"Suporte",  aoe:false, notes:"Disarm é devastador em ZvZ" },
  MAIN_HOLYSTAFF:    { dmg:400,  cc:"-",          range:11, role:"Healer",   aoe:true,  notes:"Principal heal de ZvZ" },
  "2H_NATURESTAFF":  { dmg:350,  cc:"Root",       range:12, role:"Healer/CC",aoe:true,  notes:"Root + heal, versátil" },
  MAIN_ARCANESTAFF:  { dmg:680,  cc:"Purge",      range:12, role:"Suporte",  aoe:false, notes:"Purge de buffs, antihealer" },
  MAIN_SWORD:        { dmg:750,  cc:"-",          range:3,  role:"DPS/Chase",aoe:false, notes:"Chase e 1v1, menos usado em ZvZ" },
  MAIN_AXE:          { dmg:830,  cc:"Bleed",      range:3,  role:"DPS",      aoe:false, notes:"Bleed ignora resistência" },
  "2H_QUARTERSTAFF": { dmg:900,  cc:"Knockback",  range:4,  role:"Frontline",aoe:true,  notes:"Knockback poderoso, tanque/dps" },
  MAIN_CROSSBOW:     { dmg:810,  cc:"-",          range:14, role:"DPS",      aoe:true,  notes:"Salvo AoE de longa distância" },
};

// ── Roles de ZvZ ─────────────────────────────────────
const ZVZ_ROLES = [
  { id:"mainhealer",  label:"Main Healer",    color:"#3B8A55", icon:"ti-heart-plus" },
  { id:"offhealer",   label:"Off Healer",     color:"#2E7048", icon:"ti-heart" },
  { id:"maindps",     label:"Main DPS",       color:"#B04040", icon:"ti-flame" },
  { id:"offdps",      label:"Off DPS",        color:"#8A3030", icon:"ti-sword" },
  { id:"frontline",   label:"Frontline",      color:"#C08828", icon:"ti-shield" },
  { id:"backline",    label:"Backline",       color:"#1DA898", icon:"ti-bow-arrow" },
  { id:"cc",          label:"CC/Support",     color:"#7A5DB0", icon:"ti-magnet" },
  { id:"caller",      label:"Caller",         color:"#DDD8C8", icon:"ti-speakerphone" },
];

// ── VOD Review Matrix ─────────────────────────────────
// Será preenchida pelos officers. Padrão inicial:
const VOD_MATRIX = [
  { id:"positioning", label:"Posicionamento",  weight:25, desc:"Ficou no lugar certo da comp?" },
  { id:"rotation",    label:"Rotação de Skills",weight:25, desc:"Usou skills na ordem correta?" },
  { id:"target",      label:"Foco de Target",  weight:20, desc:"Atacou o alvo certo?" },
  { id:"survival",    label:"Sobrevivência",   weight:15, desc:"Minimizou mortes desnecessárias?" },
  { id:"engage",      label:"Timing de Engage",weight:15, desc:"Entrou e saiu na hora certa?" },
];

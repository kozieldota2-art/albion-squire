// ═══════════════════════════════════════════════════
// ALBION SQUIRE — Discord Bot
// Discord.js v14 + Firebase Admin
// Deploy: Railway / Render / VPS
// ═══════════════════════════════════════════════════

require("dotenv").config();
const { Client, GatewayIntentBits, SlashCommandBuilder,
        EmbedBuilder, ActionRowBuilder, ButtonBuilder,
        ButtonStyle, REST, Routes } = require("discord.js");
const admin = require("firebase-admin");

// ── Firebase init ────────────────────────────────
const serviceAccount = require("./serviceAccountKey.json"); // ⚙️ baixar do Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const db = admin.database();

// ── Discord client ────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// ── Slash commands ────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName("masscall")
    .setDescription("Criar um mass call / CTA")
    .addStringOption(o => o.setName("titulo").setDescription("Título do conteúdo").setRequired(true))
    .addStringOption(o => o.setName("tipo").setDescription("Tipo de conteúdo").setRequired(true)
      .addChoices(
        { name:"ZvZ", value:"ZvZ" },
        { name:"Chall", value:"Chall" },
        { name:"HCE", value:"HCE" },
        { name:"Raid", value:"Raid" },
      ))
    .addStringOption(o => o.setName("horario").setDescription("Horário (ex: 21:00)").setRequired(true))
    .addIntegerOption(o => o.setName("slots").setDescription("Número de slots").setRequired(false)),

  new SlashCommandBuilder()
    .setName("join")
    .setDescription("Inscrever em um mass call ativo")
    .addStringOption(o => o.setName("arma").setDescription("Sua arma preferida").setRequired(true)),

  new SlashCommandBuilder()
    .setName("sair")
    .setDescription("Cancelar inscrição no mass call ativo"),

  new SlashCommandBuilder()
    .setName("comp")
    .setDescription("Ver composição atual do mass call"),

  new SlashCommandBuilder()
    .setName("regear")
    .setDescription("Solicitar regear após morte")
    .addStringOption(o => o.setName("evento").setDescription("Link do kill event (albiononline.com/killboard)").setRequired(true)),

  new SlashCommandBuilder()
    .setName("saldo")
    .setDescription("Ver seu saldo de silver virtual"),

  new SlashCommandBuilder()
    .setName("encerrar")
    .setDescription("Encerrar mass call ativo (somente officers)"),

  new SlashCommandBuilder()
    .setName("split")
    .setDescription("Iniciar split de loot (somente officers)")
    .addIntegerOption(o => o.setName("total").setDescription("Valor total em silver").setRequired(true)),

  new SlashCommandBuilder()
    .setName("vod")
    .setDescription("Submeter VOD de conteúdo")
    .addStringOption(o => o.setName("url").setDescription("Link do YouTube/Twitch").setRequired(true)),
].map(c => c.toJSON());

// ── Register slash commands ───────────────────────
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);
  try {
    console.log("Registrando slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✓ Slash commands registrados.");
  } catch (e) {
    console.error("Erro ao registrar commands:", e);
  }
}

// ── Helpers ──────────────────────────────────────
function isOfficer(member) {
  const officerRoles = (process.env.OFFICER_ROLE_IDS || "").split(",");
  return member.roles.cache.some(r => officerRoles.includes(r.id)) ||
         member.permissions.has("ManageGuild");
}

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return Math.round(n).toLocaleString("pt-BR");
}

async function getActiveMassCall() {
  const snap = await db.ref("masscalls")
    .orderByChild("status").equalTo("open")
    .limitToLast(1)
    .once("value");
  let call = null;
  snap.forEach(c => { call = c.val(); });
  return call;
}

// ── Embed builder para Mass Call ─────────────────
function buildMassCallEmbed(call, attendance) {
  const filled = Object.values(call.composition || {}).filter(s => s.playerId).length;
  const total  = Object.keys(call.composition || {}).length;
  const att    = Object.values(attendance || {});

  const embed = new EmbedBuilder()
    .setColor(0x1DA898)
    .setTitle(`⚔️ MASS CALL — ${call.title}`)
    .setDescription(`**Tipo:** ${call.type}\n**Horário:** ${call.horario || "A definir"}\n**Slots:** ${filled}/${total}`)
    .addFields(
      { name: "👥 Inscritos", value: att.length ? att.map(a => `${a.playerName} — ${a.weapon}`).join("\n") : "Nenhum ainda", inline: false },
    )
    .setFooter({ text: "Use /join [arma] pra se inscrever · albionsquire.netlify.app" })
    .setTimestamp();

  return embed;
}

// ── Handlers de interação ─────────────────────────
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user, member, guild } = interaction;

  // ══ /masscall ══
  if (commandName === "masscall") {
    if (!isOfficer(member)) {
      return interaction.reply({ content: "❌ Apenas officers podem criar mass calls.", ephemeral: true });
    }

    const titulo  = interaction.options.getString("titulo");
    const tipo    = interaction.options.getString("tipo");
    const horario = interaction.options.getString("horario");
    const slots   = interaction.options.getInteger("slots") || 20;

    const id   = Date.now().toString(36);
    const call = {
      id, titulo, tipo, horario,
      status:      "open",
      createdAt:   Date.now(),
      createdBy:   user.username,
      createdById: user.id,
      maxSlots:    slots,
      composition: {},
      attendance:  {},
      loot:        { items:[], totalValue:0 },
      channelId:   interaction.channelId,
      messageId:   null,
    };

    await db.ref(`masscalls/${id}`).set(call);

    const embed = new EmbedBuilder()
      .setColor(0x1DA898)
      .setTitle(`⚔️ MASS CALL — ${titulo}`)
      .setDescription(`**Tipo:** ${tipo}\n**Horário:** ${horario}\n**Slots:** 0/${slots}`)
      .addFields({ name: "👥 Inscritos", value: "Nenhum ainda" })
      .setFooter({ text: "Use /join [arma] pra se inscrever · albionsquire.netlify.app" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`join_${id}`).setLabel("Entrar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`leave_${id}`).setLabel("Sair").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setLabel("Ver no site").setStyle(ButtonStyle.Link)
        .setURL(`${process.env.SITE_URL || "https://albiansquire.netlify.app"}#masscall`),
    );

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    await db.ref(`masscalls/${id}/messageId`).set(msg.id);

    console.log(`Mass call criado: ${id} por ${user.username}`);
  }

  // ══ /join ══
  else if (commandName === "join") {
    const arma = interaction.options.getString("arma");
    const call = await getActiveMassCall();

    if (!call) return interaction.reply({ content: "❌ Nenhum mass call ativo no momento.", ephemeral: true });

    const entry = {
      playerId:   user.id,
      playerName: member.nickname || user.username,
      discordId:  user.id,
      weapon:     arma,
      ts:         Date.now(),
      status:     "pending",
    };

    await db.ref(`masscalls/${call.id}/attendance/${user.id}`).set(entry);

    const attSnap = await db.ref(`masscalls/${call.id}/attendance`).once("value");
    const att = [];
    attSnap.forEach(c => att.push(c.val()));

    const embed = buildMassCallEmbed(call, att);

    // Atualizar a mensagem original
    try {
      const channel = await client.channels.fetch(call.channelId);
      const msg     = await channel.messages.fetch(call.messageId);
      await msg.edit({ embeds: [embed] });
    } catch (e) { console.warn("Não foi possível atualizar a mensagem:", e.message); }

    await interaction.reply({ content: `✅ ${member.nickname || user.username} inscrito como **${arma}**!`, ephemeral: true });
  }

  // ══ /sair ══
  else if (commandName === "sair") {
    const call = await getActiveMassCall();
    if (!call) return interaction.reply({ content: "❌ Nenhum mass call ativo.", ephemeral: true });

    await db.ref(`masscalls/${call.id}/attendance/${user.id}`).remove();
    await interaction.reply({ content: "✅ Inscrição cancelada.", ephemeral: true });
  }

  // ══ /comp ══
  else if (commandName === "comp") {
    const call = await getActiveMassCall();
    if (!call) return interaction.reply({ content: "❌ Nenhum mass call ativo.", ephemeral: true });

    const attSnap = await db.ref(`masscalls/${call.id}/attendance`).once("value");
    const att = [];
    attSnap.forEach(c => att.push(c.val()));

    const embed = buildMassCallEmbed(call, att);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ══ /regear ══
  else if (commandName === "regear") {
    const eventoUrl = interaction.options.getString("evento");

    // Extrair event ID da URL (formato: .../kill/12345678)
    const match = eventoUrl.match(/kill\/([a-zA-Z0-9\-]+)/);
    const eventId = match?.[1];

    if (!eventId) {
      return interaction.reply({ content: "❌ URL inválida. Use o link do killboard: albiononline.com/killboard/kill/...", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Buscar dados da morte
      const eventData = await fetch(`https://gameinfo.albiononline.com/api/gameinfo/events/${eventId}`).then(r => r.json());

      if (!eventData?.Victim) {
        return interaction.editReply("❌ Evento não encontrado ou sem dados de vítima.");
      }

      if (eventData.Victim.Id !== user.id && eventData.Victim.Name !== (member.nickname || user.username)) {
        // Permitir que officer registre por outro player
        if (!isOfficer(member)) {
          return interaction.editReply("❌ Este evento não é seu. Apenas officers podem registrar por outros players.");
        }
      }

      // Calcular valor do kit (simplificado — sem lookup de preço aqui, vai usar média)
      const slots = ["MainHand","OffHand","Head","Armor","Shoes","Cape","Bag","Mount"];
      const items = slots.map(s => eventData.Victim.Equipment?.[s]).filter(Boolean);
      const estimatedValue = items.length * 800000; // Estimativa simplificada

      const regear = {
        id:          eventId,
        playerId:    eventData.Victim.Id,
        playerName:  eventData.Victim.Name,
        discordId:   user.id,
        killedBy:    eventData.Killer?.Name || "Desconhecido",
        kitItems:    items.map(i => i.Type),
        kitValue:    estimatedValue,
        eventUrl:    eventoUrl,
        timestamp:   eventData.TimeStamp,
        status:      "pending",
        requestedAt: Date.now(),
      };

      await db.ref(`regeares/${eventId}`).set(regear);

      const embed = new EmbedBuilder()
        .setColor(0xC08828)
        .setTitle("🛡️ Solicitação de Regear")
        .addFields(
          { name: "Player",   value: eventData.Victim.Name, inline: true },
          { name: "Morto por", value: eventData.Killer?.Name || "?", inline: true },
          { name: "Valor estimado", value: fmt(estimatedValue) + " silver", inline: true },
          { name: "Itens",    value: items.map(i => i.Type).join(", ") || "—" },
        )
        .setFooter({ text: "Aguardando aprovação de officer · albionsquire.netlify.app" })
        .setURL(eventoUrl);

      // Notificar canal de officers
      try {
        const officerChannel = await client.channels.fetch(process.env.OFFICER_CHANNEL_ID || interaction.channelId);
        await officerChannel.send({ content: "@here Nova solicitação de regear aguardando aprovação!", embeds: [embed] });
      } catch (e) { console.warn("Não foi possível notificar canal de officers:", e.message); }

      await interaction.editReply({ content: "✅ Solicitação de regear enviada! Aguarde aprovação de um officer.", embeds: [embed] });

    } catch (e) {
      console.error("Regear error:", e);
      await interaction.editReply("❌ Erro ao processar regear: " + e.message);
    }
  }

  // ══ /saldo ══
  else if (commandName === "saldo") {
    const snap = await db.ref(`balances/${user.id}`).once("value");
    const saldo = snap.val() || 0;

    const embed = new EmbedBuilder()
      .setColor(0x1DA898)
      .setTitle(`💰 Saldo — ${member.nickname || user.username}`)
      .setDescription(`**${fmt(saldo)} silver**`)
      .setFooter({ text: "Saldo virtual da guild · albionsquire.netlify.app" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ══ /encerrar ══
  else if (commandName === "encerrar") {
    if (!isOfficer(member)) return interaction.reply({ content: "❌ Apenas officers.", ephemeral: true });

    const call = await getActiveMassCall();
    if (!call) return interaction.reply({ content: "❌ Nenhum mass call ativo.", ephemeral: true });

    await db.ref(`masscalls/${call.id}/status`).set("ended");
    await interaction.reply({ content: `✅ Mass call **${call.titulo}** encerrado. Vá para o site para processar o split.` });
  }

  // ══ /split ══
  else if (commandName === "split") {
    if (!isOfficer(member)) return interaction.reply({ content: "❌ Apenas officers.", ephemeral: true });

    const total = interaction.options.getInteger("total");
    const call  = await getActiveMassCall();
    if (!call) return interaction.reply({ content: "❌ Nenhum mass call ativo.", ephemeral: true });

    const guildFee  = Math.round(total * 0.10);
    const repairFee = Math.round(total * 0.03);
    const distrib   = total - guildFee - repairFee;

    const attSnap = await db.ref(`masscalls/${call.id}/attendance`).once("value");
    const players = [];
    attSnap.forEach(c => players.push(c.val()));

    const perPlayer = players.length ? Math.round(distrib / players.length) : 0;

    const embed = new EmbedBuilder()
      .setColor(0xC08828)
      .setTitle("💰 Split de Loot")
      .addFields(
        { name: "Total bruto",    value: fmt(total),    inline: true },
        { name: "Taxa guild 10%", value: fmt(guildFee), inline: true },
        { name: "Reparo 3%",      value: fmt(repairFee),inline: true },
        { name: "Distribuível",   value: fmt(distrib),  inline: true },
        { name: "Players",        value: String(players.length), inline: true },
        { name: "Por player",     value: `**${fmt(perPlayer)}**`, inline: true },
        { name: "Participantes",  value: players.map(p => `${p.playerName}: ${fmt(perPlayer)}`).join("\n") || "Nenhum" },
      );

    // Salvar split no Firebase
    await db.ref(`masscalls/${call.id}/result`).set({
      total, guildFee, repairFee, distributable: distrib, perPlayer,
      players: players.map(p => ({ ...p, amount: perPlayer })),
      finalizedAt: Date.now(),
      finalizedBy: user.username,
    });

    // Atualizar saldos
    for (const p of players) {
      if (p.discordId) {
        await db.ref(`balances/${p.discordId}`).transaction(curr => (curr || 0) + perPlayer);
      }
    }

    await db.ref("guildBalance").transaction(curr => (curr || 0) + guildFee);
    await interaction.reply({ embeds: [embed] });
  }

  // ══ /vod ══
  else if (commandName === "vod") {
    const url = interaction.options.getString("url");

    const call = await getActiveMassCall();
    const vod = {
      id:          Date.now().toString(36),
      playerName:  member.nickname || user.username,
      discordId:   user.id,
      videoUrl:    url,
      callId:      call?.id || "manual",
      submittedAt: Date.now(),
      status:      "pending",
    };

    await db.ref(`vods/${vod.id}`).set(vod);
    await interaction.reply({ content: `✅ VOD enviado! Será revisado por um officer em breve. 🎬`, ephemeral: true });
  }
});

// ── Button interactions (join/leave inline) ───────
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const [action, callId] = interaction.customId.split("_");
  const { user, member } = interaction;

  if (action === "join") {
    // Mostrar modal de seleção de arma seria ideal, mas por simplicidade:
    const entry = {
      playerId:   user.id,
      playerName: member.nickname || user.username,
      discordId:  user.id,
      weapon:     "A definir",
      ts:         Date.now(),
      status:     "pending",
    };
    await db.ref(`masscalls/${callId}/attendance/${user.id}`).set(entry);
    await interaction.reply({ content: "✅ Inscrito! Use `/join [arma]` para definir sua arma.", ephemeral: true });
  }

  if (action === "leave") {
    await db.ref(`masscalls/${callId}/attendance/${user.id}`).remove();
    await interaction.reply({ content: "✅ Inscrição cancelada.", ephemeral: true });
  }
});

// ── Ready ─────────────────────────────────────────
client.once("ready", async () => {
  console.log(`\n✓ Albion Squire Bot online como ${client.user.tag}`);
  console.log(`  Servidor: ${process.env.GUILD_ID}`);
  console.log(`  Firebase: ${process.env.FIREBASE_DB_URL}\n`);
  await registerCommands();
});

client.login(process.env.BOT_TOKEN);

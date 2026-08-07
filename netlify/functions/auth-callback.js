// ═══════════════════════════════════════════════════
// ALBION SQUIRE — Netlify Function: auth-callback
// Troca o "code" do Discord OAuth por um token do Firebase.
// Roda no servidor (Netlify) — nunca no navegador — porque precisa
// do DISCORD_CLIENT_SECRET e da service account do Firebase, que
// não podem ficar expostos no site publico.
// ═══════════════════════════════════════════════════

const admin = require("firebase-admin");

let adminApp;
function getAdmin() {
  if (adminApp) return adminApp;
  const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64 || "", "base64").toString("utf8");
  adminApp = admin.initializeApp({
    credential:  admin.credential.cert(JSON.parse(json)),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
  return adminApp;
}

exports.handler = async (event) => {
  const siteUrl  = process.env.SITE_URL || "https://albiansquire.netlify.app";
  const code     = event.queryStringParameters?.code;
  const tenantId = event.queryStringParameters?.state || "teste";

  const fail = (reason) => ({
    statusCode: 302,
    headers: { Location: `${siteUrl}/?loginError=${encodeURIComponent(reason)}` },
  });

  if (!code) return fail("codigo_ausente");

  try {
    // 1. Trocar "code" por access_token do usuario
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type:    "authorization_code",
        code,
        redirect_uri:  process.env.DISCORD_REDIRECT_URI || `${siteUrl}/auth/callback`,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("Discord token exchange falhou:", tokenData);
      return fail("token_discord_invalido");
    }

    // 2. Identidade do usuario logado
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userRes.json();
    if (!discordUser?.id) return fail("usuario_discord_invalido");

    // 3. Confirmar que e membro do servidor da guild + pegar cargos
    //    (usa o token do BOT, nao o do usuario, pra nao precisar de
    //    escopo OAuth extra sujeito a verificacao do Discord)
    const memberRes = await fetch(
      `https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordUser.id}`,
      { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
    );
    if (!memberRes.ok) return fail("nao_e_membro_da_guild");
    const member = await memberRes.json();

    const officerRoleIds = (process.env.OFFICER_ROLE_IDS || "")
      .split(",").map(s => s.trim()).filter(Boolean);
    const role = (member.roles || []).some(r => officerRoleIds.includes(r)) ? "officer" : "member";

    // 4. Criar/atualizar usuario no Firebase Auth com custom claims
    //    (tenantId + discordId sao usados pelas regras de seguranca
    //    do Realtime Database em firebase.rules.json)
    getAdmin();
    const uid = `discord:${discordUser.id}`;
    const displayName = member.nick || discordUser.global_name || discordUser.username;

    try {
      await admin.auth().updateUser(uid, { displayName });
    } catch (e) {
      await admin.auth().createUser({ uid, displayName });
    }
    await admin.auth().setCustomUserClaims(uid, { tenantId, role, discordId: discordUser.id });

    const customToken = await admin.auth().createCustomToken(uid, { tenantId, role, discordId: discordUser.id });

    const returnPath = tenantId && tenantId !== "teste" ? `/g/${tenantId}/` : "/";
    return {
      statusCode: 302,
      headers: { Location: `${siteUrl}${returnPath}#token=${encodeURIComponent(customToken)}` },
    };
  } catch (e) {
    console.error("Auth callback error:", e);
    return fail("erro_interno");
  }
};

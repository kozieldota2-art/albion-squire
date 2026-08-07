# ⚔️ Albion Squire

Plataforma de gestão de guild para Albion Online.  
Stack: HTML/CSS/JS vanilla · Firebase Realtime DB · Netlify · Discord.js v14

---

## 🏠 Modelo de negócio: multi-tenant (SaaS)

O plano é evoluir o Albion Squire pra um ecossistema onde cada guilda é um
"tenant" isolado, e existe um **painel master** (fora do escopo ainda) de
onde o dono do produto cria novas guildas e distribui login.

**Estado atual: já preparado, ainda não ligado.**
- Todo dado no Firebase vive sob `tenants/{tenantId}/...` (ver `tenantPath()`
  em `js/config.js` e `js/bot.js`).
- O `tenantId` é lido da URL: `albionsquire.com/g/{tenantId}/...`. Sem esse
  path, cai no `TENANT_DEFAULT` (`"teste"`) — é assim que a guilda de teste
  roda hoje, sem precisar de painel master nem login multi-guilda ainda.
- `netlify.toml` já redireciona qualquer path pra `index.html`, então
  `/g/nomeguilda` já funciona sem configuração extra.
- `firebase.rules.json` tem as regras de isolamento por tenant (usam
  `auth.token.tenantId`, um custom claim que só existe quando o login via
  Discord OAuth for implementado — até lá, manter o Realtime DB em modo
  teste como já orientado abaixo).

**Login via Discord OAuth: implementado.** `netlify/functions/auth-callback.js`
troca o `code` do Discord por um token do Firebase com custom claims
(`tenantId`, `discordId`, `role`) — ver seção "6. Login" abaixo pra configurar
as variáveis de ambiente.

**Falta pra ativar de verdade (próxima fase):**
1. Painel master (rota separada, só pro dono) pra criar tenants e gerar login.
2. Trocar `firebase.rules.json` de "modo teste" pras regras reais (o arquivo já
   está pronto — só falta colar no Firebase Console → Realtime Database →
   Rules → Publish, depois que o login OAuth estiver configurado e testado).
3. O bot Discord recebe o tenant via `.env` (`TENANT_ID=nomeguilda`) — hoje
   cada bot atende UMA guilda; se quiser um bot só pra todas, precisa de
   outra abordagem (bot multi-servidor mapeando `Discord Server ID → tenantId`).

---

## ⚙️ Setup em 5 passos

### 1. Firebase
1. Criar projeto em https://console.firebase.google.com
2. Habilitar **Realtime Database** (modo teste por enquanto)
3. Habilitar **Authentication** → Discord provider
4. Preencher `FIREBASE_CONFIG` em `js/config.js`
5. Baixar `serviceAccountKey.json` (Settings → Service Accounts) → colocar em `discord-bot/`

### 2. Discord
1. Criar aplicação em https://discord.com/developers
2. Criar bot, copiar o token
3. Habilitar "Message Content Intent" nas configurações do bot
4. Convidar o bot com permissões: `Send Messages`, `Embed Links`, `Read Message History`, `Manage Messages`
5. Preencher `DISCORD_CLIENT_ID` em `js/config.js`
6. Preencher `GUILD_CONFIG` em `js/config.js` com IDs do servidor/canais

> Anúncios de mass call no Discord são feitos pelo próprio bot (que já
> observa o Firebase), não por webhook — isso evita expor qualquer token
> no navegador, já que `js/config.js` é carregado no site público.

### 3. Guild Config
Em `js/config.js`, preencher `GUILD`:
```js
const GUILD = {
  name: "Nome da sua guild",
  albionId: "ID da guild no Albion (ver URL do perfil)",
  discordServerId: "ID do servidor Discord",
  ...
}
```

### 4. Deploy no Netlify
1. Push do repositório para o GitHub
2. Conectar repo no Netlify
3. Build command: (vazio — site estático)
4. Publish directory: `.`
5. Deploy!

### 5. Bot Discord (Railway / VPS)
```bash
cd discord-bot
cp .env.example .env
# Preencher .env
npm install
npm start
```

### 6. Login (Discord OAuth)

O login acontece assim: usuário clica em "Entrar" → vai pro Discord autorizar
→ Discord manda o `code` pra `/auth/callback` → a Netlify Function
(`netlify/functions/auth-callback.js`) troca esse `code` por um token do
Firebase e devolve pro site. A troca acontece só no servidor porque precisa
do `DISCORD_CLIENT_SECRET` e da service account do Firebase — nenhum dos
dois pode aparecer no navegador.

**1. Discord Developer Portal** ([discord.com/developers/applications](https://discord.com/developers/applications))
- Na aplicação do bot, aba **OAuth2** → copiar o **Client Secret**
- Em **Redirects**, adicionar: `https://SEU-SITE.netlify.app/auth/callback`

**2. Firebase**
- Settings → Service Accounts → **Generate new private key** (baixa um `.json`)
- Converter esse arquivo pra base64 (não commitar o `.json` em lugar nenhum):
  ```bash
  # Linux/Mac
  base64 -i serviceAccountKey.json | tr -d '\n'
  # Windows (PowerShell)
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json"))
  ```

**3. Netlify** → Site settings → Environment variables, adicionar:

| Variável | Valor |
|---|---|
| `DISCORD_CLIENT_ID` | mesmo valor de `DISCORD_CLIENT_ID` em `js/config.js` |
| `DISCORD_CLIENT_SECRET` | copiado no passo 1 (segredo) |
| `DISCORD_REDIRECT_URI` | `https://SEU-SITE.netlify.app/auth/callback` |
| `DISCORD_GUILD_ID` | mesmo valor de `GUILD.discordServerId` |
| `DISCORD_BOT_TOKEN` | mesmo token do bot (`BOT_TOKEN` no `.env` do bot) |
| `OFFICER_ROLE_IDS` | mesmo valor do `.env` do bot |
| `FIREBASE_SERVICE_ACCOUNT_B64` | base64 gerado no passo 2 (segredo) |
| `FIREBASE_DB_URL` | mesma URL do `FIREBASE_CONFIG.databaseURL` |
| `SITE_URL` | `https://SEU-SITE.netlify.app` |

Depois de configurar, novo deploy no Netlify pra aplicar as variáveis.

---

## 📁 Estrutura de arquivos

```
albion-squire/
├── index.html              # App completo (single page)
├── js/
│   ├── config.js           # ⚙️ Configurações (Firebase, guild, fórmulas)
│   ├── api.js              # Camada de API (market, gameinfo, murder ledger)
│   ├── craft.js            # Ranking de craft com API real
│   ├── masscall.js         # Sistema de mass call / CTA
│   ├── guild.js            # Regear · Membros · VOD · Builds · Saldos
│   ├── boards.js           # Battle boards · Kill feed · Leaderboard
│   └── buildstudy.js       # Analisador de builds · IP scaling · Combos
├── discord-bot/
│   ├── bot.js              # Bot principal (slash commands)
│   ├── package.json
│   ├── .env.example        # Template de variáveis de ambiente
│   └── serviceAccountKey.json  # ⚙️ Baixar do Firebase Console
├── netlify.toml
└── README.md
```

---

## 🔗 APIs utilizadas

| API | Uso | Requer auth |
|-----|-----|-------------|
| albion-online-data.com | Preços de mercado | ❌ |
| render.albiononline.com | Imagens dos itens | ❌ |
| gameinfo.albiononline.com | Battles, kills, players | ❌ |
| Firebase Realtime DB | Dados da guild em tempo real | ✅ |
| Discord API | Bot e OAuth | ✅ |

---

## 📐 Fórmula de lucro de craft

```
productionBonus = 18 (base)
                + 40 (se cidade tem especialização no material, tipo Martlock+Couro)
                + 15 (se cidade tem especialização no tipo de item)
                + 59 (se usando foco)

RRR = 1 - 1 / (1 + productionBonus / 100)

effectiveCost = materialCost × (1 - RRR)
netSell       = sellPrice × (1 - 0.03)    // 3% de taxa de mercado
profit        = netSell - effectiveCost
```

---

## 🔥 Estrutura do Firebase

```
/masscalls/{id}
  ├── title, type, date, status
  ├── composition/{slotId} → { role, weapon, playerId, playerName }
  ├── attendance/{playerId} → { playerName, weapon, status }
  ├── loot → { items[], totalValue }
  └── result → { splits[], finalizedAt }

/regeares/{eventId}
  ├── playerName, kitItems[], kitValue
  ├── status: "pending" | "approved" | "rejected"
  └── approvedBy, approvedAt

/vods/{id}
  ├── playerName, videoUrl, callId
  ├── status: "pending" | "reviewed"
  ├── scores → { positioning, rotation, target, survival, engage }
  └── finalScore

/balances/{discordId} → number (silver virtual)
/guildBalance → number

/members/{id}
  ├── name, role, ip
  ├── kills, deaths, attendance
  └── weapons[]

/comps/{id}
  ├── name, type
  └── slots[] → { role, weapon, count, build }
```

---

## 🛡️ Segurança Firebase (Rules recomendadas)

```json
{
  "rules": {
    "masscalls": {
      ".read": "auth != null",
      "$id": {
        ".write": "auth != null"
      }
    },
    "balances": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": false
      }
    },
    "guildBalance": {
      ".read": "auth != null",
      ".write": false
    }
  }
}
```

*(As escritas sensíveis devem passar pelo bot via Firebase Admin SDK)*

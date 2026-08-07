# ⚔️ Albion Squire — Documentação do projeto

> Este arquivo existe pra qualquer pessoa (ou IA) que entrar no projeto depois
> entender o conceito completo, o estado atual e o que falta, sem precisar
> reconstruir o contexto do zero.

---

## 1. O que é o Albion Squire

Uma **plataforma web de gestão de guild** para o jogo *Albion Online*.
O objetivo é dar pra liderança de uma guild (líder, officers) um painel único
onde organizam tudo que hoje é feito na mão ou espalhado em planilhas/Discord.

### Módulos do produto

| Módulo | O que faz |
|---|---|
| **Mass Call / ZvZ** | Criação de chamadas de conteúdo (ZvZ, Chall, HCE, Raid), inscrição de membros, composição de grupo, controle de presença |
| **Regear** | Busca mortes reais dos membros via Killboard (API pública da Albion), calcula valor do kit perdido, registra e desconta do saldo da guild |
| **Craft & Lucro** | Ranking de itens mais lucrativos pra craftar, usando preços reais de mercado (API albion-online-data.com) + fórmula de RRR (taxa de retorno de recursos), bônus de cidade e foco |
| **Transporte pra Black Market** | (em conceito) logística de levar item craftado até o BM pra vender com lucro, considerando risco de rota |
| **VOD Review** | Matriz de avaliação de gameplay a partir de vídeos, pra dar feedback estruturado aos membros |
| **Build Analysis / Comps** | Analisador de builds e composições: sinergias, pontos fracos, sugestão de arma |
| **Battle Boards / Kill Feed** | Painel de batalhas recentes, kills, leaderboard da guild |
| **Saldo da guild** | Controle de silver: quanto entra (loot, taxas) e sai (regear, despesas) |

### Como as pessoas interagem

- **Site** (o painel em si, hoje single-page app)
- **Bot do Discord** — os membros também interagem por slash commands (`/masscall`, `/join`, `/sair`, `/comp` etc.), e o bot espelha ações no mesmo banco de dados do site

---

## 2. Modelo de negócio: SaaS multi-tenant

**Objetivo final:** o dono do produto (Koziel) opera um **painel master**
central, e vende acesso ao Albion Squire pra várias guildas — cada uma com
seus dados, login e domínio isolados, mas todas rodando na mesma base de
código e infraestrutura.

```
                    Painel master (você)
                            │
                cria/gerencia guildas, distribui login
                            │
              Backend serverless (Cloud Functions)
                cria usuário + isola dados por tenant
                            │
        ┌───────────────────┼───────────────────┐
     Guild A              Guild B              Guild C
   login próprio        login próprio        login próprio
   dados isolados       dados isolados       dados isolados
```

### Decisões já tomadas

- **Roteamento por caminho**, não subdomínio: `albionsquire.com/g/{tenantId}`
  em vez de `guildA.albionsquire.com`. Motivo: não precisa de DNS wildcard
  nem certificado extra — funciona hoje mesmo no Netlify, sem custo
  adicional. Dá pra migrar pra subdomínio depois sem reescrever nada, é só
  trocar a forma de detectar o tenant.
- **Um projeto Firebase só**, com dados particionados por tenant
  (`tenants/{tenantId}/...`), em vez de um projeto Firebase por cliente.
  Mais fácil de administrar centralmente — bate com a ideia do painel master.
- **Estratégia de rollout:** validar com uma guild de teste primeiro (rodando
  hoje sob o tenant `"teste"`), mas com a arquitetura de dados já pronta pra
  multi-tenant — assim, quando chegar a hora de vender pra outras guilds, é
  só criar novos tenants, **sem precisar migrar dado nenhum**.

### O que falta pra ativar o modelo completo

1. **Painel master** — interface separada (rota tipo `/master`, só acessível
   pelo dono) pra criar guildas, gerar credenciais de login e ativar/desativar
   acesso (ex: se não pagou).
2. **Backend serverless** (Firebase Cloud Functions ou Netlify Functions) —
   necessário porque criar login + definir permissão de tenant exige o
   **Admin SDK do Firebase**, que não pode rodar no navegador (senão
   qualquer visitante poderia se autoproclamar admin). O resto do site
   continua estático como hoje.
3. **Login real por guilda** via Firebase Auth + *custom claims*
   (`{ tenantId: "guildA", role: "officer" }`) — hoje ainda não existe login,
   o Firebase está em modo teste (regras abertas).
4. **Ativar `firebase.rules.json`** — já escrito, mas depende do custom claim
   `auth.token.tenantId`, que só existe depois do login OAuth funcionar.
5. **Modelo de cobrança** — ainda não definido (mensalidade fixa vs. planos
   com limite). Decisão em aberto.

---

## 3. Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | HTML/CSS/JS vanilla (single-page app, sem framework) |
| Banco de dados | Firebase Realtime Database |
| Hospedagem | Netlify |
| Bot | Discord.js v14 (Node.js, roda separado do site) |
| APIs externas | `albion-online-data.com` (preços de mercado), `render.albiononline.com` (imagens de itens), `gameinfo.albiononline.com` (batalhas, kills, players/killboard) |
| Repositório | GitHub — `kozieldota2-art/albion-squire` |

### Estrutura de arquivos

```
albion-squire/
├── index.html              # app inteiro (single-page)
├── firebase.rules.json     # regras de segurança (multi-tenant, pendente de ativação)
├── netlify.toml            # config de deploy + redirect catch-all
├── README.md                # setup e arquitetura
├── PROJETO.md               # este arquivo
├── market.js                # ⚠️ DUPLICATA da raiz — não é usada, apagar
└── js/
    ├── config.js             # Firebase config, GUILD, tenant, fórmulas, constantes
    ├── api.js                # camada de fetch/cache pras APIs externas
    ├── item_names.js         # dicionário de nomes de itens
    ├── craft.js               # ranking de craft (funcional, API real)
    ├── market.js               # dados de mercado (usado pelo index.html)
    ├── masscall.js              # sistema de mass call / ZvZ (Firebase plugado)
    ├── guild.js                 # regear, membros, VOD, comps, saldo (Firebase plugado)
    ├── boards.js                 # battle cards, kill feed, leaderboard — ⚠️ ainda em MOCK DATA
    ├── buildstudy.js              # analisador de build, synergy engine
    ├── bot.js                     # bot Discord (Node + firebase-admin)
    ├── env.example                 # variáveis de ambiente do bot
    ├── package.json                 # dependências do bot
    └── 1                              # ⚠️ arquivo lixo (só contém ".") — apagar
```

**Ordem de carregamento no `index.html`:** Firebase SDK (compat) →
`config.js` → `api.js` → `item_names.js` → `craft.js` → `market.js` →
`masscall.js` → `guild.js` → `boards.js` → `buildstudy.js`.

---

## 4. Estado atual de cada módulo

| Módulo | Status |
|---|---|
| Craft | ✅ Funcional, API real de mercado |
| Mass Call (ZvZ) | ✅ Funcional, Firebase plugado — módulo mais robusto do projeto |
| Regear | ✅ Funcional, busca mortes reais via Killboard |
| Membros, VOD Review, Comps | ✅ Funcional, Firebase plugado |
| Build Study | ✅ Funcional (synergy engine, weapon picker) |
| Boards (battle cards / kill feed / leaderboard) | ⚠️ Usando **dados mock**, ainda não puxa `gameinfo.albiononline.com` de verdade |
| Multi-tenant (dados) | ✅ Implementado — todo Firebase ref passa por `tenantPath()` |
| Multi-tenant (login/painel master) | ❌ Não implementado ainda |
| `GUILD` config (nome, IDs Discord, webhook) | ❌ Ainda com placeholders vazios |
| `DISCORD_CLIENT_ID` | ❌ Placeholder |
| Limpeza (arquivos duplicados/lixo) | ❌ Pendente (`market.js` da raiz, `js/1`) |

---

## 5. O que foi feito nesta sessão (multi-tenant, base de dados)

**Objetivo:** preparar a estrutura de dados pra multi-tenant, sem quebrar a
guild de teste que já está rodando, e sem ainda construir o painel master
(fase futura).

1. **`js/config.js`** — adicionado:
   - `TENANT_DEFAULT = "teste"`
   - `getTenantId()` — lê o tenant da URL (`/g/{tenantId}`), com fallback pro
     tenant de teste
   - `tenantPath(path)` — prefixa qualquer path do Realtime DB com
     `tenants/{tenantId}/`

2. **`js/guild.js` e `js/masscall.js`** — todas as chamadas
   `.ref(...)` (regeares, balances, guildBalance, members, vods, comps,
   masscalls, attendance, composition, loot) passaram a usar
   `.ref(tenantPath(...))`. ~17 pontos alterados.

3. **`js/bot.js`** — como roda em processo Node separado (não carrega
   `config.js` do navegador), ganhou sua própria versão de `tenantPath()`,
   resolvendo o tenant via `process.env.TENANT_ID` (default `"teste"`).
   ~13 pontos alterados.

4. **`js/env.example`** — nova variável `TENANT_ID`, documentada como
   diferente do `GUILD_ID` (que é o servidor Discord).

5. **`firebase.rules.json`** (novo arquivo) — regras de isolamento por
   tenant, usando `auth.token.tenantId` como custom claim. **Ainda não
   ativado** — depende do login OAuth existir. Até lá, manter o Realtime
   Database em modo teste.

6. **`README.md`** — nova seção "Modelo de negócio: multi-tenant (SaaS)"
   documentando tudo isso.

**Validação:** `node --check` rodado em todos os arquivos alterados, sem
erro de sintaxe. Nenhuma mudança de comportamento visível pra guild de
teste — ela continua acessando a URL normal (sem `/g/...`) e cai
automaticamente no tenant `"teste"`.

**Importante:** essas mudanças foram feitas localmente e **ainda não foram
commitadas/enviadas pro GitHub** até o momento da geração deste arquivo —
o objetivo é que quem for commitar (Claude Code ou você) já pegue tudo
pronto.

---

## 6. Próximos passos (em ordem sugerida)

1. Commitar e enviar as mudanças de multi-tenant pro GitHub
2. Preencher `GUILD` (nome, `albionId`, `discordServerId`, IDs de canal) e
   `DISCORD_CLIENT_ID` em `config.js`
3. Limpar lixo: apagar `market.js` da raiz (duplicata idêntica de
   `js/market.js`) e `js/1`
4. Conectar `boards.js` na API real (`gameinfo.albiononline.com`), tirando
   o mock data
5. Implementar login (Discord OAuth) — isso destrava a ativação das regras
   de segurança do Firebase
6. Construir o painel master (criação de tenants, distribuição de
   credenciais)
7. Adicionar backend serverless pra provisionamento de tenant (Cloud
   Functions ou Netlify Functions)
8. Definir e implementar modelo de cobrança
9. Validar tudo com a guild de teste antes de vender pra outras guilds

// ═══════════════════════════════════════════════════
// ALBION SQUIRE — auth.js
// Login via Discord OAuth → token do Firebase
// A troca de code por token acontece na Netlify Function
// (netlify/functions/auth-callback.js), nunca no navegador.
// ═══════════════════════════════════════════════════

const AuthModule = (() => {

  let currentUser = null;

  function buildAuthorizeUrl() {
    const params = new URLSearchParams({
      client_id:     DISCORD_CLIENT_ID,
      redirect_uri:  DISCORD_REDIRECT,
      response_type: "code",
      scope:         DISCORD_SCOPE,
      state:         TENANT_ID,
    });
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  function login() {
    window.location.href = buildAuthorizeUrl();
  }

  async function logout() {
    if (typeof firebase !== "undefined" && firebase.apps.length) {
      await firebase.auth().signOut();
    }
  }

  function renderLoggedOut() {
    const btn = document.getElementById("btn-login");
    if (!btn) return;
    btn.innerHTML = `<i class="ti ti-brand-discord" aria-hidden="true"></i> Entrar`;
    btn.onclick = login;
  }

  function renderLoggedIn(user) {
    const btn = document.getElementById("btn-login");
    if (!btn) return;
    const tag = user.role === "officer" ? " · Officer" : "";
    btn.innerHTML = `<i class="ti ti-user" aria-hidden="true"></i> ${user.name}${tag}`;
    btn.onclick = logout;
  }

  // ── Consome o token que a Netlify Function devolveu na URL ──
  async function consumeTokenFromHash() {
    const m = window.location.hash.match(/token=([^&]+)/);
    if (!m) return;
    const token = decodeURIComponent(m[1]);
    history.replaceState(null, "", window.location.pathname + window.location.search);
    try {
      await firebase.auth().signInWithCustomToken(token);
    } catch (e) {
      console.error("Falha ao completar login:", e);
    }
  }

  function init() {
    if (typeof firebase === "undefined" || !firebase.apps.length) {
      renderLoggedOut();
      return;
    }
    consumeTokenFromHash();
    firebase.auth().onAuthStateChanged(async fbUser => {
      if (!fbUser) {
        currentUser = null;
        renderLoggedOut();
        return;
      }
      const res = await fbUser.getIdTokenResult();
      currentUser = {
        uid:       fbUser.uid,
        name:      fbUser.displayName || "Membro",
        discordId: res.claims.discordId || null,
        role:      res.claims.role || "member",
      };
      renderLoggedIn(currentUser);
    });
  }

  function isOfficer() {
    return currentUser?.role === "officer";
  }

  return {
    init, login, logout, isOfficer,
    get currentUser() { return currentUser; },
  };
})();

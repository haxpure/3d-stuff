// Shared login check for all tool pages. Load after auth-config.js, in <head>.
// - not configured → does nothing (tools stay open)
// - configured, no session → redirects to login.html?next=<this page>
// - configured, logged in → shows the page and an account button (next to the language switch)
(function () {
  const C = window.AUTH_CONFIG || {};
  window.AUTH_ON = !!(C.url && C.key);
  let clientP = null;
  window.getSupa = function () {
    if (!window.AUTH_ON) return Promise.resolve(null);
    if (!clientP) clientP = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
      .then(m => m.createClient(C.url, C.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }));
    return clientP;
  };
  window.authLogout = async function () {
    const sb = await window.getSupa(); if (sb) await sb.auth.signOut();
    location.href = 'login.html';
  };
  const page = location.pathname.split('/').pop() || 'index.html';
  if (!window.AUTH_ON || page === 'login.html') return;
  // hide the page until the session is checked (no flash of the tool)
  const st = document.createElement('style'); st.id = 'authHide'; st.textContent = 'html{visibility:hidden}';
  document.head.appendChild(st);
  const show = () => { const s = document.getElementById('authHide'); if (s) s.remove(); };
  const toLogin = () => location.replace('login.html?next=' + encodeURIComponent(page + location.search));
  window.getSupa().then(async sb => {
    const { data } = await sb.auth.getSession();
    if (!data.session) return toLogin();
    window.AUTH_USER = data.session.user;
    sb.auth.onAuthStateChange((ev, s) => { if (!s) toLogin(); });
    show();
    if (page !== 'index.html') addAccountButton(data.session.user);
    document.dispatchEvent(new CustomEvent('auth-ready', { detail: data.session.user }));
  }).catch(e => {
    // login service not reachable: say so instead of showing an empty page
    show(); document.body.innerHTML = '<div style="font:15px Inter,system-ui,sans-serif;color:#e8eaee;background:#111317;min-height:100vh;padding:40px">' +
      'Login service not reachable. Please check your connection and reload.<br><small style="color:#8b919c">' + String(e && e.message || e) + '</small></div>';
  });
  function addAccountButton(user) {
    const go = () => {
      const b = document.createElement('div'); b.id = 'authBox';
      b.innerHTML = '<a href="index.html" title="All tools">☰ Tools</a><button type="button" title="' + (user.email || '') + '">Log out</button>';
      b.querySelector('button').addEventListener('click', window.authLogout);
      const css = document.createElement('style');
      css.textContent = '#authBox{position:fixed;top:10px;right:104px;z-index:1000;display:flex;gap:3px;background:rgba(17,19,23,.88);border:1px solid #262a33;border-radius:8px;padding:3px}' +
        '#authBox a,#authBox button{width:auto;background:transparent;color:#8b919c;border:0;border-radius:5px;padding:4px 9px;font:600 12px Inter,system-ui,sans-serif;cursor:pointer;text-decoration:none}' +
        '#authBox a:hover,#authBox button:hover{color:#f6c21c}';
      document.head.appendChild(css); document.body.appendChild(b);
    };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  }
})();

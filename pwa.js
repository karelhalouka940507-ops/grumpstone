// GRUMPSTONE – instalace na plochu (PWA) a automatické aktualizace
(function () {
  const W = window.GRUMP_PWA = { sw: false, prompt: null, ios: /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) };
  const $ = id => document.getElementById(id);
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  function showInstall(on) { ['btn-install', 'menu-install'].forEach(id => { const b = $(id); if (b) b.classList.toggle('hidden', !on); }); }
  function hint() {
    let m = $('install-hint'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'install-hint'; m.className = 'mount-modal';
    m.innerHTML = `<div class="mount-sheet install-sheet"><div class="mount-h">📲 Grumpstone na plochu</div>
      ${W.ios ? `<ol class="install-steps"><li>Otevři tuhle stránku v <b>Safari</b>.</li><li>Klepni dole na <b>Sdílet</b> <span class="ios-share">⬆︎</span>.</li><li>Vyber <b>Přidat na plochu</b> a potvrď <b>Přidat</b>.</li><li>Hru pak spouštěj ikonou <b>Grumpstone</b>.</li></ol>`
        : `<ol class="install-steps"><li><b>Chrome:</b> nabídka <b>⋮</b> vpravo nahoře → <b>Přidat na plochu</b> nebo <b>Nainstalovat aplikaci</b>.</li><li><b>Samsung Internet:</b> nabídka <b>☰</b> dole → <b>Přidat stránku do</b> → <b>Domovská obrazovka</b>.</li><li>Pokud máš odkaz otevřený v Messengeru, WhatsAppu nebo Gmailu, nejdřív ho otevři v Chromu (⋮ → <b>Otevřít v Chromu</b>).</li><li>Hru pak spouštěj ikonou <b>Grumpstone</b>.</li></ol>`}
      <div class="mount-act"><button class="btn btn-gold" id="install-ok">Rozumím</button></div></div>`;
    document.body.appendChild(m); $('install-ok').onclick = () => m.remove();
  }
  async function install() {
    if (W.prompt) {
      const p = W.prompt; W.prompt = null; let done = false;
      const fb = setTimeout(() => { if (!done) hint(); }, 2500);
      try { await p.prompt(); const r = await p.userChoice; done = true; clearTimeout(fb); if (r && r.outcome === 'accepted') { showInstall(false); return; } } catch (e) { done = true; clearTimeout(fb); }
      hint(); return;
    }
    hint();
  }
  W.install = install; W.hint = hint;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); W.prompt = e; showInstall(true); });
  window.addEventListener('appinstalled', () => { W.prompt = null; showInstall(false); });
  document.addEventListener('DOMContentLoaded', () => {
    ['btn-install', 'menu-install'].forEach(id => { const b = $(id); if (b) b.onclick = () => { const m = $('menu'); if (m) m.classList.add('hidden'); install(); }; });
    if (!standalone() && /^https?:/.test(location.protocol)) showInstall(true);
  });
  function updToast(reg) {
    if ($('upd-toast')) return;
    const d = document.createElement('div'); d.id = 'upd-toast'; d.className = 'upd-toast';
    d.innerHTML = '✨ Nová verze — <button class="btn btn-gold btn-sm" id="upd-go">obnovit</button>';
    document.body.appendChild(d);
    $('upd-go').onclick = () => { if (reg && reg.waiting) reg.waiting.postMessage('skipWaiting'); setTimeout(() => location.reload(), 150); };
  }
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    const hadCtl = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then(reg => {
      W.sw = true; W.reg = reg;
      reg.addEventListener('updatefound', () => { const n = reg.installing; if (n) n.addEventListener('statechange', () => { if (n.state === 'activated' && hadCtl) updToast(reg); }); });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    }).catch(e => { W.swError = String(e); });
  }
})();

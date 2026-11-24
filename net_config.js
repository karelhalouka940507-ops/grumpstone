// GRUMPSTONE – nastavení online hry (není potřeba nic měnit).
// Spojení: PeerJS (bezplatný server pro párování 0.peerjs.com) + Google/Cloudflare STUN.
// Volitelně TURN (pomůže, když se telefony na mobilních datech nespojí): zdarma účet na https://www.metered.ca/tools/openrelay/
// (20 GB/měsíc), pak sem vyplň název aplikace a API klíč a spusť publish.sh:
//   meteredApp: 'mojeaplikace', meteredKey: 'xxxxxxxx'
// Nebo pevné TURN servery: turn: [{ urls: 'turn:server:3478', username: '…', credential: '…' }]
window.GRUMP_NET = { meteredApp: '', meteredKey: '', turn: [] };

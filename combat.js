// GRUMPSTONE – bojový engine (v9b, skutečné staty bossů). Čistá logika bez DOM: používá ji hra i simulace (node).
// Každé kolo: 🎲 útok hrdiny (klepnutí), 🎲 útok bosse, 🎲 osud (spouští zvláštnosti bosse), 🎲 navíc (druhý útok bosse).
(function (root) {
  const has = (c, t) => (c.fx || []).filter(f => f.t === t);
  const fx1 = (c, t) => has(c, t)[0];
  const total = b => Math.max(0, b.sh) + Math.max(0, b.hp);
  const FORCE_KARMA_TXT = 'Bojuješ silou s charismatickým bossem';
  // hero: { name, hp, maxHp, atk, atkName, def, approach: combat|magic|charisma, focus, potions, fear, gold, karma, side, horse, atSea, intel, cha, ranged, bag:[{id,name,price}] }
  function newFight(o) {
    const b = o.boss, h = Object.assign({}, o.hero);
    const focus = Array.isArray(b.focus) ? b.focus : [b.focus || 'combat'];
    const row = (b.rows && (b.rows[h.approach] || b.rows.combat || b.rows[focus[0]])) || { deff: b.deff, atk: b.atk };
    const F = { hero: h, boss: { id: b.id, name: b.name, sh: o.sh != null ? o.sh : b.sh, hp: o.hp != null ? o.hp : b.hp, maxSh: b.sh, maxHp: b.hp,
        deff: row.deff, atk: row.atk, evil: b.evil, focus }, specials: b.specials || [], reward: b.reward || {},
      cards: o.cards.slice(), r: 0, town: !!o.town, done: false, result: null, used: 0, potionUsed: false,
      force: focus.length === 1 && focus[0] === 'charisma' && h.approach !== 'charisma',
      m: { att: 0, def: 0, buffer: 0, dodge: 0, bossAtk: 0, bossDef: 0, rollMod: 0, noAtk: false, offNow: false, offNext: false, defZero: false, dot: 0, lowhp: {} },
      fl: {}, status: [], delta: { gold: 0, karma: 0, payAfter: 0, potionsLost: 0, gift: null, loseBagItem: false, loseHalfGold: false }, log: [] };
    const fx = BOSS_FX[b.id]; if (fx && fx.start) { const L = []; fx.start(F, L); if (L.length) F.log.push(...L); }
    if (F.hero.hp <= 0) { F.done = true; F.result = 'loss'; F.log.push('☠️ <b>Padl jsi ještě před bojem.</b>'); }
    return F;
  }
  function hitBoss(F, n, pierce) {
    const b = F.boss; if (n <= 0) return '';
    if (pierce) { b.hp -= n; return `${n} do životů (přes štíty)`; }
    const s = Math.min(Math.max(0, b.sh), n); b.sh -= s; b.hp -= (n - s);
    return s && n - s ? `${s} do štítů, ${n - s} do životů` : s ? `${s} do štítů` : `${n} do životů`;
  }
  const rawHero = (F, n, why, L) => { const h = F.hero, o = h.hp;
    if (F.m.immune === F.r) { L.push(`🫧 Imunita poškození: ${why} tě nezraní.`); return; }
    if (F.m.block1 === F.r) { F.m.block1 = null; L.push(`💧 Vodní štít zastavil první poškození (${why}).`); return; } h.hp = Math.max(0, h.hp - n); L.push(`💢 ${why}: −${o - h.hp} ❤️ přímo do životů (zbývá ${h.hp}).`); };
  const addSt = (F, t, L) => { F.status.push(t); L.push({ poison: '🤢 Otrava!', disease: '🩹 Nákaza!', fear: '😱 Strach!', curse: '👁️ Prokletí!' }[t]); };
  const karma = (F, v, why, L) => { F.delta.karma += v; L.push(`☯️ ${why}: ${v > 0 ? '+' : ''}${v} karma.`); };

  // ---- ZVLÁŠTNOSTI BOSSŮ (podle id). C = kontext kola ----
  // C: { R, hd, ad, last, skip, heroAtk, heroDef, rollMod, defSet, defMult, bAtk, plus, half, attacks, noAtk, first }
  const BOSS_FX = {
    b01: { pre: (F, C) => { if (F.boss.hp <= 3) { C.bAtk += 2; C.notes.push('Poslední vzdor +2'); } },
      heroHit: (F, C, d, L) => { if (C.hd === 1) { L.push('🛡️ Starý mazák: hodil jsi 1 – zablokováno, 0 zranění.'); return 0; } return d; } },
    b02: { pre: (F, C, L) => { if (C.R === 2) C.raw.push([3, 'Havraní roj']); if (C.R === 3 && F.hero.approach === 'magic') { C.defMult = 2; L.push('🗡️ Runová čepel: proti magii dvojnásobná obrana.'); } },
      lose: (F, L) => addSt(F, 'curse', L) },
    b03: { start: (F, L) => { if ((F.hero.intel || 0) < 3) F.fl.smile = 1; },
      pre: (F, C, L) => { if (C.R === 1 && F.fl.smile === 1) { F.fl.smile = 2; C.skip = 'Úsměv čarodějnice (Inteligence pod 3)'; } },
      heroHit: (F, C, d, L) => { if (C.R === 2 && C.hd === 6 && d > 0) { C.raw.push([Math.floor(d / 2), 'Zrcadlová kletba vrací polovinu']); } return d; },
      onHit: (F, C, L) => { if (F.hero.potions > 0) { F.hero.potions--; F.delta.potionsLost++; L.push('🐦 Havraní oko ti ukradlo lektvar!'); } else addSt(F, 'fear', L); } },
    b04: { pre: (F, C) => { if (C.R === 1) { C.first = true; C.bAtk += 2; C.notes.push('Kančí nájezd +2, útočí první'); } },
      heroHit: (F, C, d, L) => { if (d >= 8 && !F.fl.boar) { F.fl.boar = 1; F.m.bossAtk -= 2; L.push('🐗 Ztratil kance! Útok −2 do konce boje.'); } return d; },
      death: (F, C, L) => { if (F.fl.undead) return false; F.fl.undead = 1; if (C.ad >= 5) { F.boss.sh = 0; F.boss.hp = 3; L.push(`💀 Nemrtvý! Osud ${C.ad} – rytíř vstává se 3 životy.`); return true; } L.push(`💀 Nemrtvý? Osud ${C.ad} – tentokrát už nevstane.`); return false; } },
    b05: { start: (F, L) => { if (F.force) { F.m.bossDef += 2; karma(F, -1, 'Ruka na meči (bojuješ silou) – obrana bosse +2', L); } },
      pre: (F, C, L) => { if (C.R === 1) { const w = Math.min(C.hd, C.ad); if (w < C.hd) L.push(`🎭 Za maskou: házíš dvakrát (${C.hd} a ${C.ad}), platí horší ${w}.`); C.hd = w; } },
      heroHit: (F, C, d, L) => { if (C.hd === 6) { C.bossRaw += 3; L.push('👑 Vzpomínka na korunu: +3 přímo do životů.'); } return d; } },
    b06: { pre: (F, C, L) => { if (C.R === 1 && C.ad <= 2) { F.m.defNext = (F.m.defNext || 0) - 1; L.push(`🍄 Kořenové sevření (osud ${C.ad}): v dalším kole obrana −1.`); } },
      post: (F, C, L) => { if (C.R === 2) { if (C.ad < 4) { L.push(`🍄 Spórový oblak (osud ${C.ad}):`); addSt(F, 'disease', L); } else L.push(`🍄 Spórovému oblaku jsi unikl (osud ${C.ad}).`); } },
      end: (F, C, L) => { F.boss.hp += 1; L.push('🍄 Mycelium: golem +1 život.'); } },
    b07: { pre: (F, C) => { if (F.boss.hp <= 10) { C.bAtk += 2; C.notes.push('Pro kořist +2'); } if (C.R === 3) C.attacks = [{ v: null }, { v: Math.ceil(F.boss.atk[2] / 2), die: 'x', noCard: true, label: 'Druhá šavle' }]; },
      heroHit: (F, C, d, L) => { if (C.hd === 1) { F.m.noCardAtt = 1; L.push('🏴‍☠️ Pirátská finta: v dalším kole bez bonusu karty k útoku.'); } return d; },
      lose: F => { F.delta.loseHalfGold = true; } },
    b08: { pre: (F, C, L) => { if (C.R === 1) C.half = 'Zahrabaný'; if (F.boss.hp <= 15) { C.rollMod -= 1; L.push('🌪️ Písečná bouře: hod −1.'); } },
      onHit: (F, C, L, tot) => { if (C.R === 2 && tot >= 10) { L.push('🐍 Jedovaté zuby:'); addSt(F, 'poison', L); } },
      lose: F => { F.delta.loseBagItem = true; } },
    b09: { offers: F => F.r === 0 && !F.fl.wish ? [{ id: 'wish', label: '✨ Přijmout přání (+1 ke všem hodům, −2 ❤️)' }] : [],
      choose: (F, id, L) => { if (id === 'wish') { F.fl.wish = 1; F.m.rollMod += 1; F.hero.hp = Math.max(1, F.hero.hp - 2); L.push('✨ Splním ti přání: +1 ke všem hodům, −2 ❤️.'); } },
      pre: (F, C) => { if (C.R === 2 && C.ad < 4) C.skip = `Bibbidi-bobbidi-bum – jsi dýně (osud ${C.ad})`; if (F.boss.hp <= 8) { C.bAtk += 2; C.notes.push('Kmotřina zloba +2'); } } },
    b10: { offers: F => F.r === 1 && !F.fl.pact ? [{ id: 'pact', label: '😈 Ďáblův pakt (+2 ke všem hodům, −1 karma)' }] : [],
      choose: (F, id, L) => { if (id === 'pact') { F.fl.pact = 1; F.m.rollMod += 2; karma(F, -1, 'Ďáblův pakt: +2 ke všem hodům', L); } },
      pre: (F, C) => { if (C.R === 1 && C.ad <= 2) C.skip = `Liánové okovy (osud ${C.ad})`; if (C.hd === 1) { C.plus += 3; C.notes.push('Rohy +3'); } },
      end: (F, C, L) => { if (F.boss.hp < 15 && F.boss.hp > 0) { F.boss.hp += 2; L.push('🌿 Kletba pralesa: ďábel +2 životy.'); } } },
    b11: { start: (F, L) => { if (F.force) { F.boss.sh += 4; F.boss.maxSh += 4; karma(F, -1, 'Královská garda (bojuješ silou) – +4 štíty', L); } },
      offers: F => F.boss.hp < 8 && F.boss.hp > 0 ? [{ id: 'leave3', label: '📜 Královský dekret: odejít se 3 🪙 (bez GB)' }] : [],
      choose: (F, id, L) => { if (id === 'leave3') { F.delta.gold += 3; F.done = true; F.result = 'left'; L.push('📜 Přijal jsi dekret a odcházíš se 3 🪙.'); } },
      post: (F, C, L) => { if (C.R === 2 && C.ad <= 3) { F.m.nextRoll = (F.m.nextRoll || 0) - 1; L.push(`🗺️ Tah na mapě (osud ${C.ad}): další hod −1.`); } } },
    b12: { pre: (F, C, L) => { if (C.R === 1) { C.plus += 2; C.notes.push('Střemhlavý nálet +2'); } if (C.R === 3 && C.ad <= 2) { F.m.skipNext = 'Beraní rohy'; L.push(`🐏 Beraní rohy (osud ${C.ad}): další útok vynecháš.`); } },
      heroHit: (F, C, d) => { if (F.hero.approach === 'magic' && d > 0 && !F.fl.rune) { F.fl.rune = 1; C.raw.push([2, 'Runová šupina odráží kouzlo']); } return d; } },
    b13: { pre: (F, C, L) => { if (C.R === 1) { if (F.hero.horse) L.push('🐎 Kopyta vpřed: máš koně – bez účinku.'); else { C.plus += 2; C.notes.push('Kopyta vpřed +2'); } }
        if (C.R === 2 && C.ad <= 2) { C.plus += 2; C.notes.push(`Rozmach sekerou +2 (osud ${C.ad})`); } if (C.last && F.boss.hp < 6) { C.bAtk += 2; C.notes.push('Prérijní hrdost +2'); } } },
    b14: { pre: (F, C) => { if (C.R === 1 && C.ad <= 2) C.skip = `Kořeny ze země (osud ${C.ad})`; },
      heroHit: (F, C, d, L) => { if (F.hero.approach !== 'magic' && F.boss.sh > 0 && d > 0) { const x = Math.min(2, d); L.push(`🌳 Tisíciletá kůra pohltila ${x}.`); d -= x; }
        if (F.hero.approach === 'magic' && d >= 6) { F.m.bossAtkNext = (F.m.bossAtkNext || 0) - 2; L.push('🔥 Strach z ohně: jeho další útok −2.'); } return d; } },
    b15: { start: (F, L) => { if (F.force) { const o = F.hero.hp; F.hero.hp = Math.max(0, F.hero.hp - 2); F.delta.gold -= 1; karma(F, -1, `Krysa Šmelina (bojuješ silou): −${o - F.hero.hp} ❤️, −1 🪙`, L); } },
      offers: F => { const o = []; if (F.r === 0 && !F.fl.paid && F.hero.gold + F.delta.gold >= 3) o.push({ id: 'pay3', label: '💰 Zaplatit 3 🪙 → −6 štítů' });
        if (F.boss.hp < 10 && F.boss.hp > 0) { o.push({ id: 'leave8', label: '💰 Vzít 8 🪙 a odejít (bez GB)' }); if (F.hero.side === 'evil') o.push({ id: 'take8', label: '🗡️ Vzít 8 🪙 a stejně ho dorazit (−1 karma)' }); } return o; },
      choose: (F, id, L) => { if (id === 'pay3') { F.fl.paid = 1; F.delta.gold -= 3; F.boss.sh = Math.max(0, F.boss.sh - 6); L.push('💰 Všechno má svou cenu: −3 🪙, Varrack −6 štítů.'); }
        if (id === 'leave8') { F.delta.gold += 8; F.done = true; F.result = 'left'; L.push('💰 Bereš 8 🪙 a odcházíš.'); }
        if (id === 'take8') { F.delta.gold += 8; karma(F, -1, 'Vzal jsi peníze a dorazil ho', L); F.boss.sh = 0; F.boss.hp = 0; F.done = true; F.result = 'win'; L.push(`🏆 <b>${F.boss.name} padl!</b>`); } },
      post: (F, C, L) => { if (C.R === 2 && C.ad <= 2) { F.delta.payAfter += 2; L.push(`📜 Dlužní úpis (osud ${C.ad}): po boji zaplatíš 2 🪙.`); } } },
    b16: { offers: F => F.r === 1 && !F.fl.plead ? [{ id: 'plead', label: '🙏 Vyslyšet prosbu vězně (místo útoku)' }] : [],
      choose: (F, id, L) => { if (id === 'plead') { F.fl.plead = 1; L.push('🙏 Rozhodl ses vyslyšet prosbu – v tomto kole neútočíš.'); } },
      pre: (F, C, L) => { if (C.R === 1 && C.ad <= 3) { F.m.nextRoll = (F.m.nextRoll || 0) - 1; L.push(`🌿 Kořenová past (osud ${C.ad}): další hod −1.`); }
        if (F.fl.plead === 1 && C.R === 2) { F.fl.plead = 2; C.skip = 'Vyslýcháš prosbu vězně';
          if (C.ad >= 5) { F.boss.hp -= 8; L.push(`🙏 Prosba vyslyšena (osud ${C.ad}): kletba povolila, vězeň −8 životů.`); } else { F.m.bossAtk += 2; L.push(`🙏 Prosba selhala (osud ${C.ad}): jeho útok +2.`); } } },
      onHit: (F, C, L) => { const b = F.boss, o = b.hp; b.hp = Math.min(b.maxHp, b.hp + 2); if (b.hp > o) L.push(`🩸 Vysávání života: +${b.hp - o}.`); },
      post: (F, C, L) => { if (C.ad === 1) { L.push('🪦 Hniloba hrobky (osud 1):'); addSt(F, 'disease', L); } } },
    b17: { start: (F, L) => { if (F.hero.atSea) { F.m.rollMod -= 1; L.push('🌊 Jsi u moře – bouře ti zhorší všechny hody o 1.'); } },
      pre: (F, C) => { if (C.R === 1) C.half = 'Schovaný v krunýři'; if (C.R === 2) C.raw.push([3, 'Přivolání bouře']); if (F.boss.sh <= 0) C.defSet = 1; },
      post: (F, C, L) => { if (C.ad <= 2) { F.m.skipNext = 'Přílivová vlna'; L.push(`🌊 Přílivová vlna (osud ${C.ad}): další útok vynecháš.`); } } },
    b18: { pre: (F, C) => { if (F.boss.hp < 10) { C.bAtk += 1; C.defSet = 1; C.notes.push('Zuřivost +1'); } },
      heroHit: (F, C, d, L) => { if (F.hero.ranged && d > 0) { d -= 1; L.push('🏹 Polštář ze šípů: −1.'); } if (F.hero.approach === 'magic' && d > 0) F.fl.magicHit = 1; return d; },
      end: (F, C, L) => { if (F.fl.magicHit) { F.fl.magicHit = 0; L.push('🔥 Magie zastavila trollí regeneraci.'); return; } if (F.boss.hp > 0) { const o = F.boss.hp; F.boss.hp = Math.min(F.boss.maxHp, F.boss.hp + 2); if (F.boss.hp > o) L.push(`♻️ Trollí regenerace: +${F.boss.hp - o} životy.`); } } },
    b19: { pre: (F, C, L) => { if (C.R === 1) { if (C.ad === 6) { L.push('💣 Bomba vybuchla goblinovi v ruce (osud 6): −4 do životů.'); F.boss.hp -= 4; } else C.raw.push([4, 'Bomba']); }
        if (C.hd <= 2) { C.plus += 2; C.notes.push('Bodnutí do zad +2'); } },
      end: (F, C, L) => { if (F.boss.hp > 0 && F.boss.hp < 5 && C.ad <= 2) { F.done = true; F.result = 'fled'; F.fleeGold = Math.floor(F.reward.g / 2); L.push(`💨 Zmizení v kouři (osud ${C.ad}): goblin utekl! Necháš si polovinu zlata.`); } } },
    b20: { start: (F, L) => { if (F.hero.atSea) { F.m.def -= 1; L.push('🌊 U moře tě chapadla stahují: obrana −1 celý boj.'); } },
      pre: (F, C, L) => { const cut = Math.floor((F.boss.maxHp - F.boss.hp) / 10); if (cut > 0) { C.bAtk -= cut; C.notes.push(`useknutá chapadla −${cut}`); }
        if (C.R === 1) C.attacks = [{ v: 5, die: 'b', label: 'Chapadla' }, { v: 5, die: 'x', label: 'Chapadla' }];
        if (C.R === 2) { C.heroAtk -= 2; L.push('🦑 Inkoustový mrak: tvůj útok −2.'); } },
      post: (F, C) => { if (C.ad <= 2) C.raw.push([3, `Stažení pod hladinu (osud ${C.ad})`]); } },
    b21: { pre: (F, C, L) => { if (C.R === 1 && C.ad <= 2) { L.push(`🍵 Bylinkový čajíček (osud ${C.ad}):`); addSt(F, 'poison', L); } if (C.ad === 1) { C.plus += 2; C.notes.push('Srp ze zástěry +2'); } },
      end: (F, C, L) => { if (F.boss.hp > 0 && F.boss.hp < 5 && !F.fl.heal) { F.fl.heal = 1; F.boss.hp += 3; L.push('🌿 Babiččino kouzlo: +3 životy.'); } } },
    b22: { start: (F, L) => { if (F.force) { const o = F.hero.hp; F.hero.hp = Math.max(0, F.hero.hp - 2); karma(F, -1, `Ruce pryč! (bojuješ silou): −${o - F.hero.hp} ❤️`, L); } },
      offers: F => F.r === 0 && !F.fl.bribe && F.hero.gold + F.delta.gold >= 2 ? [{ id: 'bribe2', label: '💰 Úplatek 2 🪙 → −4 štíty (−1 karma)' }] : [],
      choose: (F, id, L) => { if (id === 'bribe2') { F.fl.bribe = 1; F.delta.gold -= 2; F.boss.sh = Math.max(0, F.boss.sh - 4); karma(F, -1, 'Úplatek: starosta −4 štíty', L); } },
      post: (F, C, L) => { if (C.R === 1 && C.ad <= 2) { F.m.nextRoll = (F.m.nextRoll || 0) - 1; L.push(`🗳️ Volební slib (osud ${C.ad}): další hod −1.`); } } },
    b23: { start: (F, L) => { if (F.force) karma(F, -1, 'Bojuješ silou proti dámě', L); },
      offers: F => F.boss.hp < 7 && F.boss.hp > 0 ? [{ id: 'leave5', label: '📿 Perlový náhrdelník: vzít 5 🪙 a odejít (bez GB)' }] : [],
      choose: (F, id, L) => { if (id === 'leave5') { F.delta.gold += 5; F.done = true; F.result = 'left'; L.push('📿 Bereš náhrdelník (5 🪙) a odcházíš.'); } },
      pre: (F, C) => { if (C.R === 1 && C.ad <= 2) C.skip = `Sladký úsměv (osud ${C.ad})`; },
      post: (F, C, L) => { if (C.R === 2 && C.ad <= 2) karma(F, -1, `Dvorní pomluva (osud ${C.ad})`, L); } },
    b24: { start: (F, L) => { if (F.force) { const o = F.hero.hp; F.hero.hp = Math.max(0, F.hero.hp - 3); karma(F, -1, `Elfská garda (bojuješ silou): −${o - F.hero.hp} ❤️`, L); } },
      offers: F => F.r === 1 && !F.fl.gift ? (F.hero.bag || []).map(it => ({ id: 'gift:' + it.id, label: `🎁 Darovat ${it.name} → −${2 * it.price} štítů` })) : [],
      choose: (F, id, L) => { const it = (F.hero.bag || []).find(x => 'gift:' + x.id === id); if (!it) return; F.fl.gift = 1; F.delta.gift = it.id; F.boss.sh = Math.max(0, F.boss.sh - 2 * it.price); L.push(`🎁 Král přijal dar ${it.name}: −${2 * it.price} štítů.`); },
      pre: (F, C, L) => { if (C.R === 1 && C.ad <= 2) { F.m.rollMod -= 1; L.push(`🧝 Tisíciletá paměť (osud ${C.ad}): celý boj hod −1.`); } if (C.R === 2) { C.noAtk = 'Královská audience – král neútočí'; } },
      heroHit: (F, C, d, L) => { if (C.hd === 1) { F.boss.hp = Math.min(F.boss.maxHp, F.boss.hp + 4); L.push('😤 Uražená ješitnost: král +4 životy.'); } return d; } },
    b25: { offers: F => F.r === 0 && !F.fl.call ? [{ id: 'odd', label: '👁️ Tipuji LICHÉ', req: true }, { id: 'even', label: '👁️ Tipuji SUDÉ', req: true }] : [],
      choose: (F, id, L) => { F.fl.call = id; L.push(`👁️ Tipuješ ${id === 'odd' ? 'liché' : 'sudé'}.`); },
      pre: (F, C, L) => { if (C.R === 1 && F.fl.call) { const ok = (C.ad % 2 === 1) === (F.fl.call === 'odd'); if (ok) L.push(`👁️ Třetí oko: osud ${C.ad} – trefa!`); else { F.m.att -= 1; C.heroAtk -= 1; L.push(`👁️ Třetí oko: osud ${C.ad} – vedle, útok −1 do konce boje.`); } }
        if (F.fl.shrink) { C.half = 'Scvrknutí'; F.fl.shrink = 0; } },
      post: (F, C, L) => { if (C.R === 2 && C.ad <= 2) { L.push(`🔮 Věštba zkázy (osud ${C.ad}):`); addSt(F, 'fear', L); } },
      end: (F, C, L) => { if (F.boss.hp > 0 && F.boss.hp < 5 && !F.fl.shrunk) { F.fl.shrunk = 1; F.fl.shrink = 1; L.push('🍇 Scvrknutí: v dalším kole jí dáš jen polovinu.'); } } },
    b26: { start: (F, L) => { if (F.force) karma(F, -1, 'Bojuješ silou proti starému kapitánovi', L); },
      pre: (F, C) => { if (C.R === 1 && C.ad <= 2) C.skip = `Námořnická historka (osud ${C.ad})`; if (C.ad === 1) { C.plus += 2; C.notes.push('Plnou parou vpřed +2'); } },
      end: (F, C, L) => { if (F.boss.hp > 0 && F.boss.hp < 5) { F.done = true; F.result = 'draw'; F.delta.gold += 2; const h = F.hero, o = h.hp; h.hp = Math.min(h.maxHp, h.hp + 3); L.push(`🍺 Rum na usmířenou: remíza, +2 🪙, +${h.hp - o} ❤️.`); } } },
    b27: { pre: (F, C, L) => { if (C.R === 1 && C.ad <= 2) { C.heroDef -= 2; L.push(`📯 Válečný řev (osud ${C.ad}): obrana −2.`); } if (C.R === 3) C.attacks = [{ v: 6, die: 'b', label: 'První břit' }, { v: 5, die: 'x', label: 'Druhý břit' }]; },
      heroHit: (F, C, d, L) => { if (d >= 8 && !F.fl.tattoo) { F.fl.tattoo = 1; d -= 4; L.push('🔷 Runová tetování: zásah −4.'); } return d; } },
    b28: { pre: (F, C) => { if (C.R === 1) { C.bAtk += 1; C.bDef += 1; C.notes.push('Ochutnávka +1'); } if (C.R === 3) { C.plus += 2; C.notes.push('Palcát z vinice +2'); } if (F.fl.drunk) C.defSet = 1; },
      post: (F, C, L) => { if (C.ad <= 2) { F.m.atkNext = (F.m.atkNext || 0) - 1; L.push(`🍇 Révové šlahouny (osud ${C.ad}): tvůj další útok −1.`); } },
      end: (F, C, L) => { if (F.boss.hp > 0 && F.boss.hp < 6 && !F.fl.drunk) { F.fl.drunk = 1; F.boss.hp += 3; L.push('🍷 Opilecká zuřivost: +3 životy, ale obrana už jen 1.'); } } },
    b29: { pre: (F, C, L) => { if (C.R === 1 && C.ad <= 2) { C.heroAtk -= 1; L.push(`🥁 Bušení do hrudi (osud ${C.ad}): tvůj útok −1.`); } if (C.ad === 1) { C.plus += 2; C.notes.push('Runová sekera +2'); } if (C.last && F.boss.hp < 4) { C.bAtk += 1; C.notes.push('Ostrovní hrdost +1'); } } },
    b30: { pre: (F, C, L) => { if (C.R === 1) { if (C.ad >= 5) L.push(`🗡️ Ze stínu: odhalil jsi ho (osud ${C.ad}).`); else C.raw.push([3, 'Ze stínu']); } },
      post: (F, C, L) => { if (C.ad <= 2) { L.push(`🗡️ Jed na čepeli (osud ${C.ad}):`); addSt(F, 'poison', L); } },
      end: (F, C, L) => { if (F.boss.hp > 0 && F.boss.hp < 6) { F.done = true; F.result = 'fled'; F.fleeGold = 3; L.push('💨 Nic osobního: vrah mizí do písku. Bereš 3 🪙.'); } } },
    b31: { offers: F => F.r === 0 && (F.hero.karma + F.delta.karma) >= 2 && (F.hero.cha || 0) >= 4 ? [{ id: 'pass', label: '🙏 Projít bez boje (karma 2+, Charisma 4+; bez GB)' }] : [],
      choose: (F, id, L) => { if (id === 'pass') { F.done = true; F.result = 'passed'; L.push('🐍 Strážce tě poznal jako hodného – smíš projít bez boje.'); } },
      pre: (F, C, L) => { if (C.R === 1 && C.ad <= 2) { F.m.skipNext = 'Hypnotický pohled'; L.push(`🐍 Hypnotický pohled (osud ${C.ad}): ve 2. kole neútočíš.`); } },
      onHit: (F, C, L) => { if (C.R === 2) { L.push('🐍 Jedovaté kousnutí:'); addSt(F, 'poison', L); } } },
    b32: { pre: (F, C, L) => { if (C.R === 1 && C.ad <= 2) { F.m.skipNext = 'Býčí náraz'; L.push(`🐂 Býčí náraz (osud ${C.ad}): ve 2. kole neútočíš.`); } if (C.R === 2) C.attacks = [{ v: 4, die: 'b', label: 'Sekera' }, { v: 4, die: 'x', label: 'Sekera' }];
        if (C.R === 3 && F.boss.hp < 8) { C.bAtk += 2; C.notes.push('Pirátský řev +2'); } } },
    // v14 Starosta Bruclík a Lord Firebeard (jen Charismou)
    b33: { start: (F, L) => { if (F.force) karma(F, -1, 'Bojuješ silou proti radnici', L); },
      pre: (F, C, L) => { if (C.R === 1 && C.ad <= 2) { F.delta.karma -= 1; F.m.nextRoll = (F.m.nextRoll || 0) - 1; L.push(`🎩 Bruclík svádí vinu (osud ${C.ad}): „To on, pane rychtáři!“ −1 karma a tvůj další hod −1.`); }
        if (C.R === 2) { C.bAtk += 2; C.notes.push('Firebeardův řev +2'); if (C.ad <= 2) { L.push(`🔥 Firebeard řve (osud ${C.ad}):`); addSt(F, 'fear', L); } } },
      heroHit: (F, C, d, L) => { if (d <= 0 && F.boss.sh < F.boss.maxSh) { const o = Math.max(0, F.boss.sh); F.boss.sh = Math.min(F.boss.maxSh, o + 2); L.push(`📜 Kují pikle: nezranil jsi je, přikuli si +${F.boss.sh - o} štíty.`); } return d; } },
    // v14 Mrtví strážci (Boj + Magie)
    b34: { pre: (F, C, L) => { if (C.R === 1) { C.bDef += 1; L.push('🛡️ Nikdo neprojde přes most: štítová hradba, obrana +1.'); } if (C.R === 3) { C.plus += 1; C.notes.push('Malí sekerníci'); } },
      end: (F, C, L) => { if (F.boss.sh <= 0 && F.boss.hp > 0 && !F.fl.bones) { F.fl.bones = 1; if (C.ad >= 4) { F.boss.sh = 3; L.push(`💀 Kosti se poskládají (osud ${C.ad}): strážci mají znovu 3 štíty.`); } else L.push(`💀 Kosti se neposkládaly (osud ${C.ad}).`); } } }
    ,
    // v18 Rybák Pulec (Boj + Magie, stupeň I)
    b35: { pre: (F, C, L) => { if (C.R === 1 && C.ad <= 2) { C.heroAtk -= 2; L.push(`💦 Šplouch do očí (osud ${C.ad}): tvůj útok −2.`); } if (C.hd === 1) C.raw.push([2, 'Oštěp z rákosí']); },
      heroHit: (F, C, d, L) => { if (d >= 5 && !F.fl.slip) { F.fl.slip = 1; d -= 2; L.push('🐟 Kluzký jak pulec: vyklouzl ti – zranění −2.'); } return d; } },
    // v18 King Rybák (Boj + Magie, stupeň III)
    b36: { pre: (F, C, L) => { if (C.R <= 2 && !F.hero.atSea) { C.rollMod -= 1; L.push('🐟 Smrdí od hlavy: rybí puch, tvůj hod −1.'); }
        if (F.boss.hp <= 15) { C.bAtk += 2; C.bDef += 1; C.notes.push('Jizva krále +2'); }
        if (C.R === 3) C.attacks = [{ v: null }, { v: Math.ceil(F.boss.atk[2] / 2), die: 'x', noCard: true, label: 'Královský meč' }]; } }
  };
  const specOn = F => !F.m.offNow;
  // v17: tvorové bez emocí – na Štěněcí nevinnost (Everett) nereagují: nemrtví, golem, chladnokrevní plazi
  const EMOTIONLESS = new Set(['b04', 'b06', 'b08', 'b31', 'b34']);
  function offers(F) { if (F.done) return []; const fx = BOSS_FX[F.boss.id]; return fx && fx.offers ? fx.offers(F) : []; }
  function choose(F, id) { const fx = BOSS_FX[F.boss.id], L = []; if (!fx || !fx.choose || !offers(F).some(o => o.id === id)) return []; fx.choose(F, id, L); F.log.push(...L); return L; }
  const needsChoice = F => offers(F).some(o => o.req);

  // Jedno kolo souboje s bossem. hd = hod hrdiny, bd = hod bosse, ad = osud, xd = hod navíc (druhý útok bosse)
  function round(F, hd, bd, ad, xd) {
    if (F.done) return [];
    if (ad == null) ad = 3; if (xd == null) xd = 3;
    const c = F.cards[F.r], b = F.boss, h = F.hero, L = [], m = F.m, ri = Math.min(F.r, 2), fx = BOSS_FX[b.id] || {};
    m.offNow = m.offNext; m.offNext = false; F.used++;
    const C = { R: F.r + 1, hd, ad, last: F.r === F.cards.length - 1, skip: null, heroAtk: 0, heroDef: 0, rollMod: 0, defSet: null, defMult: 1, bAtk: 0, bDef: 0, plus: 0, half: null, attacks: null, noAtk: null, first: false, raw: [], bossRaw: 0, notes: [] };
    L.push(`<b>Kolo ${C.R}</b> – karta <b>${c.name}</b> (útok +${c.att}, obrana +${c.deff}) · 🎲 osud ${ad}`);
    // přenesené z minulého kola
    C.rollMod += m.rollMod + (m.nextRoll || 0); m.nextRoll = 0;
    if (m.skipNext) { C.skip = m.skipNext; m.skipNext = null; }
    C.heroDef += m.defNext || 0; m.defNext = 0;
    C.heroAtk += m.atkNext || 0; m.atkNext = 0;
    C.bAtk += m.bossAtkNext || 0; m.bossAtkNext = 0;
    if (m.bossDefNext) { C.bDef += m.bossDefNext; L.push(`🏹 Zraněný soupeř: obrana v tomto kole ${m.bossDefNext < 0 ? "−" + (-m.bossDefNext) : "+" + m.bossDefNext}.`); m.bossDefNext = 0; } // v22 Rhina – Smrtící šíp
    const noCard = m.noCardAtt; m.noCardAtt = 0;
    const townOk = f => !f.town || F.town;
    // efekty karty před útokem
    let att = h.atk + (noCard ? 0 : c.att) + m.att, def = h.def + c.deff + m.def, extraNote = [];
    if (noCard) extraNote.push('bez bonusu karty (pirátská finta)');
    if (h.focus) { att += h.focus; extraNote.push(`zaměření +${h.focus}`); }
    const buff = fx1(c, 'buff'); if (buff) { m.att += buff.att; m.def += buff.def; att += buff.att; def += buff.def; L.push(`✨ Do konce boje +${buff.att} útok, +${buff.def} obrana.`); }
    const rest = fx1(c, 'rest'); if (rest) { m.att += rest.att; m.def += rest.def; att += rest.att; def += rest.def; L.push(`✨ Do konce boje ${rest.att ? '+' + rest.att + ' útok, ' : ''}+${rest.def} obrana.`); }
    has(c, 'lowhp').forEach(f => { if (h.hp < f.below && !m.lowhp[c.id]) { m.lowhp[c.id] = 1; m.att += f.v; att += f.v; L.push(`🩸 Pod ${f.below} životy: +${f.v} útok do konce boje.`); } });
    const vb = fx1(c, 'vsboss'); if (vb) { att += vb.v; extraNote.push(`proti bossovi +${vb.v}`); }
    const buf = has(c, 'buffer').reduce((a, f) => a + f.v, 0); if (buf) { m.buffer += buf; L.push(`🛡️ Pohltíš prvních ${buf} zranění v tomto boji.`); }
    if (fx1(c, 'dodge')) { m.dodge++; L.push('💨 Jednomu celému útoku bosse uhneš.'); }
    const ba = fx1(c, 'boss_atk'); if (ba) { m.bossAtk -= ba.v; L.push(`😖 Boss má do konce boje útok −${ba.v}.`); }
    // v12 Houbík: toxická kouzla
    const wk = fx1(c, 'weaken'); if (wk) { C.bAtk -= wk.v; L.push(`☁️ ${c.name}: boss má v tomto kole útok −${wk.v}.`); }
    const gr = fx1(c, 'grow'); if (gr && F.r > 0) { const g = Math.min(gr.v, F.r); att += g; extraNote.push(`nahromaděné škodliviny +${g}`); }
    const ac = fx1(c, 'acid'); if (ac) { m.bossDef -= ac.v; L.push(`🧪 ${c.name}: zbroj bosse ztrácí ${ac.v} bod odolnosti (obrana −${ac.v} do konce boje).`); }
    if (fx1(c, 'root')) { m.rootUntil = F.r + 1; L.push('🍄 Podhoubí drží bosse: v tomto ani příštím kole neuteče.'); }
    // v13 Olgrich: Oko jestřába (+2 při zahájení boje), Vysátí hrdla (2 kola −1 bossovi, +1 hrdinovi)
    const op = fx1(c, 'opener'); if (op && F.r === 0) { att += op.v; extraNote.push(`zahájení boje +${op.v}`); }
    const dr = fx1(c, 'drain'); if (dr) { m.drain = { v: dr.v, left: dr.n || 2 }; L.push(`🩸 ${c.name}: ${dr.n || 2} kola bude boss na konci kola ztrácet ${dr.v} a ty ho získáš.`); }
    // v15 Velebníček Vodička: Vodní štít, Imunita poškození, Uzdravení ocasu
    if (fx1(c, 'block1')) { m.block1 = F.r; L.push(`💧 ${c.name}: první poškození, které bys v tomto kole utrpěl, se zastaví.`); }
    const im = fx1(c, 'immune'); if (im) { m.immune = F.r; C.bAtk -= im.v; m.bossAtkNext = (m.bossAtkNext || 0) - im.v; L.push(`🫧 ${c.name}: v tomto kole tě nepřítel nezraní a jeho útoky jsou o ${im.v} slabší v tomto i příštím kole.`); }
    const hl = fx1(c, 'heal'); if (hl) { const o = h.hp; h.hp = Math.min(h.maxHp || 10, h.hp + hl.v); L.push(`💚 ${c.name}: vyléčíš si ${h.hp - o} ❤️ (${o} → ${h.hp}).`); }
    if (fx1(c, 'selfskip')) C.skip = `${c.name} – karta nedává útoky`;
    // v16 Chadimpetro: Hlubinný zával, Krtčí podkopání, Záblesk bludičky, Světlo v temnotách
    const su = fx1(c, 'sunder'); if (su) { C.bDef -= su.v; L.push(`🪨 ${c.name}: obrana bosse v tomto kole −${su.v}.`); }
    if (fx1(c, 'undermine')) { C.undermine = true; L.push(`🕳️ ${c.name}: podkopáno – boss se v tomto kole nemůže bránit (obrana 0; štíty dál chytají zásah).`); }
    const an = fx1(c, 'atk_next'); if (an) { m.bossAtkNext = (m.bossAtkNext || 0) - an.v; L.push(`✨ ${c.name}: útok bosse v příštím kole −${an.v}.`); }
    const gd = fx1(c, 'guard'); if (gd) { def += gd.v; L.push(`🏮 ${c.name}: +${gd.v} obrana do konce kola.`); }
    if (fx1(c, 'nospec_now')) { m.offNow = true; L.push('🚫 Zvláštnosti bosse jsou v tomto kole zrušeny.'); }
    const nsn = fx1(c, 'nospec_next'); if (nsn) { if (townOk(nsn)) { m.offNext = true; L.push('🌀 Boss v příštím kole nepoužije své zvláštnosti.'); } else L.push(`🌲 ${c.name}: mimo město a vesnici nepůsobí (není tu publikum).`); }
    // v17 Everett: Medový jazyk, Štěněcí nevinnost (jen ve městě/vesnici), Trn černé růže, Šlechtická zrada, Polibek smrti
    const sw = fx1(c, 'sweet'); if (sw) { if (townOk(sw)) { const v = sw.v + (sw.vs || 0); C.bAtk -= v; L.push(`🍯 ${c.name}: útok soupeře −${sw.v} do konce kola, a protože útočí na Everetta, dalších −${sw.vs || 0} (celkem −${v}).`); } else L.push(`🌲 ${c.name}: mimo město a vesnici nepůsobí (není tu publikum).`); }
    const pu = fx1(c, 'puppy'); if (pu) { if (!townOk(pu)) L.push(`🌲 ${c.name}: mimo město a vesnici nepůsobí (není tu publikum).`); else if (EMOTIONLESS.has(b.id)) L.push(`🐶 ${c.name}: ${b.name} nemá emoce – na štěňátko ani nemrkne.`); else { C.bAtk -= pu.v; L.push(`🐶 ${c.name}: kdo by odolal? Útok soupeře −${pu.v} do konce kola.`); } }
    const tn = fx1(c, 'thorn'); if (tn) C.thorn = tn;
    if (fx1(c, 'betray')) { C.undermine = true; L.push(`🗡️ ${c.name}: rána do zad – útok nejde blokovat (obrana bosse 0; štíty dál chytají zásah).`); }
    const ks = fx1(c, 'kiss'); if (ks) { L.push(`💋 ${c.name}: soupeř ztrácí ${ks.v} (${hitBoss(F, ks.v)}).`); if (total(b) > 0) { C.bDef -= ks.dv; L.push(`💋 Přežil polibek – obrana −${ks.dv} do konce kola.`); } }
    const q = fx1(c, 'queen'); let queen = 0; if (q) { queen = q.v; L.push(`👑 Všichni nepřátelé −${q.v} v tomto kole.`); }
    if (fx1(c, 'extra_card') && F.extra) { F.cards.push(F.extra); F.extra = null; L.push('🃏 Lízneš si navíc 4. kartu – boj má o kolo víc.'); }
    if (h.fear && F.r === 0) { att -= 1; extraNote.push('strach −1'); }
    // zvláštnosti bosse na začátku kola
    if (fx.pre && specOn(F)) fx.pre(F, C, L); else if (fx.pre) L.push('🚫 Zvláštnosti bosse v tomto kole nepůsobí.');
    att += C.heroAtk; def += C.heroDef;
    const roll = C.hd + C.rollMod;
    // syrová zranění na začátku kola (bomba, bouře…)
    const applyRaw = () => { C.raw.splice(0).forEach(([n, why]) => { if (n > 0) rawHero(F, n, why, L); }); };
    applyRaw();
    const heroAttack = () => {
      if (h.hp <= 0) return;
      if (C.skip) { L.push(`⛓️ ${C.skip}: v tomto kole neútočíš.`); return; }
      let bdef = (m.defZero || C.undermine) ? 0 : (C.defSet != null && specOn(F) ? C.defSet : b.deff[ri] + m.bossDef + C.bDef) - queen;
      if (m.defZero) L.push('🗡️ Útočíš ze stínu – boss se nebrání (obrana 0).'); m.defZero = false;
      bdef = Math.max(0, bdef * C.defMult);
      if (C.thorn && bdef >= C.thorn.min) { bdef = Math.max(0, bdef - C.thorn.v); L.push(`🌹 ${c.name}: soupeř má obranu ${C.thorn.min}+, ignoruješ ${C.thorn.v} body (obrana ${bdef}).`); }
      const at = att + roll, margin = at - bdef, win = margin > 0;
      L.push(`⚔️ Tvůj útok: ${h.atkName} ${h.atk} + karta ${noCard ? 0 : c.att}${extraNote.length ? ' (' + extraNote.join(', ') + ')' : ''}${C.heroAtk || m.att ? ' + bonusy' : ''} + 🎲${C.hd}${C.rollMod ? (C.rollMod > 0 ? ' +' : ' ') + C.rollMod : ''} = <b>${at}</b> proti obraně <b>${bdef}</b> → ${win ? `<b class="ok">zásah ${margin}</b>` : '<b class="ko">bez zásahu</b>'}`);
      let dmg = win ? margin : 0; const pierce = !!fx1(c, 'pierce');
      if (win) {
        has(c, 'win_dmg').forEach(f => { if (townOk(f) && margin >= (f.min || 1)) { dmg += f.v; L.push(`💥 ${c.name}: +${f.v} zranění.`); } });
        const ve = fx1(c, 'vs_evil'); if (ve && b.evil) { dmg += ve.v; L.push(`✝️ Proti zlu +${ve.v} zranění.`); }
        const md = fx1(c, 'more_dmg'); if (md && F.r < F.cards.length - 1) { dmg += md.v; L.push(`⛏️ ${c.name}: v ruce máš další kartu útoku – +${md.v} zranění.`); }
        const rg = fx1(c, 'rage'); if (rg && h.hp <= rg.below && dmg > 0) { dmg *= 2; L.push(`😤 ${c.name}: máš ${h.hp} ≤ ${rg.below} životů – dvojnásobné zranění (${dmg}).`); }
        const wr = fx1(c, 'wrath'); if (wr && h.hp <= wr.below) { dmg += wr.v; L.push(`🌿 ${c.name}: máš ${h.hp} ≤ ${wr.below} životů – +${wr.v} zranění.`); } // v22 Rhina
      }
      if (C.half && specOn(F) && dmg > 0) { dmg = Math.floor(dmg / 2); L.push(`🛡️ ${C.half}: jen polovina zranění.`); }
      if (fx.heroHit && specOn(F)) dmg = fx.heroHit(F, C, dmg, L);
      if (dmg > 0) L.push(`➡️ Boss ztrácí ${hitBoss(F, dmg, pierce)}.`);
      const dd = fx1(c, 'hit_defdown'); if (dd && dmg > 0) { m.bossDefNext = (m.bossDefNext || 0) - dd.v; L.push(`🏹 ${c.name}: soupeř je zraněný – v příštím kole má obranu −${dd.v}.`); } // v22 Rhina
      if (C.bossRaw) { b.hp -= C.bossRaw; C.bossRaw = 0; }
      const bd2 = fx1(c, 'boss_dmg'); if (bd2) L.push(`💰 ${c.name}: boss −${bd2.v} (${hitBoss(F, bd2.v)}).`);
      const sh = fx1(c, 'shame'); if (sh) L.push(`🖋️ Zesměšnění: −${sh.v * F.used} (${hitBoss(F, sh.v * F.used)}).`);
      if (win) {
        if (fx1(c, 'win_half') && b.hp > 0) { const x = Math.floor(b.hp / 2); b.hp -= x; L.push(`🌗 Polovina životů bosse: −${x} životů.`); }
        has(c, 'win_noatk').forEach(f => { if (townOk(f) && margin >= (f.min || 1)) { m.noAtkNext = true; L.push('⛓️ Boss v příštím kole neútočí.'); } });
        has(c, 'win_nospec').forEach(f => { if (townOk(f) && margin >= (f.min || 1)) { m.offNext = true; L.push('🚫 Boss v příštím kole nepoužije zvláštnosti.'); } });
        if (fx1(c, 'win_defzero')) { m.defZero = true; L.push('🌑 Příští kolo útočíš první a boss se nebrání.'); }
        const wd = fx1(c, 'win_dot'); if (wd && margin >= (wd.min || 1)) { m.dot += wd.v; L.push(`☠️ ${wd.n || 'Jed'}: boss ztratí ${wd.v} na konci každého kola.`); }
        const wf = fx1(c, 'win_def'); if (wf) { m.def += wf.v; L.push(`🌳 +${wf.v} obrana do konce boje.`); }
        const wh = fx1(c, 'win_heal'); if (wh) { const o = h.hp; h.hp = Math.min(h.maxHp, h.hp + wh.v); L.push(`🎵 Vyléčíš si ${h.hp - o} životů.`); }
      }
      applyRaw();
    };
    const bossDown = () => { if (total(b) > 0) return false; if (fx.death && fx.death(F, C, L)) return false; b.sh = Math.max(0, b.sh); b.hp = 0; F.done = true; F.result = 'win'; L.push(`🏆 <b>${b.name} padl!</b>`); return true; };
    const bossAttack = () => {
      if (h.hp <= 0) return;
      if (m.noAtk) { L.push('⛓️ Boss v tomto kole neútočí.'); return; }
      if (C.noAtk && specOn(F)) { L.push(`👑 ${C.noAtk}.`); return; }
      const dice = { b: bd, x: xd };
      const list = (C.attacks && specOn(F)) ? C.attacks : [{ v: null, die: 'b' }];
      const gt = fx1(c, 'grit'); if (gt) { m.atkNext = (m.atkNext || 0) + gt.v; L.push(`💪 ${c.name}: soupeř zaútočil – v příštím kole máš +${gt.v} k Síle.`); } // v22 Rhina
      list.forEach((a, i) => {
        if (h.hp <= 0) return;
        let base = a.v == null ? b.atk[ri] : a.v; let ba2 = base + m.bossAtk + C.bAtk - queen;
        let hd2 = a.noCard ? def - c.deff : def; const roll2 = dice[a.die || 'b'];
        const bt = ba2 + roll2; let d = Math.max(0, bt - hd2);
        L.push(`👹 ${a.label ? a.label + ': ' : 'Útok bosse: '}${ba2}${i === 0 && C.notes.length ? ' (' + C.notes.join(', ') + ')' : ''} + 🎲${roll2} = <b>${bt}</b> proti tvé obraně <b>${hd2}</b>`);
        if (d > 0 && C.plus && specOn(F)) { d += C.plus; L.push(`💢 +${C.plus} zranění (zvláštnost).`); }
        if (d > 0 && m.immune === F.r) { L.push('🫧 Imunita poškození: útok tě nezraní.'); d = 0; }
        if (d > 0 && m.block1 === F.r) { m.block1 = null; L.push('💧 Vodní štít zastavil první poškození v tomto kole!'); d = 0; }
        if (d > 0 && m.dodge) { m.dodge--; L.push('💨 Uhnul jsi celému útoku!'); d = 0; }
        const cap = fx1(c, 'cap'); if (cap && d > cap.v) { L.push(`🛡️ Štít předků: nejvýš ${cap.v} zranění.`); d = cap.v; }
        if (d > 0 && fx1(c, 'halfdmg')) { const o = d; d = Math.ceil(d / 2); L.push(`💨 ${c.name}: uhýbáš – jen polovina zranění (${o} → ${d}).`); } // v22 Rhina
        const ld = fx1(c, 'lessdmg'); if (d > 0 && ld) { const x = Math.min(d, ld.v); d -= x; L.push(`🛡️ ${c.name}: o ${x} méně zranění.`); }
        if (d > 0 && m.buffer) { const x = Math.min(d, m.buffer); m.buffer -= x; d -= x; L.push(`🛡️ Pohlceno ${x} zranění.`); }
        if (d > 0) { h.hp = Math.max(0, h.hp - d); L.push(`➡️ Ztrácíš <b>${d} ❤️</b> (zbývá ${h.hp}).`); if (fx.onHit && specOn(F)) fx.onHit(F, C, L, bt); }
        else L.push('🛡️ Ubránil ses – bez zranění.');
      });
    };
    if (C.first && specOn(F)) { L.push('🐗 Boss útočí první!'); bossAttack(); if (h.hp > 0) { heroAttack(); bossDown(); } }
    else { heroAttack(); if (!bossDown()) bossAttack(); }
    if (!F.done) {
      m.noAtk = !!m.noAtkNext; m.noAtkNext = false;
      if (fx.post && specOn(F) && h.hp > 0) fx.post(F, C, L);
      applyRaw();
      if (m.dot && total(b) > 0) L.push(`☠️ Jed: boss −${m.dot} (${hitBoss(F, m.dot)}).`);
      if (m.drain && m.drain.left > 0 && total(b) > 0 && h.hp > 0) { m.drain.left--; const o = h.hp; h.hp = Math.min(h.maxHp, h.hp + m.drain.v); L.push(`🩸 Vysátí: boss −${m.drain.v} (${hitBoss(F, m.drain.v)}), ty +${h.hp - o} ❤️.`); }
      if (!bossDown() && fx.end && specOn(F) && h.hp > 0) { fx.end(F, C, L);
        if (F.result === 'fled' && m.rootUntil != null && m.rootUntil >= F.r) { F.done = false; F.result = null; F.fleeGold = 0; L.push('🍄 Podhoubí ho drží u země – boss neuteče!'); } }
    }
    F.r++;
    if (!F.done) {
      if (h.hp <= 0) { F.done = true; F.result = 'loss'; L.push('☠️ <b>Padl jsi.</b>'); }
      else if (F.r >= F.cards.length) { F.done = true; F.result = 'timeout'; L.push(`⏳ Boj končí po ${F.cards.length} kolech – ${b.name} přežil (štíty ${Math.max(0, b.sh)}, životy ${b.hp}). Můžeš se vrátit a dorazit ho.`); }
    }
    if (F.done && F.result === 'loss' && fx.lose) fx.lose(F, L);
    F.log.push(...L); return L;
  }
  function drink(F) {
    if (F.potionUsed || !F.hero.potions || F.done) return null;
    const h = F.hero, o = h.hp; h.hp = Math.min(h.maxHp, h.hp + 4); F.potionUsed = true; h.potions--; F.curePoison = true;
    F.status = F.status.filter(s => s !== 'poison' && s !== 'disease');
    const t = `🧪 Vypil jsi léčivý lektvar: +${h.hp - o} ❤️ (Otrava a Nákaza vyléčeny).`; F.log.push(t); return t;
  }
  // PvP: každý 1 karta, jedna výměna úderů (současně). a/b: { name, hp, atk, atkName, def, card, town, evil }
  function pvp(a, b, ra, rb) {
    const L = [];
    const side = (x, y, r) => {
      const c = x.card, yc = y.card;
      let att = x.atk + c.att + (fx1(c, 'buff') ? fx1(c, 'buff').att : 0) + (fx1(c, 'rest') ? fx1(c, 'rest').att : 0) + (fx1(c, 'opener') ? fx1(c, 'opener').v : 0);
      has(c, 'lowhp').forEach(f => { if (x.hp < f.below) att += f.v; });
      const wk = fx1(yc, 'weaken'); if (wk) att -= wk.v; // toxický oblak soupeře
      const ym = fx1(yc, 'immune'); if (ym) att -= ym.v; // v15 Imunita poškození soupeře: útok −3
      const ysw = fx1(yc, 'sweet'); if (ysw && (!ysw.town || y.town)) att -= ysw.v + (ysw.vs || 0); // v17 Medový jazyk: v souboji útočí soupeř vždy na Everetta → −4
      const ypu = fx1(yc, 'puppy'); if (ypu && (!ypu.town || y.town)) att -= ypu.v; // v17 Štěněcí nevinnost (hrdinové emoce mají)
      const ac = fx1(c, 'acid'), su = fx1(c, 'sunder'), gy = fx1(yc, 'guard');
      const react = ['dodge', 'block1', 'immune', 'buffer', 'cap', 'lessdmg', 'halfdmg'].some(t => fx1(yc, t)); // v16 Krtčí podkopání: blokovat jde jen reakční kartou
      const und = (fx1(c, 'undermine') || fx1(c, 'betray')) && !react; // v17 Šlechtická zrada = stejně jako Krtčí podkopání
      const ks = fx1(c, 'kiss'), tn = fx1(c, 'thorn');
      let ydef = und ? 0 : y.def + yc.deff + (fx1(yc, 'buff') ? fx1(yc, 'buff').def : 0) + (fx1(yc, 'rest') ? fx1(yc, 'rest').def : 0) + (gy ? gy.v : 0) - (ac ? ac.v : 0) - (su ? su.v : 0) - (ks && y.hp > ks.v ? ks.dv : 0);
      const thorned = !!(tn && ydef >= tn.min); if (thorned) ydef = Math.max(0, ydef - tn.v);
      const skipA = !!fx1(c, 'selfskip'); // v15 Uzdravení ocasu: nedává útoky
      const t = att + r, mg = skipA ? 0 : t - ydef; let d = Math.max(0, mg), ex = []; if (skipA) ex.push('karta nedává útoky');
      if (mg > 0) {
        has(c, 'win_dmg').forEach(f => { if ((!f.town || x.town) && mg >= (f.min || 1)) { d += f.v; ex.push(`${c.name} +${f.v}`); } });
        const ve = fx1(c, 'vs_evil'); if (ve && y.evil) { d += ve.v; ex.push(`proti zlu +${ve.v}`); }
        const rg = fx1(c, 'rage'); if (rg && x.hp <= rg.below && d > 0) { d *= 2; ex.push(`${c.name}: dvojnásobné zranění`); }
        const wr = fx1(c, 'wrath'); if (wr && x.hp <= wr.below) { d += wr.v; ex.push(`${c.name} +${wr.v}`); }
        if (fx1(c, 'win_half')) { const hf = Math.floor(Math.max(0, y.hp - d) / 2); d += hf; ex.push(`polovina životů +${hf}`); }
      }
      const wd = fx1(c, 'win_dot'), st = wd && wd.st && mg >= (wd.min || 1) ? wd.st : null; if (st) ex.push(`${wd.n}: soupeř dostává stav`);
      const bd = fx1(c, 'boss_dmg'); if (bd) { d += bd.v; ex.push(`${c.name} +${bd.v}`); }
      const dr = fx1(c, 'drain'), drain = dr ? dr.v * (dr.n || 2) : 0; if (drain) ex.push(`vysátí ${drain}`);
      if (und) ex.push(fx1(c, 'betray') ? 'zrada – nejde blokovat' : 'podkopání – obrana 0');
      if (thorned) ex.push(`trn: −${tn.v} obrany`);
      const kiss = ks ? ks.v : 0; if (kiss) ex.push(`polibek smrti ${kiss}`);
      return { t, ydef, d, mg, ex, st, drain, kiss };
    };
    const A = side(a, b, ra), B = side(b, a, rb);
    const mit = (x, d) => { const c = x.card, n = [];
      if (d > 0 && fx1(c, 'immune')) { n.push('imunita'); d = 0; }
      if (d > 0 && fx1(c, 'block1')) { n.push('vodní štít'); d = 0; }
      if (d > 0 && fx1(c, 'dodge')) { n.push('uhnul'); d = 0; }
      const cap = fx1(c, 'cap'); if (cap && d > cap.v) { d = cap.v; n.push(`štít max ${cap.v}`); }
      if (d > 0 && fx1(c, 'halfdmg')) { d = Math.ceil(d / 2); n.push('uhnula – polovina'); }
      const ld = fx1(c, 'lessdmg'); if (ld && d > 0) { d = Math.max(0, d - ld.v); n.push(`−${ld.v}`); }
      const bf = has(c, 'buffer').reduce((s, f) => s + f.v, 0); if (bf && d > 0) { const z = Math.min(d, bf); d -= z; n.push(`pohltil ${z}`); }
      return [d, n]; };
    let [dB, nB] = mit(b, A.d), [dA, nA] = mit(a, B.d);
    dB += A.drain + A.kiss; dA += B.drain + B.kiss; // vysátí i Polibek smrti obchází obranu
    if (fx1(a.card, 'win_nospec') && A.mg > 0) A.ex.push('soupeř omámen'); if (fx1(b.card, 'win_nospec') && B.mg > 0) B.ex.push('soupeř omámen');
    L.push(`⚔️ ${a.name}: ${a.atkName} ${a.atk} + karta ${a.card.name} ${a.card.att} + 🎲${ra} = <b>${A.t}</b> proti obraně ${A.ydef}${A.ex.length ? ' (' + A.ex.join(', ') + ')' : ''} → ${b.name} −<b>${dB}</b> ❤️${nB.length ? ' (' + nB.join(', ') + ')' : ''}`);
    L.push(`⚔️ ${b.name}: ${b.atkName} ${b.atk} + karta ${b.card.name} ${b.card.att} + 🎲${rb} = <b>${B.t}</b> proti obraně ${B.ydef}${B.ex.length ? ' (' + B.ex.join(', ') + ')' : ''} → ${a.name} −<b>${dA}</b> ❤️${nA.length ? ' (' + nA.join(', ') + ')' : ''}`);
    const heal = (x, mg, X) => { const wh = fx1(x.card, 'win_heal'), hl = fx1(x.card, 'heal'); return (wh && mg > 0 ? wh.v : 0) + (hl ? hl.v : 0) + (X.drain || 0); };
    return { dmgToA: dA, dmgToB: dB, healA: heal(a, A.mg, A), healB: heal(b, B.mg, B), lines: L, winner: dB > dA ? 'a' : dA > dB ? 'b' : null, statusToB: A.st, statusToA: B.st };
  }
  const api = { EMOTIONLESS, newFight, round, drink, pvp, total, offers, choose, needsChoice, BOSS_FX };
  if (typeof module !== 'undefined') module.exports = api; else root.GSCombat = api;
})(typeof window !== 'undefined' ? window : this);

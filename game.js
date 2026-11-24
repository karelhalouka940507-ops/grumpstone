/* GRUMPSTONE – prototyp hrací plochy (úvod + mapa + pochod + schopnosti lokací) */
(function () {
'use strict';

// ---------- ASSETY (při sestavení jednosouborové verze se nahradí base64) ----------
const ASSETS = {
  title: 'assets/title.jpg', map: 'assets/map.jpg',
  krcma: 'assets/t_krcma.jpg', kovarna: 'assets/t_kovarna.jpg', trziste: 'assets/t_trziste.jpg',
  arena: 'assets/t_arena.jpg', zpoved: 'assets/t_zpoved.jpg', mucirna: 'assets/t_mucirna.jpg',
  knihovna: 'assets/t_knihovna.jpg', alchymista: 'assets/t_alchymista.jpg',
  prace2: 'assets/t_prace2.jpg', prace3: 'assets/t_prace3.jpg', mount: 'assets/t_mount.jpg',
  hero_conrad: 'assets/heroes/conrad.jpg', hero_finn: 'assets/heroes/finn.jpg', hero_elara: 'assets/heroes/elara.jpg',
  hero_josepho: 'assets/heroes/josepho.jpg', hero_thorne: 'assets/heroes/thorne.jpg', hero_silvia: 'assets/heroes/silvia.jpg',
  hero_igiorio: 'assets/heroes/igiorio.jpg', hero_piddlewick: 'assets/heroes/piddlewick.jpg', hero_zara: 'assets/heroes/zara.jpg',
  hero_hargan: 'assets/heroes/hargan.jpg', hero_kragthar: 'assets/heroes/kragthar.jpg', hero_goro: 'assets/heroes/goro.jpg',
  hero_mordraga: 'assets/heroes/mordraga.jpg', art_mordraga: 'assets/heroes/mordraga_art.jpg', fig_mordraga: 'assets/heroes/mordraga_fig.jpg',
  hero_houbik: 'assets/heroes/houbik.jpg', art_houbik: 'assets/heroes/houbik_art.jpg', fig_houbik: 'assets/heroes/houbik_fig.jpg',
  hero_olgrich: 'assets/heroes/olgrich.jpg', art_olgrich: 'assets/heroes/olgrich_art.jpg', fig_olgrich: 'assets/heroes/olgrich_fig.jpg',
  hero_vodicka: 'assets/heroes/vodicka.jpg', art_vodicka: 'assets/heroes/vodicka_art.jpg', fig_vodicka: 'assets/heroes/vodicka_fig.jpg',
  hero_chadimpetro: 'assets/heroes/chadimpetro.jpg', art_chadimpetro: 'assets/heroes/chadimpetro_art.jpg', fig_chadimpetro: 'assets/heroes/chadimpetro_fig.jpg',
  hero_everett: 'assets/heroes/everett.jpg', art_everett: 'assets/heroes/everett_art.jpg', fig_everett: 'assets/heroes/everett_fig.jpg'
};

const MAP_W = 1600, MAP_H = 895, START = 'telgarion', MAX_HP = 10, STEPS = 2;
// v10: mounti – s mountem 2 lokace + 1 krok navíc (na 3. lokaci nelze využít akci lokace). Volba mounta je jen kosmetická.
const MOUNTS = {
  horse: { n: 'Kůň', img: 'assets/mounts/horse.webp', tok: 'assets/mounts/horse_t.webp' },
  ostrich: { n: 'Dvouhlavý pštros', img: 'assets/mounts/ostrich.webp', tok: 'assets/mounts/ostrich_t.webp' },
  boar: { n: 'Kanec', img: 'assets/mounts/boar.webp', tok: 'assets/mounts/boar_t.webp' },
  rhino: { n: 'Lední nosorožec', img: 'assets/mounts/rhino.webp', tok: 'assets/mounts/rhino_t.webp' }
};
const MOUNT_PRICE = 10;
const mountOf = p => p ? (MOUNTS[p.mount] ? p.mount : p.horse ? 'horse' : null) : null;
// v11: Finn & Bruine (bard jezdí na medvědovi) a Mordraga (kentaurka) jsou sami svým mountem – mounta si nekupují.
const NATURAL_MOUNT = { finn: 'Bruine (medvěd)', mordraga: 'kentaurí kopyta' };
const isNatural = p => !!(p && NATURAL_MOUNT[p.hero]);
const hasMount = p => !!mountOf(p) || isNatural(p);
const mountName = p => mountOf(p) ? MOUNTS[mountOf(p)].n : isNatural(p) ? NATURAL_MOUNT[p.hero] : '';
// v11: lodě. Moře mimo pevninu jen lodí (1 🪙 za kolo, platí celé kolo) nebo nouzově stopem (bez peněz, 1 mořská lokace, zdržení).
const SHIPS = {
  elfingar: { n: 'Elfingar', img: 'assets/ships/elfingar.webp', tok: 'assets/ships/elfingar_t.webp', sides: ['good', 'neutral'], x: 1120, y: 560, d: 'Elfí plachetnice. Vozí dobré a neutrální hrdiny.' },
  banshee: { n: 'Crimson Banshee', img: 'assets/ships/banshee.webp', tok: 'assets/ships/banshee_t.webp', sides: ['evil', 'neutral'], x: 1000, y: 300, d: 'Pirátská loď s rudými plachtami. Vozí zlé a neutrální hrdiny.' }
};
const SHIP_PRICE = 1;
// Krok navíc s mountem neplatí v tahu, kdy je hrdina zdržen: vynucený odpočinek po 0 životech, Prokletí nebo nezdar (mlha).
// Dobrovolný odpočinek (např. v krčmě) je akce lokace – krok navíc platí.
const stepsOf = p => STEPS + (hasMount(p) && !(S && S.noMount && S.players && p === cur()) ? 1 : 0);
const MAXST = () => stepsOf(S && S.players ? cur() : null);
const isMountStep = p => hasMount(p) && S.steps > STEPS;
const XP_PER_LEVEL = 10, MAX_LEVEL = 10; // v11: zkušenosti na level zdvojnásobeny (dřív 5·L), strop level 10

// ---------- HRDINOVÉ ----------
const AL = {
  LG: ['Zákonně dobrý', 'Lawful Good', 'good'], NG: ['Neutrálně dobrý', 'Neutral Good', 'good'], CG: ['Chaoticky dobrý', 'Chaotic Good', 'good'],
  LN: ['Zákonně neutrální', 'Lawful Neutral', 'neutral'], TN: ['Pravý neutrál', 'True Neutral', 'neutral'], CN: ['Chaoticky neutrální', 'Chaotic Neutral', 'neutral'],
  LE: ['Zákonně zlý', 'Lawful Evil', 'evil'], NE: ['Neutrálně zlý', 'Neutral Evil', 'evil'], CE: ['Chaoticky zlý', 'Chaotic Evil', 'evil']
};
const SIDE_LABEL = { good: 'Dobrý', neutral: 'Neutrální', evil: 'Zlý' };
// side = strana pro pravidla (osa dobro–zlo)
const HEROES = [
  { id: 'conrad', name: 'Conrad Grumpstone', cls: 'Tank', ic: '🛡️', al: 'LG', desc: 'Tank. Čestný bojovník rodu Grumpstoneů – štít, meč a „Ve jménu cti a krále!“' },
  { id: 'finn', name: 'Finn & Bruine', cls: 'Hybrid (bard a medvěd)', ic: '🎻', al: 'CG', desc: 'Hybrid. Půltrpasličí bard s uspávací harfou a mluvící medvěd – „redistribuční umělci“.' },
  { id: 'josepho', name: 'Josepho', cls: 'Druid', ic: '🌳', al: 'NG', desc: 'Druid. Satyr, který panovou flétnou probouzí živé stromy.' },
  { id: 'zara', name: 'Zara', cls: 'Šamanka', ic: '🌊', al: 'NG', alName: 'Neutrálně dobrá', desc: 'Šamanka. Vyvolává vodní živly a věří na podivné rituály.' },
  { id: 'elara', name: 'Elara Moonwhisper', cls: 'Diplomatka', ic: '🌙', al: 'TN', alName: 'Pravá neutrálka', desc: 'Diplomatka. Svádění a přízeň politiků; ve městech ji chrání domobrana, v divočině je zranitelná.' },
  { id: 'piddlewick', name: 'Piddlewick', cls: 'Diplomat', ic: '📸', al: 'TN', desc: 'Diplomat. Gnómí paparazzi „Klikací“ Sněžný – roztomilost a kompromitující materiál.' },
  { id: 'thorne', name: 'Thorne', cls: 'Assassin', ic: '🗡️', al: 'CN', desc: 'Assassin. Rychlý elfí zabiják z Elf Service, lehká zbroj a jed na ostří.' },
  { id: 'silvia', name: 'Silvia De Saint', cls: 'Assassin', ic: '⚓', al: 'CN', alName: 'Chaoticky neutrální', desc: 'Assassin. První důstojnice lodi El Chabrus – rychlá, drzá a s šavlí v ruce.' },
  { id: 'hargan', name: 'Hargan Grimaxe', cls: 'Lovec', ic: '🏹', al: 'LE', desc: 'Lovec. Trpasličí lovec lidí s vlkem Krvavý Dráp – smlouva je smlouva.' },
  { id: 'kragthar', name: "Krag'thar Bloodthorn", cls: 'Tank', ic: '🪓', al: 'NE', note: 'Může se změnit na neutrálního.', desc: 'Tank. Tauren, bývalý otrok z arény – jediný, kdo se může obrátit k neutralitě.' },
  { id: 'goro', name: 'Goro Whiterock', cls: 'Tank', ic: '👊', al: 'CE', desc: 'Tank. Albínský ork – brutální navždy.' },
  { id: 'mordraga', name: 'Mordraga', cls: 'Tank (kentaurka)', ic: '🐴', al: 'CE', alName: 'Chaoticky zlá', female: true, desc: 'Tank. Bývalá hraběnka, která v močálu vypila zásobu lektvarů od nejhorších alchymistů a vynořila se jako obří vrásčitá kentaurka.',
    motto: '„Krása pomíjí. Ošklivost je věčná.“', lore: 'Jenže Mordraga měla jednu drobnou slabost. Nikdy nikam nechodila bez zásoby lektvarů od těch nejhorších alchymistů v království. Jejich sloučeniny dokázaly způsobit nepředstavitelná muka, ale také propůjčovaly prazvláštní schopnosti. Někteří nešťastníci po jejich požití levitovali, jiným při tom šlehal z pozadí oheň. Mordraga měla z podobných vedlejších účinků menší obavy než z bahna, které jí právě plnilo ústa.|Z posledních sil sáhla do svého pihovatého výstřihu a vytáhla první lahvičku. Vypila ji. Potom druhou. A třetí. A další a další…|Pak se propadla pod bahno a do rána byl klid.|Alespoň dočasný.|Následující noc už lesem duněla kopyta. Z močálu se totiž vynořilo něco, co bylo ještě odpornější než původní hraběnka. Mohutná, vrásčitá kentaurka s šedým drdolem, ostrým nosem a tělem, které jako by samo odporovalo přírodním zákonům.|Od té doby se lesem nese její hrůzný smích. Když nějakého nešťastníka rozdupe na kaši, obvykle si ještě upraví drdol a zkontroluje svůj odraz v kaluži.|Mordraga totiž nezemřela. Jen se stala ještě méně snesitelnou.'.split('|') },
  { id: 'houbik', name: 'Houbík', cls: 'Mág (toxická kouzla)', ic: '🍄', al: 'TN', alName: 'Pravý neutrál', desc: 'Mág. Němý poutník s kloboukem muchomůrky a brněním z kůry. Toxická kouzla, spory a podhoubí – obchoduje se všemi a smí na obě lodě.',
    motto: '„…“ (Houbík nemluví. Houbík roste.)', lore: 'Nikdo neví, jak se doopravdy jmenuje. Nikdo ho nikdy neslyšel promluvit. Jméno Houbík mu daly děti, které si hrály v lese a jednoho rána našly pod smrky muchomůrku velkou jako deštník. Muchomůrka se na ně podívala dvěma žlutě svítícíma očima a pomalu odkráčela.|Od té doby Houbík chodí krajinou. Tiše, trpělivě, v brnění z kůry a spadaného listí. Obchoduje s každým, kdo se nebojí – elfové, piráti, skřeti, jemu je to jedno. Platí se u něj sušenými hříbky, lesní jahody bere jako zálohu.|Houbík není zlý. Chodí kolem mraveniště po špičkách, zalévá zvadlé kapradí a každý večer navštěvuje svou oblíbenou rodinku koroptví. Táta koroptev, máma koroptev a jedenáct koroptvíčat. Počítá je. Pokaždé.|Jednou na podzim jich bylo jen deset.|Pytláka našli až na jaře. Seděl opřený o pařez, z uší mu rašily václavky a vnitřnosti měl prorostlé podhoubím tak důkladně, že z něj houbaři ještě dva roky sbírali bedly. V krku měl nacpané šišky. Smrkové. Pečlivě vybrané.|Koroptve jsou od té doby v kraji nejbezpečnějšími ptáky. A pytláci si na houby raději chodí do obchodu.'.split('|') },
  { id: 'olgrich', name: 'Olgrich Vottanar', cls: 'Upír (cestující aristokrat)', ic: '🦇', al: 'TN', alName: 'Neutrální', desc: 'Upír. Lord krve, Lord Vottanar – cestující aristokrat a samozvaný soudce morálky. Charisma i Inteligence. Každé druhé kolo je pro něj ☀️ den: cesta stojí 1 ❤️, nebo zůstane a využije 2 schopnosti lokace.',
    motto: '„Nejsem zlý člověk. Jsem pouze člověk, který si všímá vašich chyb.“', lore: '<b>Příběh – Zrození lorda Vottanara</b>|Olgrich Vottanar býval obyčejným, byť poněkud přehnaně svědomitým člověkem. V mládí se věnoval studiu historie, etikety a lidské povahy. Věřil v pořádek, slušnost a především v to, že každý člověk by měl nést odpovědnost za své činy.|Jeho život se změnil během jedné návštěvy zapadlého šlechtického sídla.|Olgrich byl tehdy pozván na slavnostní večeři, kde měl pomoci vyřešit spor mezi místním šlechticem a několika obchodníky. Hostitel byl velmi pohostinný, víno vynikající a společnost poněkud podivná. Olgrich si všiml, že nikdo z přítomných nejí, ale připisoval to zvláštním místním zvykům.|Teprve když hostitel během přípitku odhalil své tesáky, pochopil, že se ocitl na poněkud jiné společenské události, než očekával.|Starý upír, který si Olgricha oblíbil pro jeho zdvořilost, rozhodl, že by byla škoda nechat takového muže zestárnout. Bez jeho souhlasu jej proměnil.|Olgrich se probudil následující noc jako upír.|První týdny byly tragické. Zjistil, že nesnáší česnek, nemůže se vystát na slunci a jeho nová strava je společensky značně problematická. Nejhorší však bylo zjištění, že každé druhé ráno musí hledat místo, kde přečká den.|Svůj osud nakonec přijal. Rozhodl se, že když už mu byla odepřena možnost normálního života, alespoň se pokusí dělat svět o něco snesitelnějším místem.|A tak začal cestovat.|<b>Lord, kterého nikdo nevolil</b>|Olgrich postupně navštívil desítky měst a vesnic. Díky svému vystupování, vzdělání a mimořádné schopnosti navazovat přátelství si dokázal získat důvěru i tam, kde by jiného upíra okamžitě vyhnali s pochodněmi.|Jeho návštěvy však nikdy nebyly zcela nevinné.|Olgrich si totiž velmi rád všímá lidských charakterů. Zvláště těch, které považuje za morálně pokřivené. Zkorumpovaní obchodníci, krutí šlechtici, bezohlední lichváři a lidé, kteří zneužívají slabší, se často ocitají v jeho osobním seznamu.|Někdy jim pouze domluví. Jindy jim zničí pověst, připraví je o majetek nebo jim nabídne velmi nepříjemnou noční návštěvu.|Jeho metody nejsou vždy spravedlivé, ale Olgrich je přesvědčen, že svědomí je důležitější než zákon.|V jednom městě dokonce pomohl odhalit místního správce, který tajně okrádal chudé obyvatele. Olgrich si získal takovou přízeň místních, že mu nabídli šlechtický titul a opuštěné sídlo na okraji města.|Přijal jej s velkou pokorou.|Od té doby si nechává říkat Lord Vottanar.|Dodnes není zcela jisté, zda si titul skutečně zasloužil, nebo zda jej obyvatelé udělili hlavně proto, aby už konečně odjel do dalšího města.|<b>Povaha</b>|Olgrich je svědomitý, kultivovaný a společenský. Má rád rozhovory, kvalitní víno, staré knihy a lidi, kteří mají pevné zásady.|Nesnáší pokrytectví, zbabělost a zneužívání moci.|Přestože je upír, nepovažuje se za netvora. Krev vnímá jako nepříjemnou součást svého nového života, nikoliv jako důvod k bezmyšlenkovitému vraždění.|Jeho největší slabinou je přesvědčení, že právě on dokáže nejlépe posoudit charakter ostatních.'.split('|') },
  { id: 'vodicka', name: 'Velebníček Vodička', cls: 'Kněz (rybí kněz)', ic: '🐸', al: 'NG', alName: 'Neutrálně dobrý', desc: 'Kněz. Strážce bažin, přítel vesničanů a nepřítel zbytečného násilí – vodní a léčivá kouzla, útočí Inteligencí. 🌊 Plavání: bez lodi a zdarma přeplave jedním pochodem do sousední lokace přes vodu.',
    motto: '„Život je dar. A já se snažím, aby si ho každý mohl užít. I když už třeba nemůže mluvit, chodit ani myslet.“', lore: '<b>Příběh – Dobro má mnoho podob</b>|Rybí kněz pochází z hlubokých bažin, kde jeho druh žije v malých osadách postavených vysoko v korunách starých stromů. Od mládí byl veden k úctě k životu, přírodě a rovnováze. Nikdy nebyl příliš bojovný a už jako mladík dával přednost léčení, pomoci druhým a rozmlouvání před jakýmkoliv konfliktem.|Postupem času se stal knězem a osvojil si zvláštní vodní a léčivá kouzla. Jeho největším životním přesvědčením je, že žádný tvor nemá právo bezdůvodně ubližovat jinému, zejména pokud se nedokáže bránit.|Násilí upřímně nesnáší.|To ovšem neznamená, že by byl bezbranný.|<b>Velký pacifista</b>|Rybí kněz je přesvědčen, že zabíjení je krajním selháním každého rozumného tvora. Pokud se někdo dopustí násilí, měl by dostat příležitost své chyby litovat a napravit se.|Když však narazí na skutečně nebezpečného protivníka, který ohrožuje nevinné, dokáže být překvapivě nekompromisní.|Jeho oblíbeným řešením je protivníka zneškodnit tak důkladně, aby už nikdy nemohl nikomu ublížit.|Jednou například narazil na skupinu banditů, jejichž vůdce terorizoval několik vesnic. Kněz se nejprve pokusil o domluvu. Když neuspěl, použil své zaklínadlo a vůdci způsobil tak vážné poškození mozku, že z něj zůstal ochrnutý, slintající muž, který měl problém napočítat do pěti.|Když se později dozvěděl, že jej vesničané označují za krutého a bezcitného, byl skutečně zaskočen.|„Ale vždyť jsem ho nezabil! Dokonce jsem mu ponechal všechny jeho životy. Jen už je neumí příliš dobře používat.“|Od té doby se podobným debatám raději vyhýbá.|<b>Zimní spánek</b>|Jako obojživelník má jednu zvláštnost, kterou považuje za naprosto přirozenou. Každou zimu upadá do hluboké hibernace.|Několik měsíců prospí, nevnímá okolí a probouzí se, až když se příroda opět oteplí.|Na rozdíl od lidí v tom nevidí nic děsivého. Smrt je podle něj mnohem horší než dlouhý spánek. Proto také nechápe, proč by mělo být tak strašné, když někdo skončí v podobném stavu jeho přičiněním.|„V zimě takhle spíme všichni. Jen někteří z nás se bohužel probudí.“|<b>Přítel vesničanů</b>|Přestože žije převážně v bažinách, pravidelně navštěvuje okolní vesnice. Místní jej dobře znají a většinou ho mají rádi. Pomáhá nemocným, léčí zraněné, přináší vodu do suchých studní a občas předvádí dětem svá kouzla.|Jeho vystoupení bývají velmi oblíbená.|Dokáže vyčarovat vodní vír, nechat z vlastní kůže vyrůstat drobné rostliny nebo si během několika okamžiků zahojit utržený ocas.|Některé jeho triky ovšem nejsou pro slabší povahy.|Jednou například předvedl dětem, jak dokáže oživit mrtvou rybu. Ryba se skutečně probudila, ale začala sebou nekontrolovatelně házet, zatímco dospělí vesničané zvraceli za nejbližší stodolou.|Děti tleskaly.|Kněz byl nadšený a slíbil, že příště připraví ještě větší překvapení.|<b>Povaha a přesvědčení</b>|Rybí kněz je dobrák od kosti. Je trpělivý, laskavý, mírumilovný a velmi ochotný pomoci komukoliv, kdo to potřebuje.|Nesnáší tyrany, násilníky a ty, kteří zneužívají svou sílu proti slabším.|Není však příliš dobrým soudcem lidské psychologie. Některé věci, které ostatní považují za strašlivé, mu připadají naprosto běžné.|Jeho největší předností je soucit.|Jeho největší slabinou je skutečnost, že nedokáže pochopit, proč by měl někdo považovat celoživotní vegetativní stav za nepřijatelný trest, když dotyčný stále dýchá.|Jeho životní přesvědčení:|„Život je dar. A já se snažím, aby si ho každý mohl užít. I když už třeba nemůže mluvit, chodit ani myslet.“'.split('|') },
  { id: 'chadimpetro', name: 'Chadimpetro', cls: 'Bojovník (obří krtek horník)', ic: '⛏️', al: 'TN', alName: 'Neutrální', desc: 'Bojovník. Obří krtek horník s krumpáčem, lucernou a pytli uhlí – lovec dvacetimetrových stonožek, otec osmi Paštiků a zapřisáhlý nepřítel trpaslíků. Boj i Obrana. 🕳️ Podzemní chodby: jedním pochodem se prokope až o 2 lokace; každé kolo nasbírá 🪨 pytel uhlí. Bez mounta, lodí a vody; do arény a herny ho nepustí.',
    motto: '„Já nejsem lakomej. Já jenom vím, co má skutečnou cenu.“', lore: '<b>Příběh – Krtek, který ví, co má skutečnou cenu</b>|Chadimpetro je obří krtek horník. Na zádech krumpáč, v tlapě lucerna, přes rameno pytle uhlí – a kudy projde, tam už dlažba nikdy nesedí tak, jak seděla. Městská hlídka ho nemá ráda, protože se jí pořád propadá strážnice. Chadimpetro to nechápe: on jen jde nakoupit okurky.|<b>Lovec</b>|Dvacetimetrová stonožka je pro městskou hlídku noční můra. Pro Chadimpetra je to prostě vydatný oběd. Dokonce si ji nejprve mlsně prohlédne.|Pak ji odborně ohodnotí jako kuchař na trhu: „Tohle je malá stonožka. Ještě ani nemá pořádný maso.“ A sní ji stejně, protože doma čeká osm hladových pusinek.|<b>Rodinný typ</b>|Osm dětí pojmenovaných Paštika 1 až Paštika 8. Jména vymýšlel sám a je na ně patřičně hrdý – jsou praktická, dobře se počítají a hned je vidět, kdo je nejstarší. Úplně si představuji, jak na ně řve přes celý důl: „Paštiko šestá, nech tu stonožku, to je večeře!“|Ani to ale nepomáhá. O chvíli později se z hloubky ozve znovu: „Paštiko třetí, nejez tu lampu! To není k jídlu!“|Karmu má neutrální: neubližuje, když nemusí, a obchoduje s každým, kdo mu za uhlí nabídne něco opravdu cenného. Zlato bere, ale okurky jsou lepší. Když mu jednou kupec nabízel drahokam velký jako pěst, Chadimpetro se jen podrbal na čumáku: „Diamant? A můžu za něj dostat okurky?“|<b>Nenávist k trpaslíkům</b>|Trpaslíci považují důl za zdroj bohatství, Chadimpetro za svůj domov a jídelnu. Jejich představa pořádku je naprosto neslučitelná. Trpaslík vidí žílu zlata, krtek vidí zeď obýváku. Trpaslík vykope šachtu, krtek ji večer zahrabe, protože táhne na děti.|Kdykoli zaslechne v podzemí cinkání trpasličího krumpáče, zježí se mu srst po celém těle: „Trpaslík! Zase mi hrabe do podlahy!“|<b>Podzemní chodby</b>|Po povrchu chodí nerad – je tam moc světla a málo stonožek. Pod zemí se ale jedním pochodem prokope klidně o dvě lokace dál, a protože cestou kope, vždycky mu do pytle napadá trocha uhlí. To pak prodává na tržišti jako jediný v celém kraji.|Na koně ho nedostanete: krtek nejezdí, krtek kope. Na loď ani do vody taky ne – jakmile nemá půdu pod nohama, ztrácí hlavu. Do arény ho nepustí, protože minule prokopal písek až do sklepa a půlka diváků skončila v tunelu. A z herny ho vyhodili, když se pokusil sníst kostky, protože voněly jako hrášek.|Na otázku, proč nikdy nic nerozdá zadarmo, odpovídá vždycky stejně a s naprostým klidem: „Já nejsem lakomej. Já jenom vím, co má skutečnou cenu.“'.split('|') },
  { id: 'everett', name: 'Everett – Černá růže', cls: 'Diplomat (šlechtic manipulátor)', ic: '🌹', al: 'NE', alName: 'Neutrálně zlý', desc: 'Diplomat. Marnivý, zbabělý a nesmírně okouzlující šlechtic v růžovém kabátci s černou růží, který drží štěně za kůži na krku a míří na trůn. Charisma; ve městech a vesnicích kouzlí, v divočině je slabý. 🎲 Podvodník u kostek: v herně +1 k hodu, výhra = 6Z, ale dostane přes hubu (−2 ❤️).',
    motto: '„Já nejsem ambiciózní. Jen mám pocit, že trůn je na špatném místě.“', lore: '<b>Příběh – Černá růže</b>|Everett je šlechtic. To je první věc, kterou o sobě řekne, a obvykle i druhá a třetí. Nosí růžový kabátec s vyšitou černou růží, prsteny na každém prstu, kterým se zrovna nic nestalo, a vlasy, které by nikdy nepustil do deště. Jeho vzhled a oblečení jsou pro něj téměř posvátné – kdo mu pomačká rukáv, ten si ho pamatuje déle než vlastní křest.|<b>Charismatický</b>|Když chce, umí být skutečně okouzlující. Usměje se, pochválí vám boty, zeptá se na zdraví babičky a vy ani nepoznáte, kdy jste mu začali dlužit. Dokáže být skutečně příjemný – pokud z toho něco má. Každý člověk je pro něj potenciální nástroj, nebo aspoň publikum.|<b>Manipulátor</b>|Lidé kolem něj se dělí na dvě skupiny: na ty, kteří mu už posloužili, a na ty, kteří to ještě nevědí. Když mu někdo naznačí, že je podezřelý, jen se unaveně pousměje: „Prosím vás, nebuďte směšní. Kdybych vás chtěl zradit, už byste o tom dávno nevěděli.“|<b>Trůn</b>|Everett touží po trůnu. Sám by to ovšem nikdy tak hrubě neřekl: „Já nejsem ambiciózní. Jen mám pocit, že trůn je na špatném místě.“ Konkrétně tedy pod někým jiným než pod ním.|Na cestě mu stojí především sestřenice Liona, ke které chová ty nejvřelejší city, jaké se dají vyslovit nahlas: „Liona? Má sestřenice? Samozřejmě jí přeji všechno nejlepší. Jen trochu dál od trůnu.“|<b>Zbabělec</b>|Nerad riskuje vlastní kůži – ta je přece jen pečlivě ošetřovaná. Raději nechá ostatní bojovat za něj a pak u hostiny vypráví, jak to celé vymyslel. Do souboje se pouští, jen když nemá nikoho, za koho by se schoval, a i tehdy si nejdřív zkontroluje účes.|Kdysi se setkal s obávaným Náčelníkem a vrátil se bez škrábnutí, což vypráví při každé příležitosti: „Náčelník byl velmi milý. Dokonce mi zavázal boty. Myslím, že ve mně viděl přirozenou autoritu.“|<b>Patetický</b>|Když něco nevyjde, okamžitě se staví do role ublíženého. Prohraná partie, deštivý den nebo nevděčný svět – vždycky je to křivda spáchaná na něm. Útěchu nachází u jediné autority, kterou nikdy nezpochybnil: „Matka vždy říkala, že jsem výjimečný. A matky mají vždycky pravdu.“|<b>Podvodník u kostek</b>|V herně je Everett pravidelným a velmi štědrým hostem – hlavně co se týče kostek, které si nosí v rukávu. Díky podvádění si vždycky přihodí o oko víc. Jenže když vyhraje, ostatní hráči si toho bohužel všimnou: shrábne šest zlaťáků a vzápětí dostane přes hubu. Pak se urazí, a to velmi okázale.|<b>Mimo salóny</b>|Jeho zbraní je úsměv a úsměv potřebuje publikum. Ve městech a vesnicích kouzlí, v divočině je jen vyděšený muž v růžovém kabátci, který drží štěně za kůži na krku a doufá, že medvěd ocení jeho styl.'.split('|') },
  { id: 'igiorio', name: 'Igiorio Zapomenutý', cls: 'Mág', ic: '🔮', al: 'CE', desc: 'Mág. Senilní gnómí čaroděj v trenýrkách se srdíčky – chaos v hábitu.' }
];
HEROES.forEach(h => { const a = AL[h.al]; h.alCz = h.alName || a[0]; h.alEn = a[1]; h.side = a[2]; h.img = 'hero_' + h.id; });
const heroById = id => HEROES.find(x => x.id === id);
const SIDE_ORDER = ['good', 'neutral', 'evil'];
const SIDE_GROUP = { good: 'Dobří', neutral: 'Neutrální', evil: 'Zlí' };
const sideTag = h => `<span class="side-tag ${h.side}">${SIDE_LABEL[h.side]}</span>`;
const alignBadge = h => `<span class="align ${h.side}" title="${h.alEn} · strana: ${SIDE_LABEL[h.side]}${h.note ? ' · ' + h.note : ''}">${h.alCz}<small>${h.alEn}</small></span>`;
const COLORS = [
  { id: 'red', c: '#d83a2e', n: 'červená' }, { id: 'blue', c: '#2f6fe0', n: 'modrá' },
  { id: 'green', c: '#2fae3a', n: 'zelená' }, { id: 'yellow', c: '#e8c21c', n: 'žlutá' },
  { id: 'purple', c: '#9b4fd6', n: 'fialová' }, { id: 'orange', c: '#ee7a1a', n: 'oranžová' }
];

// ---------- LOKACE ----------
const PLACES = window.GS_PLACES;
const BY_ID = {}; PLACES.forEach(p => BY_ID[p.id] = p);
const ADJ = {}; PLACES.forEach(p => ADJ[p.id] = new Set());
const SEA = new Set();
window.GS_EDGES.forEach(([a, b]) => { ADJ[a].add(b); ADJ[b].add(a); });
window.GS_SEA.forEach(([a, b]) => { ADJ[a].add(b); ADJ[b].add(a); SEA.add(a + '|' + b); SEA.add(b + '|' + a); });
// v11: pevnina = vše spojené pozemními cestami s Grimfortem; zbytek jsou mořské lokace (jen lodí). Přístavy = lokace pevniny s mořskou cestou.
const LADJ = {}; PLACES.forEach(p => LADJ[p.id] = new Set()); window.GS_EDGES.forEach(([a, b]) => { LADJ[a].add(b); LADJ[b].add(a); });
const MAINLAND = new Set(); (function () { const st = [BY_ID.grimfort ? 'grimfort' : PLACES[0].id]; while (st.length) { const a = st.pop(); if (MAINLAND.has(a)) continue; MAINLAND.add(a); LADJ[a].forEach(b => st.push(b)); } })();
const OFFSHORE = new Set(PLACES.filter(p => !MAINLAND.has(p.id)).map(p => p.id));
const PORTS = new Set(); window.GS_SEA.forEach(([a, b]) => [a, b].forEach(x => { if (MAINLAND.has(x)) PORTS.add(x); }));
const isCoast = id => OFFSHORE.has(id) || PORTS.has(id);

const TYPE_LABEL = {
  city: 'Město', village: 'Vesnice', forest: 'Les / háj', mountain: 'Hory',
  ruin: 'Zřícenina / temné místo', water: 'Ostrov / jezero', other: 'Významné místo'
};
const TYPE_ICON = { city: '🏰', village: '🏠', forest: '🌲', mountain: '⛰️', ruin: '🏚️', water: '🏝️', other: '✨' };
const ICON_OVERRIDE = {
  draci_sopka: '🌋', hranice_stinu: '🌫️', vodnikova_tun: '🐸', jezero_dusi: '👻',
  vez_kouzla: '🗼', propast: '🕳️', krypta: '⚰️', pekelna_brana: '🔥', dul_farunotre: '⛏️',
  chram_slunce: '☀️', krvavy_utes: '🪨', ostrov_prani: '🌸', mlzny_ostrov: '🌴', ostrov_supinakuv: '🐊',
  lunohvezd: '🌙', palmova_zatoka: '🌴', rybarska_osada: '🎣'
};
const iconOf = p => ICON_OVERRIDE[p.id] || TYPE_ICON[p.type];
const isSettlement = p => p.type === 'city' || p.type === 'village';

const BOSSES = ['Obří troll', 'Víla kmotřička', 'Plazí bojovník', 'Krakenová matka', 'Houbový golem',
  'Rohatý gryf', 'Zlá víla', 'Žena s havranem', 'Parohatý stromový démon', 'Tauren se sekerami', 'Rytíř havranů'];

const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const d6 = () => 1 + rnd(6);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clampHp = p => { p.hp = Math.max(0, Math.min(MAX_HP, p.hp)); };

// ---------- TŘÍDY A TRÉNINK ----------
// Prozatímní statistiky hrdinů [Boj, Obrana, Inteligence, Charisma] – k doladění.
const ROLE = { conrad: 'tank', kragthar: 'tank', goro: 'tank', mordraga: 'tank', thorne: 'assassin', silvia: 'assassin', hargan: 'hunter',
  elara: 'diplomat', piddlewick: 'diplomat', everett: 'diplomat', josepho: 'mage', igiorio: 'mage', zara: 'mage', houbik: 'mage', vodicka: 'mage', olgrich: 'vampire', chadimpetro: 'fighter', finn: 'hybrid' };
const ROLE_NAME = { tank: 'Tank', assassin: 'Assassin', hunter: 'Lovec', diplomat: 'Diplomat', mage: 'Kouzelník', vampire: 'Upír', fighter: 'Bojovník', hybrid: 'Hybrid' };
const TRAIN_ALLOW = { tank: ['obr'], assassin: ['boj'], hunter: ['boj'], diplomat: ['cha'], mage: ['int'], vampire: ['int', 'cha'], fighter: ['boj', 'obr'], hybrid: ['boj', 'int', 'cha'] }; // v7: hlavní vlastnost(i) = jediné, co se dá placeně trénovat
const STAT_NAME = { boj: 'Boj', obr: 'Obrana', int: 'Inteligence', cha: 'Charisma' };
const STAT_IC = { boj: '⚔️', obr: '🛡️', int: '📖', cha: '💬' };
const HSTAT = {
  conrad: [1, 3, 0, 1], kragthar: [1, 4, 0, 1], goro: [1, 4, 0, 0], mordraga: [2, 3, 0, 1], // Mordraga: prozatímní
  thorne: [3, 1, 1, 2], silvia: [3, 1, 0, 2], hargan: [3, 1, 1, 1],
  elara: [0, 0, 1, 4], piddlewick: [0, 0, 1, 4], everett: [1, 1, 1, 3], // v17 Everett: Charisma 3 (hlavní), ostatní 1
  josepho: [1, 1, 3, 2], igiorio: [0, 0, 4, 1], zara: [1, 1, 3, 2], houbik: [1, 2, 3, 0], vodicka: [0, 1, 4, 1], olgrich: [1, 1, 3, 3], chadimpetro: [3, 3, 0, 1], finn: [1, 2, 2, 2]
};
const STAT_IDX = { boj: 0, obr: 1, int: 2, cha: 3 };
const roleOf = p => ROLE[p.hero] || 'hybrid';
const isMain = (p, s) => TRAIN_ALLOW[roleOf(p)].includes(s);
// Vedlejší vlastnosti rostou samy: +1 za každé 2 levely (L3, L5, L7…), jen celá čísla.
const autoBonus = (p, s) => (s === 'spec' || isMain(p, s)) ? 0 : Math.floor(((p.level || 1) - 1) / 2);
function stat(p, s) { const base = s === 'spec' ? 0 : (HSTAT[p.hero] || [1, 1, 1, 1])[STAT_IDX[s]]; return base + ((p.train && p.train[s]) || 0) + autoBonus(p, s) + (p.equip ? itemBonus(p)[s] : 0); }
function baseStat(p, s) { return (HSTAT[p.hero] || [1, 1, 1, 1])[STAT_IDX[s]] + ((p.train && p.train[s]) || 0) + autoBonus(p, s); }
// Bojová síla: tankové staví útok z Obrany; Finn z té silnější z Boje/Obrany.
const combatKey = p => roleOf(p) === 'tank' ? 'obr' : roleOf(p) === 'hybrid' ? (baseStat(p, 'boj') > baseStat(p, 'obr') ? 'boj' : 'obr') : roleOf(p) === 'fighter' ? (baseStat(p, 'obr') > baseStat(p, 'boj') ? 'obr' : 'boj') : 'boj'; // v16 Chadimpetro: silnější z Boje/Obrany (rovnost → Boj) // Finn: silnější z Boje/Obrany
function trainLock(p, s) {
  const r = roleOf(p);
  if (TRAIN_ALLOW[r].includes(s)) { const done = Object.entries(p.trainLv || {}).find(([, v]) => v === (p.level || 1)); // v11: +1 vlastnost za level (jediný trénink v levelu)
    return done ? `V levelu ${p.level} už jsi trénoval (${STAT_NAME[done[0]]}) – další placený trénink až od levelu ${p.level + 1}.` : null; }
  return `${ROLE_NAME[r]} (${heroById(p.hero).name.split(' ')[0]}) může trénovat jen: ${TRAIN_ALLOW[r].map(x => STAT_NAME[x]).join(', ')}.`;
}
function markTrain(p, s) { p.trainLv = p.trainLv || {}; p.trainLv[s] = p.level || 1; }
// Zkušenosti (v11): level L od 10·(L−1) zkušeností celkem, strop level 10 (pak MAX)
const xpNeed = p => XP_PER_LEVEL * (p.level || 1);
function addXp(p, n) {
  if ((p.level || 1) >= MAX_LEVEL) return ''; // MAX – zkušenosti se už nesbírají
  p.xp = (p.xp || 0) + n; const msgs = [];
  while (p.level < MAX_LEVEL && p.xp >= xpNeed(p)) { p.level++; msgs.push(p.level); addLog(`⭐ ${p.name} postoupil na level ${p.level}!`); }
  if (p.level >= MAX_LEVEL) p.xp = XP_PER_LEVEL * (MAX_LEVEL - 1);
  return msgs.length ? ` <b>⭐ Level ${p.level}!</b>` : '';
}

// Léčivý lektvar (v7): jen v boji – boj zatím není, proto ho mimo boj vypít nejde.
const POTION_MAX = 2, POTION_RULE = 'Léčivý lektvar: +4 životy a vyléčí Otravu i Nákazu. Pít jen v boji, max 1 za boj; nosit max 2.';
// ---------- SCHOPNOSTI LOKACÍ ----------
// classLock(p) -> důvod, proč to hrdinova třída nemůže; req(p, loc, opt) -> důvod blokace nebo null; apply(p, loc, opt) -> {log, html}
// v11 obtížnost: soupeř v aréně = level hrdiny + 1; průměrný hrdina potřebuje na kostce aspoň 3 (1–2 vždy neúspěch, 6 vždy úspěch).
const MIN_DIE = 3;
const arenaDiff = p => (p.level || 1) + 5; // soupeř = level + 1; hrdina s typickou hlavní vlastností (2 + level) potřebuje hodit 3
const ABILITIES = {
  krcma: { name: 'Krčma', img: 'krcma', text: 'Za 1Z vyléčí všechny životy. Bez peněz jen polovinu.',
    req: p => p.hp >= MAX_HP ? 'Máš plné životy.' : null,
    apply: p => { const b = p.hp;
      if (p.gold >= 1) { p.gold -= 1; p.hp = MAX_HP; return { log: `se vyspal v krčmě (−1Z, +${p.hp - b} životů, plné zdraví)`, html: `🍺 Pivo, pečínka a postel! Životy ${b} → <b>${p.hp}</b>, zaplaceno 1 zlaťák.` }; }
      p.hp = Math.min(MAX_HP, p.hp + MAX_HP / 2); return { log: `přespal v krčmě bez peněz (+${p.hp - b} životů)`, html: `🍺 Hostinský tě nechal přespat ve stáji zadarmo. Životy ${b} → <b>${p.hp}</b> (bez peněz jen polovina).` }; } },
  kovarna: { name: 'Kovárna', img: 'kovarna', text: 'Nabídka se mění každé kolo. Žluté 3Z, oranžové 10Z (od levelu 3), fialové 20Z (od levelu 6). ✔ = kompatibilní, 🎒 = jen do brašny. Klikni na předmět pro kartu.',
    options: (p, l) => shopView(p, l.id + ':kovarna', SHOP_SLOTS.kovarna).map(id => itemOpt(id, ITEM_BY_ID[id].price, p)),
    req: (p, l, o) => !o ? 'Vyber předmět.' : (p.gold < ITEM_BY_ID[o].price ? `Potřebuješ ${ITEM_BY_ID[o].price} zlaťáků.` : null),
    apply: (p, l, o) => { const it = ITEM_BY_ID[o]; p.gold -= it.price; shopTake(l.id + ':kovarna', o); const r = giveItem(p, o);
      return { log: `koupil v kovárně „${it.name}“ (−${it.price}Z)`, html: `⚒️ Kovář ti podává <b>${it.name}</b> – ${r === 'equipped' ? 'hned si ho nasazuješ.' : r === 'bag' ? 'ukládáš ho do brašny.' : r === 'full' ? FULL_TXT + '.' : 'tvoje třída ho nosit nemůže, putuje do brašny.'}<div class="loot">${itemCardHTML(it, p)}</div>` }; } },
  trziste: { name: 'Tržiště', img: 'trziste', text: 'Kup (nabídka se mění každé kolo; oranžové od levelu 3, fialové od levelu 6) nebo prodej předmět za výkupní cenu: žlutý 3Z, oranžový 5Z, fialový 10Z. (Prodávat můžeš i přes kartu předmětu – nestojí to akci.)',
    options: (p, l) => [...(l ? shopView(p, l.id + ':trziste', SHOP_SLOTS.trziste) : []).map(id => itemOpt(id, ITEM_BY_ID[id].price, p, 'buy:')),
      ...ownedBy(p).map(id => ({ id, label: `Prodat ${ITEM_BY_ID[id].name} +${PAWN[ITEM_BY_ID[id].tier]}Z`, cls: 't-' + ITEM_BY_ID[id].tier })),
      ...coalOpts(p)],
    req: (p, l, o) => !o ? 'Vyber, co koupit nebo prodat.' : o.startsWith('coal:') ? (!isMole(p) ? 'Uhlí smí prodávat jen Chadimpetro.' : (p.coal || 0) < 1 ? 'Nemáš žádný pytel uhlí.' : null) : (o.startsWith('buy:') && p.gold < ITEM_BY_ID[o.slice(4)].price ? `Potřebuješ ${ITEM_BY_ID[o.slice(4)].price} zlaťáků.` : null),
    apply: (p, l, o) => {
      if (o.startsWith('buy:')) { const id = o.slice(4), it = ITEM_BY_ID[id]; p.gold -= it.price; shopTake(l.id + ':trziste', id); const r = giveItem(p, id);
        return { log: `koupil na tržišti „${it.name}“ (−${it.price}Z)`, html: `🛒 Kupec ti podává <b>${it.name}</b>${r === 'equipped' ? ' – hned ho máš na sobě' : r === 'full' ? ' – ' + FULL_TXT : ' – do brašny'}.` }; }
      if (o.startsWith('coal:')) return sellCoal(p, o);
      const it = ITEM_BY_ID[o], v = PAWN[it.tier]; removeItem(p, o); p.gold += v; return { log: `prodal na tržišti „${it.name}“ (+${v}Z)`, html: `💰 Prodáno: <b>${it.name}</b> za <b>${v}</b> zlaťáků.` };
    } },
  arena: { name: 'Aréna', img: 'arena', text: 'Souboj o zlato se soupeřem o level silnějším: d6 + bojová síla ≥ level + 5 (na kostce aspoň 3, šestka vždy vyhrává) → +3Z a +1 zkušenost, jinak −2 životy.', dice: true,
    classLock: p => isMole(p) ? 'Chadimpetro má do arény zákaz: minule prokopal písek až do sklepa a půlka diváků skončila v tunelu.' : null,
    req: p => p.hp <= 2 ? 'Jsi příliš zraněný na arénu.' : null,
    dieLabel: p => { const k = combatKey(p); return `d6 + ${STAT_NAME[k]} ${stat(p, k)}${hasStatus(p, 'fear') ? ' − 1 strach' : ''} ≥ ${arenaDiff(p)} (soupeř level ${(p.level || 1) + 1}; 1–2 vždy prohra)`; },
    resolve: (p, l, o, r) => { const k = combatKey(p), s = stat(p, k) - useFear(p), t = r + s;
      const line = `Hod: <span class="dice">${r}</span> + ${s} = <b>${t}</b>`;
      if (r === 6 || (r >= MIN_DIE && t >= arenaDiff(p))) { p.gold += 3; const lv = addXp(p, 1); return { log: `zvítězil v aréně (hod ${r}+${s} ≥ ${arenaDiff(p)}, +3Z, +1 zk.)`, html: `⚔️ ${line} (potřeba ${arenaDiff(p)}) Vítězství! Dav šílí, <b>+3 zlaťáky, +1 zkušenost</b>.${lv}` }; }
      p.hp -= 2; return { log: `prohrál v aréně (hod ${r}+${s}, −2 životy)`, html: `⚔️ ${line} Prohra… Odnášejí tě z písku, <b>−2 životy</b>.` }; } },
  zpoved: { name: 'Zpověď', img: 'zpoved', text: 'Náprava karmy: +1 karma.',
    apply: p => { p.karma += 1; return { log: `se vyzpovídal (+1 karma → ${p.karma})`, html: `🕯️ Hříchy odpuštěny. <b>+1 karma</b> (teď ${p.karma}).` }; } },
  mucirna: { name: 'Mučírna', img: 'mucirna', text: 'Pro záporáky: −1 karma (může jít do mínusu). Vyslýchaný vězeň navíc prozradí úkryt bosse.',
    classLock: p => heroById(p.hero).side === 'good' ? 'Dobrý hrdina do mučírny nevkročí – slouží záporákům.' : null,
    apply: p => { p.karma -= 1; const b = pick(BOSSES); const w = pick(PLACES.filter(x => !isSettlement(x)));
      p.intel.push(`${b} – ${w.name}`);
      return { log: `týral v mučírně vězně (−1 karma → ${p.karma}) a zjistil: ${b} se skrývá u místa ${w.name}`, html: `⛓️ Vězeň pod „přesvědčováním“ promluvil: <b>${b}</b> se prý skrývá u místa <b>${w.name}</b>.<br><b>−1 karma</b> (teď ${p.karma}).` }; } },
  knihovna: { name: 'Knihovna', img: 'knihovna', text: 'Trénink Inteligence: 3Z → +1 Inteligence.',
    classLock: p => trainLock(p, 'int'),
    req: p => p.gold < 3 ? 'Potřebuješ 3 zlaťáky.' : null,
    apply: p => { p.gold -= 3; p.train.int++; markTrain(p, 'int'); return { log: 'studoval v knihovně (−3Z, +1 Inteligence)', html: '📖 Noc nad svitky. <b>+1 Inteligence</b> (trénink).' }; } },
  alchymista: { name: 'Alchymista', img: 'alchymista', text: 'Léčivý lektvar za 2Z: +4 životy a vyléčí Otravu i Nákazu. Pít jen v boji (max 1 za boj), nosit max 2.',
    req: p => p.gold < 2 ? 'Potřebuješ 2 zlaťáky.' : (p.potions >= POTION_MAX ? `Neseš už ${POTION_MAX} lektvary (víc se nevejde).` : null),
    apply: p => { p.gold -= 2; p.potions += 1; return { log: `koupil u alchymisty léčivý lektvar (−2Z, nese ${p.potions}/${POTION_MAX})`, html: `⚗️ Alchymista ti zazátkuje baňku: <b>léčivý lektvar</b> (${p.potions}/${POTION_MAX}).<br><small>${POTION_RULE}</small>` }; } },
  prace: { name: 'Práce', img: 'prace2', text: 'Vesnice +2Z, město +3Z.',
    apply: (p, l) => { const v = l.type === 'city' ? 3 : 2; p.gold += v; return { log: `si poctivě vydělal prací (+${v}Z)`, html: `⛏️ Poctivá dřina: <b>+${v} zlaťáky</b>.` }; } },
  mount: { name: 'Mount', img: 'mount', text: 'Koupit mounta za 10Z (až od levelu 3): kůň, dvouhlavý pštros, kanec nebo lední nosorožec. Každý tahem přidá 1 krok navíc (na 3. lokaci ale nelze využít akci lokace).', cityOnly: true, mountPick: true,
    classLock: p => isMole(p) ? 'Krtek nejezdí, krtek kope. (Chadimpetro si mounta pořídit nemůže.)' : null,
    reqText: p => isMole(p) ? [[false, 'Krtek nejezdí, krtek kope']] : isNatural(p) ? [[false, 'Je sám svým mountem']] : [[p.level >= 3, 'level 3 a výš'], [p.gp >= 2, '2 Grumpstone body'], [p.gold >= MOUNT_PRICE, '10 zlaťáků']],
    req: p => isMole(p) ? 'Krtek nejezdí, krtek kope.' : isNatural(p) ? 'Je sám svým mountem.' : hasMount(p) ? `Mounta už máš (${MOUNTS[mountOf(p)].n}).` : (p.level < 3 || p.gp < 2 || p.gold < MOUNT_PRICE) ? 'Mount až od levelu 3 (a 2 Grumpstone body, 10Z).' : null,
    apply: (p, l, o) => { const m = MOUNTS[o] ? o : 'horse'; p.gold -= MOUNT_PRICE; p.mount = m; p.horse = true;
      return { log: `koupil mounta: ${MOUNTS[m].n} (−${MOUNT_PRICE}Z)`, html: `<div class="mount-got"><img src="${MOUNTS[m].tok}" alt=""><div>Máš vlastního mounta: <b>${MOUNTS[m].n}</b>!<br><small>Každý tah můžeš ujít 2 lokace + 1 krok navíc (na 3. lokaci nelze využít akci lokace).</small></div></div>` }; } },
  zbrojmistr: { name: 'Zbrojmistr', icon: '⚔️', text: 'Trénink Boje a Obrany: 3Z → +1. Tankové trénují Obranu, assassini, lovec a Finn Boj, Chadimpetro Boj i Obranu. Jen +1 vlastnost za level (jeden placený trénink v levelu).', cityOnly: true,
    options: [{ id: 'boj', label: 'Boj' }, { id: 'obr', label: 'Obrana' }],
    classLock: p => (trainLock(p, 'boj') && trainLock(p, 'obr')) ? (isMain(p, 'obr') ? trainLock(p, 'obr') : trainLock(p, 'boj')) : null,
    optLock: (p, o) => trainLock(p, o),
    req: (p, l, o) => !o ? 'Vyber, co budeš trénovat.' : (trainLock(p, o) || (p.gold < 3 ? 'Potřebuješ 3 zlaťáky.' : null)),
    apply: (p, l, o) => { p.gold -= 3; p.train[o] = (p.train[o] || 0) + 1; markTrain(p, o); const n = STAT_NAME[o]; return { log: `trénoval u zbrojmistra (−3Z, +1 ${n})`, html: `🛡️ Pot a modřiny: <b>+1 ${n}</b> (trénink).` }; } },
  spolecensky: { name: 'Společenská událost', icon: '🎭', text: 'Ples, hostina, salón: 3Z → +1 Charisma.', cityOnly: true,
    classLock: p => trainLock(p, 'cha'),
    req: p => p.gold < 3 ? 'Potřebuješ 3 zlaťáky.' : null,
    apply: p => { p.gold -= 3; p.train.cha++; markTrain(p, 'cha'); return { log: 'zazářil na společenské události (−3Z, +1 Charisma)', html: '🥂 Tanec, víno a drby. <b>+1 Charisma</b> (trénink).' }; } },
  // --- nové (v5) ---
  lecitel: { name: 'Léčitel', icon: '🌿', text: 'Bylinky a obvazy za 1Z: +4 životy.',
    req: p => p.hp >= MAX_HP ? 'Máš plné životy.' : (p.gold < 1 ? 'Potřebuješ 1 zlaťák.' : null),
    apply: p => { p.gold -= 1; const b = p.hp; p.hp = Math.min(MAX_HP, p.hp + 4); return { log: `se nechal ošetřit u léčitele (−1Z, +${p.hp - b} životů)`, html: `🌿 Léčitel ti převázal rány. Životy ${b} → <b>${p.hp}</b>.` }; } },
  svatyne: { name: 'Svatyně', icon: '🗿', text: 'Obětuj 1Z: požehnání = +1 k příštímu hodu v NPC úkolu.',
    req: p => p.blessing ? 'Požehnání už máš.' : (p.gold < 1 ? 'Potřebuješ 1 zlaťák.' : null),
    apply: p => { p.gold -= 1; p.blessing = true; return { log: 'obětoval ve svatyni (−1Z, požehnání +1 k hodu)', html: '🗿 Kadidlo stoupá k nebi. <b>Požehnání:</b> příští hod kostkou v NPC úkolu máš <b>+1</b>.' }; } },
  herna: { name: 'Herna', icon: '🎲', text: 'Vsaď 2Z: padne-li 5 nebo 6, vyhraješ 5Z.', dice: true,
    classLock: p => isMole(p) ? 'Ke kostkám Chadimpetra nepustí – posledně je očichal a snědl, protože voněly jako hrášek.' : null,
    req: p => p.gold < 2 ? 'Potřebuješ 2 zlaťáky na sázku.' : null,
    dieLabel: p => isCheat(p) ? 'Sázka 2Z – potřebuješ 5 nebo 6 · 🃏 podvádíš: +1 k hodu' : 'Sázka 2Z – potřebuješ 5 nebo 6',
    resolve: (p, l, o, r) => { if (isCheat(p)) return cheatDice(p, r); p.gold -= 2; if (r >= 5) { p.gold += 5; return { log: `vyhrál v herně (hod ${r}, +3Z čistého)`, html: `🎲 Hod: <span class="dice">${r}</span> Výhra! <b>+5 zlaťáků</b> (sázka 2Z).` }; }
      return { log: `prohrál v herně (hod ${r}, −2Z)`, html: `🎲 Hod: <span class="dice">${r}</span> Kostky tě nemají rády. <b>−2 zlaťáky</b>.` }; } },
  vestkyne: { name: 'Věštkyně', icon: '🔮', text: 'Nahlédni na příští NPC kartu (1Z), nebo ji odlož pod balíček (2Z).',
    options: [{ id: 'look', label: 'Nahlédnout 1Z' }, { id: 'change', label: 'Změnit osud 2Z' }],
    req: (p, l, o) => !o ? 'Vyber: nahlédnout, nebo změnit osud.' : (p.gold < (o === 'look' ? 1 : 2) ? `Potřebuješ ${o === 'look' ? 1 : 2} zlaťáky.` : null),
    apply: (p, l, o) => { ensureDeck(); const top = NPC_BY_ID[S.npcDeck[S.npcDeck.length - 1]];
      if (o === 'look') { p.gold -= 1; return { log: 'nahlédl u věštkyně do osudu (−1Z)', html: `🔮 V křišťálové kouli se zjevuje: <b>${top.name}</b>${top.title ? ' – ' + top.title : ''}${top.is_boss ? ' <b style="color:#a21">(BOSS!)</b>' : ''}.` }; }
      p.gold -= 2; S.npcDeck.unshift(S.npcDeck.pop()); return { log: 'změnil u věštkyně osud (−2Z, vrchní NPC karta pod balíček)', html: `🔮 Věštkyně zamíchala osudem: <b>${top.name}</b> zmizel(a) až na dno balíčku.` }; } },
  cech: { name: 'Cech dobrodruhů', icon: '📜', text: 'Vezmi zakázku: doruč zásilku do jiného sídla (odměna při doručení 2Z a 2 zkušenosti).',
    req: p => (p.quests || []).length >= 3 ? 'Máš už 3 rozpracované úkoly.' : null,
    apply: (p, l) => { const q = makeQuest(p, ['city', 'village'], 'Doruč cechovní zásilku', 'Cech dobrodruhů', { g: 2, xp: 2, gp: 0 });
      return { log: `přijal cechovní zakázku: ${q.goal} → ${BY_ID[q.target].name}`, html: `📜 Cechmistr ti podává zapečetěný balík: <b>doruč ho do ${BY_ID[q.target].name}</b> (${q.dist} ${q.dist === 1 ? 'pochod' : q.dist < 5 ? 'pochody' : 'pochodů'}). Odměna při doručení: 3Z a 2 zkušenosti.` }; } },
  cerny_trh: { name: 'Černý trh', icon: '🗝️', text: 'Kradené oranžové (od levelu 3) a fialové (od levelu 6) předměty o 1Z levněji – ale −1 karma. Nabídka se mění každé kolo.', cityOnly: true,
    options: (p, l) => shopView(p, l.id + ':cerny_trh', SHOP_SLOTS.cerny_trh).map(id => itemOpt(id, BM_PRICE(ITEM_BY_ID[id]), p)),
    req: (p, l, o) => !o ? 'Vyber předmět.' : (p.gold < BM_PRICE(ITEM_BY_ID[o]) ? `Potřebuješ ${BM_PRICE(ITEM_BY_ID[o])} zlaťáků.` : null),
    apply: (p, l, o) => { const it = ITEM_BY_ID[o], c = BM_PRICE(it); p.gold -= c; p.karma -= 1; shopTake(l.id + ':cerny_trh', o); const r = giveItem(p, o);
      return { log: `koupil na černém trhu „${it.name}“ (−${c}Z, −1 karma)`, html: `🗝️ Pod pláštěm ti podají <b>${it.name}</b>${r === 'equipped' ? ' – hned ho máš na sobě' : r === 'full' ? ' – ' + FULL_TXT : ' – do brašny'}. Nikdo se neptá, odkud je. <b>−1 karma</b>.<div class="loot">${itemCardHTML(it, p)}</div>` }; } },
  explore: { name: 'Prozkoumat', text: 'Prohledej místo: hod d6 + Specializace. Nízký hod = nezdar, vysoký = nález (výjimečně předmět).', explore: true, dice: true,
    dieLabel: p => `Hledání: d6${stat(p, 'spec') ? ' + Specializace ' + stat(p, 'spec') : ''}${hasStatus(p, 'fear') ? ' − 1 strach' : ''}`,
    resolve: null }
};
// v16 Chadimpetro – uhlí: každé kolo (na konci jeho tahu, cestou podzemím) +1 🪨 pytel uhlí do vlastního počítadla (nezabírá brašnu). Prodat ho smí jen on, na Tržišti za 4Z/pytel.
const MOLE_HEROES = new Set(['chadimpetro']);
const isMole = p => !!p && MOLE_HEROES.has(p.hero);
const COAL_PRICE = 4;
function coalOpts(p) { const n = isMole(p) ? (p.coal || 0) : 0; if (!n) return [];
  const o = [{ id: 'coal:1', label: `Prodat 1 🪨 pytel uhlí +${COAL_PRICE}Z`, cls: 't-coal' }]; if (n > 1) o.push({ id: 'coal:all', label: `Prodat všechno uhlí (${n}× 🪨) +${n * COAL_PRICE}Z`, cls: 't-coal' }); return o; }
function sellCoal(p, o) { const n = o === 'coal:all' ? (p.coal || 0) : 1, v = n * COAL_PRICE; p.coal -= n; p.gold += v;
  return { log: `prodal na tržišti ${n}× pytel uhlí (+${v}Z)`, html: `🪨 Kupec si promne zčernalé ruce: <b>${n}× pytel uhlí</b> za <b>${v}</b> zlaťáků.${p.coal ? ` Zbývá ti ${p.coal} 🪨.` : ''}<br><i>„Já nejsem lakomej. Já jenom vím, co má skutečnou cenu.“</i>` }; }
function collectCoal(p) { if (!isMole(p) || p.coalRound === S.round) return; p.coalRound = S.round; p.coal = (p.coal || 0) + 1;
  addLog(`🪨 ${p.name} cestou podzemím nasbíral pytel uhlí (má ${p.coal}).`); }
// v17 Everett – Podvodník u kostek: v herně vždy +1 k hodu (podvádí). Výhra = 6Z (místo běžné výplaty 5Z, sázka 2Z platí), ale dostane přes hubu: −2 ❤️ (nikdy pod 1 – rána pěstí nezabíjí). Prohra jako obvykle.
const CHEAT_HEROES = new Set(['everett']);
const isCheat = p => !!p && CHEAT_HEROES.has(p.hero);
const CHEAT_WIN = 6, CHEAT_PUNCH = 2;
function cheatDice(p, r) { const t = Math.min(6, r) + 1; p.gold -= 2;
  if (t >= 5) { p.gold += CHEAT_WIN; const o = p.hp; p.hp = Math.max(1, p.hp - CHEAT_PUNCH);
    return { log: `vyhrál v herně podváděním (hod ${r}+1, +${CHEAT_WIN}Z) a dostal přes hubu (−${o - p.hp} ❤️)`, html: `🎲 Hod: <span class="dice">${r}</span> + 1 🃏 (kostka z rukávu) = <b>${t}</b> Výhra! <b>+${CHEAT_WIN} zlaťáků</b>.<br>👊 …a pak si toho ostatní hráči všimli. <b>Dostal jsi přes hubu: −${o - p.hp} ❤️</b> (životy ${o} → ${p.hp}).<br><i>„Tohle je útok na šlechtu! Matka se o tom dozví!“</i>` }; }
  return { log: `prohrál v herně i s podváděním (hod ${r}+1, −2Z)`, html: `🎲 Hod: <span class="dice">${r}</span> + 1 🃏 = <b>${t}</b> Ani kostka z rukávu nepomohla. <b>−2 zlaťáky</b>.<br><i>„To je spiknutí. Ty kostky mě nenávidí.“</i>` }; }
const VILLAGE_POOL = ['krcma', 'prace', 'trziste', 'zpoved', 'alchymista', 'kovarna', 'lecitel', 'svatyne', 'herna', 'cech'];
const CITY_SPECIAL = ['mount', 'zbrojmistr', 'spolecensky', 'arena', 'knihovna', 'mucirna', 'cech', 'cerny_trh', 'vestkyne'];
const CITY_ALL = Object.keys(ABILITIES).filter(k => k !== 'explore');
const CITY_FIXED = { telgarion: ['mount'], lunohvezd: ['knihovna'], rudohrad: ['kovarna'], stribrny_hradec: ['trziste'],
  vetrny_dvur: ['spolecensky'], kamenity_prusmyk: ['zbrojmistr'], zelezny_brod: ['kovarna'], cernovod: ['mucirna'] };
const N_CITY = [5, 6], N_VILLAGE = [4, 5]; // v5: města +2, vesnice +1

function rollAbilities() {
  const res = {};
  PLACES.forEach(p => {
    if (!isSettlement(p)) return;
    const [lo, hi] = p.type === 'city' ? N_CITY : N_VILLAGE, n = lo + rnd(hi - lo + 1);
    let list;
    if (p.type === 'city') {
      list = (CITY_FIXED[p.id] || []).slice();
      const want = 3 + rnd(2); // 3–4 městské "speciality"
      shuffle(CITY_SPECIAL).forEach(a => { if (list.length < want && !list.includes(a)) list.push(a); });
      shuffle(CITY_ALL).forEach(a => { if (list.length < n && !list.includes(a)) list.push(a); });
    } else {
      list = shuffle(VILLAGE_POOL).slice(0, n);
    }
    res[p.id] = list.slice(0, n);
  });
  return res;
}

// ---------- KOSTKA (znovupoužitelná komponenta) ----------
// Obsidiánová „krystalová“ kostka (izometrická kostka s osekanými rohy), zlaté runové oko. Hod spouští hráč klepnutím.
const DIE_PIPS = { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]],
  5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.27, .2], [.27, .5], [.27, .8], [.73, .2], [.73, .5], [.73, .8]] };
const DIE_RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᛉ', 'ᛟ'];
let dieUid = 0;
function dieSVG(v, side1, side2) {
  const u = ++dieUid;
  const pips = DIE_PIPS[v].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${v === 1 ? .13 : .085}"/>`).join('');
  return `<svg viewBox="0 0 100 104" aria-hidden="true"><defs>
  <linearGradient id="dt${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4458"/><stop offset=".45" stop-color="#17141f"/><stop offset="1" stop-color="#05040a"/></linearGradient>
  <linearGradient id="dl${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d1a26"/><stop offset="1" stop-color="#040306"/></linearGradient>
  <linearGradient id="dr${u}" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2537"/><stop offset="1" stop-color="#08070c"/></linearGradient>
  <radialGradient id="dp${u}"><stop offset="0" stop-color="#fff6c2"/><stop offset=".55" stop-color="#ffcf4a"/><stop offset="1" stop-color="#b9781a"/></radialGradient>
  <filter id="dg${u}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <polygon points="44,4 56,4 88,22 94,32 94,72 88,82 56,100 44,100 12,82 6,72 6,32 12,22" fill="#000" stroke="#c9a24a" stroke-width="1.6"/>
  <polygon points="50,7 87,28 50,49 13,28" fill="url(#dt${u})"/>
  <polygon points="10,32 48,53 48,96 10,74" fill="url(#dl${u})"/>
  <polygon points="52,53 90,32 90,74 52,96" fill="url(#dr${u})"/>
  <path d="M50,7 L87,28 L50,49 L13,28Z M10,32 L48,53 L48,96 M52,96 L52,53 L90,32" fill="none" stroke="#d9b25a" stroke-width=".9" opacity=".75"/>
  <path d="M22,26 L50,10 M78,26 L60,15 M16,40 L16,66 M84,40 L84,66" stroke="#ffffff" stroke-width=".6" opacity=".18"/>
  <g transform="matrix(37,21,-37,21,50,7)" fill="url(#dp${u})" filter="url(#dg${u})">${pips}</g>
  <g transform="matrix(38,21,0,43,10,32)"><text x=".5" y=".66" font-size=".55" text-anchor="middle" fill="#d9b25a" opacity=".55" font-family="serif">${side1}</text></g>
  <g transform="matrix(38,-21,0,43,52,53)"><text x=".5" y=".66" font-size=".55" text-anchor="middle" fill="#d9b25a" opacity=".55" font-family="serif">${side2}</text></g>
  </svg>`;
}
let FORCE_ROLLS = []; // testovací háček: GS.force([…])
const nextRoll = () => FORCE_ROLLS.length ? FORCE_ROLLS.shift() : 1 + rnd(6);
// opts: { label, id, onRoll(v), size }
function makeDie(opts) {
  const w = el('div', 'gdie-wrap'); if (opts.wrapId) w.id = opts.wrapId;
  const b = el('button', 'gdie', dieSVG(6, 'ᚱ', 'ᛟ')); b.type = 'button'; if (opts.id) b.id = opts.id;
  b.setAttribute('aria-label', 'Hodit kostkou'); b.title = 'Klepni a hoď kostkou';
  const cap = el('div', 'gdie-cap', opts.label || 'Klepni na kostku a hoď!');
  w.appendChild(b); w.appendChild(cap);
  b.onclick = () => {
    if (b.disabled) return; b.disabled = true;
    if (NET.role === 'guest') { // online host: hodí hostitel, výsledek přijde se stavem hry
      opts.onRoll(0); w.classList.add('rolling'); cap.textContent = 'Kostka se kutálí… (hází hostitel)'; let k = 0;
      const tt = setInterval(() => { if (!b.isConnected || ++k > 40) { clearInterval(tt); return; } b.innerHTML = dieSVG(1 + rnd(6), pick(DIE_RUNES), pick(DIE_RUNES)); }, 90); return; }
    const v = nextRoll(); w.classList.add('rolling'); cap.textContent = 'Kostka se kutálí…';
    let n = 0;
    const t = setInterval(() => {
      b.innerHTML = dieSVG(1 + rnd(6), pick(DIE_RUNES), pick(DIE_RUNES));
      if (++n >= 11) {
        clearInterval(t); b.innerHTML = dieSVG(v, pick(DIE_RUNES), pick(DIE_RUNES));
        w.classList.remove('rolling'); w.classList.add('landed'); cap.innerHTML = `Padlo <b>${v}</b>`;
        setTimeout(() => opts.onRoll(v), 280);
      }
    }, 90);
  };
  return w;
}

// ---------- PŘEDMĚTY ----------
const ITEMS = window.GS_ITEMS || [];
const ITEM_BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
// v11 ceny a viditelnost v obchodech: žluté 3Z vždy, oranžové 10Z od levelu 3, fialové 20Z od levelu 6.
const PRICE = { basic: 3, mid: 10, epic: 20 }, TIER_LV = { basic: 1, mid: 3, epic: 6 };
ITEMS.forEach(i => { i.price = PRICE[i.tier] || i.price; });
const tierVisible = (p, t) => (p.level || 1) >= TIER_LV[t];
const TIER = { basic: { n: 'Základní', c: 'yellow', bonus: '+1 hlavní vlastnost' }, mid: { n: 'Střední', c: 'orange', bonus: '+1 hlavní vlastnost, +1 Specializace' }, epic: { n: 'Epický', c: 'purple', bonus: '+2 hlavní vlastnost' } };
// v8: 4 volná místa výbavy (nasazeno) + 4 místa v brašně. Typ předmětu smí být nasazen jen jednou; ruce řeší pravidla zbraní.
const SLOT_NAME = { head: 'Hlava', body: 'Tělo', hands: 'Ruce', feet: 'Nohy', jewel: 'Šperk', trinket: 'Talisman', main: 'Zbraň / hlavní ruka', off: 'Druhá ruka' };
const SLOT_IC = { head: '🪖', body: '🥋', hands: '🧤', feet: '🥾', jewel: '💍', trinket: '💀', main: '🗡️', off: '🛡️' };
const ROLE_PL = { tank: 'Tankové', assassin: 'Assassini', hunter: 'Lovec', diplomat: 'Diplomaté', mage: 'Kouzelníci', vampire: 'Olgrich', fighter: 'Chadimpetro', hybrid: 'Finn & Bruine' };
const ITEM_CAP = 2; // předměty dávají dohromady nejvýš +2 k hlavní vlastnosti
const EQUIP_MAX = 4, BAG_MAX = 4;
const PAWN = { basic: 3, mid: 5, epic: 10 }; // výkupní cena (zastavárna)
const TRADE_MULT = 2; // mezi hráči nejvýš 2× cena z karty
// Typ = co nejde nosit dvakrát (dvoje boty, dva pásy, dva prsteny…)
const TYPE_BY_KIND = { 'pás': 'belt', 'plášť': 'cloak', 'nárameníky': 'shoulders', 'rukavice': 'gloves', 'náramky': 'bracers', 'náramek': 'bracers', 'prsten': 'ring', 'amulet': 'neck', 'náhrdelník': 'neck', 'náušnice': 'earring', 'štít': 'shield', 'kniha': 'book', 'fetiš': 'fetish' };
const TYPE_NAME = { head: 'pokrývka hlavy', chest: 'zbroj / šaty', belt: 'pás', cloak: 'plášť', shoulders: 'nárameníky', gloves: 'rukavice', bracers: 'náramky', feet: 'boty', ring: 'prsten', neck: 'amulet / náhrdelník', earring: 'náušnice', talisman: 'talisman', shield: 'štít', book: 'kniha', fetish: 'fetiš', weapon: 'zbraň' };
function itemType(it) { if (it.slot === 'main') return 'weapon'; if (TYPE_BY_KIND[it.kind]) return TYPE_BY_KIND[it.kind]; return it.slot === 'body' ? 'chest' : it.slot === 'trinket' ? 'talisman' : it.slot; }
const handsOf = it => it.slot === 'main' ? (it.hands === 2 ? 2 : 1) : it.slot === 'off' ? 1 : 0;
// v13 Olgrich: předmět dá bonus k Inteligenci (magický) nebo Charismě (diplomatický)
function vampKey(p, it) { if (it && (it.stat === 'cha' || it.stat === 'int')) return it.stat; if (it && it.classes.includes('diplomat') && !it.classes.includes('mage')) return 'cha'; if (it && it.classes.includes('mage')) return 'int'; return baseStat(p, 'int') > baseStat(p, 'cha') ? 'int' : 'cha'; }
// v16 Chadimpetro (bojovník): tankový předmět → Obrana, assassinský/lovecký → Boj, smíšený → jeho útočná vlastnost
function fighterKey(p, it) { if (it && (it.stat === 'boj' || it.stat === 'obr')) return it.stat; const c = it ? it.classes : []; const t = c.includes('tank'), a = c.includes('assassin') || c.includes('hunter');
  return t && !a ? 'obr' : a && !t ? 'boj' : combatKey(p); }
function mainKeyFor(p, it) { const r = roleOf(p); if (r === 'fighter') return fighterKey(p, it); return r === 'tank' ? 'obr' : (r === 'assassin' || r === 'hunter') ? 'boj' : r === 'diplomat' ? 'cha' : r === 'mage' ? 'int' : r === 'vampire' ? vampKey(p, it) : (it && it.stat === 'cha' ? 'cha' : it && it.stat === 'int' ? 'int' : combatKey(p)); }
function equipped(p) { return (Array.isArray(p.equip) ? p.equip : []).map(id => ITEM_BY_ID[id]).filter(Boolean); }
function itemBonus(p) {
  const r = { boj: 0, obr: 0, int: 0, cha: 0, spec: 0, raw: 0, capped: false }; let left = ITEM_CAP;
  equipped(p).forEach(it => { const v = it.tier === 'epic' ? 2 : 1, k = mainKeyFor(p, it), g = Math.min(v, left); r.raw += v; r[k] += g; left -= g; if (it.tier === 'mid') r.spec++; });
  r.capped = r.raw > ITEM_CAP; return r;
}
function canWear(p, it) {
  const r = roleOf(p); if (it.classes.includes(r)) return null;
  if (r === 'fighter' && ['tank', 'assassin', 'hunter'].some(c => it.classes.includes(c))) return null; // v16 Chadimpetro nosí bojové předměty (tank, assassin, lovec) vč. štítů
  if ((r === 'hybrid' || r === 'vampire') && (it.classes.includes('diplomat') || it.classes.includes('mage'))) return null; // v13: Olgrich nosí magické i diplomatické // v11: Finn nosí i diplomatické a magické předměty
  if (r === 'tank' && it.ranged) return 'Tankové nesmí používat luky ani kuše.';
  return `Tento předmět mohou nosit jen: ${it.classes.map(c => ROLE_PL[c]).join(', ')}.`;
}
// Platí sada nasazených předmětů? Vrací důvod, nebo null.
function loadoutProblem(ids) {
  const its = ids.map(i => ITEM_BY_ID[i]);
  if (its.length > EQUIP_MAX) return `Nasadit lze nejvýš ${EQUIP_MAX} předměty.`;
  const seen = {};
  for (const it of its) { const t = itemType(it); if (t === 'weapon') continue; if (seen[t]) return `Nemůžeš mít nasazené dva předměty stejného typu (${TYPE_NAME[t] || t}): ${seen[t].name} a ${it.name}.`; seen[t] = it; }
  const two = its.filter(it => it.slot === 'main' && it.hands === 2), sh = its.find(it => it.shield);
  if (two.length > 1) return 'Dvě obouruční zbraně najednou držet nejde.';
  if (two.length && sh) return 'Se štítem lze držet jen jednoruční zbraň.';
  if (its.reduce((a, it) => a + handsOf(it), 0) > 2) return two.length ? `${two[0].name} je obouruční – zabírá obě ruce.` : 'Máš jen dvě ruce (zbraň + štít/kniha, nebo dvě jednoruční zbraně).';
  return null;
}
function equipConflict(p, it, without) { return loadoutProblem([...p.equip.filter(x => x !== it.id && x !== without), it.id]); }
function ownerOf(id) { for (const p of S.players) { if (p.bag.includes(id)) return { p, where: 'bag' }; if (p.equip.includes(id)) return { p, where: 'equip' }; } return null; }
const ownedBy = p => [...p.equip, ...p.bag];
function freeItems(tiers) {
  const taken = new Set(); S.players.forEach(p => ownedBy(p).forEach(i => taken.add(i)));
  Object.entries(S.shops || {}).forEach(([k, l]) => { if (!S.shopRound || S.shopRound[k] == null || S.shopRound[k] === S.round) (l || []).forEach(i => taken.add(i)); }); // staré nabídky (minulé kolo) už neblokují
  return ITEMS.filter(i => !taken.has(i.id) && (!tiers || tiers.includes(i.tier)));
}
function removeItem(p, id) { p.bag = p.bag.filter(x => x !== id); p.equip = p.equip.filter(x => x !== id); }
// Z brašny na tělo; swap = který nasazený předmět jde výměnou do brašny.
function equipItem(p, id, swap) {
  const it = ITEM_BY_ID[id]; if (!p.bag.includes(id)) return 'Předmět není v tvé brašně.';
  const why = canWear(p, it) || equipConflict(p, it, swap); if (why) return why;
  p.bag = p.bag.filter(x => x !== id);
  if (swap) { p.equip = p.equip.filter(x => x !== swap); p.bag.push(swap); }
  p.equip.push(id); return null;
}
// Které nasazené předměty by šlo vyměnit, aby se tenhle dal nasadit
const swapOptions = (p, it) => canWear(p, it) ? [] : p.equip.filter(x => !equipConflict(p, it, x));
function unequipItem(p, id) {
  if (!p.equip.includes(id)) return 'Předmět nemáš nasazený.';
  if (p.bag.length >= BAG_MAX) return `Brašna je plná (${BAG_MAX}/${BAG_MAX}) – nejdřív něco prodej nebo zahoď, nebo použij výměnu.`;
  p.equip = p.equip.filter(x => x !== id); p.bag.push(id); return null;
}
const hasRoom = (p, id) => p.bag.length < BAG_MAX || (p.equip.length < EQUIP_MAX && !canWear(p, ITEM_BY_ID[id]) && !equipConflict(p, ITEM_BY_ID[id]));
// Nový předmět: když ho hrdina může nosit a je volné místo, rovnou si ho nasadí; jinak do brašny; když je všechno plné → volba (prodat/zahodit/vyměnit).
function giveItem(p, id) {
  const it = ITEM_BY_ID[id];
  if (!canWear(p, it) && p.equip.length < EQUIP_MAX && !equipConflict(p, it)) { p.equip.push(id); return 'equipped'; }
  if (p.bag.length < BAG_MAX) { p.bag.push(id); return canWear(p, it) ? 'bag-incompatible' : 'bag'; }
  S.overflow = { pi: S.players.indexOf(p), id }; setTimeout(() => renderOverflow(), 0); return 'full';
}
const FULL_TXT = 'všechno je plné (4 nasazené + 4 v brašně) – vyber, co s ním';
function overflowDone(msg) { S.overflow = null; addLog(msg); $('item-modal').classList.add('hidden'); renderAll(); save(); }
function overflowSell() { const o = S.overflow; if (!o) return; const p = S.players[o.pi], it = ITEM_BY_ID[o.id]; p.gold += PAWN[it.tier]; overflowDone(`${p.name} prodal „${it.name}“ za ${PAWN[it.tier]}Z (neměl místo).`); }
function renderOverflow() {
  const o = S.overflow; if (!o) return; const p = S.players[o.pi], it = ITEM_BY_ID[o.id];
  const box = $('item-body'); box.innerHTML = `<div class="ovf-h">🎒 Plná výbava i brašna!</div><p class="ovf-t"><b>${p.name}</b> získal <b>${it.name}</b>, ale nemá kam ho dát. Prodej ho, zahoď ho, nebo jím nahraď jiný předmět (ten se zahodí).</p>${itemCardHTML(it, p)}`;
  const act = el('div', 'item-actions');
  const done = msg => overflowDone(msg);
  const sb = el('button', 'btn btn-gold', `💰 Prodat za ${PAWN[it.tier]} 🪙`); sb.id = 'ovf-sell'; sb.onclick = () => overflowSell(); act.appendChild(sb);
  const db = el('button', 'btn btn-dark', '🗑️ Zahodit'); db.id = 'ovf-drop'; db.onclick = () => itemAct('ovfDrop', it.id); act.appendChild(db);
  act.appendChild(el('div', 'item-owner', 'Nahradit (starý předmět se zahodí):'));
  const row = el('div', 'ovf-repl');
  ownedBy(p).forEach(x => { const X = ITEM_BY_ID[x], inEq = p.equip.includes(x);
    const ok = inEq ? !canWear(p, it) && !equipConflict(p, it, x) : true;
    const b = el('button', `ichip t-${X.tier}`, `${inEq ? '🧍' : '🎒'} ${X.name}`); b.dataset.repl = x; b.disabled = !ok; if (!ok) b.title = canWear(p, it) || equipConflict(p, it, x);
    b.onclick = () => { const r = itemAct('ovfReplace', it.id, x); if (r) toast(r); };
    row.appendChild(b); });
  act.appendChild(row); box.appendChild(act); $('item-modal').classList.remove('hidden');
}
// Kde se dá prodat za výkupní cenu (bez spotřeby akce): v sídle s tržištěm, kovárnou nebo černým trhem
const SELL_AT = ['trziste', 'kovarna', 'cerny_trh'];
const canSellHere = p => isSettlement(BY_ID[p.loc]) && (S.abilities[p.loc] || []).some(a => SELL_AT.includes(a));
function sellItem(p, id) { const it = ITEM_BY_ID[id]; removeItem(p, id); p.gold += PAWN[it.tier]; addLog(`💰 ${p.name} prodal „${it.name}“ za ${PAWN[it.tier]}Z (${BY_ID[p.loc].name}).`); return PAWN[it.tier]; }
function itemChip(id, extra) {
  const it = ITEM_BY_ID[id]; return `<button class="ichip t-${it.tier}" data-item="${id}" title="${it.name} – ${TIER[it.tier].n}">${extra || ''}${it.name}</button>`;
}
function itemCardHTML(it, p) {
  const t = TIER[it.tier], wear = p ? canWear(p, it) : null;
  return `<div class="icard t-${it.tier}">
    <div class="icard-band"><span class="icard-name">${it.name}${it.name_placeholder ? ' <small title="Na kartě chybí jméno – zástupné jméno">*</small>' : ''}${it.added === 'v7' ? ' <small class="inew">NOVÉ</small>' : ''}</span><span class="icard-badge">${t.n}</span></div>
    <img class="${it.full_card ? 'full' : ''}" src="${it.image}" alt="${it.name}">${it.image_placeholder ? '<div class="icard-ph">Obrázek karty se doplní</div>' : ''}
    <div class="icard-body">
      <div class="icard-bonus">${t.bonus}</div>
      <div class="icard-row">${SLOT_IC[it.slot]} ${SLOT_NAME[it.slot]}${it.slot === 'main' || it.slot === 'off' ? (it.hands === 2 ? ' · obouruční' : ' · jednoruční') : ''} · ${it.kind}</div>
      <div class="icard-row">Mohou nosit: <b>${it.classes.map(c => ROLE_PL[c]).join(', ')}</b></div>
      ${p ? `<div class="icard-row icard-compat ${wear ? 'no' : 'yes'}">${wear ? '✖ Nekompatibilní – ' + wear : `✔ Kompatibilní s tvým hrdinou (${heroById(p.hero).name.split(' ')[0]}, bonus do: ${STAT_NAME[mainKeyFor(p, it)]})`}</div>` : ''}
      <div class="icard-flav">${it.origin || ''}${it.flavor ? `<br><i>${it.flavor}</i>` : ''}</div>
      <div class="icard-price">Cena: <b>${it.price} 🪙</b></div>
    </div></div>`;
}
// v20: akce s předměty jako funkce (UI, AI i online host je volají stejně)
function itemAct(kind, id, x) {
  const me = cur(), it = ITEM_BY_ID[id]; if (!it) return 'Neznámý předmět.';
  if (kind === 'ovfDrop' || kind === 'ovfReplace') {
    const o = S.overflow; if (!o || o.id !== id) return 'Není co řešit.'; const p = S.players[o.pi];
    if (kind === 'ovfDrop') { overflowDone(`${p.name} zahodil „${it.name}“ (neměl místo).`); return null; }
    const X = ITEM_BY_ID[x]; if (!X || !ownedBy(p).includes(x)) return 'Neplatná výměna.'; const inEq = p.equip.includes(x);
    if (inEq && (canWear(p, it) || equipConflict(p, it, x))) return canWear(p, it) || equipConflict(p, it, x);
    if (inEq) p.equip[p.equip.indexOf(x)] = it.id; else p.bag[p.bag.indexOf(x)] = it.id;
    overflowDone(`${p.name} zahodil „${X.name}“ a vzal si „${it.name}“.`); return null;
  }
  if (S.npc || S.pending || S.combat) return 'Teď ne – dokonči rozehranou akci.';
  if (!ownedBy(me).includes(id)) return 'Předmět nemáš.';
  let r = null;
  if (kind === 'equip' || kind === 'swap') { r = equipItem(me, id, kind === 'swap' ? x : undefined); if (!r) addLog(kind === 'swap' ? `${me.name} vyměnil „${ITEM_BY_ID[x].name}“ za „${it.name}“.` : `${me.name} si nasadil „${it.name}“.`); }
  else if (kind === 'unequip') r = unequipItem(me, id);
  else if (kind === 'sell') { if (!canSellHere(me)) return 'Tady se prodávat nedá.'; sellItem(me, id); }
  else if (kind === 'drop') { removeItem(me, id); addLog(`${me.name} zahodil „${it.name}“.`); }
  renderAll(); save(); return r;
}
function combatDrink() { const C = S.combat; if (!C || !C.F || C.F.done) return; GSCombat.drink(C.F); save(); renderCombat(); }
function setNpcOn(v) { S.npcOn = !!v; $('menu-npc').textContent = 'NPC karty: ' + (S.npcOn === false ? 'vypnuto' : 'zapnuto'); save(); }
function openItem(id, shop) {
  if (S.overflow) return renderOverflow();
  const it = ITEM_BY_ID[id], o = ownerOf(id), me = cur();
  const box = $('item-body'); box.innerHTML = itemCardHTML(it, o ? o.p : me);
  const act = el('div', 'item-actions');
  if (shop && !o) act.appendChild(el('div', 'item-owner item-shop', `🛒 V nabídce za <b>${shop.price} 🪙</b> – vybráno; nákup potvrdíš tlačítkem v kartě obchodu.`));
  if (o) act.appendChild(el('div', 'item-owner', `Vlastní: <b>${o.p.name}</b> – ${o.where === 'bag' ? `🎒 v brašně (${o.p.bag.length}/${BAG_MAX})` : `🧍 nasazeno (${o.p.equip.length}/${EQUIP_MAX})`}`));
  const busy = S.npc || S.pending || S.combat;
  const re = () => { renderAll(); save(); if (!NET.role || NET.role === 'host') openItem(id); else $('item-modal').classList.add('hidden'); };
  if (o && o.p === me && !busy) {
    if (o.where === 'bag') { const why = canWear(me, it) || equipConflict(me, it);
      const b = el('button', 'btn btn-gold', '⬆ Nasadit'); b.id = 'item-equip'; b.disabled = !!why;
      b.onclick = () => { const r = itemAct('equip', id); if (r) toast(r); re(); }; act.appendChild(b);
      if (why) { act.appendChild(el('div', 'item-why', '🚫 ' + why));
        const sw = swapOptions(me, it); if (sw.length) { act.appendChild(el('div', 'item-owner', 'Vyměnit za nasazený (ten půjde do brašny):'));
          const row = el('div', 'ovf-repl'); sw.forEach(x => { const X = ITEM_BY_ID[x]; const c = el('button', `ichip t-${X.tier}`, `⇄ ${X.name}`); c.dataset.swap = x;
            c.onclick = () => { const r = itemAct('swap', id, x); if (r) toast(r); re(); }; row.appendChild(c); }); act.appendChild(row); } } }
    else { const b = el('button', 'btn btn-dark', '⬇ Sundat do brašny'); b.id = 'item-unequip'; b.disabled = me.bag.length >= BAG_MAX; if (b.disabled) b.title = 'Brašna je plná.';
      b.onclick = () => { const r = itemAct('unequip', id); if (r) toast(r); re(); }; act.appendChild(b); }
    const sell = el('button', 'btn btn-gold', `💰 Prodat za ${PAWN[it.tier]} 🪙`); sell.id = 'item-sell'; sell.disabled = !canSellHere(me);
    sell.title = canSellHere(me) ? 'Výkupní cena: žlutá 3Z, oranžová 5Z, fialová 10Z.' : 'Prodat lze ve městě/vesnici s tržištěm, kovárnou nebo černým trhem.';
    sell.onclick = () => { itemAct('sell', id); $('item-modal').classList.add('hidden'); toast(`Prodáno za ${PAWN[it.tier]} 🪙`); }; act.appendChild(sell);
    const drop = el('button', 'btn btn-dark', '🗑️ Zahodit'); drop.id = 'item-drop';
    drop.onclick = () => { itemAct('drop', id); $('item-modal').classList.add('hidden'); }; act.appendChild(drop);
  } else if (o && o.p !== me) act.appendChild(el('div', 'item-why', 'Chceš ho? Domluv se – 🤝 Obchod (nabídku dělá kupující, potvrzuje majitel; nejvýš 2× cena z karty).'));
  const c = el('button', 'btn btn-dark', 'Zavřít'); c.onclick = () => $('item-modal').classList.add('hidden'); act.appendChild(c);
  box.appendChild(act); $('item-modal').classList.remove('hidden');
}
function inventoryHTML(p, mine) {
  const ib = itemBonus(p), slot = (id, kind) => {
    if (!id) return `<div class="islot empty ${kind}">volné</div>`;
    const it = ITEM_BY_ID[id], bad = kind === 'bag' && canWear(p, it);
    const btn = !mine ? '' : kind === 'eq' ? `<button class="islot-btn" data-unequip="${id}" title="Sundat do brašny"${p.bag.length >= BAG_MAX ? ' disabled' : ''}>⬇</button>`
      : `<button class="islot-btn" data-equip="${id}" title="${bad ? 'Nemůžeš nosit' : 'Nasadit / vyměnit'}"${bad ? ' disabled' : ''}>⬆</button>`;
    return `<div class="islot ${kind}">${itemChip(id, (bad ? '🚫 ' : '') + SLOT_IC[it.slot] + ' ')}${btn}</div>`; };
  const row = (arr, n, kind) => Array.from({ length: Math.max(n, arr.length) }, (_, i) => slot(arr[i], kind)).join('');
  return `<div class="inv-box"><div class="inv-h">🧍 Nasazeno ${p.equip.length}/${EQUIP_MAX} <small>bonus: +${Math.min(ib.raw, ITEM_CAP)}/${ITEM_CAP}${ib.capped ? ' (strop)' : ''}${ib.spec ? ` · Specializace +${ib.spec}` : ''}</small></div>
    <div class="inv-grid inv-eq">${row(p.equip, EQUIP_MAX, 'eq')}</div>
    <div class="inv-h">🎒 Brašna ${p.bag.length}/${BAG_MAX} <small>(nenasazené nic nedávají)</small></div>
    <div class="inv-grid inv-bag">${row(p.bag, BAG_MAX, 'bag')}</div></div>`;
}
// Obchody (v11): nabídka se obmění na začátku každého kola; v jedné nabídce nikdy dva předměty stejného typu.
// slots = úroveň pro každé místo v nabídce. Hrdina vidí jen úrovně, na které má level (TIER_LV).
const SHOP_SLOTS = { kovarna: ['basic', 'basic', 'mid', 'epic'], trziste: ['basic', 'mid', 'epic'], cerny_trh: ['mid', 'mid', 'epic'] };
function shopStock(key, slots) {
  S.shops = S.shops || {}; S.shopRound = S.shopRound || {};
  if (S.shopRound[key] == null && Array.isArray(S.shops[key])) S.shopRound[key] = S.round; // starší uložená hra: nabídka platí do konce kola
  if (S.shopRound[key] !== S.round || !Array.isArray(S.shops[key])) {
    S.shops[key] = []; S.shopRound[key] = S.round; const l = [];
    slots.forEach(t => { const used = new Set(l.map(id => itemType(ITEM_BY_ID[id])));
      const f = freeItems([t]).filter(i => !l.includes(i.id) && !used.has(itemType(i))); if (f.length) l.push(pick(f).id); });
    S.shops[key] = l;
  }
  return S.shops[key] = S.shops[key].filter(id => !ownerOf(id));
}
const shopView = (p, key, slots) => shopStock(key, slots).filter(id => tierVisible(p, ITEM_BY_ID[id].tier));
const shopTake = (key, id) => { S.shops[key] = (S.shops[key] || []).filter(x => x !== id); };
const LOCK_NOTE = p => (p.level || 1) >= 6 ? '' : ` <small>🔒 ${(p.level || 1) < 3 ? 'Oranžové (10Z) uvidíš od levelu 3, fialové (20Z) od levelu 6.' : 'Fialové (20Z) uvidíš od levelu 6.'}</small>`;
const itemOpt = (id, price, p, pre) => { const it = ITEM_BY_ID[id], w = canWear(p, it); return { id: (pre || '') + id, item: id, price, label: `${w ? '🎒' : '✔'} ${it.name} · ${price}Z`, cls: 't-' + it.tier, title: `${TIER[it.tier].n} – ${w ? 'nekompatibilní' : 'kompatibilní s tvým hrdinou'} (klikni pro kartu)` }; };
const BM_PRICE = it => Math.max(2, it.price - 1);
function lootItem(p) {
  const L = p.level, r = Math.random() * 100;
  const tier = L <= 3 ? (r < 85 ? 'basic' : 'mid') : L <= 5 ? (r < 45 ? 'basic' : r < 95 ? 'mid' : 'epic') : (r < 25 ? 'basic' : r < 70 ? 'mid' : 'epic');
  let f = freeItems([tier]); if (!f.length) f = freeItems(); if (!f.length) return null;
  return pick(f).id;
}

// ---------- STAVY (prokletí, otrava…) ----------
const STATUS = {
  curse: { ic: '👁️', n: 'Prokletí', t: 'Příští kolo jen 1 pochod.' },
  poison: { ic: '🤢', n: 'Otrava', t: 'Na začátku příštího tahu −1 život (nejméně na 1).' },
  disease: { ic: '🩹', n: 'Nákaza', t: 'Na začátku příštích tahů −1 život (nejméně na 1).' },
  fear: { ic: '😱', n: 'Strach', t: '−1 k příštímu hodu kostkou (hledání, NPC, aréna).' }
};
function addStatus(p, id, turns) { p.status = p.status || []; const s = p.status.find(x => x.id === id); if (s) s.turns = Math.max(s.turns, turns || 1); else p.status.push({ id, turns: turns || 1 }); }
const hasStatus = (p, id) => (p.status || []).some(x => x.id === id);
function useFear(p) { if (!hasStatus(p, 'fear')) return 0; p.status = p.status.filter(x => x.id !== 'fear'); return 1; }
function statusHTML(p) {
  const l = (p.status || []).map(s => `<span class="st" title="${STATUS[s.id].t}">${STATUS[s.id].ic} ${STATUS[s.id].n}${s.turns > 1 ? ` (${s.turns}×)` : ''}: <small>${STATUS[s.id].t}</small></span>`);
  if (p.blessing) l.push('<span class="st good">🗿 Požehnání: <small>+1 k příštímu hodu v NPC úkolu</small></span>');
  return l.length ? `<div class="status">${l.join('')}</div>` : '';
}
function startTurnStatus(p) {
  const out = [];
  (p.status || []).forEach(s => {
    if (s.id === 'curse') { S.noMount = true; S.steps = Math.max(S.steps, MAXST() - 1); s.turns--; out.push('👁️ Prokletí jednooké čarodějnice: toto kolo jen 1 pochod.'); }
    if (s.id === 'poison' || s.id === 'disease') { const b = p.hp; p.hp = Math.max(1, p.hp - 1); s.turns--; out.push(`${STATUS[s.id].ic} ${STATUS[s.id].n}: životy ${b} → ${p.hp}.`); }
  });
  p.status = (p.status || []).filter(s => s.id === 'fear' || s.turns > 0);
  out.forEach(t => addLog(`${p.name} – ${t}`));
  if (out.length) setTimeout(() => toast(out.join(' ')), 900);
}

// ---------- HLEDÁNÍ (Prozkoumat) ----------
// Hod d6 + Specializace (− strach): 1 nebo méně = nezdar, 2–3 = setkání, 4 = drobnost, 5 = nález, 6+ = velký nález (výjimečně předmět podle levelu).
const BANDS = t => t <= 1 ? 'bad' : t <= 3 ? 'enc' : t === 4 ? 'meh' : t === 5 ? 'good' : 'great';
const BAND_NAME = { bad: 'Nezdar', enc: 'Setkání', meh: 'Drobnost', good: 'Nález', great: 'Velký nález' };
const SEARCH = [
  { id: 'witch', ic: '👁️', n: 'Jednooká čarodějnice', bands: ['bad'], w: 3, th: ['forest', 'other', 'ruin'],
    run: p => { addStatus(p, 'curse', 1); return ['proklela ho jednooká čarodějnice (příští kolo 1 pochod)', 'Z mlhy se vynoří shrbená stařena s jediným okem uprostřed čela. Zakvákne zaklínadlo… <b>Prokletí: příští kolo máš jen 1 pochod.</b>']; } },
  { id: 'bandits', ic: '🗡️', n: 'Tlupa banditů', bands: ['bad', 'enc'], w: 3,
    text: 'Z křoví vyskočí pět otrhaných banditů: „Měšec, nebo život!“',
    choices: [
      { id: 'pay', label: 'Zaplatit výpalné (2Z)', run: p => { const g = Math.min(2, p.gold); p.gold -= g; return [`zaplatil banditům ${g}Z`, `Bandité si přepočítají <b>${g} zlaťáky</b> a s posměchem zmizí.`]; } },
      { id: 'fight', label: 'Bránit se (hod: bojová síla ≥ 6)', check: { k: 'combat', d: 6 } }],
    ok: p => { p.gold += 1; const lv = addXp(p, 1); return ['rozprášil bandity (+1Z, +1 zk.)', `Bandité prchají a jeden v útěku ztratil měšec: <b>+1 zlaťák, +1 zkušenost</b>.${lv}`]; },
    ko: p => { p.hp -= 2; const g = Math.min(1, p.gold); p.gold -= g; return ['podlehl banditům (−2 životy)', `Přesila tě srazila k zemi: <b>−2 životy${g ? ', −1 zlaťák' : ''}</b>.`]; } },
  { id: 'wolves', ic: '🐺', n: 'Smečka vlků', bands: ['bad', 'enc'], w: 3, th: ['forest', 'mountain'],
    text: 'Za zády se ozve vytí. Mezi stromy se blýskají žluté oči – smečka vlků tě obkličuje!', check: { k: 'combat', d: 5 },
    ok: p => { const lv = addXp(p, 1); return ['odrazil vlky (+1 zk.)', `Vůdce smečky dostal ránu a vlci se stáhli. <b>+1 zkušenost</b>.${lv}`]; },
    ko: p => { p.hp -= 2; return ['pokousali ho vlci (−2 životy)', 'Vlčí tesáky tě dostihly: <b>−2 životy</b>.']; } },
  { id: 'leper', ic: '🧟', n: 'Malomocný poutník', bands: ['bad', 'enc'], w: 2,
    text: 'U cesty sedí malomocný v cárech a natahuje k tobě obvázanou ruku.',
    choices: [
      { id: 'alms', label: 'Dát almužnu (1Z)', run: p => { if (p.gold < 1) { return ['neměl ani na almužnu', 'Prohrábneš měšec – je prázdný. Poutník smutně pokývá hlavou.']; } p.gold -= 1; p.karma += 1; return ['dal almužnu malomocnému (−1Z, +1 karma)', 'Poutník ti požehná: <b>−1 zlaťák, +1 karma</b>.']; } },
      { id: 'heal', label: 'Ošetřit mu rány', run: p => { p.karma += 2; addStatus(p, 'disease', 2); return ['ošetřil malomocného (+2 karma, nákaza)', 'Vyčistíš a obvážeš mu rány. <b>+2 karma</b> – ale chytil jsi <b>Nákazu</b> (−1 život na začátku příštích 2 tahů).']; } },
      { id: 'chase', label: 'Odehnat ho', run: p => { p.karma -= 1; return ['odehnal malomocného (−1 karma)', 'Odeženeš ho kamením. <b>−1 karma</b>.']; } }] },
  { id: 'pit', ic: '🕳️', n: 'Zrádná jáma', bands: ['bad', 'enc'], w: 2, th: ['mountain', 'ruin'],
    run: p => { p.hp -= 2; return ['spadl do jámy (−2 životy)', 'Zem se pod tebou propadne a ty sletíš do zarostlé jámy. <b>−2 životy</b>.']; } },
  { id: 'shrooms', ic: '🍄', n: 'Jedovaté houby', bands: ['bad', 'enc'], w: 2, th: ['forest'],
    run: p => { p.hp -= 1; addStatus(p, 'poison', 1); return ['otrávil se houbami (−1 život, otrava)', 'Ty houby vypadaly tak chutně… <b>−1 život</b> a <b>Otrava</b> (−1 život na začátku příštího tahu).']; } },
  { id: 'bats', ic: '🦇', n: 'Netopýří roj', bands: ['bad'], w: 2, th: ['ruin', 'mountain'],
    run: p => { p.hp -= 1; const g = Math.min(1, p.gold); p.gold -= g; return ['napadl ho netopýří roj (−1 život)', `Z temnoty se vyvalí tisíce netopýrů. <b>−1 život</b>${g ? ' a v tom zmatku ti vypadl <b>1 zlaťák</b>' : ''}.`]; } },
  { id: 'fog', ic: '🌫️', n: 'Bludná mlha', bands: ['bad', 'enc'], w: 2, th: ['forest', 'water', 'other'],
    run: p => { S.noMount = true; const lost = MAXST() - S.steps; S.steps = MAXST(); return ['zabloudil v mlze (přišel o zbytek pochodů)', `Hustá mlha tě točí v kruhu až do setmění. ${lost > 0 ? '<b>Přicházíš o zbývající pochod tohoto kola.</b>' : 'Naštěstí už jsi stejně nikam nešel.'}`]; } },
  { id: 'wisp', ic: '👻', n: 'Bludička', bands: ['bad', 'enc'], w: 2, th: ['water', 'ruin', 'other'],
    text: 'Nad bažinou tančí modré světélko a láká tě k sobě…', check: { k: 'int', d: 6 },
    ok: p => { p.gold += 1; const lv = addXp(p, 1); return ['prohlédl kouzlo bludičky (+1Z, +1 zk.)', `Prohlédneš kouzlo – světélko tě dovede k utopenému měšci. <b>+1 zlaťák, +1 zkušenost</b>.${lv}`]; },
    ko: p => { addStatus(p, 'fear', 1); return ['vyděsila ho bludička (strach)', 'Světélko se změní v šklebící se lebku! <b>Strach:</b> −1 k příštímu hodu.']; } },
  { id: 'monster', ic: '👹', n: 'Nestvůra 1. stupně', bands: ['enc'], w: 3,
    text: 'Ze stínu se vyvalí slintající nestvůra!', check: { k: 'combat', d: 6 },
    ok: p => { p.gold += 1; const lv = addXp(p, 2); return ['porazil nestvůru (+1Z, +2 zk.)', `Nestvůra padla. <b>+1 zlaťák, +2 zkušenosti</b>.${lv}<br><small>(Zástupný souboj – později plný boj s kartami.)</small>`]; },
    ko: p => { p.hp -= 3; return ['prohrál s nestvůrou (−3 životy)', 'Nestvůra tě zřídila: <b>−3 životy</b>.']; } },
  { id: 'nothing', ic: '🍃', n: 'Nic', bands: ['meh'], w: 3, run: () => ['nenašel nic zajímavého', 'Vítr fouká, ptáci zpívají. <b>Nic se nestalo.</b>'] },
  { id: 'camp', ic: '🔥', n: 'Opuštěný tábor', bands: ['meh', 'good'], w: 2, run: p => { const b = p.hp; p.hp = Math.min(MAX_HP, p.hp + 2); return [`si odpočinul v táboře (+${p.hp - b} životy)`, `Chvíle u dohasínajícího ohně: životy ${b} → <b>${p.hp}</b>.`]; } },
  { id: 'pilgrim', ic: '🧙', n: 'Tajemný poutník', bands: ['meh'], w: 2, run: p => { p.karma += 1; return ['podělil se s poutníkem (+1 karma)', 'Podělíš se s tajemným poutníkem o chleba. <b>+1 karma</b>.']; } },
  { id: 'tracks', ic: '🐾', n: 'Stopy bosse', bands: ['meh'], w: 2, run: p => { const b = pick(BOSSES); p.intel.push(`${b} – stopy v divočině`); return [`našel stopy bosse: ${b}`, `Obří stopy… Někde poblíž se toulá <b>${b}</b>.`]; } },
  { id: 'herbs', ic: '🌿', n: 'Léčivé byliny', bands: ['meh', 'good'], w: 2, th: ['forest', 'water'], run: p => { if (p.potions >= POTION_MAX) { const b = p.hp; p.hp = Math.min(MAX_HP, p.hp + 2); return [`nasbíral byliny (lektvary plné, +${p.hp - b} životy)`, `Najdeš léčivé byliny, ale víc lektvarů neuneseš – rovnou je rozžvýkáš: životy ${b} → <b>${p.hp}</b>.`]; }
      p.potions += 1; return ['nasbíral byliny (+1 léčivý lektvar)', `Najdeš vzácné léčivé byliny a uvaříš z nich <b>léčivý lektvar</b> (${p.potions}/${POTION_MAX}).<br><small>${POTION_RULE}</small>`]; } },
  { id: 'purse', ic: '💰', n: 'Ztracený měšec', bands: ['good'], w: 3, run: p => { const g = 1 + rnd(2); p.gold += g; return [`našel měšec (+${g}Z)`, `V trávě u cesty leží ztracený měšec: <b>+${g} zlaťáky</b>.`]; } },
  { id: 'scroll', ic: '📜', n: 'Starý cvičební svitek', bands: ['good', 'great'], w: 1,
    run: p => { const k = pick(TRAIN_ALLOW[roleOf(p)]); p.train[k] = (p.train[k] || 0) + 1; return [`našel cvičební svitek (+1 ${STAT_NAME[k]})`, `V rozpadlé brašně najdeš svitek s tajnými cviky. <b>+1 ${STAT_NAME[k]}</b> (zlepšení dovednosti).`]; } },
  { id: 'shrine', ic: '🗿', n: 'Zapomenutá svatyně', bands: ['good'], w: 1, th: ['ruin', 'mountain', 'other'], run: p => { p.blessing = true; return ['pomodlil se v zapomenuté svatyni (požehnání)', 'Mechem zarostlý oltář ještě slabě září. <b>Požehnání:</b> +1 k příštímu hodu v NPC úkolu.']; } },
  { id: 'chest', ic: '🧰', n: 'Truhla s pokladem', bands: ['great'], w: 3, run: p => { p.gold += 3; return ['našel truhlu (+3Z)', 'Pod kořeny stromu je zakopaná truhla: <b>+3 zlaťáky</b>!']; } },
  { id: 'hero', ic: '🦸', n: 'Hrdinský čin', bands: ['great'], w: 2, run: p => { const lv = addXp(p, 3); p.karma += 1; return ['zachránil přepadené kupce (+3 zk., +1 karma)', `Zachráníš přepadené kupce před lapky. <b>+3 zkušenosti, +1 karma</b>.${lv}`]; } },
  { id: 'item', ic: '⚔️', n: 'Předmět!', bands: ['great'], w: 1,
    run: p => { const id = lootItem(p); if (!id) { p.gold += 3; return ['našel poklad (+3Z)', 'Všechny předměty už mají jiní – aspoň <b>+3 zlaťáky</b>.']; }
      const it = ITEM_BY_ID[id], r = giveItem(p, id);
      const where = r === 'equipped' ? 'a hned si ho nasazuješ' : r === 'bag' ? 'a ukládáš ho do brašny' : r === 'full' ? '– ale ' + FULL_TXT : 'ale tvoje třída ho nosit nemůže – putuje do brašny (můžeš ho prodat)';
      return [`našel předmět „${it.name}“ (${TIER[it.tier].n})`, `Mezi kostmi padlého dobrodruha se něco zablýskne… Našel jsi <b>${it.name}</b> (${TIER[it.tier].n}) ${where}.<div class="loot">${itemCardHTML(it, p)}</div>`]; } }
];
const SEARCH_BY_ID = Object.fromEntries(SEARCH.map(s => [s.id, s]));
let FORCE_SEARCH = null; // testovací háček
function pickSearch(t, loc, nat) {
  if (FORCE_SEARCH) { const s = SEARCH_BY_ID[FORCE_SEARCH]; FORCE_SEARCH = null; return { s, band: nat === 1 ? 'bad' : BANDS(t) }; }
  const band = nat === 1 ? 'bad' : BANDS(t);
  const list = SEARCH.filter(s => s.bands.includes(band)).map(s => ({ s, w: s.w * (s.th ? (s.th.includes(loc.type) ? 2 : 0.4) : 1) * (s.id === 'item' && t >= 7 ? 2 : 1) }));
  let r = Math.random() * list.reduce((a, x) => a + x.w, 0);
  for (const x of list) { if ((r -= x.w) < 0) return { s: x.s, band }; }
  return { s: list[0].s, band };
}
const checkStat = (p, k) => k === 'combat' ? combatKey(p) : k;

// ---------- OBCHOD MEZI HRÁČI ----------
// Kupující dělá nabídku zlaťáků, prodávající (dává předmět) potvrzuje. Zlý ↔ dobrý obchodovat nemohou.
function tradeBlock(a, b) {
  if (a.side === 'neutral' || b.side === 'neutral' || a.side === b.side) return null;
  return `${SIDE_LABEL[a.side]} a ${SIDE_LABEL[b.side].toLowerCase()} hrdina spolu obchodovat nemohou.`;
}
let TR = null; // rozpracovaný obchod (jen v UI); odeslaná nabídka je ve stavu hry S.trade (online ji potvrzuje prodávající na svém zařízení)
const tradeSellerIdx = T => T.dir === 'buy' ? T.partner : T.from;
function tradePropose(partner, dir, item, offer) {
  const me = cur(), q = S.players[partner]; if (!q || q === me || tradeBlock(me, q) || S.npc || S.pending || S.combat) return;
  const seller = dir === 'buy' ? q : me, buyer = dir === 'buy' ? me : q, it = ITEM_BY_ID[item];
  offer = Math.max(0, Math.floor(+offer || 0));
  if (!it || !ownedBy(seller).includes(item) || offer > TRADE_MULT * it.price || offer > buyer.gold || !hasRoom(buyer, item)) { toast('Nabídka neplatí.'); return; }
  S.trade = { from: S.cur, partner, dir, item, offer }; save();
  if (isAI(seller)) return tradeAnswer(offer >= it.price);
  if (!$('trade').classList.contains('hidden') || !NET.role) { $('trade').classList.remove('hidden'); renderTrade(); }
}
function tradeAnswer(yes) {
  const T = S.trade; if (!T) return; S.trade = null;
  const A = S.players[T.from], seller = T.dir === 'buy' ? S.players[T.partner] : A, buyer = T.dir === 'buy' ? A : S.players[T.partner], it = ITEM_BY_ID[T.item];
  if (TR) TR.stage = 'form';
  if (!yes) { addLog(`🤝 ${seller.name} odmítl nabídku ${T.offer}Z za „${it.name}“.`); save(); renderAll(); if (TR) renderTrade(); toast('Nabídka odmítnuta.'); return; }
  if (buyer.gold < T.offer || !ownedBy(seller).includes(T.item) || T.offer > TRADE_MULT * it.price || !hasRoom(buyer, T.item)) { toast('Obchod už neplatí.'); save(); if (TR) renderTrade(); return; }
  removeItem(seller, T.item); giveItem(buyer, T.item); buyer.gold -= T.offer; seller.gold += T.offer;
  addLog(`🤝 ${seller.name} prodal „${it.name}“ hráči ${buyer.name} za ${T.offer}Z.`);
  renderAll(); save(); $('trade').classList.add('hidden'); toast(`Obchod uzavřen: ${it.name} → ${buyer.name}`);
}
function openTrade() {
  if (S.npc || S.pending || S.combat) { toast('Obchodovat můžeš během svého tahu, ne uprostřed hodu nebo NPC karty.'); return; }
  TR = { partner: null, dir: 'buy', item: null, offer: 1, stage: 'form' }; if (S.trade && !NET.role) S.trade = null; renderTrade(); $('trade').classList.remove('hidden');
}
function renderTrade() {
  const me = cur(), box = $('trade-body'); box.innerHTML = '';
  box.appendChild(el('h3', '', '🤝 Obchod mezi hráči'));
  box.appendChild(el('p', 'tr-note', `Na tahu je <b>${me.name}</b> – obchodovat může s kýmkoli, kdykoli během svého tahu. Nabídku dělá kupující, předání potvrzuje ten, kdo předmět dává.`));
  if (S.trade) {
    const T = S.trade, A = S.players[T.from], seller = T.dir === 'buy' ? S.players[T.partner] : A, buyer = T.dir === 'buy' ? A : S.players[T.partner], it = ITEM_BY_ID[T.item];
    if (NET.role && S.players.indexOf(seller) !== NET.mySeat) { box.appendChild(el('div', 'tr-confirm', `⏳ Čeká se, až <b>${seller.name}</b> potvrdí obchod: <b>${it.name}</b> za <b>${T.offer} 🪙</b>.`)); return; }
    box.appendChild(el('div', 'tr-confirm', `<div class="tr-handover">📣 Předej zařízení hráči <b>${seller.name}</b></div>
      <b>${buyer.name}</b> nabízí <b>${T.offer} 🪙</b> za předmět:<div class="loot">${itemCardHTML(it, buyer)}</div>
      <b>${seller.name}</b>, souhlasíš s předáním?`));
    const row = el('div', 'npc-opts');
    const y = el('button', 'btn btn-gold', `✔ Ano, předávám za ${T.offer} 🪙`); y.id = 'trade-accept';
    y.onclick = () => tradeAnswer(true);
    const n = el('button', 'btn btn-dark', '✖ Odmítnout'); n.id = 'trade-decline';
    n.onclick = () => tradeAnswer(false);
    row.appendChild(y); row.appendChild(n); box.appendChild(row); return;
  }
  // partner
  const pl = el('div', 'tr-partners');
  S.players.forEach((q, i) => { if (q === me) return; const bl = tradeBlock(me, q);
    const b = el('button', 'tr-partner' + (TR.partner === i ? ' on' : '') + (bl ? ' blocked' : ''), `<b>${q.name}</b> · ${heroById(q.hero).name} ${sideTag(heroById(q.hero))}${bl ? `<div class="tr-why">🚫 ${bl}</div>` : ''}`);
    b.dataset.p = i; b.disabled = !!bl; b.onclick = () => { TR.partner = i; TR.item = null; renderTrade(); }; pl.appendChild(b); });
  box.appendChild(el('div', 'tr-lbl', '1. S kým?')); box.appendChild(pl);
  if (TR.partner == null) return;
  const q = S.players[TR.partner];
  const dr = el('div', 'seg tr-dir');
  [['buy', `Kupuji od ${q.name}`], ['sell', `Prodávám hráči ${q.name}`]].forEach(([k, t]) => { const b = el('button', TR.dir === k ? 'on' : '', t); b.dataset.dir = k; b.onclick = () => { TR.dir = k; TR.item = null; renderTrade(); }; dr.appendChild(b); });
  box.appendChild(el('div', 'tr-lbl', '2. Co děláš?')); box.appendChild(dr);
  const seller = TR.dir === 'buy' ? q : me, buyer = TR.dir === 'buy' ? me : q;
  const own = ownedBy(seller);
  box.appendChild(el('div', 'tr-lbl', `3. Který předmět (${seller.name})?`));
  const il = el('div', 'tr-items');
  if (!own.length) il.appendChild(el('span', 'inv-empty', `${seller.name} nemá žádné předměty.`));
  own.forEach(id => { const it = ITEM_BY_ID[id]; const b = el('button', `ichip t-${it.tier}` + (TR.item === id ? ' on' : ''), `${it.name} <small>(${it.price}Z)</small>`); b.dataset.item = id;
    b.onclick = () => { TR.item = id; TR.offer = Math.min(buyer.gold, it.price, TRADE_MULT * it.price) || 0; renderTrade(); }; il.appendChild(b); });
  box.appendChild(il);
  if (!TR.item) return;
  box.appendChild(el('div', 'tr-lbl', `4. Nabídka kupujícího (${buyer.name} má ${buyer.gold} 🪙)`));
  const row = el('div', 'tr-offer');
  const inp = el('input'); inp.type = 'number'; inp.min = 0; const cap = TRADE_MULT * ITEM_BY_ID[TR.item].price; inp.max = Math.min(buyer.gold, cap); inp.value = TR.offer; inp.id = 'trade-offer';
  inp.oninput = () => { TR.offer = Math.max(0, Math.min(cap, Math.floor(+inp.value || 0))); if (+inp.value > cap) inp.value = cap; };
  row.appendChild(inp); row.appendChild(el('span', '', `🪙 (cena z karty ${ITEM_BY_ID[TR.item].price}Z · nejvýš <b>${cap}Z</b> = 2×)`));
  const room = hasRoom(buyer, TR.item); if (!room) box.appendChild(el('div', 'item-why', `🚫 ${buyer.name} nemá místo (4 nasazené + 4 v brašně) – nejdřív musí něco prodat nebo zahodit.`));
  box.appendChild(row);
  const go = el('button', 'btn btn-gold', '📨 Poslat nabídku k potvrzení'); go.id = 'trade-send';
  go.disabled = !room; go.onclick = () => { if (TR.offer > cap) { toast(`Nejvýš ${cap}Z (2× cena z karty).`); return; } if (TR.offer > buyer.gold) { toast(`${buyer.name} nemá dost zlaťáků.`); return; } tradePropose(TR.partner, TR.dir, TR.item, TR.offer); };
  box.appendChild(go);
}

// Starý formát (sloty jako objekt) → v8: seznam nasazených (max 4, bez konfliktů), zbytek do brašny.
function migrateGear(p) {
  if (!p.bag) p.bag = [];
  if (!Array.isArray(p.equip)) { const old = Object.values(p.equip || {}).filter((v, i, a) => v && a.indexOf(v) === i); p.equip = [];
    old.forEach(id => { if (ITEM_BY_ID[id] && !canWear(p, ITEM_BY_ID[id]) && p.equip.length < EQUIP_MAX && !loadoutProblem([...p.equip, id])) p.equip.push(id); else p.bag.push(id); }); }
  p.equip = p.equip.filter(id => ITEM_BY_ID[id]); p.bag = p.bag.filter(id => ITEM_BY_ID[id] && !p.equip.includes(id));
}

// ---------- BOJ (v9): bossové na mapě, souboj se 3 kartami, PvP s 1 kartou ----------
const CB = window.GS_COMBAT || { cards: {}, bosses: [] };
const BOSS_BY_ID = Object.fromEntries(CB.bosses.map(b => [b.id, b]));
const TIER_NAME = { 1: 'Úroveň I', 2: 'Úroveň II', 3: 'Úroveň III' };
const FOCUS_NAME = { combat: '⚔️ bojový', charisma: '💬 charismatický', magic: '🔮 magický' };
const FOCUS_BONUS = 1;
const focusList = b => Array.isArray(b.focus) ? b.focus : [b.focus || 'combat'];
const focusName = b => focusList(b).map(f => FOCUS_NAME[f] || f).join(' + ');
let FORCE_CARDS = null, FORCE_LOOT = null; // testovací háčky
function bossState(id) { S.bosses = S.bosses || {}; const b = BOSS_BY_ID[id]; return S.bosses[id] = S.bosses[id] || { sh: b.sh, hp: b.hp, dead: false, active: false, loc: null }; }
// v9b: bossové na začátku nejsou na mapě. Od 2. kola (po skončení 1. kola) je ve hře 1 boss na hráče,
// vybraný podle levelu hrdiny (L1–2 úroveň I, L3–5 II, L6+ III) a jeho zaměření (Finn & Bruine: jakékoli).
// Poražený boss je na začátku dalšího kola nahrazen novým podle stejného pravidla (pro téhož hráče).
const BOSS_START_ROUND = 2, BOSSES_PER_PLAYER = 1;
const tierForLevel = L => L <= 2 ? 1 : L <= 5 ? 2 : 3;
const FOCUS_OF_ROLE = { mage: 'magic', diplomat: 'charisma', hybrid: null, vampire: null };
const focusOfHero = p => FOCUS_OF_ROLE[roleOf(p)] !== undefined ? FOCUS_OF_ROLE[roleOf(p)] : 'combat';
const activeBosses = () => CB.bosses.filter(b => { const st = S.bosses && S.bosses[b.id]; return st && st.active && !st.dead; });
const bossLoc = b => (S.bosses && S.bosses[b.id] && S.bosses[b.id].loc) || null;
const bossAt = locId => activeBosses().find(b => bossLoc(b) === locId);
function spawnBossFor(pi) {
  const p = S.players[pi], t = tierForLevel(p.level || 1), f = focusOfHero(p);
  const taken = id => S.bosses && S.bosses[id] && (S.bosses[id].active || S.bosses[id].dead);
  const free = CB.bosses.filter(b => !taken(b.id));
  let cand = free.filter(b => b.tier === t && (!f || focusList(b).includes(f)));
  if (!cand.length) cand = free.filter(b => b.tier === t);
  if (!cand.length) cand = free.filter(b => Math.abs(b.tier - t) === 1);
  if (!cand.length) cand = free;
  if (!cand.length) return null;
  const b = pick(cand), occ = new Set([...activeBosses().map(bossLoc), ...S.players.map(q => q.loc)]);
  let loc = b.loc;
  if (occ.has(loc)) { const D = distances(p.loc), wild = PLACES.filter(x => !isSettlement(x) && !occ.has(x.id));
    const far = wild.filter(x => D[x.id] >= 2 && D[x.id] <= 4); loc = (far.length ? pick(far) : wild.length ? pick(wild) : pick(PLACES.filter(x => !occ.has(x.id)))).id; }
  S.bosses = S.bosses || {}; S.bosses[b.id] = { sh: b.sh, hp: b.hp, dead: false, active: true, loc, for: pi, since: S.round };
  addLog(`👹 Do hry vstupuje boss ${b.name} (${TIER_NAME[b.tier]}, ${focusName(b)}) – ${BY_ID[loc].name}. Přišel kvůli hrdinovi ${p.name} (level ${p.level || 1}).`, true);
  return b;
}
// v19: návrat bossů – poražený boss (vítězstvím hrdiny) se po BOSS_RESPAWN kolech vrátí na SVÉ místo s plnými štíty i životy a plnou odměnou.
// Uprchlý boss (útěk) se nevrací. Je-li jeho místo zrovna obsazené jiným bossem, počká, až se uvolní.
const BOSS_RESPAWN = 8;
const respawnLoc = b => b.loc;
function pendingRespawns() { return CB.bosses.filter(b => { const st = S.bosses && S.bosses[b.id]; return st && st.dead && st.back != null; }); }
function bossRespawnAt(locId) { return pendingRespawns().find(b => respawnLoc(b) === locId) || null; }
function bossRespawnTick() {
  const out = [];
  pendingRespawns().forEach(b => { const st = S.bosses[b.id], loc = respawnLoc(b);
    if (S.round < st.back || !BY_ID[loc] || bossAt(loc)) return;
    S.bosses[b.id] = { sh: b.sh, hp: b.hp, dead: false, active: true, loc, for: null, since: S.round, returns: (st.returns || 0) + 1 };
    addLog(`👹↻ Boss ${b.name} se vrátil na své místo – ${BY_ID[loc].name} (${TIER_NAME[b.tier]}, plné štíty i životy, plná odměna).`, true);
    out.push(b); });
  if (out.length) setTimeout(() => toast(`👹↻ Vrátil${out.length > 1 ? 'i' : ''} se: ${out.map(b => b.name).join(', ')}`), 700);
  return out;
}
function bossRoundStart() {
  bossRespawnTick();
  if (S.round < BOSS_START_ROUND) return [];
  S.bossSlots = S.bossSlots || {}; const out = [];
  S.players.forEach((p, i) => { const have = S.bossSlots[i] || [];
    const alive = have.filter(id => S.bosses[id] && !S.bosses[id].dead);
    while (alive.length < BOSSES_PER_PLAYER) { const b = spawnBossFor(i); if (!b) break; alive.push(b.id); out.push(b); }
    S.bossSlots[i] = alive; });
  if (out.length) setTimeout(() => toast(`👹 Do hry vstoupil${out.length > 1 ? 'i' : ''} boss${out.length > 1 ? 'ové' : ''}: ${out.map(b => b.name).join(', ')}`), 400);
  return out;
}
// v13 Olgrich útočí Charismou nebo Inteligencí: proti bossovi zaměřenému na magii Inteligencí, na charisma Charismou, jinak tou vyšší (při rovnosti Charismou).
function atkKeyOf(p, b) { const r = roleOf(p); if (r === 'vampire') { const f = b ? focusList(b) : [];
    if (f.includes('magic') && !f.includes('charisma')) return 'int'; if (f.includes('charisma') && !f.includes('magic')) return 'cha';
    return stat(p, 'int') > stat(p, 'cha') ? 'int' : 'cha'; }
  return r === 'mage' ? 'int' : r === 'diplomat' ? 'cha' : combatKey(p); }
const approachOf = (p, b) => ({ int: 'magic', cha: 'charisma' }[atkKeyOf(p, b)] || 'combat');
const focusMatch = (p, b) => focusList(b).includes(approachOf(p, b));
const APPROACH_NAME = { combat: '⚔️ Boj', magic: '🔮 Magie', charisma: '💬 Charisma' };
const SEA_PORTS = ['cernovod', 'sedy_pristav', 'palmova_zatoka', 'rybarska_osada'];
const bossRow = (b, ap) => (b.rows && (b.rows[ap] || b.rows.combat || b.rows[focusList(b)[0]])) || { deff: b.deff, atk: b.atk };
function rewardLine(b) { const r = b.reward || {}, x = [`${r.gp} 🔷 GB`, `${r.g} 🪙`, `${r.xp} zk.`];
  if (r.item) x.push(`1/3 šance na předmět (${TIER[r.item].n.toLowerCase()})`); if (r.trophy) x.push(`trofej ${r.trophy.n} (${r.trophy.v} 🪙)`);
  if (r.potion) x.push('léčivý lektvar'); if (r.heal) x.push('plné vyléčení'); if (r.uncurse) x.push('sejme kletby'); if (r.karma) x.push(`+${r.karma} karma`);
  if (r.cha_karma) x.push('+1 karma za vítězství Charismatem'); if (r.magic_karma) x.push('+1 karma za vítězství magií');
  if (r.win_combat === 'potion') x.push('lektvar za vítězství Bojem'); if (r.win_combat === 'gold1') x.push('+1 🪙 za vítězství Bojem'); if (r.win_magic === 'heal1') x.push('+1 ❤️ za vítězství magií');
  [r.cha_text, r.win_magic_text, r.extra].filter(Boolean).forEach(t => x.push(t)); return x.join(' · '); }
const specHTML = b => (b.specials || []).map(s => `<div class="cb-spec">✴️ <b>${s.n}:</b> ${s.t}</div>`).join('');
const rowsHTML = b => Object.entries(b.rows || {}).length > 1 ? Object.entries(b.rows).map(([k, r]) => `${APPROACH_NAME[k]}: obrana <b>${r.deff.join(' / ')}</b> · útok <b>${r.atk.join(' / ')}</b>`).join('<br>') : `Obrana po kolech <b>${bossRow(b).deff.join(' / ')}</b> · Útok <b>${bossRow(b).atk.join(' / ')}</b>`;
const CARD_BY_ID = Object.fromEntries(Object.values(CB.cards).flat().map(c => [c.id, c]));
const cardLite = c => { const o = Object.assign({}, c); delete o.image; return o; };
const cardImg = c => (CARD_BY_ID[c.id] || {}).image || '';
function cardPool(p) { return (CB.cards[p.hero] || []).filter(c => !(c.once && (p.usedCards || []).includes(c.id))); }
function drawCards(p, n) {
  const pool = cardPool(p);
  if (FORCE_CARDS) { const f = FORCE_CARDS.map(id => pool.find(c => c.id === id)).filter(Boolean); FORCE_CARDS = FORCE_CARDS.filter(id => !f.some(c => c.id === id)); if (!FORCE_CARDS.length) FORCE_CARDS = null; if (!f.length) return shuffle(pool).slice(0, n).map(cardLite); const rest = shuffle(pool.filter(c => !f.includes(c))); return [...f, ...rest].slice(0, n).map(cardLite); }
  return shuffle(pool).slice(0, n).map(cardLite);
}
function bossBar(b, st) {
  return `<div class="cb-bars"><div class="cb-bar sh" title="Štíty"><i style="width:${st.sh / b.sh * 100}%"></i><span>🛡️ Štíty ${Math.max(0, st.sh)}/${b.sh}</span></div>
    <div class="cb-bar hp" title="Životy"><i style="width:${Math.max(0, st.hp) / b.hp * 100}%"></i><span>❤️ Životy ${Math.max(0, st.hp)}/${b.hp}</span></div></div>`;
}
function bossInfoHTML(b) {
  const st = bossState(b.id);
  return `<div class="cb-tier t${b.tier}">${TIER_NAME[b.tier]} · ${focusName(b)}</div>${bossBar(b, st)}
    <div class="cb-stats">${rowsHTML(b)} <small>(+ 🎲)</small></div>
    ${b.chaOnly ? '<div class="cb-chaonly">💬 Jen Charismou – silou ani magií je neporazíš.</div>' : ''}${specHTML(b)}${b.lore ? `<div class="cb-lore">„${b.lore}“</div>` : ''}
    ${st.for != null && S.players[st.for] ? `<div class="cb-for">Přišel kvůli: <b>${S.players[st.for].name}</b> (od ${st.since}. kola)</div>` : ''}${st.returns ? `<div class="cb-for">↻ Vrátil se na své místo (${st.returns}. návrat, od ${st.since}. kola)</div>` : ''}
    <div class="cb-rew">Odměna: ${rewardLine(b)}</div>`;
}
ABILITIES.boss = { name: 'Boss', icon: '👹', combat: true, text: 'Souboj s bossem: 3 kola, v každém jedna náhodná bojová karta.',
  req: (p, loc) => { if (p.hp <= 0) return 'Jsi vyčerpaný.'; const b = loc && bossAt(loc.id); return chaOnlyWhy(p, b); } };
// v14: někteří diplomatičtí bossové jdou porazit jen Charismou (b33 Bruclík a Firebeard)
function chaOnlyWhy(p, b) { return b && b.chaOnly && approachOf(p, b) !== 'charisma' ? `${b.name}: s nimi se dá utkat jen Charismou (diplomaté, Olgrich).` : null; }
// Souboj s bossem
function heroCtx(p, b) {
  return { name: p.name, hp: p.hp, maxHp: MAX_HP, atk: stat(p, atkKeyOf(p, b)), atkName: STAT_NAME[atkKeyOf(p, b)], def: stat(p, 'obr'), approach: approachOf(p, b),
    focus: focusMatch(p, b) ? FOCUS_BONUS : 0, potions: p.potions || 0, fear: !!useFear(p), gold: p.gold, karma: p.karma || 0, side: p.side, horse: hasMount(p),
    atSea: SEA_PORTS.includes(p.loc), intel: stat(p, 'int'), cha: stat(p, 'cha'), ranged: (p.equip || []).some(id => ITEM_BY_ID[id] && ITEM_BY_ID[id].ranged),
    bag: (p.bag || []).map(id => ({ id, name: ITEM_BY_ID[id].name, price: ITEM_BY_ID[id].price || 1 })) };
}
function startBossFight(p, b) {
  const co = chaOnlyWhy(p, b); if (co) { toast(co); return; }
  const st = bossState(b.id), town = isSettlement(BY_ID[p.loc]);
  const hand = drawCards(p, 4), cards = hand.slice(0, 3);
  const F = GSCombat.newFight({ hero: heroCtx(p, b), boss: b, sh: st.sh, hp: st.hp, cards, town });
  F.extra = hand[3] || null;
  S.combat = { type: 'boss', boss: b.id, F, lines: [] };
  addLog(`⚔️ ${p.name} vyzval na souboj bosse ${b.name} (${BY_ID[p.loc].name}).`);
  save(); openCombat();
}
function openCombat() { if (!S.combat) return; closePanel(true); renderCombat(); $('combat').classList.remove('hidden'); }
function renderCombat() {
  const C = S.combat, box = $('combat-body'); if (!C) return;
  if (C.type === 'pvp') return renderPvp();
  const F = C.F, b = BOSS_BY_ID[C.boss], p = cur(), st = { sh: F.boss.sh, hp: F.boss.hp };
  const c = F.done ? F.cards[F.r - 1] : F.cards[F.r];
  box.innerHTML = `<div class="cb-top">
      <div class="cb-boss"><img src="${b.image}" alt="${b.name}"><div class="cb-name">👹 ${b.name}</div><div class="cb-desc">${b.desc}</div>
        <div class="cb-tier t${b.tier}">${TIER_NAME[b.tier]} · ${focusName(b)}</div>${bossBar(b, st)}
        <div class="cb-stats">${APPROACH_NAME[F.hero.approach]}: obrana ${F.boss.deff.join('/')} · útok ${F.boss.atk.join('/')} + 🎲</div>${specHTML(b)}</div>
      <div class="cb-card">${c ? `<img id="cb-card-img" src="${cardImg(c)}" alt="${c.name}" title="${c.name}">` : ''}
        <div class="cb-cardrow">${F.cards.map((x, i) => `<span class="cb-mini ${i < F.r ? 'used' : i === F.r && !F.done ? 'now' : ''}" title="${x.name} (+${x.att}/+${x.deff})${x.once ? ' · 1× za hru' : ''}">${i + 1}. ${x.name}${x.once ? ' ①' : ''}</span>`).join('')}</div></div>
      <div class="cb-hero"><img src="${ASSETS[heroById(p.hero).img]}" alt=""><div class="cb-name">${p.name}</div>
        <div class="cb-bars"><div class="cb-bar hp hero"><i style="width:${F.hero.hp / MAX_HP * 100}%"></i><span>❤️ ${F.hero.hp}/${MAX_HP}</span></div></div>
        <div class="cb-stats">Útok: ${F.hero.atkName} <b>${F.hero.atk}</b>${F.hero.focus ? ` (+${F.hero.focus} zaměření)` : ''}<br>Obrana <b>${F.hero.def}</b>${F.m.def ? ` +${F.m.def}` : ''}${F.m.buffer ? ` · pohltí ${F.m.buffer}` : ''}${F.m.dodge ? ' · 💨 úhyb' : ''}</div></div></div>
    <div class="cb-log" id="cb-log">${F.log.map(l => `<div>${l}</div>`).join('')}</div>`;
  const act = el('div', 'cb-act');
  if (!F.done) {
    const offs = GSCombat.offers(F), must = GSCombat.needsChoice(F);
    if (offs.length) { const ob = el('div', 'cb-offers'); offs.forEach(o => { const bt = el('button', 'btn ' + (o.req ? 'btn-gold' : 'btn-dark'), o.label); bt.dataset.offer = o.id; bt.onclick = () => combatChoose(o.id); ob.appendChild(bt); }); act.appendChild(ob); }
    if (!must) act.appendChild(makeDie({ id: 'cb-die', wrapId: 'cb-die-wrap', label: `👆 Kolo ${F.r + 1}/${F.cards.length}: klepni a hoď (boss hází současně, 🎲 osud spouští jeho zvláštnosti)`, onRoll: v => combatRoll(v) }));
    const pot = el('button', 'btn btn-dark', `🧪 Lektvar (${F.hero.potions})`); pot.id = 'cb-potion'; pot.disabled = F.potionUsed || !F.hero.potions || F.hero.hp >= MAX_HP;
    pot.title = 'Léčivý lektvar: +4 životy, vyléčí Otravu a Nákazu. Max 1 za boj.'; pot.onclick = () => combatDrink(); act.appendChild(pot);
  } else {
    const head = { win: `🏆 Vítězství nad bossem ${b.name}!`, loss: '☠️ Prohra – padl jsi.', timeout: `⏳ ${b.name} přežil – jeho zranění zůstávají.`,
      left: `🤝 Dohoda s bossem ${b.name} – odcházíš.`, fled: `💨 ${b.name} utekl!`, draw: `🍺 Remíza s bossem ${b.name}.`, passed: `🙏 ${b.name} tě nechal projít.` }[F.result];
    act.appendChild(el('div', `cb-result ${F.result}`, `<b>${head}</b>${C.summary ? '<br>' + C.summary : ''}`));
    const ok = el('button', 'btn btn-gold', 'Pokračovat'); ok.id = 'cb-close'; ok.onclick = () => closeCombat(); act.appendChild(ok);
  }
  box.appendChild(act);
  const lg = $('cb-log'); lg.scrollTop = lg.scrollHeight;
}
function combatRoll(v) {
  const C = S.combat; if (!C || C.F.done) return;
  const F = C.F, br = nextRoll(), ad = nextRoll(), xd = nextRoll();
  GSCombat.round(F, v, br, ad, xd);
  if (F.done) finishBossFight();
  save(); renderCombat();
}
function combatChoose(id) {
  const C = S.combat; if (!C || C.F.done) return;
  GSCombat.choose(C.F, id); if (C.F.done) finishBossFight(); save(); renderCombat();
}
function finishBossFight() {
  const C = S.combat, F = C.F, p = cur(), b = BOSS_BY_ID[C.boss], st = bossState(b.id), sm = [];
  p.hp = F.hero.hp; p.potions = F.hero.potions;
  if (F.curePoison) p.status = (p.status || []).filter(x => x.id !== 'poison' && x.id !== 'disease');
  st.sh = Math.max(0, F.boss.sh); st.hp = Math.max(0, F.boss.hp);
  p.usedCards = p.usedCards || []; F.cards.slice(0, F.r).forEach(c => { if (c.once && !p.usedCards.includes(c.id)) { p.usedCards.push(c.id); sm.push(`Karta „${c.name}“ je spotřebována (1× za hru).`); } });
  [...new Set(F.status)].forEach(t => { addStatus(p, t, t === 'disease' ? 2 : 1); sm.push(`Stav: ${STATUS[t].ic} ${STATUS[t].n}.`); });
  const D = F.delta, r = b.reward || {}, ap = F.hero.approach;
  if (D.gold) { const g = D.gold < 0 ? -Math.min(p.gold, -D.gold) : D.gold; p.gold += g; sm.push(g >= 0 ? `+${g} 🪙.` : `Zaplatil jsi ${-g} 🪙.`); }
  if (D.payAfter) { const g = Math.min(p.gold, D.payAfter); p.gold -= g; sm.push(`Dlužní úpis: −${g} 🪙.`); }
  if (D.karma) { p.karma = (p.karma || 0) + D.karma; sm.push(`Karma ${D.karma > 0 ? '+' : ''}${D.karma} (teď ${p.karma}).`); }
  if (D.gift) { removeItem(p, D.gift); sm.push(`Daroval jsi ${ITEM_BY_ID[D.gift].name}.`); }
  if (F.result === 'loss' && D.loseHalfGold) { const g = Math.floor(p.gold / 2); p.gold -= g; sm.push(`Piráti ti vzali polovinu zlata (−${g} 🪙).`); }
  if (F.result === 'loss' && D.loseBagItem && p.bag.length) { const id = pick(p.bag); removeItem(p, id); sm.push(`Boss ti vzal z brašny: ${ITEM_BY_ID[id].name}.`); }
  if (D.potionsLost) sm.push(`Přišel jsi o ${D.potionsLost} lektvar(y).`);
  if (F.result === 'win') {
    st.dead = true; st.by = p.name; st.killed = S.round; st.back = S.round + BOSS_RESPAWN; const lv = giveReward(p, { g: r.g, xp: r.xp, gp: r.gp });
    sm.push(`Odměna: <b>+${r.gp} Grumpstone body, +${r.g} 🪙, +${r.xp} zk.</b>${lv}`);
    if (r.item && (FORCE_LOOT != null ? FORCE_LOOT : rnd(3) === 0)) { let f = freeItems([r.item]); if (!f.length) f = freeItems();
      if (f.length) { const id = pick(f).id, it = ITEM_BY_ID[id], res = giveItem(p, id); sm.push(`Kořist: <b>${it.name}</b> (${TIER[it.tier].n})${res === 'equipped' ? ' – hned nasazeno' : res === 'full' ? ' – ' + FULL_TXT : ' – do brašny'}.`); } }
    else if (r.item) sm.push('Předmět tentokrát nepadl (šance 1/3).');
    if (r.trophy) { p.gold += r.trophy.v; sm.push(`Trofej ${r.trophy.n} prodána za ${r.trophy.v} 🪙.`); }
    if (r.potion || (r.win_combat === 'potion' && ap === 'combat')) { p.potions = (p.potions || 0) + 1; sm.push('+1 léčivý lektvar.'); }
    if (r.win_combat === 'gold1' && ap === 'combat') { p.gold += 1; sm.push('+1 🪙 (vítězství Bojem).'); }
    if (r.win_magic === 'heal1' && ap === 'magic') { p.hp = Math.min(MAX_HP, p.hp + 1); sm.push('+1 ❤️ (vítězství magií).'); }
    if (r.heal) { p.hp = MAX_HP; sm.push('Plně vyléčen.'); }
    if (r.uncurse) { p.status = (p.status || []).filter(x => x.id !== 'curse'); sm.push('Kletby sňaty.'); }
    let k = (r.karma || 0) + (r.cha_karma && ap === 'charisma' ? 1 : 0) + (r.magic_karma && ap === 'magic' ? 1 : 0);
    if (k) { p.karma = (p.karma || 0) + k; sm.push(`+${k} karma.`); }
    if (b.id === 'b27' && !F.potionUsed) { sm.push(`Bez lektvaru: +1 zk.${addXp(p, 1)}`); }
    [ap === 'charisma' && r.cha_text, ap === 'magic' && r.win_magic_text, r.extra].filter(Boolean).forEach(t => sm.push(`📝 ${t}`));
    sm.push(`↻ ${b.name} se vrátí na své místo (${BY_ID[respawnLoc(b)].name}) v kole ${st.back}.`);
    addLog(`🏆 ${p.name} porazil bosse ${b.name}! +${r.gp} GB, +${r.g}Z, +${r.xp} zk. (Vrátí se v kole ${st.back}.)`);
  } else if (F.result === 'timeout') addLog(`⏳ ${p.name} bojoval s bossem ${b.name} – boss přežil (štíty ${st.sh}, životy ${st.hp}).`);
  else if (F.result === 'fled') { const g = F.fleeGold || 0; p.gold += g; st.dead = true; st.by = null; sm.push(`Boss utekl a už se nevrátí${g ? `; získáváš ${g} 🪙` : ''}.`); addLog(`💨 ${b.name} utekl před hrdinou ${p.name}.`); }
  else if (F.result === 'left' || F.result === 'passed') addLog(`🤝 ${p.name} a ${b.name} se rozešli bez boje do konce.`);
  else if (F.result === 'draw') addLog(`🍺 ${p.name} a ${b.name} – remíza u rumu.`);
  else addLog(`☠️ ${p.name} padl v souboji s bossem ${b.name}.`);
  C.summary = sm.join('<br>');
}
function closeCombat() {
  const C = S.combat; if (!C || (C.F && !C.F.done) || (C.type === 'pvp' && !C.done)) return;
  const p = cur(); S.combat = null; $('combat').classList.add('hidden');
  if (S.over) { renderAll(); save(); return showVictory(); }
  const ko = knockout(p);
  lastResult = (C.type === 'pvp' ? `⚔️ Souboj skončil.` : `⚔️ Souboj s bossem skončil.`) + (C.summary ? '<br>' + C.summary : '') + ko;
  renderAll(); save(); openPanel(p.loc); renderPanel();
}
// PvP: dva hrdinové na stejném poli, každý 1 náhodná karta, jedna výměna úderů
function pvpBlock(a, b) {
  if (a === b) return 'Sám se sebou bojovat nemůžeš.';
  if (a.loc !== b.loc) return 'Souboj jen na stejném poli.';
  if (a.side === b.side && a.side !== 'neutral') return `${SIDE_LABEL[a.side]} hrdinové jsou spojenci – spolu nebojují.`;
  if (b.hp <= 0) return `${b.name} je vyčerpaný.`;
  return null;
}
function startPvp(p, q) {
  const why = pvpBlock(p, q); if (why) { toast(why); return; }
  spendUse('pvp');
  const ca = drawCards(p, 1)[0], cbb = drawCards(q, 1)[0];
  S.combat = { type: 'pvp', a: S.players.indexOf(p), b: S.players.indexOf(q), ca, cb: cbb, done: false, lines: [] };
  addLog(`⚔️ ${p.name} vyzval na souboj hráče ${q.name}!`);
  save(); openCombat();
}
const fighter = (p, c) => ({ name: p.name, hp: p.hp, atk: stat(p, atkKeyOf(p)), atkName: STAT_NAME[atkKeyOf(p)], def: stat(p, 'obr'), card: c, town: isSettlement(BY_ID[p.loc]), evil: p.side === 'evil' });
function renderPvp() {
  const C = S.combat, A = S.players[C.a], B = S.players[C.b], box = $('combat-body');
  const side = (p, c) => `<div class="cb-pvp-side"><img class="cb-por" src="${ASSETS[heroById(p.hero).img]}" alt=""><div class="cb-name">${p.name}</div><div class="cb-stats">❤️ ${p.hp}/${MAX_HP} · ${STAT_NAME[atkKeyOf(p)]} ${stat(p, atkKeyOf(p))} · Obrana ${stat(p, 'obr')}</div>
    <img class="cb-pvp-card" src="${cardImg(c)}" alt="${c.name}" title="${c.name}"><div class="cb-stats"><b>${c.name}</b> (+${c.att} / +${c.deff})${c.once ? ' · ① 1× za hru' : ''}</div></div>`;
  box.innerHTML = `<h3 class="cb-h">${C.finale ? `🏁 FINÁLNÍ SOUBOJ o vítězství – výměna ${C.ex}` : `⚔️ Souboj hrdinů – ${BY_ID[A.loc].name}`}</h3><div class="cb-pvp">${side(A, C.ca)}<div class="cb-vs">VS</div>${side(B, C.cb)}</div>
    <div class="cb-log" id="cb-log">${C.lines.map(l => `<div>${l}</div>`).join('')}</div>`;
  const act = el('div', 'cb-act');
  if (!C.done) act.appendChild(makeDie({ id: 'cb-die', wrapId: 'cb-die-wrap', label: C.finale ? `👆 Klepni a hoď – ${A.name} útočí první` : `👆 Klepni a hoď (${B.name} hází současně)`, onRoll: v => pvpRoll(v) }));
  else { act.appendChild(el('div', 'cb-result', C.summary)); const ok = el('button', 'btn btn-gold', 'Pokračovat'); ok.id = 'cb-close'; ok.onclick = () => closeCombat(); act.appendChild(ok); }
  box.appendChild(act);
}
function pvpRoll(v) {
  const C = S.combat; if (!C || C.done) return;
  if (C.finale) return finaleRoll(v);
  const A = S.players[C.a], B = S.players[C.b], rb = nextRoll();
  const r = GSCombat.pvp(fighter(A, C.ca), fighter(B, C.cb), v, rb);
  A.hp = Math.max(0, Math.min(MAX_HP, A.hp - r.dmgToA + (r.healA || 0))); B.hp = Math.max(0, Math.min(MAX_HP, B.hp - r.dmgToB + (r.healB || 0)));
  [[A, C.ca], [B, C.cb]].forEach(([p, c]) => { if (c.once) { p.usedCards = p.usedCards || []; if (!p.usedCards.includes(c.id)) p.usedCards.push(c.id); } });
  C.lines = r.lines; C.done = true;
  const sm = [];
  if (r.winner) { const w = r.winner === 'a' ? A : B, l = r.winner === 'a' ? B : A, g = Math.min(1, l.gold); l.gold -= g; w.gold += g; const lv = addXp(w, 1);
    sm.push(`🏆 Vítěz: <b>${w.name}</b> (+1 zk.${g ? ', vezme 1 🪙' : ''}).${lv}`); addLog(`⚔️ Souboj ${A.name} × ${B.name}: vyhrál ${w.name}.`); }
  else { sm.push('🤝 Nerozhodně.'); addLog(`⚔️ Souboj ${A.name} × ${B.name}: nerozhodně.`); }
  [[A, r.statusToA], [B, r.statusToB]].forEach(([p, st]) => { if (st && STATUS[st]) { addStatus(p, st, 2); sm.push(`${STATUS[st].ic || '☠️'} ${p.name} dostává stav <b>${STATUS[st].n}</b>.`); } }); // v12 Houbík: Mykóza (Nákaza), Otrava
  if (B.hp <= 0) { B.restPending = true; sm.push(`☠️ ${B.name} klesl na 0 životů – odpočine si na začátku svého tahu.`); addLog(`☠️ ${B.name} klesl v souboji na 0 životů.`); }
  C.summary = sm.join('<br>');
  save(); renderAll(); renderCombat();
}

// ---------- STAV ----------
let S = null;          // stav hry
let zoom = 1;
let setup = { n: 2, players: [] };
const MAX_PLAYERS = 6; // v11
let panelLoc = null, selAbility = null, selOpt = null, lastResult = null;
const $ = id => document.getElementById(id);
const el = (t, cls, html) => { const e = document.createElement(t); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const cur = () => S.players[S.cur];

function save() { if (NET.role === 'guest') return; try { localStorage.setItem('grumpstone_save', JSON.stringify(S)); } catch (e) {} if (NET.role === 'host') netBroadcast(); }
function loadSave() { try { const s = JSON.parse(localStorage.getItem('grumpstone_save')); return s && s.v === 1 ? s : null; } catch (e) { return null; } }

// ---------- OBRAZOVKY ----------
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }

function initTitle() {
  $('title-img').src = ASSETS.title;
  $('btn-continue').classList.toggle('hidden', !loadSave());
  $('btn-start').onclick = () => { initSetup(); show('screen-setup'); };
  $('btn-continue').onclick = () => { S = loadSave(); if (S) startGame(); };
  const gs = netLoadGuest(), rj = $('btn-rejoin');
  if (rj) { rj.classList.toggle('hidden', !(gs && gs.code && gs.token)); if (gs) rj.textContent = `🌐 Zpět do online hry ${gs.code}`;
    rj.onclick = () => { initSetup(); setGameMode('online'); show('screen-setup'); setup.players = []; netJoin(gs.code, gs.name); }; }
  const rq = netNorm(netQuery().get('room') || ''); if (rq && !NET.role && !initTitle.done) { initTitle.done = true;
    if (gs && gs.code === rq && gs.token) rj.onclick(); // stejný odkaz po obnovení stránky → rovnou zpět na své místo
    else { initSetup(); setGameMode('online'); show('screen-setup'); } }
}

function defaultPlayer(i) {
  const used = setup.players.map(p => p.hero);
  const hero = HEROES.find(h => !used.includes(h.id)).id;
  const usedC = setup.players.map(p => p.color);
  return { name: 'Hráč ' + (i + 1), hero, color: COLORS.find(c => !usedC.includes(c.id)).id };
}
let setupTab = 0;
function initSetup() {
  setup = { n: 2, players: [], mode: 'hot', diff: (setup && setup.diff) || 'normal' }; setupTab = 0;
  for (let i = 0; i < 2; i++) setup.players.push(defaultPlayer(i));
  renderSetup();
}
// v18: režim „1 hráč + počítač“ – hráč 1 je člověk, 1–5 soupeřů hraje počítač (náhodní různí hrdinové; dají se přepsat v záložkách).
function aiRandomize(pl, i) {
  const used = new Set(setup.players.filter(q => q !== pl).map(q => q.hero));
  pl.hero = pick(HEROES.filter(h => !used.has(h.id))).id;
  if (!pl.name || /^Hráč \d+$/.test(pl.name) || /^Počítač \d+$/.test(pl.name)) pl.name = 'Počítač ' + i;
}
function setAiCount(k) {
  k = Math.max(1, Math.min(MAX_PLAYERS - 1, k)); setup.mode = 'ai'; setup.n = 1 + k;
  while (setup.players.length < setup.n) setup.players.push(defaultPlayer(setup.players.length));
  setup.players.length = setup.n;
  setup.players.forEach((pl, i) => { const was = pl.ai; pl.ai = i > 0; if (i === 0 && /^Počítač \d+$/.test(pl.name)) pl.name = 'Hráč 1'; if (pl.ai && !was) aiRandomize(pl, i); });
  setupTab = Math.min(setupTab, setup.n - 1); renderSetup();
}
function setGameMode(m) {
  if (m === 'online') { setup.mode = 'online'; setup.players.forEach(pl => { pl.ai = false; }); setup.players.length = 1; setup.n = 1; setupTab = 0; return renderSetup(); }
  if (setup.mode === 'online' && !NET.role) { setup.mode = 'hot'; while (setup.players.length < 2) setup.players.push(defaultPlayer(setup.players.length)); setup.n = setup.players.length; }
  if (m === 'ai') return setAiCount(Math.max(1, (setup.players.filter(q => q.ai).length) || 3));
  setup.mode = 'hot'; setup.players.forEach((pl, i) => { if (pl.ai) { pl.ai = false; if (/^Počítač \d+$/.test(pl.name)) pl.name = 'Hráč ' + (i + 1); } }); renderSetup();
}
function renderSetup() {
  const gm = $('game-mode');
  if (gm) { gm.innerHTML = '';
    [['hot', '👥 Hra více hráčů u jednoho zařízení'], ['ai', '🤖 1 hráč + počítač'], ['online', '🌐 Online hra']].forEach(([m, t]) => { const b = el('button', setup.mode === m ? 'on' : '', t); b.dataset.mode = m;
      b.disabled = !!NET.role && m !== 'online'; b.onclick = () => setGameMode(m); gm.appendChild(b); });
    const ab = $('ai-setup'); ab.innerHTML = '';
    const onl = setup.mode === 'online';
    $('player-setup').classList.toggle('hidden', onl && (!NET.role || !setup.players.length));
    $('btn-play').classList.toggle('hidden', onl && !isHostNet());
    $('btn-play').textContent = onl ? '🌐 Spustit online hru' : 'Vyrazit na výpravu';
    if (onl) netSetupPanel(ab);
    const anyAI = setup.players.some(q => q.ai);
    if (setup.mode === 'ai') {
      ab.appendChild(el('h3', '', 'Počet počítačových soupeřů'));
      const sg = el('div', 'seg'); sg.id = 'ai-count';
      for (let k = 1; k < MAX_PLAYERS; k++) { const b = el('button', setup.players.filter(q => q.ai).length === k ? 'on' : '', k); b.dataset.k = k; b.onclick = () => setAiCount(k); sg.appendChild(b); }
      ab.appendChild(sg);
    }
    if ((anyAI || setup.mode === 'ai') && !onl) {
      ab.appendChild(el('h3', '', 'Obtížnost počítače'));
      const dg = el('div', 'seg seg-wide'); dg.id = 'ai-diff';
      [['normal', '🙂 Normální'], ['hard', '😈 Těžká']].forEach(([d, t]) => { const b = el('button', setup.diff === d ? 'on' : '', t); b.dataset.diff = d; b.onclick = () => { setup.diff = d; renderSetup(); }; dg.appendChild(b); });
      ab.appendChild(dg);
      ab.appendChild(el('p', 'hint', setup.diff === 'hard' ? 'Těžká: počítač hraje chamtivě – lépe odhaduje souboje, jde tvrdě po Grumpstone bodech a brzdí vedoucího hráče.' : 'Normální: počítač hraje opatrně a občas se rozhodne trochu náhodně.'));
    }
    $('pc-h').classList.toggle('hidden', setup.mode === 'ai' || onl); $('player-count').classList.toggle('hidden', setup.mode === 'ai' || onl);
  }
  const pc = $('player-count'); pc.innerHTML = '';
  for (let n = 1; n <= MAX_PLAYERS; n++) {
    const b = el('button', n === setup.n ? 'on' : '', n); b.dataset.n = n;
    b.onclick = () => { setup.n = n; while (setup.players.length < n) setup.players.push(defaultPlayer(setup.players.length)); setup.players.length = n; setupTab = Math.min(setupTab, n - 1); renderSetup(); };
    pc.appendChild(b);
  }
  const box = $('player-setup'); box.innerHTML = '';
  // záložky hráčů
  const tabs = el('div', 'ptabs');
  if (!setup.players.length) return;
  if (!netCanEditSeat(setupTab)) setupTab = NET.mySeat;
  setup.players.forEach((pl, i) => {
    const h = heroById(pl.hero), col = COLORS.find(c => c.id === pl.color).c;
    const t = el('button', 'ptab' + (i === setupTab ? ' on' : '') + (pl.ai ? ' ai' : ''), `<img src="${ASSETS[h.img]}" alt="" style="border-color:${col}"><span><b>${pl.ai ? '🤖 ' : ''}${pl.name || 'Hráč ' + (i + 1)}</b><small>${h.name}</small></span>`);
    t.dataset.tab = i; t.onclick = () => { if (!netCanEditSeat(i)) { toast(`${pl.name} si hrdinu vybírá sám na svém zařízení.`); return; } setupTab = i; renderSetup(); }; tabs.appendChild(t);
  });
  box.appendChild(tabs);
  const pl = setup.players[setupTab], i = setupTab;
  const d = el('div', 'pset');
  const head = el('div', 'pset-head');
  const inp = el('input'); inp.value = pl.name; inp.maxLength = 18; inp.setAttribute('aria-label', 'Jméno hráče');
  inp.oninput = () => { pl.name = inp.value; const tb = box.querySelector(`.ptab[data-tab="${i}"] b`); if (tb) tb.textContent = inp.value || 'Hráč ' + (i + 1); };
  inp.onchange = () => netSeatChanged(i);
  head.appendChild(el('b', '', `Hráč ${i + 1}`)); head.appendChild(inp);
  const cols = el('div', 'colors');
  COLORS.forEach(c => {
    const b = el('button', pl.color === c.id ? 'on' : ''); b.style.background = c.c; b.title = c.n;
    b.disabled = setup.players.some((o, j) => j !== i && o.color === c.id);
    b.onclick = () => { pl.color = c.id; renderSetup(); netSeatChanged(i); };
    cols.appendChild(b);
  });
  head.appendChild(cols);
  const aiL = el('label', 'ai-toggle', `<input type="checkbox" ${pl.ai ? 'checked' : ''}> 🤖 Hraje počítač`); aiL.title = 'Za tohoto hráče táhne počítač (lze kombinovat lidi a počítač).';
  aiL.querySelector('input').onchange = e => { pl.ai = e.target.checked; if (pl.ai) aiRandomize(pl, i); else if (/^Počítač \d+$/.test(pl.name)) pl.name = 'Hráč ' + (i + 1); renderSetup(); };
  if (setup.mode !== 'online') head.appendChild(aiL);
  if (pl.ai) { const rb = el('button', 'btn btn-dark btn-sm', '🎲 Náhodný hrdina'); rb.onclick = () => { aiRandomize(pl, i); renderSetup(); netSeatChanged(i); }; head.appendChild(rb); }
  if (pl.ai && isHostNet() && i > 0) { const xb = el('button', 'btn btn-dark btn-sm', '✖ Odebrat počítač'); xb.onclick = () => netRemoveSeat(i); head.appendChild(xb); }
  d.appendChild(head);
  d.appendChild(el('div', 'pick-hint', 'Vyber hrdinu (klepnutím). Šedé karty už mají jiní hráči.'));
  const detail = el('div', 'hero-detail');
  d.appendChild(detail);
  const showDetail = h => { detail.innerHTML = `<b>${h.name}</b> · ${h.cls} · ${alignBadge(h)} ${sideTag(h)}<br>${h.desc}${h.motto ? `<br><i>${h.motto}</i>` : ''}${h.note ? `<br><i>${h.note}</i>` : ''}${h.lore ? `<details class="hero-lore"><summary>📜 Příběh</summary><div class="lore-imgs">${ASSETS['art_' + h.id] ? `<img src="${ASSETS['art_' + h.id]}" alt="">` : ''}${ASSETS['fig_' + h.id] ? `<img class="fig" src="${ASSETS['fig_' + h.id]}" alt="figurka" title="Figurka">` : ''}</div>${h.lore.map(t => `<p>${t}</p>`).join('')}</details>` : ''}<br><small>Statistiky (prozatímní): ${['boj', 'obr', 'int', 'cha'].map((k, i) => `${STAT_NAME[k]} ${HSTAT[h.id][i]}`).join(' · ')} · hlavní vlastnost: <b>${TRAIN_ALLOW[ROLE[h.id]].map(x => STAT_NAME[x]).join(' a ')}</b> (placený trénink 1× za level)</small>`; };
  SIDE_ORDER.forEach(side => {
  d.appendChild(el('div', 'side-group', `${SIDE_GROUP[side]} <span class="side-tag ${side}">${SIDE_LABEL[side]}</span>`));
  const hs = el('div', 'heroes'); hs.dataset.side = side;
  HEROES.filter(h => h.side === side).forEach(h => {
    const owner = setup.players.findIndex((o, j) => j !== i && o.hero === h.id);
    const b = el('button', 'hero' + (pl.hero === h.id ? ' on' : '') + (owner >= 0 ? ' taken' : ''),
      `<span class="hp-img"><img src="${ASSETS[h.img]}" alt="${h.name}" loading="lazy">${owner >= 0 ? `<em>${setup.players[owner].name || 'Hráč ' + (owner + 1)}</em>` : ''}</span>
       <span class="h-txt"><b>${h.name}</b><small>${h.cls}</small>${alignBadge(h)}</span>`);
    b.dataset.hero = h.id; b.title = h.desc + (h.note ? ' ' + h.note : '');
    b.disabled = owner >= 0;
    b.onmouseenter = () => showDetail(h); b.onfocus = () => showDetail(h);
    b.onmouseleave = () => showDetail(heroById(pl.hero));
    b.onclick = () => { pl.hero = h.id; renderSetup(); netSeatChanged(i); };
    hs.appendChild(b);
  });
  d.appendChild(hs);
  });
  showDetail(heroById(pl.hero));
  box.appendChild(d);
}

function newGame() {
  S = {
    v: 1, round: 1, cur: 0, steps: 0, canUse: false, lock: 'start', stayed: false,
    abilities: rollAbilities(), log: [], shops: {}, pending: null, combat: null, bosses: {}, npcOn: true, npcDeck: null, npcDiscard: [], npc: null,
    players: setup.players.map(pl => ({
      name: (pl.name || '').trim() || 'Hráč', hero: pl.hero, side: heroById(pl.hero).side, color: COLORS.find(c => c.id === pl.color).c,
      hp: MAX_HP, gold: 5, karma: 0, level: 1, gp: 0, loc: START, items: [], potions: 0, horse: false, mount: null,
      train: { boj: 0, obr: 0, int: 0, cha: 0 }, intel: [], xp: 0, quests: [], blessing: false, equip: [], bag: [], status: [], usedCards: [], ai: !!pl.ai
    }))
  };
  S.aiDiff = setup.diff || 'normal';
  addLog('Výprava vyráží z Telgarionu! Schopnosti měst a vesnic byly náhodně rozdány.', true);
  if (S.players.some(isAI)) addLog(`🤖 Počítačoví soupeři: ${S.players.filter(isAI).map(q => q.name).join(', ')} – obtížnost ${aiCfg().n}.`, true);
  addLog(`Kolo 1 – na tahu ${S.players[0].name}.`, true);
}

// ---------- HRA ----------
function startGame() {
  S.players.forEach(p => { migrateGear(p); p.mount = mountOf(p); p.horse = !!p.mount; if (p.potions > POTION_MAX) p.potions = POTION_MAX; if (!p.bag) p.bag = []; if (!p.status) p.status = []; delete p.items; });
  S.bosses = S.bosses || {}; S.players.forEach(p => { if (!p.usedCards) p.usedCards = []; if (p.xp == null) p.xp = 0; if (!p.quests) p.quests = []; p.train = Object.assign({ boj: 0, obr: 0, int: 0, cha: 0 }, p.train); });
  show('screen-game');
  $('map-img').src = ASSETS.map;
  buildBoard();
  renderAll();
  setTimeout(centerOnActive, 60);
  $('menu-npc').textContent = 'NPC karty: ' + (S.npcOn === false ? 'vypnuto' : 'zapnuto');
  $('npc').classList.add('hidden');
  if (S.npc) setTimeout(openNpc, 120);
  else if (S.pending) setTimeout(() => openPanel(S.pending.loc), 120);
  if (S.combat) setTimeout(openCombat, 150); else $('combat').classList.add('hidden');
  if (S.over && !S.combat) setTimeout(showVictory, 200); else if (S.finalePending && !S.combat && !isAI(cur())) setTimeout(openFinale, 200);
  save();
  aiGen++; aiBusy = false; aiKick(700);
  if (S.online && !NET.role) netHost(S.online.code); // hostitel po obnovení stránky znovu otevře místnost
  netBar();
}

function buildBoard() {
  const svg = $('paths'); svg.innerHTML = '';
  const NS = 'http://www.w3.org/2000/svg';
  const done = new Set();
  PLACES.forEach(a => ADJ[a.id].forEach(bid => {
    const k = [a.id, bid].sort().join('|'); if (done.has(k)) return; done.add(k);
    const b = BY_ID[bid]; const ln = document.createElementNS(NS, 'line');
    ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y); ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
    ln.dataset.k = k; if (SEA.has(a.id + '|' + bid)) ln.classList.add('sea');
    svg.appendChild(ln);
  }));
  const tk = $('tokens'); tk.innerHTML = '';
  PLACES.forEach(p => {
    const kind = isSettlement(p) ? p.type : 'wild ' + p.type;
    const b = el('button', 'token ' + kind, `<span class="ic">${iconOf(p)}</span><span class="lbl">${p.name}</span>`);
    b.style.left = (p.x / MAP_W * 100) + '%'; b.style.top = (p.y / MAP_H * 100) + '%';
    b.dataset.id = p.id; b.title = `${p.name} – ${TYPE_LABEL[p.type]}`; b.setAttribute('aria-label', p.name);
    b.onclick = () => openPanel(p.id);
    tk.appendChild(b);
  });
  requestAnimationFrame(fitUnits);
}
function fitUnits() {
  const b = $('board'), w = $('board-scroll'); if (!b || !w.clientWidth) return;
  let base = Math.min(w.clientWidth, w.clientHeight * MAP_W / MAP_H);
  if (w.clientWidth < 760) base = Math.max(base, 1100); // mobil: větší mapa, posouvá se prstem
  const W = Math.round(base * zoom);
  b.style.width = W + 'px';
  b.style.setProperty('--u', (W / MAP_W) + 'px');
}
window.addEventListener('resize', fitUnits);

// v11 pohyb: pozemní cesty volně; na moře jen na palubě lodi (zaplaceno v tomto kole) nebo nouzovým stopem (0 🪙, 1 sousední mořská cesta, zdržení).
const sideOf = p => p.side || heroById(p.hero).side;
const shipAllowed = (p, id) => !isMole(p) && SHIPS[id].sides.includes(sideOf(p));
// v15 Velebníček Vodička umí plavat: bez lodi a zdarma 1 sousední lokace po mořské cestě za pochod (ne skok lodí kamkoli).
const SWIM_HEROES = new Set(['vodicka']);
const canSwim = p => !!p && SWIM_HEROES.has(p.hero);
function shipOf(p) { const i = S.players.indexOf(p), s = S.ships && S.ships[i]; return s && s.round === S.round && SHIPS[s.id] ? s.id : null; }
// v16 Chadimpetro – Podzemní chodby: jedním pochodem až o 2 lokace po souši (prostřední lokaci podkope – žádná akce ani setkání). Nikdy na moře.
function tunnelVia(p, to) { if (!isMole(p) || !LADJ[p.loc] || LADJ[p.loc].has(to)) return null; return [...LADJ[p.loc]].find(m => LADJ[m].has(to) && m !== to) || null; }
function moveKind(p, to) {
  if (!BY_ID[to] || to === p.loc) return null;
  if (isMole(p)) return LADJ[p.loc] && LADJ[p.loc].has(to) ? 'land' : tunnelVia(p, to) && !OFFSHORE.has(to) ? 'tunnel' : null;
  if (LADJ[p.loc].has(to)) return 'land';
  const seaEdge = SEA.has(p.loc + '|' + to);
  if (shipOf(p) && isCoast(p.loc) && (seaEdge || isCoast(to))) return 'ship'; // na palubě: kterákoli mořská lokace i přístav
  if (seaEdge && canSwim(p)) return 'swim'; // v15 Vodička: plavání – 1 sousední lokace přes vodu za pochod, zdarma
  if (seaEdge && !shipOf(p) && p.gold < SHIP_PRICE && !S.hitched) return 'hitch';
  return null;
}
const MOLE_WATER = 'Chadimpetro do vody ani na loď nevleze – jakmile nemá půdu pod nohama, ztrácí hlavu.';
function seaWhy(p, to) {
  if (moveKind(p, to)) return null;
  if (isMole(p)) return (SEA.has(p.loc + '|' + to) || OFFSHORE.has(to)) ? MOLE_WATER : null;
  if (SEA.has(p.loc + '|' + to) || (isCoast(to) && isCoast(p.loc) && !(MAINLAND.has(to) && MAINLAND.has(p.loc)))) return p.gold >= SHIP_PRICE ? `⛵ Na moře se dostaneš jen lodí – klikni na žeton lodi (${SHIP_PRICE} 🪙, platí celé kolo).` : 'Nouzový stop už jsi v tomto tahu využil.';
  return null;
}
function reachable() { if (S.steps >= MAXST()) return new Set(); const p = cur(); return new Set(PLACES.map(x => x.id).filter(id => moveKind(p, id))); }
function shipWhy(p, id) {
  if (S.combat || S.pending || S.npc) return 'Nejdřív dokonči rozehranou akci.';
  if (isMole(p)) return MOLE_WATER;
  if (!shipAllowed(p, id)) return `${SHIPS[id].n} vozí jen ${SHIPS[id].sides.map(x => SIDE_GROUP[x].toLowerCase()).join(' a ')} hrdiny.`;
  if (shipOf(p)) return `Na palubě už jsi (${SHIPS[shipOf(p)].n}) – platí do konce kola.`;
  if (!isCoast(p.loc)) return 'Nalodit se můžeš jen v přístavu (Černovod, Stříbrný Hradec, Rybářská osada, Šedý přístav) nebo na moři.';
  if (S.steps >= MAXST()) return 'Pochody máš vyčerpané.';
  if (p.gold < SHIP_PRICE) return `Nemáš ${SHIP_PRICE} 🪙 – zbývá nouzový stop na obchodní lodi (jen 1 sousední mořská lokace, zdržení).`;
  return null;
}
function boardShip(id) {
  const p = cur(), why = shipWhy(p, id); if (why) { toast(why); return false; }
  p.gold -= SHIP_PRICE; S.ships = S.ships || {}; S.ships[S.cur] = { id, round: S.round };
  addLog(`⛵ ${p.name} se nalodil na ${SHIPS[id].n} (−${SHIP_PRICE}Z) – do konce kola může jedním pochodem na kteroukoli mořskou lokaci.`);
  renderAll(); save(); if (panelLoc) openPanel(panelLoc); return true;
}
function openShipModal(id) {
  const p = cur(), sh = SHIPS[id], why = shipWhy(p, id);
  let m = $('ship-modal'); if (m) m.remove();
  m = el('div', 'mount-modal ship-modal'); m.id = 'ship-modal';
  m.innerHTML = `<div class="mount-sheet"><div class="mount-h">⛵ ${sh.n}</div><div class="mount-sub">${sh.d}</div>
    <img class="ship-pic" src="${sh.img}" alt="${sh.n}">
    <div class="mount-sub">Za <b>${SHIP_PRICE} 🪙</b> jsi na palubě celé kolo: otevřou se všechny mořské lokace a <b>na kteroukoli z nich (i do kteréhokoli přístavu) se dostaneš jedním pochodem</b>. Další kolo platíš znovu.<br><small>Bez peněz: nouzový stop na obchodní lodi – jen 1 sousední mořská lokace a zdržení (akci lokace využiješ v tahu jen jednu).</small></div>
    ${why ? `<div class="item-why">🚫 ${why}</div>` : ''}
    <div class="mount-act"><button class="btn btn-dark" id="ship-cancel">Zrušit</button><button class="btn btn-gold" id="ship-ok" ${why ? 'disabled' : ''}>Nastoupit (−${SHIP_PRICE} 🪙)</button></div></div>`;
  document.body.appendChild(m);
  $('ship-cancel').onclick = () => m.remove();
  $('ship-ok').onclick = () => { if (boardShip(id)) m.remove(); };
}

function renderAll() { renderTop(); renderBoardState(); renderPlayers(); renderLog(); netDecorate(); netBar(); }

function renderTop() {
  const p = cur(), h = HEROES.find(x => x.id === p.hero);
  $('tb-round').textContent = 'Kolo ' + S.round;
  let dn = $('tb-daynight'); const anyV = S.players.some(q => DAY_HEROES.has(q.hero));
  if (anyV && !dn) { dn = el('span', 'pill daynight'); dn.id = 'tb-daynight'; $('tb-round').after(dn); }
  if (dn) { dn.classList.toggle('hidden', !anyV); dn.classList.toggle('day', isDayRound()); dn.textContent = isDayRound() ? '☀️ Den' : '🌙 Noc';
    dn.title = isDayRound() ? 'Sudé kolo = den pro upíra Olgricha: cesta −1 ❤️, nebo přečkat den a využít 2 schopnosti.' : 'Liché kolo = noc: Olgrich hraje normálně.'; }
  $('btn-stay').textContent = isDayFor(p) && S.steps === 0 && !S.acted ? '☀️ Přečkat den' : 'Zůstat';
  $('tb-player').innerHTML = `<img class="tb-por" src="${ASSETS[h.img]}" alt="" style="border-color:${p.color}">${p.ai ? '🤖 ' : ''}${p.name} · ${h.name}`;
  const st = $('tb-steps');
  if (S.steps >= MAXST()) { st.textContent = 'Pochody vyčerpány'; st.classList.add('done'); }
  else { st.textContent = `Pochod ${S.steps + 1}/${MAXST()}`; st.classList.remove('done'); }
  $('btn-stay').disabled = S.steps >= MAXST();
}

function renderBoardState() {
  const r = reachable(), here = cur().loc;
  document.querySelectorAll('.token').forEach(t => {
    t.classList.toggle('reach', r.has(t.dataset.id));
    t.classList.toggle('swim', r.has(t.dataset.id) && moveKind(cur(), t.dataset.id) === 'swim');
    t.classList.toggle('tunnel', r.has(t.dataset.id) && moveKind(cur(), t.dataset.id) === 'tunnel');
    t.classList.toggle('here', t.dataset.id === here);
    t.classList.toggle('quest', (cur().quests || []).some(q => q.target === t.dataset.id));
  });
  document.querySelectorAll('#paths line').forEach(l => {
    const [a, b] = l.dataset.k.split('|');
    l.classList.toggle('reach', (a === here && r.has(b)) || (b === here && r.has(a)));
    l.classList.toggle('swim', l.classList.contains('reach') && moveKind(cur(), a === here ? b : a) === 'swim');
    const tun = isMole(cur()) && r.size && ((LADJ[here].has(a) && r.has(b) && moveKind(cur(), b) === 'tunnel' && LADJ[a].has(b)) || (LADJ[here].has(b) && r.has(a) && moveKind(cur(), a) === 'tunnel' && LADJ[b].has(a)));
    l.classList.toggle('tunnel', !!tun);
  });
  // pěšáci + bossové
  const pw = $('pawns'); pw.innerHTML = '';
  activeBosses().forEach(b => { const st = bossState(b.id); const pl = BY_ID[st.loc]; if (!pl) return;
    const d = el('div', `boss-tok t${b.tier}`); d.style.backgroundImage = `url(${b.token})`; d.dataset.boss = b.id;
    d.style.left = ((pl.x - 30) / MAP_W * 100) + '%'; d.style.top = ((pl.y + 26) / MAP_H * 100) + '%';
    d.title = `👹 ${b.name} – ${TIER_NAME[b.tier]} (štíty ${st.sh}/${b.sh}, životy ${st.hp}/${b.hp})`;
    if (st.sh < b.sh || st.hp < b.hp) d.classList.add('hurt'); d.onclick = e => { e.stopPropagation(); openPanel(st.loc); }; pw.appendChild(d); });
  pendingRespawns().forEach(b => { const st = S.bosses[b.id], pl = BY_ID[respawnLoc(b)]; if (!pl || bossAt(pl.id)) return;
    const d = el('div', `boss-ghost t${b.tier}`, `↻${st.back}`); d.dataset.ghost = b.id;
    d.style.left = ((pl.x - 30) / MAP_W * 100) + '%'; d.style.top = ((pl.y + 26) / MAP_H * 100) + '%';
    d.title = `💀 ${b.name} byl poražen – vrátí se v kole ${st.back}`; d.onclick = e => { e.stopPropagation(); openPanel(pl.id); }; pw.appendChild(d); });
  Object.entries(SHIPS).forEach(([sid, sh]) => { const me = cur(), ok = shipAllowed(me, sid);
    const d = el('button', 'ship-tok' + (ok ? '' : ' off') + (shipOf(me) === sid ? ' aboard' : '')); d.dataset.ship = sid; d.style.backgroundImage = `url(${sh.tok})`;
    d.style.left = (sh.x / MAP_W * 100) + '%'; d.style.top = (sh.y / MAP_H * 100) + '%';
    d.title = ok ? `⛵ ${sh.n} – nalodit se za ${SHIP_PRICE} 🪙 na celé kolo` : `${sh.n}: ${shipWhy(me, sid)}`; d.setAttribute('aria-label', sh.n);
    d.disabled = !ok; d.onclick = e => { e.stopPropagation(); if (ok) openShipModal(sid); }; pw.appendChild(d); });
  const groups = {};
  S.players.forEach((p, i) => (groups[p.loc] = groups[p.loc] || []).push(i));
  Object.entries(groups).forEach(([loc, idx]) => {
    const pl = BY_ID[loc];
    idx.forEach((i, k) => {
      const p = S.players[i], h = HEROES.find(x => x.id === p.hero);
      const ang = -Math.PI / 2 + (k - (idx.length - 1) / 2) * 1.2;
      const R = 44;
      const d = el('div', 'pawn' + (i === S.cur ? ' active' : ''));
      d.style.borderColor = p.color; d.style.backgroundImage = `url(${ASSETS[h.img]})`;
      d.style.left = ((pl.x + Math.cos(ang) * R + 22) / MAP_W * 100) + '%';
      d.style.top = ((pl.y + Math.sin(ang) * R) / MAP_H * 100) + '%';
      d.title = `${p.name} (${h.name})${hasMount(p) ? ' · ' + mountName(p) : ''}${shipOf(p) ? ' · ⛵ ' + SHIPS[shipOf(p)].n : ''}`;
      if (shipOf(p)) { const sb = el('i', 'pawn-ship'); sb.style.backgroundImage = `url(${SHIPS[shipOf(p)].tok})`; d.appendChild(sb); }
      if (mountOf(p)) { const mb = el('i', 'pawn-mount'); mb.style.backgroundImage = `url(${MOUNTS[mountOf(p)].tok})`; d.appendChild(mb); }
      pw.appendChild(d);
    });
  });
}

function renderPlayers() {
  const box = $('players'); box.innerHTML = '';
  S.players.forEach((p, i) => {
    const h = HEROES.find(x => x.id === p.hero);
    const c = el('div', 'pcard' + (i === S.cur ? ' active' : ''));
    const tr = Object.entries(p.train).filter(([, v]) => v).map(([k, v]) => `${STAT_NAME[k]} +${v}`).join(', ');
    c.innerHTML = `<div class="pc-top"><div class="pc-porw"><img class="pc-por" src="${ASSETS[h.img]}" alt="${h.name}" title="${h.desc}" style="border-color:${p.color}">${shipOf(p) ? `<img class="pc-ship" data-ship="${shipOf(p)}" src="${SHIPS[shipOf(p)].tok}" alt="${SHIPS[shipOf(p)].n}" title="Na palubě: ${SHIPS[shipOf(p)].n} (do konce kola)">` : ''}${mountOf(p) ? `<img class="pc-mount" data-mount="${mountOf(p)}" src="${MOUNTS[mountOf(p)].tok}" alt="${MOUNTS[mountOf(p)].n}" title="Mount: ${MOUNTS[mountOf(p)].n} (2 lokace + 1 krok navíc)">` : ''}</div><div><div class="nm"><span class="dot" style="background:${p.color}"></span>${p.ai ? '<span class="ai-badge" title="Hraje počítač">🤖</span> ' : ''}${p.name}${i === S.cur ? ' · na tahu' : ''}${DAY_HEROES.has(p.hero) ? `<span class="pc-day ${isDayRound() ? 'day' : 'night'}" title="${isDayRound() ? DAY_NOTE : 'Noc – Olgrich hraje normálně.'}">${isDayRound() ? '☀️ Den' : '🌙 Noc'}</span>` : ''}</div><div class="hr">${h.name} – ${h.cls}</div>${alignBadge(h)} ${sideTag(h)}</div></div>
      <div class="stats"><span title="Životy">❤️ ${p.hp}/${MAX_HP}</span><span title="Zlaťáky">🪙 ${p.gold}</span><span title="Karma (může být i záporná)" class="${p.karma < 0 ? 'neg' : ''}">☯️ ${p.karma}</span><span title="Level · zkušenosti${p.level >= MAX_LEVEL ? ' – maximální level' : ` (další level při ${xpNeed(p)})`}">⭐ ${p.level} <small class="xp">${p.level >= MAX_LEVEL ? 'MAX' : `(${p.xp || 0}/${xpNeed(p)} zk.)`}</small></span></div>
      <div class="hstats" title="Statistiky jsou prozatímní. Hlavní vlastnost (zvýrazněná): ${TRAIN_ALLOW[roleOf(p)].map(x => STAT_NAME[x]).join(', ')} – placený trénink 1× za level. Vedlejší rostou samy +1 každé 2 levely.">${['boj', 'obr', 'int', 'cha'].map(k => `<span class="${isMain(p, k) ? 'tr' : ''}">${isMain(p, k) ? '★' : ''}${STAT_IC[k]} ${STAT_NAME[k]} <b>${stat(p, k)}</b></span>`).join('')}${stat(p, 'spec') ? `<span class="tr">✦ Specializace <b>${stat(p, 'spec')}</b></span>` : ''}</div>
      <div class="hpbar"><i style="width:${p.hp / MAX_HP * 100}%"></i></div>
      <div class="loc">📍 ${BY_ID[p.loc].name}${hasMount(p) ? ` · 🐾 ${mountName(p)}` : ''}${shipOf(p) ? ` · ⛵ ${SHIPS[shipOf(p)].n}` : ''}${isMole(p) ? ` · <span class="pc-coal" title="Pytle uhlí – prodej jen na Tržišti, ${COAL_PRICE}Z za pytel">🪨 <b>${p.coal || 0}</b></span>` : ''} · <span class="pc-gp${p.gp >= WIN_GP ? ' win' : ''}" title="Grumpstone body – cíl ${WIN_GP}">🔷 GB <b>${p.gp}</b>/${WIN_GP}</span>${p.finale ? ' <span class="pc-finale">🏁 Finální výzva</span>' : ''}</div>
      ${tr ? `<div class="inv">Trénink: ${tr}</div>` : ''}
      ${p.intel.length ? `<div class="inv">🔎 ${p.intel.slice(-2).join('; ')}</div>` : ''}
      ${statusHTML(p)}${inventoryHTML(p, i === S.cur && !S.npc && !S.pending && !S.combat)}
      ${(p.quests || []).length ? `<div class="quests">${p.quests.map(q => `<div class="q" data-target="${q.target}">📜 ${q.goal} → <b>${BY_ID[q.target].name}</b> <small>(${distances(p.loc)[q.target]} 🥾 · ${rewardText(q.reward).join(', ')})</small></div>`).join('')}</div>` : ''}`;
    if (p.potions) {
      const b = el('button', 'btn btn-dark btn-sm potion-btn', `🧪 Léčivý lektvar ×${p.potions}/${POTION_MAX} <small>(jen v boji)</small>`);
      b.title = POTION_RULE; b.disabled = true; c.appendChild(b);
    }
    box.appendChild(c);
  });
}

function addLog(t, round) { S.log.push({ t, r: !!round }); if (S.log.length > 200) S.log.shift(); }
function renderLog() {
  const ol = $('log'); ol.innerHTML = '';
  S.log.slice().reverse().forEach(e => ol.appendChild(el('li', e.r ? 'r' : '', e.t)));
}

let toastT = 0;
function toast(t) { const d = $('toast'); d.textContent = t; d.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => d.classList.remove('show'), 2200); }

function centerOnActive() {
  const w = $('board-scroll'), b = $('board'), p = BY_ID[cur().loc];
  const x = p.x / MAP_W * b.clientWidth, y = p.y / MAP_H * b.clientHeight;
  w.scrollTo({ left: x - w.clientWidth / 2, top: y - w.clientHeight / 2, behavior: 'smooth' });
}


// ---------- KONEC HRY (v14): 30 Grumpstone bodů → Finální výzva ----------
// Kdo dosáhne 30 GB, dostane stav „Finální výzva“. Na ZAČÁTKU svého dalšího tahu (jeho poslední kolo) musí vyzvat jiného hráče –
// bez cestování, bez ohledu na přesvědčení. Souboj = PvP (1 náhodná karta každý), vyzyvatel útočí první:
// jeho úder se vyhodnotí dřív – srazí-li soupeře na 0, soupeř neodpoví; při stejném zranění vyhrává vyzyvatel; 0 : 0 = další výměna (nejvýš 3, pak se obránce ubránil).
// Výhra = vítězství ve hře. Prohra = vyzyvatel −5 GB, obránce +5 GB (dosáhne-li 30, má Finální výzvu on). Sólo hra: není koho vyzvat → vítězství.
const WIN_GP = 30, FINALE_STEAL = 5, FINALE_MAX_EX = 3;
function checkFinale(p) {
  if (!S || S.over || p.finale || (p.gp || 0) < WIN_GP) return false;
  p.finale = true; addLog(`🏁 ${p.name} má ${p.gp} Grumpstone bodů – FINÁLNÍ VÝZVA! Na začátku svého dalšího tahu musí vyzvat jiného hráče na souboj.`, true);
  finaleBanner(`🏁 FINÁLNÍ VÝZVA`, `${p.name} má ${p.gp} Grumpstone bodů! Na začátku svého dalšího tahu musí vyzvat soupeře na souboj o vítězství.`);
  return true;
}
function finaleBanner(h, t) {
  let d = $('finale-banner'); if (!d) { d = el('div', ''); d.id = 'finale-banner'; document.body.appendChild(d); d.onclick = () => d.classList.remove('show'); }
  d.innerHTML = `<div class="fb-h">${h}</div><div class="fb-t">${t}</div>`; d.classList.add('show');
  clearTimeout(d._t); d._t = setTimeout(() => d.classList.remove('show'), 4500);
}
function openFinale() {
  const p = cur(); if (!S.finalePending || S.over) return;
  if (NET.role && !myTurnNet()) return;
  const others = S.players.filter(q => q !== p);
  if (!others.length) { S.finalePending = false; addLog(`🏁 ${p.name}: sólo hra – není koho vyzvat, Finální výzva = vítězství.`, true); return declareWinner(p, 'Sólo hra: nebylo koho vyzvat – 30 Grumpstone bodů stačí.'); }
  let m = $('finale-modal'); if (m) m.remove(); const fb = $('finale-banner'); if (fb) fb.classList.remove('show');
  m = el('div', 'mount-modal'); m.id = 'finale-modal'; let pick = null;
  m.innerHTML = `<div class="mount-sheet finale-box"><div class="mount-h">🏁 FINÁLNÍ VÝZVA</div>
    <div class="fin-sub"><b>${p.name}</b> (${heroById(p.hero).name}) má <b>${p.gp}</b> Grumpstone bodů. Vyzvi jednoho soupeře na souboj o vítězství – nemusíš za ním cestovat. <b>Útočíš první.</b><br>
    Vyhraješ → <b>vítězíš celou hru</b>. Prohraješ → soupeř ti sebere <b>${FINALE_STEAL} GB</b>.</div>
    <div class="mount-grid">${others.map(q => { const i = S.players.indexOf(q), h = heroById(q.hero);
      return `<button class="mount-opt fin-opt" data-pi="${i}"><img src="${ASSETS[h.img]}" alt="${h.name}"><span><b>${q.name}</b><br><small>${h.name}<br>❤️ ${q.hp}/${MAX_HP} · 🔷 ${q.gp} GB · ⭐ ${q.level}</small></span></button>`; }).join('')}</div>
    <div class="mount-act"><button class="btn btn-gold" id="fin-ok" disabled>⚔️ Vyzvat na finální souboj</button></div></div>`;
  document.body.appendChild(m);
  m.querySelectorAll('.fin-opt').forEach(b => b.onclick = () => { pick = +b.dataset.pi; m.querySelectorAll('.fin-opt').forEach(x => x.classList.toggle('sel', x === b)); $('fin-ok').disabled = false; $('fin-ok').textContent = `⚔️ Vyzvat: ${S.players[pick].name}`; });
  $('fin-ok').onclick = () => { if (pick == null) return; m.remove(); startFinale(pick); };
}
function startFinale(bi) {
  const p = cur(), q = S.players[bi]; S.finalePending = false;
  if (q.hp <= 0) { q.hp = 1; addLog(`${q.name} se na finální souboj zvedá z prachu s 1 ❤️.`); }
  S.combat = { type: 'pvp', finale: true, a: S.cur, b: bi, ca: drawCards(p, 1)[0], cb: drawCards(q, 1)[0], done: false, lines: [], ex: 1 };
  addLog(`🏁 ${p.name} vyzývá ${q.name} na FINÁLNÍ SOUBOJ o vítězství!`, true); save(); openCombat();
}
function finaleRoll(v) {
  const C = S.combat, A = S.players[C.a], B = S.players[C.b], rb = nextRoll();
  const fa = fighter(A, C.ca), fb = fighter(B, C.cb); fb.hp = Math.max(1, fb.hp);
  const r = GSCombat.pvp(fa, fb, v, rb), ko = r.dmgToB >= fb.hp;
  const dA = ko ? 0 : r.dmgToA, dB = r.dmgToB;
  const L = [`<b>Výměna ${C.ex}</b> – ${A.name} útočí první.`, ...r.lines];
  if (ko) L.push(`⚡ První útok: ${B.name} padl dřív, než stihl odpovědět – jeho úder se nepočítá.`);
  A.hp = Math.max(0, Math.min(MAX_HP, A.hp - dA + (r.healA || 0))); B.hp = Math.max(0, Math.min(MAX_HP, B.hp - dB + (ko ? 0 : (r.healB || 0))));
  [[A, C.ca], [B, C.cb]].forEach(([p, c]) => { if (c.once) { p.usedCards = p.usedCards || []; if (!p.usedCards.includes(c.id)) p.usedCards.push(c.id); } });
  [[A, ko ? null : r.statusToA], [B, r.statusToB]].forEach(([p, st]) => { if (st && STATUS[st]) { addStatus(p, st, 2); L.push(`${STATUS[st].ic} ${p.name} dostává stav <b>${STATUS[st].n}</b>.`); } });
  C.lines = C.lines.concat(L);
  let win = ko || dB > dA ? 'a' : dA > dB ? 'b' : dB > 0 ? 'a' : null;
  if (win === 'a' && !ko && dA === dB) C.lines.push('⚡ Stejné zranění – rozhoduje první útok: vyhrává vyzyvatel.');
  if (!win) {
    if (C.ex >= FINALE_MAX_EX) { win = 'b'; C.lines.push(`🛡️ Ani ve ${FINALE_MAX_EX}. výměně nikdo nezasáhl – ${B.name} se ubránil.`); }
    else { C.ex++; C.lines.push('🤺 Nikdo nezasáhl – další výměna s novými kartami.'); C.ca = drawCards(A, 1)[0]; C.cb = drawCards(B, 1)[0]; save(); renderAll(); renderCombat(); return; }
  }
  C.done = true; const sm = [];
  if (win === 'a') { S.over = { winner: C.a, round: S.round, vs: C.b }; sm.push(`🏆 <b>${A.name} vyhrál finální souboj a s ním celou hru!</b>`); addLog(`🏆 ${A.name} porazil ve finálním souboji hráče ${B.name} a VÍTĚZÍ ve hře GRUMPSTONE!`, true); }
  else { const g = Math.min(FINALE_STEAL, A.gp); A.gp -= g; B.gp += g; A.finale = A.gp >= WIN_GP; addXp(B, 1);
    sm.push(`🛡️ <b>${B.name}</b> ubránil vítězství! ${A.name} −${g} GB (teď ${A.gp}), ${B.name} +${g} GB (teď ${B.gp}).`);
    addLog(`🏁 Finální souboj: ${B.name} porazil ${A.name} a sebral mu ${g} Grumpstone bodů (${A.name} ${A.gp}, ${B.name} ${B.gp}).`, true);
    setTimeout(() => toast(`🛡️ ${B.name} ubránil vítězství: ${A.name} −${g} GB, ${B.name} +${g} GB.`), 200);
    if (A.finale) sm.push(`🏁 ${A.name} má pořád ${A.gp} GB – Finální výzva znovu v příštím tahu.`);
    if (checkFinale(B)) sm.push(`🏁 ${B.name} má teď ${B.gp} GB – Finální výzvu má on!`);
    if (B.hp <= 0) { B.restPending = true; sm.push(`☠️ ${B.name} klesl na 0 životů – odpočine si na začátku svého tahu.`); } }
  C.summary = sm.join('<br>'); save(); renderAll(); renderCombat();
}
function declareWinner(p, note) {
  S.over = S.over || { winner: S.players.indexOf(p), round: S.round, note }; save(); renderAll(); showVictory();
}
function showVictory() {
  if (!S || !S.over) return; const w = S.players[S.over.winner], h = heroById(w.hero);
  let v = $('victory'); if (v) v.remove();
  v = el('div', ''); v.id = 'victory';
  const rank = S.players.slice().sort((a, b) => b.gp - a.gp || b.level - a.level);
  v.innerHTML = `<div class="vic-bg" style="background-image:url('${ASSETS['art_' + w.hero] || ASSETS.title}')"></div><div class="vic-box">
    <div class="vic-h">VÍTĚZSTVÍ</div><img class="vic-por" src="${ASSETS[h.img]}" alt="${h.name}" style="border-color:${w.color}">
    <div class="vic-name">${w.name}</div><div class="vic-hero">${h.name} · ${h.cls}</div>
    <div class="vic-round">Kolo ${S.over.round} · 🔷 ${w.gp} Grumpstone bodů${S.over.note ? `<br><small>${S.over.note}</small>` : S.over.vs != null ? `<br><small>Finální souboj vyhrán proti hráči ${S.players[S.over.vs].name}.</small>` : ''}</div>
    <table class="vic-tab"><tr><th>#</th><th>Hráč</th><th>Hrdina</th><th>🔷 GB</th><th>⭐</th><th>🪙</th></tr>${rank.map((q, i) => `<tr class="${q === w ? 'win' : ''}"><td>${i + 1}.</td><td>${q.name}</td><td>${heroById(q.hero).name}</td><td>${q.gp}</td><td>${q.level}</td><td>${q.gold}</td></tr>`).join('')}</table>
    <button class="btn btn-gold" id="vic-new">Nová hra</button></div>`;
  document.body.appendChild(v);
  $('vic-new').onclick = () => { const wasGuest = NET.role === 'guest'; netLeave(); aiGen++; clearTimeout(aiTimer); document.body.classList.remove('ai-turn'); if ($('ai-bar')) $('ai-bar').classList.add('hidden'); v.remove(); $('combat').classList.add('hidden'); closePanel(true); try { if (!wasGuest) localStorage.removeItem('grumpstone_save'); } catch (e) {} initSetup(); show('screen-setup'); };
}
const finaleBlock = () => { if (S && S.over) { showVictory(); return true; } if (S && S.finalePending) { toast('🏁 Nejdřív vyzvi soupeře na finální souboj.'); openFinale(); return true; } return false; };
// ---------- POHYB A TAHY ----------
// v13 Olgrich – denní světlo: sudá kola (2, 4, 6…) jsou pro něj DEN, lichá NOC (normální).
// Ve dne: cesta (pochod, plavba, mount, nouzový stop) = −1 ❤️ jednou za kolo (nejméně na 1).
// Nebo „Přečkat den“ = Zůstat hned na začátku tahu: vzdá se pochodů, nic neztratí a smí tu využít 2 různé schopnosti lokace (i tam, kde tah začal).
const DAY_HEROES = new Set(['olgrich']);
const isDayRound = r => (r == null ? S.round : r) % 2 === 0;
const isDayFor = p => !!p && DAY_HEROES.has(p.hero) && isDayRound();
const DAY_NOTE = '☀️ Den — Olgrich může zůstat a využít 2 schopnosti, nebo cestovat za −1 ❤️';
const DAY_USES = 2;
function spendUse(aid) { // po využití schopnosti lokace: obvykle konec, při „Přečkat den“ ještě jedna další
  if (S.dayStay) { S.dayDone = S.dayDone || []; S.dayDone.push(aid); S.dayLeft = Math.max(0, (S.dayLeft || 0) - 1);
    if (S.dayLeft > 0) { S.canUse = true; S.lock = null; return; } }
  S.canUse = false; S.lock = 'used';
}
function sunBurn(p) {
  if (!isDayFor(p) || p.sunRound === S.round) return '';
  p.sunRound = S.round; const b = p.hp; p.hp = Math.max(1, p.hp - 1);
  addLog(`☀️ ${p.name} cestuje za denního světla: životy ${b} → ${p.hp}.`);
  return `☀️ Denní světlo pálí: −1 ❤️ (${b} → ${p.hp}).`;
}
function moveTo(id) {
  if (finaleBlock()) return;
  const p = cur();
  if (S.combat) { toast('Nejdřív dokonči souboj.'); openCombat(); return; }
  if (S.pending) { toast('Nejdřív dokonči hod kostkou.'); openPanel(S.pending.loc); return; }
  if (S.steps >= MAXST()) return;
  const kind = moveKind(p, id); if (!kind) { const w = seaWhy(p, id); if (w) toast(w); return; }
  const from = BY_ID[p.loc];
  p.loc = id; S.steps++; S.canUse = true; S.lock = null; lastResult = null;
  if (kind === 'hitch') { // nouzový stop = zdržení: pochody končí, akce lokace jen pokud v tahu ještě žádná nebyla
    S.hitched = true; S.noMount = true; S.steps = MAXST(); S.canUse = !S.acted; S.lock = S.acted ? 'hitch' : null;
    addLog(`🛶 ${p.name} nemá na loď – nouzově stopuje obchodní loď: ${from.name} → ${BY_ID[id].name}. Zdržení: pochody pro tento tah končí${S.acted ? ' a akci tu už nevyužije' : ''}.`);
  } else {
  const extra = isMountStep(p);
  if (extra) { S.canUse = false; S.lock = 'mount'; }
  addLog(`${p.name} ${kind === 'ship' ? `se plaví na lodi ${SHIPS[shipOf(p)].n}` : kind === 'tunnel' ? `🕳️ se prokopal podzemím pod lokací ${BY_ID[tunnelVia({ hero: p.hero, loc: from.id }, id)].name}` : kind === 'swim' ? `🐸🌊 plave přes vodu${extra ? ` (krok navíc s mountem – ${mountName(p)} plave s ním)` : ''}` : extra ? `jede na mountovi (${mountName(p)})` : 'pochoduje'}: ${from.name} → ${BY_ID[id].name} (pochod ${S.steps}/${MAXST()})${extra ? ' – krok navíc s mountem, akci lokace tu nelze využít' : ''}.`);
  }
  const sb = sunBurn(p);
  const qd = completeQuests(p);
  renderAll(); save();
  openPanel(id);
  if (sb) setTimeout(() => toast(sb), 50);
  if (qd) { lastResult = qd; renderPanel(); toast('✅ Úkol splněn!'); }
}
function stay() {
  if (finaleBlock()) return;
  if (S.steps >= MAXST()) return;
  if (S.combat) { toast('Nejdřív dokonči souboj.'); openCombat(); return; }
  if (S.pending) { toast('Nejdřív dokonči hod kostkou.'); openPanel(S.pending.loc); return; }
  if (isDayFor(cur()) && S.steps === 0 && !S.dayStay && !S.acted) { const p = cur();
    S.dayStay = true; S.dayLeft = DAY_USES; S.dayDone = []; S.steps = MAXST(); S.noMount = true; S.canUse = true; S.lock = null; lastResult = null;
    addLog(`☀️ ${p.name} přečká den v lokaci ${BY_ID[p.loc].name} – vzdává se pochodů, neztrácí život a smí tu využít ${DAY_USES} různé schopnosti lokace.`);
    renderAll(); save(); openPanel(p.loc); toast(`☀️ Přečkáš den tady: bez ztráty ❤️ a můžeš využít ${DAY_USES} různé schopnosti lokace.`); return; }
  const p = cur(); S.steps++; S.canUse = false; S.lock = 'stayed'; lastResult = null;
  addLog(`${p.name} zůstává v lokaci ${BY_ID[p.loc].name} (pochod ${S.steps}/${MAXST()}) – schopnost lokace tu už nevyužije.`);
  renderAll(); save();
  if (panelLoc) openPanel(panelLoc);
  else if (S.steps >= MAXST()) { toast('Pochody vyčerpány – na tahu je další hráč.'); setTimeout(endTurn, 900); }
  else toast('Zůstal jsi na místě. Schopnost lokace už tu nevyužiješ.');
}
function passTurn() {
  closePanel(true);
  collectCoal(cur()); // v16: Chadimpetro – pytel uhlí za každé kolo (na konci jeho tahu)
  S.cur++;
  if (S.cur >= S.players.length) { S.cur = 0; S.round++; bossRoundStart(); }
  S.steps = 0; S.noMount = false; S.acted = false; S.hitched = false; S.canUse = false; S.lock = 'start'; lastResult = null;
  S.dayStay = false; S.dayLeft = 0; S.dayDone = [];
  addLog(`Kolo ${S.round} – na tahu ${cur().name}.`, true);
  if (isDayFor(cur())) addLog(`${DAY_NOTE.replace('Olgrich', cur().name + ' (Olgrich)')}.`);
  if (cur().restPending) { cur().restPending = false; S.noMount = true; S.steps = 1; restHeal(cur()); }
  startTurnStatus(cur());
  if (cur().finale && !S.over) { S.finalePending = true; addLog(`🏁 ${cur().name} začíná svůj poslední tah – Finální výzva!`, true); setTimeout(openFinale, 250); }
  renderAll(); save();
  toast(isDayFor(cur()) ? `Na tahu: ${cur().name} · ${DAY_NOTE}` : `Na tahu: ${isAI(cur()) ? '🤖 ' : ''}${cur().name}`);
  setTimeout(centerOnActive, 80);
  aiKick();
}
// ---------- NPC KARTY (fáze na konci tahu, po pochodech a akcích lokací) ----------
const NPC = window.GS_NPC || [];
const NPC_BY_ID = Object.fromEntries(NPC.map(c => [c.id, c]));
const FEMALE = new Set(['elara', 'silvia', 'zara']);
const NPC_KIND = { boj: { n: 'Boj', ic: '⚔️' }, charisma: { n: 'Charisma', ic: '💬' }, magie: { n: 'Magie', ic: '🔮' } };
const npcStatKey = (p, kind) => kind === 'boj' ? combatKey(p) : kind === 'charisma' ? 'cha' : 'int';
const NPC_DIFF = 6, NPC_DIFF_BOSS = 8; // v11: + (level − 1) – úkoly rostou s hrdinou; na kostce aspoň 3
const npcDiff = (p, boss) => (boss ? NPC_DIFF_BOSS : NPC_DIFF) + Math.min(MAX_LEVEL, p.level || 1) - 1;
// Odměny (prozatímní): Grumpstone body jen za bossy a výjimečné cestovní úkoly.
const REW_OK = boss => boss ? { g: 3, xp: 4, gp: 2 } : { g: 1, xp: 2, gp: 0 }; // v11: zlato ~−35 % (dřív 4 / 2)
function heroStat(p, kind) { return stat(p, npcStatKey(p, kind)); }
function ensureDeck() {
  if (!S.npcDeck || !S.npcDeck.length) {
    const fresh = !S.npcDeck;
    S.npcDeck = shuffle(NPC.map(c => c.id)); S.npcDiscard = [];
    if (!fresh) addLog('🃏 Balíček NPC karet byl vyčerpán a znovu zamíchán.', true);
  }
}
function drawNpc() { ensureDeck(); const id = S.npcDeck.pop(); S.npcDiscard.push(id); return id; }
function endTurn() {
  if (finaleBlock()) return;
  if (S.combat) { toast('Nejdřív dokonči souboj.'); openCombat(); return; }
  if (S.pending) { toast('Nejdřív dokonči hod kostkou.'); openPanel(S.pending.loc); return; }
  if (S.npcOn === false || !NPC.length) return passTurn();
  if (!S.npc) { closePanel(true); S.npc = { id: drawNpc(), pick: null, res: null }; addLog(`🃏 ${cur().name} potkává NPC: ${NPC_BY_ID[S.npc.id].name}.`); save(); }
  openNpc();
}
function openNpc() {
  const c = NPC_BY_ID[S.npc.id], p = cur(); if (!c) { S.npc = null; return passTurn(); }
  $('npc-img').src = c.image; $('npc-img').alt = c.name;
  $('npc-name').textContent = c.name;
  $('npc-title').innerHTML = (c.title || '') + (c.is_boss ? ' <span class="npc-boss">BOSS</span>' : '');
  $('npc-story').textContent = c.story;
  $('npc-special').innerHTML = c.special ? `⚠️ ${c.special}` : '';
  $('npc-special').classList.toggle('hidden', !c.special);
  $('npc-who').textContent = `${p.name} (${heroById(p.hero).name}) na konci tahu potkává:`;
  renderNpcChoices(); renderNpcStage();
  $('npc').classList.remove('hidden');
}
function npcOptions(c, p) {
  const list = ['boj', 'charisma', 'magie'].map(k => ({ key: k, kind: k, ...c.choices[k] }));
  if (c.extra && (c.extra.who === 'all' || heroById(p.hero).side === 'good'))
    list.push({ key: 'extra', kind: c.extra.stat, mode: 'dice', text: c.extra.label, success: c.extra.success, fail: c.extra.fail, karma: c.extra.karma, boss: true, extra: true });
  return list;
}
function renderNpcChoices() {
  const c = NPC_BY_ID[S.npc.id], p = cur(), box = $('npc-choices'); box.innerHTML = '';
  npcOptions(c, p).forEach(o => {
    const k = NPC_KIND[o.kind], sk = npcStatKey(p, o.kind), st = stat(p, sk), diff = npcDiff(p, c.is_boss || o.boss);
    const txt = (o.key === 'charisma' && o.text_female && FEMALE.has(p.hero)) ? o.text_female : o.text;
    const how = o.mode === 'dice' ? `🎲 Hod kostkou: d6 + ${STAT_NAME[sk]} ${st}${stat(p, 'spec') ? ' + Spec. ' + stat(p, 'spec') : ''}${p.blessing ? ' + 1 požehnání' : ''} ≥ ${diff}` : '🤔 Rozhodnutí: vybereš ze 2 možností';
    const b = el('button', 'npc-ch ' + o.kind + (o.extra ? ' extra' : '') + (S.npc.pick === o.key ? ' sel' : ''),
      `<div class="npc-ch-h">${k.ic} ${o.extra ? 'Zvláštní volba – ' + k.n : k.n}</div><div class="npc-ch-t">${txt}</div><div class="npc-ch-f">${how}${o.quest ? '<br>📜 Po úspěchu lze přijmout cestovní úkol' : ''}</div>`);
    b.dataset.key = o.key; b.dataset.mode = o.mode;
    b.disabled = !!S.npc.pick;
    b.onclick = () => npcPick(o.key);
    box.appendChild(b);
  });
}
// ---- NPC akce (volá je UI i počítačový hráč) ----
const npcCur = () => { const c = NPC_BY_ID[S.npc.id]; return { c, p: cur(), o: S.npc.pick ? npcOptions(c, cur()).find(x => x.key === S.npc.pick) : null }; };
function npcDice(p, o, c) { const sk = npcStatKey(p, o.kind); return { sk, st: stat(p, sk), bl: p.blessing ? 1 : 0, diff: npcDiff(p, c.is_boss || o.boss), sp: stat(p, 'spec'), fe: hasStatus(p, 'fear') ? 1 : 0 }; }
function npcPick(key) { if (!S.npc || S.npc.pick || S.npc.res) return; S.npc.pick = key; save(); renderNpcChoices(); renderNpcStage(); }
function npcRoll(v) { if (!S.npc || S.npc.res) return; const { c, p, o } = npcCur(); if (!o || o.mode !== 'dice') return; const d = npcDice(p, o, c); useFear(p); npcRollDone(o, d.st + d.sp + d.bl - d.fe, d.diff, v); }
function npcDecide(i) { if (!S.npc || S.npc.res) return; const { o } = npcCur(); if (!o || o.mode === 'dice') return; const op = o.options[i]; npcResolve(o, op.result, op.karma || 0, `<div class="npc-picked">Zvolil jsi: <i>${op.label}</i></div>${op.outcome}`, false); }
function renderNpcStage() {
  const c = NPC_BY_ID[S.npc.id], p = cur(), stg = $('npc-stage'), cont = $('npc-continue');
  stg.innerHTML = ''; cont.classList.toggle('hidden', !S.npc.res || !!S.npc.offer);
  if (S.npc.res) { stg.innerHTML = S.npc.res; if (S.npc.offer) renderOffer(stg); return; }
  if (!S.npc.pick) { stg.innerHTML = '<div class="npc-hint">Vyber, jak úkol vyřešíš: <b>Boj</b>, <b>Charisma</b> nebo <b>Magie</b>.</div>'; return; }
  const o = npcOptions(c, p).find(x => x.key === S.npc.pick);
  if (o.mode === 'dice') {
    const sk = npcStatKey(p, o.kind), st = stat(p, sk), bl = p.blessing ? 1 : 0, diff = npcDiff(p, c.is_boss || o.boss);
    const sp = stat(p, 'spec'), fe = hasStatus(p, 'fear') ? 1 : 0;
    stg.innerHTML = `<div class="npc-hint">Potřebuješ <b>${diff}</b> nebo víc: d6 + ${STAT_NAME[sk]} <b>${st}</b>${sp ? ` + Specializace <b>${sp}</b>` : ''}${bl ? ' + <b>1</b> (požehnání ze svatyně)' : ''}${fe ? ' − <b>1</b> (strach)' : ''}.<br><small>Padne-li 6, uspěješ vždy; 1 nebo 2 je vždy neúspěch. Obtížnost roste s levelem (+1 za level).</small></div>`;
    stg.appendChild(makeDie({ id: 'npc-roll', wrapId: 'npc-die', label: '👆 Klepni na kostku a hoď!', onRoll: v => npcRoll(v) }));
  } else {
    stg.appendChild(el('div', 'npc-hint', 'Rozhodni se – výsledek uvidíš až po volbě:'));
    const row = el('div', 'npc-opts');
    o.options.forEach((op, i) => {
      const b = el('button', 'btn btn-dark npc-opt', op.label); b.dataset.i = i;
      b.onclick = () => npcDecide(i);
      row.appendChild(b);
    });
    stg.appendChild(row);
  }
}
function npcRollDone(o, st, diff, roll) {
  const tot = roll + st, ok = roll === 6 || (roll >= MIN_DIE && tot >= diff);
  const line = `<div class="npc-roll-line">🎲 Padlo <b>${roll}</b> + ${st} = <b>${tot}</b> (potřeba ${diff}) → ${ok ? '<b class="ok">ÚSPĚCH</b>' : '<b class="ko">NEÚSPĚCH</b>'}</div>`;
  npcResolve(o, ok ? 'good' : 'bad', ok ? (o.karma || 0) : 0, line + (ok ? o.success : o.fail), true);
}
function rewardText(r) {
  const a = []; if (r.g) a.push(`+${r.g} 🪙`); if (r.xp) a.push(`+${r.xp} zk.`); if (r.gp) a.push(`+${r.gp} Grumpstone ${r.gp === 1 ? 'bod' : 'body'}`); return a;
}
function giveReward(p, r) { p.gold += r.g || 0; p.gp += r.gp || 0; checkFinale(p); return addXp(p, r.xp || 0); }
function npcResolve(o, result, karma, text, dice) {
  const c = NPC_BY_ID[S.npc.id], p = cur(), boss = c.is_boss || o.boss, ch = [];
  if (dice && p.blessing) { p.blessing = false; ch.push('požehnání využito'); }
  let lv = '';
  const canQuest = result === 'good' && o.quest && (p.quests || []).length < 3;
  if (canQuest) {
    // odměna se vyplatí až podle volby: přijmout úkol, nebo vzít odměnu hned
    const q = makeQuest(p, o.quest.targets, o.quest.goal, c.name, null, true);
    S.npc.offer = { boss, gp: o.quest.gp, target: q.target, dist: q.dist, goal: o.quest.goal };
  } else if (result === 'good') { const r = REW_OK(boss); lv = giveReward(p, r); ch.push(...rewardText(r)); }
  else if (result === 'neutral') { lv = giveReward(p, { g: 1, xp: 1 }); ch.push('+1 🪙', '+1 zk.'); }
  else {
    let dmg = dice ? (boss ? 3 : 2) : (boss ? 2 : 1);
    if (c.onfail_extra_dmg) dmg += c.onfail_extra_dmg;
    const b = p.hp; p.hp = Math.max(0, p.hp - dmg); ch.push(`−${b - p.hp} ❤️`);
  }
  if (karma) { p.karma += karma; ch.push(`${karma > 0 ? '+' : '−'}1 ☯️ karma`); }
  let extra = lv;
  if (p.hp <= 0) {
    p.restPending = true;
    addLog(`☠️ ${p.name} klesl po setkání s NPC na 0 životů – odpočinek proběhne na začátku jeho příštího tahu.`);
    extra += '<div class="ko">☠️ Klesl jsi na 0 životů! Na začátku příštího tahu odpočíváš (přijdeš o 1 pochod).</div>';
  }
  const cls = result === 'good' ? 'good' : result === 'neutral' ? 'neutral' : 'bad';
  const head = { good: '✨ Povedlo se', neutral: '😐 Napůl', bad: '💥 Nepovedlo se' }[cls];
  S.npc.res = `<div class="npc-res ${cls}"><div class="npc-res-h">${head}</div><div>${text}</div><div class="npc-rew">${ch.join(' · ') || (canQuest ? '' : 'Bez odměny')}</div>${extra}</div>`;
  addLog(`🃏 ${c.name} – ${NPC_KIND[o.kind].n} (${dice ? 'hod' : 'rozhodnutí'}): ${head.slice(2).trim()}. ${ch.join(', ')}.`);
  renderAll(); save(); renderNpcStage();
}
function offerRewards(f) { const now = REW_OK(f.boss); return { now, later: { g: now.g + 1, xp: now.xp + 2, gp: now.gp + (f.gp ? 1 : 0) } }; }
function npcQuest(accept) {
  const f = S.npc && S.npc.offer; if (!f) return; const p = cur(), c = NPC_BY_ID[S.npc.id], { now, later } = offerRewards(f);
  if (accept) {
    const lv = giveReward(p, { g: 1, xp: 1 });
    p.quests = p.quests || [];
    p.quests.push({ id: Date.now() + '' + rnd(1000), npc: c.name, goal: f.goal, target: f.target, reward: later });
    addLog(`📜 ${p.name} přijal úkol „${f.goal}“ → ${BY_ID[f.target].name}.`);
    S.npc.res += `<div class="npc-res good">📜 Úkol přijat: <b>${f.goal}</b> → <b>${BY_ID[f.target].name}</b>. Záloha +1 🪙, +1 zk.${lv}</div>`;
  } else {
    const lv = giveReward(p, now);
    addLog(`🃏 ${p.name} odmítl cestovní úkol a bere odměnu hned (${rewardText(now).join(', ')}).`);
    S.npc.res += `<div class="npc-res good">💰 Odměna hned: <b>${rewardText(now).join(' · ')}</b>${lv}</div>`;
  }
  S.npc.offer = null; renderAll(); save(); renderNpcStage();
}
function renderOffer(stg) {
  const f = S.npc.offer, { now, later } = offerRewards(f);
  const box = el('div', 'npc-offer', `<div class="npc-offer-h">📜 Cestovní úkol: <b>${f.goal}</b> → <b>${BY_ID[f.target].name}</b> (${f.dist} ${f.dist === 1 ? 'pochod' : f.dist < 5 ? 'pochody' : 'pochodů'})</div>
    <div>Přijmeš-li úkol, dostaneš hned zálohu <b>+1 🪙, +1 zk.</b> a po příchodu na místo <b>${rewardText(later).join(', ')}</b>. Úkol je nepovinný – nic se nestane, když ho nesplníš.</div>`);
  const row = el('div', 'npc-opts');
  const a = el('button', 'btn btn-gold', '📜 Přijmout úkol'); a.id = 'npc-quest-accept'; a.onclick = () => npcQuest(true);
  const d = el('button', 'btn btn-dark', `💰 Odměnu hned (${rewardText(now).join(', ')})`); d.id = 'npc-quest-decline'; d.onclick = () => npcQuest(false);
  row.appendChild(a); row.appendChild(d); box.appendChild(row); stg.appendChild(box);
}
function finishNpc() { if (S.npc && S.npc.offer) return; $('npc').classList.add('hidden'); S.npc = null; passTurn(); }

// ---------- CESTOVNÍ ÚKOLY ----------
function distances(from) {
  const D = { [from]: 0 }, q = [from];
  while (q.length) { const a = q.shift(); ADJ[a].forEach(b => { if (D[b] == null) { D[b] = D[a] + 1; q.push(b); } }); }
  return D;
}
// targets: id míst nebo typy lokací; vybere cíl ve vzdálenosti 2–4 pochodů (jinak nejbližší)
function makeQuest(p, targets, goal, npc, reward, dry) {
  const D = distances(p.loc);
  let cand = PLACES.filter(x => x.id !== p.loc && (targets.includes(x.id) || targets.includes(x.type)));
  if (!cand.length) cand = PLACES.filter(x => isSettlement(x) && x.id !== p.loc);
  const pref = cand.filter(x => D[x.id] >= 2 && D[x.id] <= 4);
  let t;
  if (pref.length) t = pick(pref);
  else { const m = Math.min(...cand.map(x => D[x.id])); t = pick(cand.filter(x => D[x.id] === m)); }
  const q = { id: Date.now() + '' + rnd(1000), npc, goal, target: t.id, dist: D[t.id], reward };
  if (!dry) { p.quests = p.quests || []; p.quests.push(q); }
  return q;
}
// v11: vzácně (10 %) splněný úkol naučí hrdinu něco nového: +1 hlavní vlastnost.
const QUEST_STAT_CHANCE = 0.1; let FORCE_QSTAT = null;
function questStatBonus(p) {
  const hit = FORCE_QSTAT != null ? FORCE_QSTAT : Math.random() < QUEST_STAT_CHANCE; FORCE_QSTAT = null; if (!hit) return '';
  const k = pick(TRAIN_ALLOW[roleOf(p)]); p.train[k] = (p.train[k] || 0) + 1; addLog(`✨ ${p.name} se na cestě něco naučil: +1 ${STAT_NAME[k]}.`);
  return `<br>✨ <b>Vzácné: +1 ${STAT_NAME[k]}</b> – cesta tě něco naučila.`;
}
function completeQuests(p) {
  const done = (p.quests || []).filter(q => q.target === p.loc); if (!done.length) return '';
  p.quests = p.quests.filter(q => q.target !== p.loc);
  return done.map(q => {
    const lv = giveReward(p, q.reward);
    const bonus = questStatBonus(p);
    addLog(`✅ ${p.name} splnil úkol „${q.goal}“ (${q.npc}) v lokaci ${BY_ID[p.loc].name}: ${rewardText(q.reward).join(', ')}.`);
    return `<div class="quest-done">✅ <b>Úkol splněn:</b> ${q.goal} <small>(${q.npc})</small><br>Odměna: <b>${rewardText(q.reward).join(' · ')}</b>${lv}${bonus}</div>`;
  }).join('');
}
// Hrdina na 0 životech zůstává na místě; jeden z jeho dvou pochodů padne na odpočinek.
function restHeal(p) {
  const loc = BY_ID[p.loc], b = p.hp;
  let how;
  if (isSettlement(loc) && S.abilities[loc.id].includes('krcma')) {
    if (p.gold >= 1) { p.gold -= 1; p.hp = MAX_HP; how = `v krčmě za 1Z – plné zdraví`; }
    else { p.hp = Math.min(MAX_HP, p.hp + MAX_HP / 2); how = `v krčmě bez peněz – jen polovina`; }
  } else { p.hp = Math.min(MAX_HP, p.hp + 1); how = isSettlement(loc) ? 'bez krčmy – jen 1 život' : 'v divočině – jen 1 život'; }
  addLog(`${p.name} odpočívá (Odpočinek, spotřebován 1 pochod) – ${loc.name}, ${how}: životy ${b} → ${p.hp}.`);
  return `😴 <b>Odpočinek</b> (${how}): životy ${b} → <b>${p.hp}</b>. Spotřebován 1 pochod.`;
}
function knockout(p) {
  if (p.hp > 0) return '';
  addLog(`☠️ ${p.name} klesl na 0 životů a zůstává v lokaci ${BY_ID[p.loc].name}.`);
  S.canUse = false; S.lock = 'used';
  S.noMount = true;
  if (S.steps < MAXST()) { S.steps++; return '<br><b style="color:#a21">☠️ Klesl jsi na 0 životů!</b><br>' + restHeal(p); }
  p.restPending = true;
  addLog(`${p.name} byl vyčerpán na posledním pochodu – odpočinek proběhne na začátku jeho příštího tahu.`);
  return '<br><b style="color:#a21">☠️ Klesl jsi na 0 životů na posledním pochodu!</b><br>Odpočineš si na začátku příštího tahu (přijdeš o 1 pochod).';
}

// ---------- PANEL LOKACE ----------
function abilitiesOf(p) { const l = isSettlement(p) ? S.abilities[p.id] : ['explore']; return bossAt(p.id) ? [...l, 'boss'] : l; }

function openPanel(id) {
  panelLoc = id; selAbility = null; selOpt = null;
  renderPanel();
  $('panel').classList.remove('hidden'); $('panel-backdrop').classList.remove('hidden');
}
function closePanel(silent) {
  panelLoc = null; lastResult = null;
  $('panel').classList.add('hidden'); $('panel-backdrop').classList.add('hidden');
  if (!silent && S && S.steps >= MAXST() && !S.canUse && !S.pending && !S.combat) { toast('Pochody vyčerpány – na tahu je další hráč.'); setTimeout(endTurn, 700); }
}

function renderPanel() {
  const loc = BY_ID[panelLoc], p = cur();
  const isHere = p.loc === loc.id;
  const adj = !!moveKind(p, loc.id), seaW = !isHere ? seaWhy(p, loc.id) : null;
  const ic = $('panel-icon');
  ic.className = 'panel-icon token ' + (isSettlement(loc) ? loc.type : 'wild ' + loc.type);
  ic.innerHTML = `<span class="ic" style="font-size:30px">${iconOf(loc)}</span>`;
  $('panel-name').textContent = loc.name;
  const neigh = [...ADJ[loc.id]].map(i => BY_ID[i].name);
  $('panel-type').textContent = TYPE_LABEL[loc.type] + (isHere ? ' · tady stojíš' : '');
  const rsp = !bossAt(loc.id) && bossRespawnAt(loc.id);
  $('panel-desc').innerHTML = (loc.desc ? loc.desc + '<br>' : '') + `<small>Sousedí s: ${neigh.join(', ')}</small>` +
    (rsp ? `<div class="boss-back">💀 ${rsp.name} tu byl poražen (${S.bosses[rsp.id].by || 'hrdina'}) – <b>vrátí se v kole ${S.bosses[rsp.id].back}</b>.</div>` : '');

  // stav
  const stEl = $('panel-status');
  let usable = false;
  if (isHere) {
    if (S.canUse) { usable = true; stEl.className = 'panel-status ok'; stEl.innerHTML = isSettlement(loc) ? 'Vyber jednu schopnost lokace a potvrď zeleným ✔.' : 'Můžeš toto místo prozkoumat – vyber kartu a potvrď ✔.';
      if (S.dayStay) stEl.innerHTML = `☀️ <b>Přečkáváš den</b> – můžeš tu využít ještě <b>${S.dayLeft}</b> ${S.dayLeft === 1 ? 'schopnost' : 'různé schopnosti'} lokace${(S.dayDone || []).length ? ' (jinou než předtím)' : ''}.`; }
    else if (S.lock === 'start' && isDayFor(p)) { stEl.className = 'panel-status day'; stEl.innerHTML = `${DAY_NOTE}.<br><small>„☀️ Přečkat den tady“ = vzdáš se pochodů a využiješ tu 2 různé schopnosti. Pochod nebo plavba stojí 1 ❤️ (jednou za kolo).</small>`; }
    else if (S.lock === 'mount') { stEl.className = 'panel-status lock'; stEl.innerHTML = `🐾 Sem jsi dojel krokem navíc na mountovi (${mountName(cur())}) – <b>akci lokace tu nelze využít</b>.`; }
    else if (S.lock === 'hitch') { stEl.className = 'panel-status lock'; stEl.innerHTML = '🛶 Nouzový stop = zdržení. Akci lokace jsi v tomto tahu už využil, tady ji použít nelze.'; }
    else if (S.lock === 'start') { stEl.className = 'panel-status lock'; stEl.innerHTML = 'Tah začínáš tady – schopnost lokace použiješ až po pochodu na další lokaci.'; }
    else if (S.dayStay) { stEl.className = 'panel-status day'; stEl.innerHTML = `☀️ Den přečkán – obě schopnosti lokace jsi využil (${(S.dayDone || []).map(x => x === 'pvp' ? 'souboj' : (ABILITIES[x] || {}).name || x).join(' + ')}). Ukonči tah.`; }
    else { stEl.className = 'panel-status lock'; stEl.innerHTML = 'Tady už jsi schopnost využil – pokračuj v pochodu.' + (S.lock === 'stayed' ? '<br><small>(Zůstal jsi na místě, takže druhou schopnost tu použít nelze.)</small>' : ''); }
  } else {
    stEl.className = 'panel-status';
    stEl.innerHTML = adj && S.steps < MAXST() ? `Jen prohlížíš. Pochodem sem se dostaneš (zbývá ${MAXST() - S.steps} ${MAXST() - S.steps === 1 ? 'pochod' : 'pochody'}).`
      : S.steps >= MAXST() ? 'Jen prohlížíš – pochody pro toto kolo máš vyčerpané.' : seaW ? 'Jen prohlížíš. ' + seaW : 'Jen prohlížíš – sem se jedním pochodem nedostaneš.';
    if (adj && S.steps < MAXST() && moveKind(p, loc.id) === 'tunnel') stEl.innerHTML += `<br><small>🕳️ Podzemní chody: prokopeš se sem jedním pochodem pod lokací ${BY_ID[tunnelVia(p, loc.id)].name} (tam se nic nevyhodnocuje – akce jen tady v cíli).</small>`;
    if (adj && S.steps < MAXST() && moveKind(p, loc.id) === 'swim') stEl.innerHTML += '<br><small>🐸🌊 Plavání: přes vodu sem doplaveš zdarma jako obyčejným pochodem (bez lodi; jen do sousední lokace).</small>';
    if (adj && S.steps < MAXST() && moveKind(p, loc.id) === 'hitch') stEl.innerHTML += '<br><small>🛶 Bez peněz: nouzový stop na obchodní lodi – jen tahle sousední mořská lokace, pak tah končí (zdržení).</small>';
  }

  // karty
  const box = $('panel-cards'); box.innerHTML = '';
  abilitiesOf(loc).forEach(aid => {
    const a = ABILITIES[aid];
    const opts = typeof a.options === 'function' ? a.options(p, loc) : a.options;
    const imgKey = aid === 'prace' ? (loc.type === 'city' ? 'prace3' : 'prace2') : a.img;
    const text = aid === 'prace' ? (loc.type === 'city' ? 'Práce ve městě: +3 zlaťáky.' : 'Práce ve vesnici: +2 zlaťáky.') : a.text;
    const c = el('div', 'acard');
    c.dataset.ability = aid;
    const bo = aid === 'boss' ? bossAt(loc.id) : null;
    c.innerHTML = bo ? `<img class="boss-art" src="${bo.image}" alt="${bo.name}"><div class="t">👹 ${bo.name}</div><div class="e">${bo.desc}${bossInfoHTML(bo)}</div>` :
      (imgKey ? `<img src="${ASSETS[imgKey]}" alt="${a.name}">` : `<div class="noimg">${a.icon || iconOf(loc)}</div>`) +
      `<div class="t">${a.name}</div><div class="e">${text}</div>`;
    if (bo) c.classList.add('boss-card');
    if (a.reqText) {
      c.innerHTML += `<div class="req">Vyžaduje: ${a.reqText(p).map(([ok, t]) => `<span class="${ok ? 'met' : ''}" style="color:${ok ? '#a8f0a0' : '#ffb3a8'}">${ok ? '✔' : '✖'} ${t}</span>`).join(', ')}</div>`;
    }
    const cl = a.classLock ? a.classLock(p) : null;
    if (cl) { c.classList.add('cls-lock'); c.innerHTML += `<div class="clslock">🚫 ${cl}</div>`; }
    else if (a.optLock) { const lk = opts.filter(op => a.optLock(p, op.id)); if (lk.length) c.innerHTML += `<div class="clsnote">🚫 ${lk.map(op => op.label).join(', ')}: ${a.optLock(p, lk[0].id)}</div>`; }
    if (opts && usable && selAbility === aid && !cl && !(S.dayStay && (S.dayDone || []).includes(aid))) {
      const o = el('div', 'opts');
      if (!opts.length) o.appendChild(el('span', 'inv-empty', 'Nic tu teď není.'));
      opts.forEach(op => { const lock = a.optLock && a.optLock(p, op.id);
        const b = el('button', (selOpt === op.id ? 'on' : '') + (lock ? ' lockd' : '') + (op.cls ? ' ' + op.cls : ''), (lock ? '🚫 ' : '') + op.label); b.dataset.opt = op.id;
        if (op.title) b.title = op.title;
        if (lock) { b.disabled = true; b.title = lock; }
        b.onclick = ev => { ev.stopPropagation(); if (lock) return; selOpt = op.id; renderPanel(); if (op.item) openItem(op.item, { price: op.price }); }; o.appendChild(b); });
      if (opts.some(op => op.item) || ['kovarna', 'trziste', 'cerny_trh'].includes(aid)) o.insertAdjacentHTML('beforeend', LOCK_NOTE(p));
      c.appendChild(o);
    }
    const dayUsed = S.dayStay && isHere && (S.dayDone || []).includes(aid);
    if (dayUsed) c.innerHTML += '<div class="clsnote">✔ Dnes už využito</div>';
    if (!usable || dayUsed) c.classList.add('dis');
    else if (cl || (a.req && !opts && a.req(p, loc, null))) c.classList.add('blocked');
    if (selAbility === aid) c.classList.add('sel');
    c.onclick = () => {
      if (!usable) { toast(isHere ? (S.lock === 'start' ? 'Nejdřív vyraž na pochod.' : S.lock === 'mount' ? 'Na 3. lokaci (krok navíc s mountem) nelze využít akci lokace.' : 'Tady už jsi schopnost využil – pokračuj v pochodu.') : 'Schopnost lze použít jen tam, kde stojíš.'); return; }
      if (selAbility !== aid) { selAbility = aid; selOpt = null; } renderPanel();
    };
    box.appendChild(c);
  });

  const rb = $('panel-result'); rb.classList.toggle('hidden', !lastResult || !isHere); rb.innerHTML = lastResult || '';
  const pend = S.pending && S.pending.loc === loc.id && isHere;
  if (pend) { renderPending(rb); stEl.className = 'panel-status ok'; stEl.innerHTML = S.pending.stage === 'choice' ? 'Rozhodni se:' : '🎲 Klepni na kostku a hoď!'; }

  // potvrzení
  const row = $('panel-confirm-row'), btn = $('btn-confirm');
  row.classList.toggle('hidden', !usable);
  let reason = null;
  if (usable) {
    if (!selAbility) reason = 'Vyber kartu schopnosti.';
    else { const a = ABILITIES[selAbility]; reason = (a.classLock && a.classLock(p)) || (a.req ? a.req(p, loc, selOpt) : null); }
    btn.disabled = !!reason;
    $('confirm-label').textContent = reason && selAbility ? reason : 'Chci použít schopnost lokace';
  }

  // akce
  const act = $('panel-actions'); act.innerHTML = '';
  if (S.pending) { const cl = el('button', 'btn btn-dark', 'Zavřít'); cl.onclick = () => closePanel(); act.appendChild(cl); return; }
  if (!isHere && adj && S.steps < MAXST()) {
    const mk = moveKind(p, loc.id);
    const b = el('button', 'btn btn-march', mk === 'hitch' ? '🛶 Nouzový stop sem (zdržení)' : mk === 'ship' ? `⛵ Plout sem (${S.steps + 1}/${MAXST()})` : mk === 'swim' ? `🐸🌊 Plavat sem (${S.steps + 1}/${MAXST()}, zdarma)` : mk === 'tunnel' ? `🕳️ Prokopat se sem (${S.steps + 1}/${MAXST()})` : `🥾 Pochodovat sem (${S.steps + 1}/${MAXST()})`); b.id = 'btn-march';
    b.onclick = () => moveTo(loc.id); act.appendChild(b);
  }
  if (isHere && isCoast(loc.id) && S.steps < MAXST() && !shipOf(p)) Object.entries(SHIPS).forEach(([sid, sh]) => {
    const ok = shipAllowed(p, sid), b = el('button', 'btn btn-dark ship-btn' + (ok ? '' : ' off'), `<img src="${sh.tok}" alt="">${sh.n} (−${SHIP_PRICE} 🪙)`); b.dataset.ship = sid;
    b.disabled = !ok; b.title = ok ? 'Nalodit se na celé kolo' : shipWhy(p, sid); b.onclick = () => openShipModal(sid); act.appendChild(b); });
  if (isHere && S.steps < MAXST()) {
    const dayStart = isDayFor(p) && S.steps === 0 && !S.acted;
    const b = el('button', 'btn btn-dark' + (dayStart ? ' btn-day' : ''), dayStart ? '☀️ Přečkat den tady (2 schopnosti, bez ztráty ❤️)' : '⏸ Zůstat (spotřebuje pochod)'); b.id = 'btn-stay-panel';
    b.onclick = () => stay(); act.appendChild(b);
  }
  if (isHere && usable) S.players.forEach(q => { if (q === p || q.loc !== loc.id) return; const why = pvpBlock(p, q);
    const b = el('button', 'btn btn-dark pvp-btn', `⚔️ Souboj s ${q.name}`); b.dataset.pvp = S.players.indexOf(q); b.disabled = !!why; if (why) b.title = why; b.onclick = () => startPvp(p, q); act.appendChild(b); });
  if (isHere && S.steps < MAXST() && !usable) {
    const b = el('button', 'btn btn-gold', 'Pokračovat v pochodu'); b.onclick = () => closePanel(); act.appendChild(b);
  }
  if (isHere && S.steps >= MAXST()) {
    const b = el('button', 'btn btn-gold', 'Ukončit tah'); b.id = 'btn-end-panel'; b.onclick = () => endTurn(); act.appendChild(b);
  }
  const cl = el('button', 'btn btn-dark', 'Zavřít'); cl.onclick = () => closePanel(); act.appendChild(cl);
}

// výběr mounta při koupi (jen kosmetika – všichni mají stejný účinek)
let mountChoice = null;
function openMountModal() {
  let m = $('mount-modal'); if (m) m.remove();
  m = el('div', 'mount-modal'); m.id = 'mount-modal'; let pickId = null;
  m.innerHTML = `<div class="mount-sheet"><div class="mount-h">MOUNTS</div><div class="mount-sub">Vyber si mounta – klikni na jednoho a potvrď. Všichni mají stejný účinek (2 lokace + 1 krok navíc).</div>
    <div class="mount-grid">${Object.entries(MOUNTS).map(([k, v]) => `<button class="mount-opt" data-mount="${k}"><img src="${v.img}" alt="${v.n}"><span>${v.n}</span></button>`).join('')}</div>
    <div class="mount-act"><button class="btn btn-dark" id="mount-cancel">Zrušit</button><button class="btn btn-gold" id="mount-ok" disabled>Potvrdit (−${MOUNT_PRICE} 🪙)</button></div></div>`;
  document.body.appendChild(m);
  m.querySelectorAll('.mount-opt').forEach(b => b.onclick = () => { pickId = b.dataset.mount; m.querySelectorAll('.mount-opt').forEach(x => x.classList.toggle('sel', x === b)); $('mount-ok').disabled = false; $('mount-ok').textContent = `Potvrdit: ${MOUNTS[pickId].n} (−${MOUNT_PRICE} 🪙)`; });
  $('mount-cancel').onclick = () => { m.remove(); toast('Nákup mounta zrušen – nic jsi nezaplatil.'); };
  $('mount-ok').onclick = () => { if (!pickId) return; m.remove(); mountChoice = pickId; confirmAbility(); };
}
function confirmAbility() {
  const loc = BY_ID[panelLoc], p = cur();
  if (!selAbility || p.loc !== loc.id || !S.canUse || S.pending || S.combat) return;
  if (S.dayStay && (S.dayDone || []).includes(selAbility)) { toast('Tuto schopnost jsi dnes už využil – vyber jinou.'); return; }
  const a = ABILITIES[selAbility];
  if ((a.classLock && a.classLock(p)) || (a.req && a.req(p, loc, selOpt))) return;
  if (a.mountPick && !mountChoice) { openMountModal(); return; }
  S.acted = true;
  if (a.combat) { const b = bossAt(loc.id); if (!b) return; spendUse(selAbility); selAbility = null; selOpt = null; lastResult = null; renderAll(); startBossFight(p, b); return; }
  if (a.dice) {
    spendUse(selAbility); S.pending = { ab: selAbility, loc: loc.id, opt: selOpt, stage: 'main' };
    selAbility = null; selOpt = null; lastResult = null; renderAll(); save(); renderPanel(); return;
  }
  const r = a.apply(p, loc, a.mountPick ? mountChoice : selOpt); mountChoice = null;
  clampHp(p);
  spendUse(selAbility);
  addLog(`${p.name} (${loc.name}) ${r.log}.`);
  lastResult = r.html + knockout(p);
  panelLoc = p.loc; selAbility = null; selOpt = null;
  renderAll(); save(); renderPanel();
}

// ---------- HODY KOSTKOU V LOKACI (aréna, herna, hledání) ----------
function renderPending(rb) {
  const P = S.pending, p = cur(), a = ABILITIES[P.ab];
  rb.classList.remove('hidden'); rb.innerHTML = `<div class="pend-h">${a.icon || '🎲'} ${a.name}</div>` + (P.pre || '');
  if (P.stage === 'choice') {
    const o = SEARCH_BY_ID[P.out], row = el('div', 'npc-opts');
    o.choices.forEach(c => { const b = el('button', 'btn btn-dark srch-choice', c.label); b.dataset.c = c.id; b.onclick = () => choosePending(c.id); row.appendChild(b); });
    rb.appendChild(row); return;
  }
  let label;
  if (P.stage === 'check') { const k = checkStat(p, P.check.k), sp = stat(p, 'spec'); label = `${STAT_NAME[k]}: d6 + ${stat(p, k)}${sp ? ' + Specializace ' + sp : ''}${hasStatus(p, 'fear') ? ' − 1 strach' : ''} ≥ ${P.check.d}`; }
  else label = a.dieLabel ? a.dieLabel(p) : 'Hoď kostkou';
  rb.appendChild(makeDie({ id: 'panel-die', label: '👆 Klepni na kostku · ' + label, onRoll: v => rollPending(v) }));
}
function finishPending(log, html) {
  const p = cur(), P = S.pending, loc = BY_ID[P.loc];
  clampHp(p); S.pending = null;
  addLog(`${p.name} (${loc.name}) ${log}.`);
  lastResult = (P.pre || '') + html + knockout(p);
  panelLoc = loc.id; renderAll(); save(); renderPanel();
}
function rollPending(v) {
  const P = S.pending; if (!P) return;
  const p = cur(), loc = BY_ID[P.loc], a = ABILITIES[P.ab];
  if (P.ab !== 'explore') { const r = a.resolve(p, loc, P.opt, v); return finishPending(r.log, r.html); }
  if (P.stage === 'check') return checkResolve(v);
  const sp = stat(p, 'spec'), f = useFear(p), t = v + sp - f;
  const { s: o, band } = pickSearch(t, loc, v);
  const head = `<div class="srch-roll">🎲 Hod <b>${v}</b>${sp ? ` + Specializace ${sp}` : ''}${f ? ' − 1 strach' : ''} = <b>${t}</b> → <b class="band band-${band}">${BAND_NAME[band]}</b></div><div class="srch-h">${o.ic} <b>${o.n}</b></div>`;
  if (o.run) { const [lg, h] = o.run(p, loc); return finishPending(`prohledává: ${o.n} – ${lg}`, head + h); }
  P.pre = head + `<p>${o.text}</p>`; P.out = o.id;
  if (o.check) { P.stage = 'check'; P.check = o.check; } else P.stage = 'choice';
  save(); renderPanel();
}
function checkResolve(v) {
  const P = S.pending, p = cur(), o = SEARCH_BY_ID[P.out], k = checkStat(p, P.check.k), sp = stat(p, 'spec'), f = useFear(p);
  const s = stat(p, k) + sp - f, t = v + s, ok = v === 6 || (v !== 1 && t >= P.check.d);
  const line = `<div class="srch-roll">🎲 ${STAT_NAME[k]}: hod <b>${v}</b> + ${s} = <b>${t}</b> (potřeba ${P.check.d}) → ${ok ? '<b class="ok">ÚSPĚCH</b>' : '<b class="ko">NEÚSPĚCH</b>'}</div>`;
  const [lg, h] = (ok ? o.ok : o.ko)(p, BY_ID[P.loc]);
  finishPending(`prohledává: ${o.n} – ${lg}`, line + h);
}
function choosePending(cid) {
  const P = S.pending, p = cur(), o = SEARCH_BY_ID[P.out], c = o.choices.find(x => x.id === cid);
  const pk = `<div class="npc-picked">Zvolil jsi: <i>${c.label}</i></div>`;
  if (c.check) { P.stage = 'check'; P.check = c.check; P.pre += pk; save(); renderPanel(); return; }
  const [lg, h] = c.run(p, BY_ID[P.loc]);
  finishPending(`prohledává: ${o.n} – ${lg}`, pk + h);
}

// ======================================================================
// ---------- v18 POČÍTAČOVÍ SOUPEŘI (AI) ----------
// Hráč s p.ai === true hraje sám. Stav zůstává čistě v S (JSON), AI jen volá stejné akční funkce jako UI:
// moveTo, stay, boardShip, useAbility, rollPending/choosePending, combatRoll/combatChoose/closeCombat, pvpRoll,
// startPvp, startFinale, endTurn, npcPick/npcRoll/npcDecide/npcQuest/finishNpc, overflowSell.
// Obtížnost (S.aiDiff): 'normal' = opatrná, s náhodou; 'hard' = chamtivá, lepší odhad boje, jde po GB a brzdí vedoucího.
// ======================================================================
const AI_DIFFS = { normal: { n: 'Normální', sims: 24, thr: 0.55, noise: 0.35, gbW: 10, heal: 5, pvp: false },
                   hard: { n: 'Těžká', sims: 60, thr: 0.4, noise: 0.08, gbW: 16, heal: 4, pvp: true } };
const aiCfg = () => AI_DIFFS[(S && S.aiDiff) || 'normal'] || AI_DIFFS.normal;
const isAI = p => !!(p && p.ai);
const aiTurnNow = () => !!(S && !S.over && S.players && isAI(cur()));
let aiDelay = (() => { try { return +localStorage.getItem('grumpstone_aispeed') || 650; } catch (e) { return 650; } })();
let aiGen = 0, aiBusy = false, aiTimer = null, aiStepsThisTurn = 0, aiTurnKey = null, aiCache = {}, aiSkipKey = null, aiFreeKey = null, aiStats = { stuck: 0, forced: 0, turns: 0, errors: [], fights: 0, finales: 0, pvp: 0 };
const aiSleep = ms => new Promise(r => setTimeout(r, ms));
function aiLog(t) { addLog(`🤖 ${t}`); }
const aiNoise = () => 1 + (Math.random() * 2 - 1) * aiCfg().noise;
// ---- odhad šance proti bossovi (Monte Carlo přes skutečný GSCombat, bez vedlejších efektů) ----
function aiCtx(p, b) {
  return { name: p.name, hp: p.hp, maxHp: MAX_HP, atk: stat(p, atkKeyOf(p, b)), atkName: STAT_NAME[atkKeyOf(p, b)], def: stat(p, 'obr'), approach: approachOf(p, b),
    focus: focusMatch(p, b) ? FOCUS_BONUS : 0, potions: p.potions || 0, fear: hasStatus(p, 'fear'), gold: p.gold, karma: p.karma || 0, side: p.side, horse: hasMount(p),
    atSea: SEA_PORTS.includes(bossLoc(b) || p.loc), intel: stat(p, 'int'), cha: stat(p, 'cha'), ranged: (p.equip || []).some(id => ITEM_BY_ID[id] && ITEM_BY_ID[id].ranged), bag: [] };
}
function aiEstimate(p, b) {
  if (chaOnlyWhy(p, b)) return { win: 0, loss: 1, dmg: 0 };
  const st = bossState(b.id), key = [b.id, S.round, S.players.indexOf(p), p.hp, p.potions, st.sh, st.hp, stat(p, atkKeyOf(p, b)), stat(p, 'obr')].join(':');
  if (aiCache[key]) return aiCache[key];
  const n = aiCfg().sims, pool = cardPool(p), town = isSettlement(BY_ID[bossLoc(b)] || {});
  let win = 0, loss = 0, dmg = 0;
  for (let i = 0; i < n; i++) {
    let F; try {
      const hand = shuffle(pool).slice(0, 3).map(cardLite);
      F = GSCombat.newFight({ hero: aiCtx(p, b), boss: b, sh: st.sh, hp: st.hp, cards: hand, town });
      for (let g = 0; g < 12 && !F.done; g++) {
        const offs = GSCombat.offers(F);
        if (GSCombat.needsChoice(F)) { const req = offs.filter(o => o.req); GSCombat.choose(F, pick(req.length ? req : offs).id); continue; }
        if (!F.potionUsed && F.hero.potions && F.hero.hp <= 4) GSCombat.drink(F);
        GSCombat.round(F, d6(), d6(), d6(), d6());
      }
    } catch (e) { continue; }
    if (F.result === 'win' || F.result === 'fled' || F.result === 'passed') win++;
    if (F.result === 'loss' || F.hero.hp <= 0) loss++;
    dmg += (st.sh + st.hp) - (Math.max(0, F.boss.sh) + Math.max(0, F.boss.hp));
  }
  return aiCache[key] = { win: win / n, loss: loss / n, dmg: dmg / n / Math.max(1, st.sh + st.hp) };
}
function aiBossWorth(p, b) { // vrací skóre (0 = nebojovat)
  const e = aiEstimate(p, b), c = aiCfg(), r = b.reward || {}, st = bossState(b.id);
  if (p.hp <= 2) return 0;
  const ok = e.win * aiNoise() >= c.thr || (e.loss <= (c.pvp ? 0.25 : 0.12) && e.dmg >= 0.35 && p.hp >= 6);
  if (!ok) return 0;
  let v = e.win * ((r.gp || b.tier) * c.gbW + (r.g || 0)) + e.dmg * 4 - e.loss * 8;
  if (c.pvp) { const L = aiLeader(p); if (L && st.for === S.players.indexOf(L)) v *= 1.3; } // těžká: krademe bosse vedoucímu
  return Math.max(0.5, v);
}
function aiLeader(p) { let L = null; S.players.forEach(q => { if (q !== p && (!L || q.gp > L.gp)) L = q; }); return L; }
// ---- cesty: BFS po grafu, který respektuje pravidla hrdiny (krtek tunely bez vody, Vodička plave, lodě) ----
const SEA_ADJ = {}; PLACES.forEach(x => SEA_ADJ[x.id] = []); window.GS_SEA.forEach(([a, b]) => { SEA_ADJ[a].push(b); SEA_ADJ[b].push(a); });
const COASTS = PLACES.map(x => x.id).filter(isCoast);
function aiCanShip(p) { return !isMole(p) && Object.keys(SHIPS).some(id => shipAllowed(p, id)) && p.gold >= SHIP_PRICE; }
function aiNeigh(p, id) {
  if (isMole(p)) { const o = new Set(LADJ[id]); LADJ[id].forEach(m => LADJ[m].forEach(t => { if (t !== id && !OFFSHORE.has(t)) o.add(t); })); return [...o]; }
  const o = new Set(LADJ[id]);
  if (canSwim(p) || p.gold < SHIP_PRICE) SEA_ADJ[id].forEach(t => o.add(t));
  if (isCoast(id) && (aiCanShip(p) || shipOf(p))) COASTS.forEach(t => { if (t !== id) o.add(t); });
  return [...o];
}
function aiDist(p, from) {
  const D = { [from]: 0 }, q = [from];
  while (q.length) { const a = q.shift(); aiNeigh(p, a).forEach(b => { if (D[b] == null) { D[b] = D[a] + 1; q.push(b); } }); }
  return D;
}
// ---- hodnota cílů na mapě ----
function aiLocValue(p, loc) {
  const c = aiCfg(); let v = 0;
  const b = bossAt(loc.id); if (b) v = Math.max(v, aiBossWorth(p, b) + 2);
  (p.quests || []).forEach(q => { if (q.target === loc.id) v = Math.max(v, 6 + ((q.reward && q.reward.gp) || 0) * c.gbW / 2); });
  if (isSettlement(loc)) {
    const ab = S.abilities[loc.id] || [];
    if (p.hp <= c.heal + 1 && (ab.includes('krcma') || (ab.includes('lecitel') && p.gold >= 1))) v = Math.max(v, 8 + (MAX_HP - p.hp) * 1.5);
    if (p.gold >= 3 && aiTrainOpt(p, ab)) v = Math.max(v, 7);
    if (ab.includes('mount') && !ABILITIES.mount.req(p) && !ABILITIES.mount.classLock(p)) v = Math.max(v, 9);
    if (p.gold >= 3 && itemBonus(p).raw < ITEM_CAP && ab.some(a => ['kovarna', 'trziste', 'cerny_trh'].includes(a))) v = Math.max(v, 4);
    if (isMole(p) && (p.coal || 0) >= 2 && ab.includes('trziste')) v = Math.max(v, 3 + p.coal);
    if (p.gold < 4) v = Math.max(v, ab.includes('prace') ? 3.5 : 1.5);
    v = Math.max(v, 1.5);
  } else v = Math.max(v, 2.2);
  return v;
}
function aiTrainOpt(p, ab) {
  for (const k of TRAIN_ALLOW[roleOf(p)]) {
    if (trainLock(p, k)) continue;
    if ((k === 'boj' || k === 'obr') && ab.includes('zbrojmistr')) return { aid: 'zbrojmistr', opt: k };
    if (k === 'int' && ab.includes('knihovna')) return { aid: 'knihovna', opt: null };
    if (k === 'cha' && ab.includes('spolecensky')) return { aid: 'spolecensky', opt: null };
  }
  return null;
}
function aiGoal(p) {
  const D = aiDist(p, p.loc); let best = null, bs = -1;
  PLACES.forEach(loc => { const d = D[loc.id]; if (d == null) return;
    const s = aiLocValue(p, loc) * aiNoise() / (1 + 0.55 * Math.max(d, 1) + (d === 0 ? 0.6 : 0));
    if (s > bs) { bs = s; best = loc.id; } });
  return best;
}
// ---- jeden pochod směrem k cíli ----
function aiMarch(p) {
  const goal = aiGoal(p); if (!goal) return false;
  const D = aiDist(p, goal), here = D[p.loc] == null ? 99 : D[p.loc];
  const pickBest = () => { let b = null, bd = 1e9; reachable().forEach(id => { const d = (D[id] == null ? 99 : D[id]) + Math.random() * 0.3; if (d < bd) { bd = d; b = id; } }); return [b, bd]; };
  let [nx, nd] = pickBest();
  if ((!nx || nd >= here) && here > 0 && isCoast(p.loc) && !shipOf(p) && aiCanShip(p)) { // na moře: nalodit se
    const sid = Object.keys(SHIPS).find(id => !shipWhy(p, id));
    if (sid && COASTS.some(t => (D[t] == null ? 99 : D[t]) < here)) { boardShip(sid); aiLog(`${p.name} se nalodil (${SHIPS[sid].n}).`); [nx, nd] = pickBest(); }
  }
  if (!nx) return false;
  moveTo(nx); return true;
}
// ---- výběr akce v lokaci ----
function aiShopPick(p, aid, loc) {
  const a = ABILITIES[aid]; let best = null, bv = 0;
  (a.options(p, loc) || []).forEach(op => {
    if (op.id.startsWith && op.id.startsWith('coal:')) { if (op.id === 'coal:all' || (p.coal || 0) === 1) { const v = 3 + (p.coal || 0); if (v > bv) { bv = v; best = op.id; } } return; }
    if (!op.item || a.req(p, loc, op.id)) return;
    const it = ITEM_BY_ID[op.item]; if (aid === 'trziste' && !op.id.startsWith('buy:')) return;
    if (canWear(p, it) || p.equip.length >= EQUIP_MAX || equipConflict(p, it) || itemBonus(p).raw >= ITEM_CAP) return;
    if (p.gold - op.price < 1 && p.hp < 7) return;
    const v = (it.tier === 'epic' ? 6 : it.tier === 'mid' ? 5 : 4) - (aid === 'cerny_trh' && p.side === 'good' ? 1 : 0);
    if (v > bv) { bv = v; best = op.id; } });
  return best ? { aid, opt: best, v: bv } : null;
}
function aiActions(p) {
  const loc = BY_ID[p.loc], c = aiCfg(), out = [];
  const can = (aid, opt) => { const a = ABILITIES[aid]; if (!a) return false; if (S.dayStay && (S.dayDone || []).includes(aid)) return false; if (a.classLock && a.classLock(p)) return false; return !(a.req && a.req(p, loc, opt)); };
  abilitiesOf(loc).forEach(aid => {
    if (aid === 'boss') { const b = bossAt(loc.id), w = b && can('boss') ? aiBossWorth(p, b) : 0; if (w > 0) out.push({ aid, v: 10 + w }); return; }
    if (['kovarna', 'trziste', 'cerny_trh'].includes(aid)) { const s = aiShopPick(p, aid, loc); if (s && can(aid, s.opt)) out.push(s); return; }
    if (!can(aid, aid === 'zbrojmistr' ? (aiTrainOpt(p, ['zbrojmistr']) || {}).opt : aid === 'vestkyne' ? 'change' : null)) return;
    switch (aid) {
      case 'krcma': if (p.hp <= c.heal + 1 || (p.hp <= 7 && p.gold >= 4)) out.push({ aid, v: 6 + (MAX_HP - p.hp) }); break;
      case 'lecitel': if (p.hp <= 6) out.push({ aid, v: 5 + (MAX_HP - p.hp) / 2 }); break;
      case 'zbrojmistr': { const t = aiTrainOpt(p, ['zbrojmistr']); if (t) out.push({ aid, opt: t.opt, v: 8 }); break; }
      case 'knihovna': case 'spolecensky': out.push({ aid, v: 8 }); break;
      case 'mount': out.push({ aid, v: 9, mount: pick(Object.keys(MOUNTS)) }); break;
      case 'alchymista': if ((p.potions || 0) < 1 && p.gold >= 4) out.push({ aid, v: 4.5 }); break;
      case 'prace': out.push({ aid, v: p.gold < 4 ? 4 : 1.6 }); break;
      case 'cech': if ((p.quests || []).length < 2) out.push({ aid, v: 3 }); break;
      case 'svatyne': if (p.gold >= 4) out.push({ aid, v: 2 }); break;
      case 'zpoved': if (p.side === 'good' && p.karma < 1) out.push({ aid, v: 1.8 }); break;
      case 'herna': if (isCheat(p) ? p.hp >= 5 : (p.gold >= 6 && Math.random() < (c.pvp ? 0.1 : 0.25))) out.push({ aid, v: isCheat(p) ? 4.2 : 1.5 }); break;
      case 'arena': { const s = stat(p, combatKey(p)) - (hasStatus(p, 'fear') ? 1 : 0), need = Math.max(MIN_DIE, arenaDiff(p) - s), pr = Math.max(1, 7 - need) / 6;
        if (pr >= 0.5 && p.hp >= 6) out.push({ aid, v: 3 + pr * 2 }); break; }
      case 'explore': out.push({ aid, v: 3 }); break;
      default: break;
    }
  });
  if (c.pvp && S.canUse) S.players.forEach(q => { // těžká: brzdí vedoucího hráče
    if (q === p || q.loc !== p.loc || pvpBlock(p, q)) return;
    const L = aiLeader(p); if (q !== L || q.gp < p.gp + 3 || p.hp < 6) return;
    if (stat(p, atkKeyOf(p)) + stat(p, 'obr') >= stat(q, atkKeyOf(q)) + stat(q, 'obr')) out.push({ aid: 'pvp', q: S.players.indexOf(q), v: 5 });
  });
  return out.sort((a, b) => b.v - a.v);
}
// ---- akční funkce pro schopnost lokace (UI ji volá přes výběr karty + ✔) ----
function useAbility(aid, opt, mount) {
  const p = cur(), loc = BY_ID[p.loc], a = ABILITIES[aid];
  if (!a || !abilitiesOf(loc).includes(aid)) return; // jen schopnosti této lokace (ověření i pro online akce)
  if (opt != null && a.options) { const os = typeof a.options === 'function' ? a.options(p, loc) : a.options; if (!os.some(o => o.id === opt)) return; }
  if (mount != null && !MOUNTS[mount]) mount = null;
  panelLoc = p.loc; selAbility = aid; selOpt = opt == null ? null : opt;
  if (mount) mountChoice = mount;
  confirmAbility(); mountChoice = null;
}
function aiFreeActions(p) { // prodej nepoužitelných věcí (zdarma) + nasazení z brašny
  let did = false;
  p.bag.slice().forEach(id => { const it = ITEM_BY_ID[id]; if (!canWear(p, it) && p.equip.length < EQUIP_MAX && !equipConflict(p, it)) { if (!equipItem(p, id)) { aiLog(`${p.name} si nasadil „${it.name}“.`); did = true; } } });
  if (canSellHere(p)) p.bag.slice().forEach(id => { const it = ITEM_BY_ID[id]; if (canWear(p, it) || equipConflict(p, it)) { sellItem(p, id); did = true; } });
  if (did) { renderAll(); save(); }
  return did;
}
function aiNpcChoice(p) {
  const c = NPC_BY_ID[S.npc.id], opts = npcOptions(c, p), cf = aiCfg();
  const pr = o => { if (o.mode !== 'dice') return 0.45; const d = npcDice(p, o, c), s = d.st + d.sp + d.bl - d.fe; let k = 0; for (let r = 1; r <= 6; r++) if (r === 6 || (r >= MIN_DIE && r + s >= d.diff)) k++; return k / 6; };
  const sc = opts.map(o => ({ o, s: pr(o) * (cf.pvp ? 1 : aiNoise()) + (o.quest && cf.pvp ? 0.05 : 0) }));
  sc.sort((a, b) => b.s - a.s);
  return sc[0].o;
}
function aiFinaleTarget(p) {
  const o = S.players.filter(q => q !== p);
  if (aiCfg().pvp) return S.players.indexOf(o.slice().sort((a, b) => (a.hp + stat(a, 'obr') * 2) - (b.hp + stat(b, 'obr') * 2))[0]);
  return S.players.indexOf(pick(o));
}
// ---- krokový automat: vždy právě jedna viditelná akce ----
function aiStep() {
  const p = cur(); if (!isAI(p) || S.over) return 'stop';
  ['mount-modal', 'ship-modal'].forEach(id => { const m = $(id); if (m) m.remove(); });
  if (S.overflow) { const it = ITEM_BY_ID[S.overflow.id]; overflowSell(); aiLog(`${p.name} neměl místo – prodal „${it.name}“.`); return 'ovf'; }
  if (!$('item-modal').classList.contains('hidden')) $('item-modal').classList.add('hidden');
  const C = S.combat;
  if (C) {
    if (C.type === 'boss') { const F = C.F;
      if (F.done) { closeCombat(); return 'close'; }
      const offs = GSCombat.offers(F);
      if (GSCombat.needsChoice(F)) { const req = offs.filter(o => o.req); const o = pick(req.length ? req : offs); combatChoose(o.id); aiLog(`${p.name} volí: ${o.label.replace(/<[^>]+>/g, '')}`); return 'choose'; }
      if (!F.potionUsed && F.hero.potions && F.hero.hp <= 4 && F.hero.hp < MAX_HP) { GSCombat.drink(F); save(); renderCombat(); aiLog(`${p.name} pije léčivý lektvar.`); return 'drink'; }
      combatRoll(nextRoll()); return 'roll';
    }
    if (!C.done) { pvpRoll(nextRoll()); return 'pvp'; }
    closeCombat(); return 'close';
  }
  if (S.finalePending) { const m = $('finale-modal'); if (m) m.remove(); const t = aiFinaleTarget(p); aiStats.finales++; aiLog(`${p.name} vyzývá na finální souboj: ${S.players[t].name}!`); startFinale(t); return 'finale'; }
  if (S.npc) {
    if (!S.npc.pick) { const o = aiNpcChoice(p); aiLog(`${p.name} řeší NPC kartu: ${NPC_KIND[o.kind].n}${o.extra ? ' (zvláštní volba)' : ''}.`); npcPick(o.key); return 'npc-pick'; }
    if (!S.npc.res) { const { o } = npcCur(); if (o.mode === 'dice') npcRoll(nextRoll()); else npcDecide(rnd(o.options.length)); return 'npc-res'; }
    if (S.npc.offer) { const f = S.npc.offer, acc = (p.quests || []).length < 3 && (aiCfg().pvp ? f.dist <= 4 || f.gp : Math.random() < 0.6); npcQuest(acc); aiLog(`${p.name} ${acc ? 'přijímá cestovní úkol' : 'bere odměnu hned'}.`); return 'npc-offer'; }
    finishNpc(); return 'end';
  }
  if (S.pending) {
    const P = S.pending;
    if (P.stage === 'choice') { const o = SEARCH_BY_ID[P.out];
      const ch = o.choices.map(c => { if (!c.check) return { c, s: 0.5 }; const k = checkStat(p, c.check.k), s = stat(p, k) + stat(p, 'spec'); let n = 0; for (let r = 1; r <= 6; r++) if (r === 6 || (r !== 1 && r + s >= c.check.d)) n++; return { c, s: n / 6 + (p.hp <= 3 ? -0.3 : 0) }; }).sort((a, b) => b.s - a.s);
      choosePending(ch[0].c.id); return 'choice'; }
    rollPending(nextRoll()); return 'pend';
  }
  // Olgrich ve dne: přečkat den, když je zraněný nebo stojí ve městě s dobrými akcemi
  if (isDayFor(p) && S.steps === 0 && !S.dayStay && !S.acted && (p.hp <= 4 || (isSettlement(BY_ID[p.loc]) && aiActions(p).length >= 2 && Math.random() < 0.5))) {
    stay(); aiLog(`${p.name} přečká den.`); return 'daystay'; }
  const key = S.round + ':' + S.steps + ':' + p.loc + ':' + (S.dayLeft || 0);
  if (aiFreeKey !== key) { aiFreeKey = key; if (aiFreeActions(p)) return 'free'; }
  if (S.canUse && aiSkipKey !== key) {
    aiSkipKey = key;
    const acts = aiActions(p), best = acts[0];
    const marchLeft = S.steps < MAXST();
    if (best && (best.v >= 2.5 || !marchLeft || S.dayStay)) {
      if (best.aid === 'pvp') { aiLog(`${p.name} vyzývá vedoucího hráče ${S.players[best.q].name} na souboj!`); aiStats.pvp++; startPvp(p, S.players[best.q]); return 'pvp-start'; }
      aiLog(`${p.name} (${BY_ID[p.loc].name}): ${ABILITIES[best.aid].name}${best.opt && !String(best.opt).startsWith('coal') ? '' : ''}.`);
      if (best.aid === 'boss') aiStats.fights++;
      useAbility(best.aid, best.opt, best.mount); return 'act';
    }
  }
  if (S.steps < MAXST()) { if (aiMarch(p)) return 'march'; stay(); return 'stay'; }
  endTurn(); return 'endturn';
}
async function aiRun() {
  if (NET.role === 'guest') return;
  if (aiBusy || !aiTurnNow()) return;
  aiBusy = true; const gen = aiGen; document.body.classList.add('ai-turn'); aiBar();
  try {
    while (S && !S.over && aiTurnNow() && gen === aiGen) {
      const tk = S.round + ':' + S.cur;
      if (tk !== aiTurnKey) { aiTurnKey = tk; aiStepsThisTurn = 0; aiCache = {}; aiStats.turns++; }
      if (++aiStepsThisTurn > 90) { aiForce(); continue; }
      let r;
      try { r = aiStep(); } catch (e) { aiStats.errors.push(String(e && e.stack || e).slice(0, 300)); console.error(e); aiForce(); continue; }
      if (r === 'stop') break;
      const d = aiDelay * (r === 'roll' || r === 'pvp' || r === 'npc-res' || r === 'pend' ? 1.2 : r === 'end' ? 1.3 : r === 'free' || r === 'ovf' ? 0.3 : 1);
      if (d > 0) await aiSleep(d); else await Promise.resolve();
      if (r === 'end') aiBar();
    }
  } finally { aiBusy = false; // vítěz finále (AI): chvíli ukázat výsledek, pak vítězná obrazovka
    if (S && S.over && S.combat && isAI(cur()) && gen === aiGen) setTimeout(() => { if (S && S.over && S.combat) closeCombat(); }, Math.max(0, aiDelay * 2.5));
    document.body.classList.toggle('ai-turn', aiTurnNow()); aiBar(); if (aiTurnNow() && gen === aiGen) aiKick(); }
}
function aiForce() { // pojistka proti zaseknutí: dotáhni tah do konce
  aiStats.forced++;
  const p = cur(); aiLog(`${p.name}: pojistka – tah ukončen.`);
  ['mount-modal', 'ship-modal', 'finale-modal'].forEach(id => { const m = $(id); if (m) m.remove(); });
  S.pending = null; S.overflow = null; $('item-modal').classList.add('hidden');
  if (S.combat) { S.combat = null; $('combat').classList.add('hidden'); }
  if (S.finalePending) { S.finalePending = false; }
  $('npc').classList.add('hidden'); S.npc = null; passTurn();
}
function aiKick(ms) {
  if (NET.role === 'guest') return;
  clearTimeout(aiTimer);
  if (!aiTurnNow()) { document.body.classList.remove('ai-turn'); aiBar(); return; }
  document.body.classList.add('ai-turn'); aiBar();
  aiTimer = setTimeout(() => aiRun(), ms != null ? ms : Math.max(0, aiDelay));
}
function aiBar() {
  let b = $('ai-bar');
  if (!S || !S.players || !S.players.some(isAI) || !$('screen-game').classList.contains('active') || NET.role) { if (b) b.classList.add('hidden'); return; }
  if (!b) { b = el('div', 'ai-bar'); b.id = 'ai-bar'; document.body.appendChild(b); }
  const p = cur(), on = aiTurnNow(), fast = aiDelay <= 150;
  b.classList.remove('hidden'); b.classList.toggle('idle', !on);
  b.innerHTML = on ? `<span class="ai-who">🤖 Hraje počítač: <b>${p.name}</b> · ${aiCfg().n}</span><button class="btn btn-sm ${fast ? 'btn-gold' : 'btn-dark'}" id="ai-fast" title="Zrychlit tahy počítače">⏩ ${fast ? 'Rychle' : 'Zrychlit'}</button>`
    : `<span class="ai-who">🤖 Soupeři: ${aiCfg().n} obtížnost</span><button class="btn btn-sm ${fast ? 'btn-gold' : 'btn-dark'}" id="ai-fast" title="Rychlost tahů počítače">⏩ ${fast ? 'Rychle' : 'Normálně'}</button>`;
  $('ai-fast').onclick = () => { aiSetSpeed(aiDelay <= 150 ? 650 : 120); };
}
function aiSetSpeed(ms) { aiDelay = ms; try { localStorage.setItem('grumpstone_aispeed', String(ms)); } catch (e) {} aiBar(); }

// ======================================================================
// ---------- v20 ONLINE HRA (WebRTC přes PeerJS; hostitel je autorita) ----------
// Hostitel drží stav S, hází kostkami a hraje za počítačové hráče. Hosté posílají jen AKCE (stejné funkce jako UI/AI),
// hostitel je ověří (je hráč na tahu?), provede a rozešle serializovaný stav. Hosté vidí ovládání jen ve svém tahu.
// ======================================================================
const NET_SITE = 'https://karelhalouka940507-ops.github.io/grumpstone/';
const NET_PREFIX = 'grumpstone-kh-', NET_PROTO = 1;
const NET = { role: null, peer: null, code: null, mySeat: 0, conns: {}, seatOf: new Map(), tokens: {}, hostConn: null, applying: false, bcastT: null, lobby: false,
  status: '', ui: {}, onList: [], left: false, turnFetched: null, retry: 0, name: '' };
const isGuest = () => NET.role === 'guest';
const isHostNet = () => NET.role === 'host';
const netInGame = () => !!(S && S.online && !NET.lobby);
const myTurnNet = () => !NET.role || !S || !S.players || S.cur === NET.mySeat;
function netQuery() { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); } }
function netIce() {
  const base = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
  const cfg = window.GRUMP_NET || {}; let extra = [];
  try { extra = JSON.parse(localStorage.getItem('grumpstone_turn') || 'null') || []; } catch (e) {}
  return base.concat(cfg.turn || [], NET.turnFetched || [], extra);
}
async function netFetchTurn() { // volitelné: vlastní bezplatný účet metered.ca (20 GB/měsíc) → TURN pro mobilní data / přísné NAT
  const c = window.GRUMP_NET || {}; if (!c.meteredApp || !c.meteredKey || NET.turnFetched) return;
  try { const r = await fetch(`https://${c.meteredApp}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(c.meteredKey)}`); if (r.ok) NET.turnFetched = await r.json(); } catch (e) {}
}
function netPeerOpts() {
  const o = { debug: 0, config: { iceServers: netIce() } }, ph = netQuery().get('peerhost'); // ?peerhost=localhost:9000 = vlastní PeerJS server (testy)
  if (ph) { const [h, pt] = ph.split(':'); Object.assign(o, { host: h, port: +pt || 9000, path: '/', secure: false }); }
  if (netQuery().get('ice') === 'blocked') o.config = { iceServers: [], iceTransportPolicy: 'relay' }; // test: přímé spojení nikdy nevznikne
  return o;
}
const netNewCode = () => 'GRUM-' + String(1000 + rnd(9000));
const netNorm = c => { c = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (/^\d{4}$/.test(c)) c = 'GRUM' + c; return c.length === 8 ? c.slice(0, 4) + '-' + c.slice(4) : ''; };
const netPeerId = code => NET_PREFIX + code.toLowerCase();
const netToken = () => Array.from({ length: 3 }, () => Math.random().toString(36).slice(2, 10)).join('');
const netLink = code => NET_SITE + '?room=' + code;
function netStatus(t) { NET.status = t; const e = $('net-status'); if (e) e.innerHTML = t; netBar(); }
function netSaveHost() { try { localStorage.setItem('grumpstone_host', JSON.stringify({ code: NET.code, tokens: NET.tokens })); } catch (e) {} }
function netLoadHost() { try { return JSON.parse(localStorage.getItem('grumpstone_host') || 'null'); } catch (e) { return null; } }
function netSaveGuest(o) { try { localStorage.setItem('grumpstone_net', JSON.stringify(o)); } catch (e) {} }
function netLoadGuest() { try { return JSON.parse(localStorage.getItem('grumpstone_net') || 'null'); } catch (e) { return null; } }
function netLeave() {
  NET.left = true; clearTimeout(NET.retryT); clearTimeout(NET.relayT); clearTimeout(NET.failT); netRelayStop(); netWakeLock(false);
  Object.assign(NET, { welcomed: false, welcomedVia: null, via: null, relayOpen: false, p2pOpen: false });
  try { if (NET.peer) NET.peer.destroy(); } catch (e) {}
  Object.assign(NET, { role: null, peer: null, conns: {}, seatOf: new Map(), hostConn: null, lobby: false, status: '', onList: [] });
  document.body.classList.remove('not-mine', 'net-on'); const b = $('net-bar'); if (b) b.classList.add('hidden');
}
// ---------- HOSTITEL ----------
async function netHost(resume) {
  netLeave(); NET.left = false; NET.lobby = typeof resume !== 'string'; await netFetchTurn();
  const saved = netLoadHost();
  NET.role = 'host'; NET.mySeat = 0; NET.gids = {}; NET.code = typeof resume === 'string' ? resume : (resume && saved ? saved.code : netNewCode());
  NET.tokens = resume && saved && saved.code === NET.code ? (saved.tokens || {}) : {};
  document.body.classList.add('net-on');
  let tries = 0; netWakeLock(true);
  netRelayHost(); // záložní spojení přes server běží vždy souběžně
  const open = () => {
    if (NET.role !== 'host' || typeof Peer === 'undefined' || netMode() === 'relay') return;
    const peer = new Peer(netPeerId(NET.code), netPeerOpts()); NET.peer = peer;
    netStatus(resume ? `⏳ Obnovuji místnost ${NET.code}…` : '⏳ Zakládám místnost…');
    peer.on('open', () => { tries = 0; NET.p2pOpen = true; netHostReady(); });
    peer.on('connection', c => netHostConn(c));
    peer.on('disconnected', () => { if (NET.peer === peer && !peer.destroyed && NET.role === 'host') setTimeout(() => { try { peer.reconnect(); } catch (x) {} }, 2500); });
    peer.on('error', e => {
      if (NET.peer !== peer) return;
      if (e.type === 'unavailable-id') { try { peer.destroy(); } catch (x) {}
        if (!resume && !netInGame()) { NET.code = netNewCode(); NET.tokens = {}; NET.relayOpen = false; netRelayHost(); return setTimeout(open, 200); }
        if (tries++ < 40) { netStatus(`⏳ Server ještě drží kód ${NET.code} (po obnovení stránky) – zkouším znovu…`); return setTimeout(open, 3000); } }
      if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' || e.type === 'socket-closed') { NET.p2pOpen = false; if (!NET.relayOpen) netStatus('⚠️ Spojení se serverem pro párování vypadlo – zkouším znovu…'); try { peer.destroy(); } catch (x) {} return setTimeout(open, 4000); }
      if (!NET.relayOpen) netStatus('⚠️ ' + (e.type || e));
    });
  };
  open();
}
function netHostReady() {
  if (!isHostNet()) return; netSaveHost();
  netStatus(`✅ Místnost <b>${NET.code}</b> je otevřená – pošli kód nebo odkaz přátelům.`);
  if (netInGame()) netBroadcast(true); else netRenderSetup();
}
function netHostConn(c) {
  c.on('data', m => { try { netHostMsg(c, m); } catch (e) { console.error(e); } });
  c.on('close', () => { const s = NET.seatOf.get(c); NET.seatOf.delete(c);
    if (s != null && NET.conns[s] === c) { delete NET.conns[s]; if (netInGame()) { addLog(`🌐 ${S.players[s] ? S.players[s].name : 'Hráč'} se odpojil.`); netBroadcast(); renderAll(); } else netLobbyBroadcast(); } });
  c.on('error', () => {});
}
function netBind(c, seat) { const old = NET.conns[seat]; if (old && old !== c) { NET.seatOf.delete(old); try { old.close(); } catch (e) {} } NET.conns[seat] = c; NET.seatOf.set(c, seat); }
const netSend = (c, m) => { try { if (c && c.open) c.send(m); } catch (e) {} };
function netHostMsg(c, m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'hello') return netHostHello(c, m);
  const seat = NET.seatOf.get(c); if (seat == null) return;
  if (m.t === 'seat') return netLobbySeat(seat, m);
  if (m.t === 'act') return netApply(seat, String(m.a), Array.isArray(m.args) ? m.args : []);
}
function netHostHello(c, m) {
  const name = String(m.name || '').trim().slice(0, 18);
  NET.gids = NET.gids || {};
  let seat = m.token ? Object.keys(NET.tokens).map(Number).find(i => NET.tokens[i] === m.token) : undefined;
  if (seat == null && m.gid && NET.gids[m.gid] != null) seat = NET.gids[m.gid]; // stejné zařízení, jiná cesta (přímo / přes server)
  if (netInGame()) { // hra běží – jen návrat na vlastní místo
    if (seat == null || !S.players[seat]) return netSend(c, { t: 'reject', msg: 'Hra už běží – připojit se může jen hráč, který v ní sedí (ze stejného zařízení).' });
    netBind(c, seat); const p = S.players[seat];
    if (p.aiTakeover) { p.ai = false; p.aiTakeover = false; }
    addLog(`🌐 ${p.name} je zase online.`);
    netSend(c, { t: 'welcome', seat, token: m.token, code: NET.code, started: true }); renderAll(); netBroadcast(true); return;
  }
  if (!NET.lobby) return netSend(c, { t: 'reject', msg: 'Hostitel zatím nemá otevřenou místnost.' });
  if (seat != null && setup.players[seat]) { netBind(c, seat); if (name) setup.players[seat].name = name; }
  else {
    if (setup.players.length >= MAX_PLAYERS) return netSend(c, { t: 'reject', msg: 'Místnost je plná (6 hráčů).' });
    const pl = defaultPlayer(setup.players.length), used = new Set(setup.players.map(q => q.hero));
    pl.hero = pick(HEROES.filter(h => !used.has(h.id))).id; pl.name = name || pl.name; pl.kind = 'guest'; pl.ai = false;
    setup.players.push(pl); setup.n = setup.players.length;
    const i = setup.players.length - 1; NET.tokens[i] = netToken(); netBind(c, i);
  }
  const i = NET.seatOf.get(c); if (m.gid) NET.gids[String(m.gid)] = i;
  netSend(c, { t: 'welcome', seat: i, token: NET.tokens[i], code: NET.code, started: false });
  netSaveHost(); netLobbyBroadcast();
}
function netLobbyData() {
  return { code: NET.code, diff: setup.diff || 'normal', seats: setup.players.map((p, i) => ({ name: p.name, hero: p.hero, color: p.color, ai: !!p.ai, kind: i === 0 ? 'host' : p.ai ? 'ai' : 'guest', on: i === 0 || !!p.ai || !!NET.conns[i] })) };
}
function netLobbyBroadcast() { const d = netLobbyData(); Object.entries(NET.conns).forEach(([i, c]) => netSend(c, { t: 'lobby', you: +i, lobby: d })); netRenderSetup(); }
function netLobbySeat(seat, m) {
  const pl = setup.players[seat]; if (!pl || netInGame()) return;
  if (typeof m.name === 'string') pl.name = m.name.trim().slice(0, 18) || pl.name;
  if (m.hero && HEROES.some(h => h.id === m.hero) && !setup.players.some((q, j) => j !== seat && q.hero === m.hero)) pl.hero = m.hero;
  if (m.color && COLORS.some(c => c.id === m.color) && !setup.players.some((q, j) => j !== seat && q.color === m.color)) pl.color = m.color;
  netLobbyBroadcast();
}
function netRemoveSeat(i) { // jen počítačová místa
  if (!isHostNet() || i === 0 || !setup.players[i] || !setup.players[i].ai) return;
  setup.players.splice(i, 1); setup.n = setup.players.length;
  const t = {}, c = {}; Object.keys(NET.tokens).map(Number).forEach(k => { if (k !== i) t[k > i ? k - 1 : k] = NET.tokens[k]; });
  Object.keys(NET.conns).map(Number).forEach(k => { if (k !== i) { const cc = NET.conns[k], nk = k > i ? k - 1 : k; c[nk] = cc; NET.seatOf.set(cc, nk); } });
  Object.keys(NET.gids || {}).forEach(g => { if (NET.gids[g] === i) delete NET.gids[g]; else if (NET.gids[g] > i) NET.gids[g]--; });
  NET.tokens = t; NET.conns = c; setupTab = Math.min(setupTab, setup.n - 1); netSaveHost(); netLobbyBroadcast();
}
function netAddAI() {
  if (!isHostNet() || setup.players.length >= MAX_PLAYERS) return;
  const pl = defaultPlayer(setup.players.length); pl.ai = true; pl.kind = 'ai'; setup.players.push(pl); setup.n = setup.players.length;
  aiRandomize(pl, setup.players.filter(q => q.ai).length); netLobbyBroadcast();
}
function netStart() {
  if (!isHostNet() || setup.players.length < 2) { toast('Na online hru potřebuješ aspoň jednoho dalšího hráče (přítele nebo počítač).'); return; }
  NET.lobby = false;
  newGame(); S.online = { code: NET.code, v: NET_PROTO };
  S.players.forEach((p, i) => { p.remote = i !== 0 && !setup.players[i].ai; });
  addLog(`🌐 Online hra ${NET.code}: ${S.players.map(p => p.name + (p.ai ? ' 🤖' : '')).join(', ')}.`, true);
  netSaveHost(); startGame(); netBroadcast(true);
}
const NET_DICE = new Set(['rollPending', 'combatRoll', 'pvpRoll', 'npcRoll']);
const NET_REAL = {};
function netApply(seat, a, args) {
  if (!netInGame() || S.over || !NET_REAL[a]) return;
  const p = S.players[seat];
  const ok = a === 'tradeAnswer' ? !!(S.trade && tradeSellerIdx(S.trade) === seat) : seat === S.cur && p && !p.ai;
  if (!ok) { netSend(NET.conns[seat], { t: 'deny', msg: `Teď je na tahu ${cur().name}.` }); return netBroadcast(); }
  if (NET_DICE.has(a)) args = [nextRoll()]; // náhoda jen u hostitele
  NET.applying = true;
  try { NET_REAL[a](...args.slice(0, 4)); } catch (e) { console.error('net act', a, e); } finally { NET.applying = false; }
  netBroadcast();
}
function netOnList() { return S && S.players ? S.players.map((p, i) => i === NET.mySeat || !p.remote || !!NET.conns[i]) : []; }
function netBroadcast(now) {
  if (!isHostNet() || !netInGame()) return;
  clearTimeout(NET.bcastT);
  const go = () => { const msg = { t: 'state', json: JSON.stringify(S), ui: { lastResult: lastResult || null }, on: netOnList() };
    Object.values(NET.conns).forEach(c => netSend(c, msg)); netTradeView(); netBar(); };
  if (now) go(); else NET.bcastT = setTimeout(go, 40);
}
function netHandover(i) {
  if (!isHostNet() || !S || !S.players[i] || !S.players[i].remote || NET.conns[i]) return;
  const p = S.players[i]; p.ai = true; p.aiTakeover = true; addLog(`🤖 Za odpojeného hráče ${p.name} teď hraje počítač (po návratu hraje zase sám).`);
  renderAll(); save(); if (S.cur === i) aiKick(300);
}
// ---------- HOST (připojený hráč) ----------
async function netJoin(code, name) {
  code = netNorm(code); if (!code) { netStatus('❌ Zadej kód hry, např. GRUM-4821.'); return; }
  netLeave(); NET.left = false; await netFetchTurn();
  NET.role = 'guest'; NET.code = code; NET.name = (name || '').trim().slice(0, 18); NET.retry = 0; NET.via = 'p2p'; document.body.classList.add('net-on');
  netStatus(`⏳ Připojuji se ke hře ${code}…`); netRenderSetup(); netWakeLock(true);
  NET.failT = setTimeout(() => { if (isGuest() && !NET.welcomed) netStatus(`❌ Nepodařilo se spojit s hostitelem hry ${code}. Zkontroluj kód a ať má hostitel hru otevřenou na obrazovce (ne na pozadí). <button class="btn btn-gold btn-sm" id="net-retry">🔄 Zkusit znovu</button>`); }, 20000);
  if (typeof Peer === 'undefined' || netMode() === 'relay') return netRelayGuest();
  NET.relayT = setTimeout(() => { if (isGuest() && !NET.welcomed) netRelayGuest(); }, 6000); // přímé spojení se do 6 s neotevřelo → přes server
  const peer = new Peer(netPeerOpts()); NET.peer = peer;
  peer.on('open', () => netConnect());
  peer.on('disconnected', () => { if (NET.peer === peer && !peer.destroyed && isGuest()) setTimeout(() => { try { peer.reconnect(); } catch (x) {} }, 2500); });
  peer.on('error', e => { if (NET.peer !== peer || !isGuest()) return;
    if (netMode() !== 'p2p') { if (!NET.welcomed) netRelayGuest(); return; } // přímo to nejde → záložní spojení přes server
    if (e.type === 'peer-unavailable') { netStatus(`⏳ Hra ${code} zatím není online (hostitel ji musí mít otevřenou) – zkouším znovu…`); clearTimeout(NET.retryT); NET.retryT = setTimeout(netConnect, 4000); return; }
    netStatus('⚠️ ' + (e.type || e)); clearTimeout(NET.retryT); NET.retryT = setTimeout(() => { if (isGuest() && peer.destroyed) netJoin(code, NET.name); }, 5000); });
}
function netConnect() {
  if (!isGuest() || !NET.peer || NET.peer.destroyed || NET.left || NET.via === 'relay') return;
  if (NET.peer.disconnected) { try { NET.peer.reconnect(); } catch (e) {} }
  const saved = netLoadGuest(), token = saved && saved.code === NET.code ? saved.token : null;
  const c = NET.peer.connect(netPeerId(NET.code), { reliable: true }); NET.hostConn = c;
  c.on('open', () => { NET.retry = 0; c.send({ t: 'hello', name: NET.name || (saved && saved.name) || '', token, gid: NR.id, v: NET_PROTO }); });
  c.on('data', m => { try { netGuestMsg(m); } catch (e) { console.error(e); } });
  c.on('close', () => { if (NET.hostConn !== c || !isGuest() || NET.left || NET.via === 'relay') return; NET.hostConn = null;
    netStatus('⚠️ Spojení s hostitelem přerušeno – připojuji znovu…'); clearTimeout(NET.retryT); NET.retryT = setTimeout(netConnect, 3000);
    if (netMode() !== 'p2p') { clearTimeout(NET.relayT); NET.relayT = setTimeout(() => { if (isGuest() && (!NET.hostConn || !NET.hostConn.open)) netRelayGuest(); }, 6000); } });
  c.on('error', () => {});
}
function netGuestMsg(m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'welcome') { NET.mySeat = m.seat; NET.welcomed = true; NET.welcomedVia = NET.hostConn; clearTimeout(NET.failT); clearTimeout(NET.relayT);
    netSaveGuest({ code: m.code, token: m.token, seat: m.seat, name: NET.name });
    netStatus(`${netViaLabel()} · ` + (m.started ? `✅ Zpět ve hře ${m.code}.` : `ke hře <b>${m.code}</b> – vyber si hrdinu a počkej na start.`)); netRenderSetup(); return; }
  if (m.t === 'reject') { netStatus('❌ ' + m.msg); const keep = NET.code; netLeave(); NET.code = keep; netStatus('❌ ' + m.msg); netRenderSetup(); return; }
  if (m.t === 'deny') { toast('⏳ ' + m.msg); return; }
  if (m.t === 'lobby') { NET.mySeat = m.you; const L = m.lobby;
    setup = { n: L.seats.length, mode: 'online', diff: L.diff, players: L.seats.map(s => ({ name: s.name, hero: s.hero, color: s.color, ai: s.ai, kind: s.kind, on: s.on })) };
    setupTab = m.you; if (!$('screen-setup').classList.contains('active') && !(S && $('screen-game').classList.contains('active'))) show('screen-setup'); renderSetup(); return; }
  if (m.t === 'state') {
    const first = !S || !S.online || !$('screen-game').classList.contains('active');
    S = JSON.parse(m.json); NET.ui = m.ui || {}; NET.onList = m.on || [];
    if (first) { panelLoc = null; startGame(); }
    netSync();
  }
}
function netSendAct(a, args) {
  const c = NET.hostConn;
  if (!c || !c.open) { toast('⚠️ Spojení s hostitelem teď není – zkouším se připojit…'); return; }
  if (!myTurnNet() && a !== 'tradeAnswer') { toast(`⏳ Teď hraje ${cur().name}.`); return; }
  c.send({ t: 'act', a, args });
}
// Překreslení u hosta podle stavu od hostitele (modaly jen pro hráče na tahu)
function netSync() {
  if (!S || !S.players) return;
  const mine = myTurnNet();
  renderAll();
  if (S.over) { $('combat').classList.add('hidden'); $('npc').classList.add('hidden'); closePanel(true); showVictory(); return; }
  if (mine) {
    lastResult = NET.ui.lastResult || null;
    if (S.combat) { closePanel(true); renderCombat(); $('combat').classList.remove('hidden'); } else $('combat').classList.add('hidden');
    if (S.npc) openNpc(); else $('npc').classList.add('hidden');
    if (!S.combat && !S.npc) {
      if (S.pending) openPanel(S.pending.loc);
      else if (panelLoc) { const keepA = selAbility; renderPanel(); $('panel').classList.remove('hidden'); $('panel-backdrop').classList.remove('hidden'); selAbility = keepA; }
    }
    if (S.overflow && S.overflow.pi === NET.mySeat) renderOverflow(); else if (!S.overflow && $('item-body').querySelector('.ovf-h')) $('item-modal').classList.add('hidden');
    if (S.finalePending && !S.combat && !$('finale-modal')) openFinale();
  } else {
    if (panelLoc) closePanel(true); $('npc').classList.add('hidden'); $('combat').classList.add('hidden');
    const fm = $('finale-modal'); if (fm) fm.remove(); $('item-modal').classList.add('hidden');
  }
  netTradeView();
}
function netTradeView() {
  if (!NET.role || !S || !S.players) return;
  const tr = $('trade');
  if (S.trade && tradeSellerIdx(S.trade) === NET.mySeat) { TR = TR || { partner: null, dir: 'buy', item: null, offer: 1, stage: 'form' }; tr.classList.add('net-allow'); tr.classList.remove('hidden'); renderTrade(); }
  else if (tr.classList.contains('net-allow')) { tr.classList.remove('net-allow'); if (!myTurnNet() || !S.trade) tr.classList.add('hidden'); }
  else if (S.trade && myTurnNet() && !tr.classList.contains('hidden')) renderTrade();
  else if (!S.trade && myTurnNet() && !tr.classList.contains('hidden') && TR && TR.stage === 'confirm') { TR.stage = 'form'; renderTrade(); }
}
// Lišta stavu online hry + značky připojení u hráčů
function netBar() {
  const on = !!NET.role && S && S.players && S.online && $('screen-game').classList.contains('active');
  document.body.classList.toggle('not-mine', !!on && !myTurnNet() && !S.over);
  let b = $('net-bar');
  if (!on) { if (b) b.classList.add('hidden'); return; }
  if (!b) { b = el('div', 'net-bar'); b.id = 'net-bar'; document.body.appendChild(b); }
  const p = cur(), off = isHostNet() ? (p.remote && !NET.conns[S.cur]) : NET.onList[S.cur] === false;
  const conn = isGuest() && (!NET.hostConn || !NET.hostConn.open);
  b.classList.remove('hidden'); b.classList.toggle('mine', myTurnNet()); b.classList.toggle('warn', conn);
  b.innerHTML = `<span class="nb-code" title="Kód online hry">${isGuest() && NET.via === 'relay' ? '🛰' : '🌐'} ${NET.code || ''}</span>` +
    (conn ? `<span>${NET.status || '⚠️ Připojuji…'}</span>` : S.over ? '<span>🏁 Hra skončila</span>' : myTurnNet() ? '<span class="nb-turn">🎲 <b>Jsi na tahu!</b></span>' :
      isAI(p) ? `<span>🤖 Hraje počítač: <b>${p.name}</b></span>` : `<span>⏳ Čeká se na hráče <b>${p.name}</b>${off ? ' <i>(odpojen)</i>' : ''}</span>`);
}
function netDecorate() {
  if (!NET.role || !S || !S.online) return;
  const on = isHostNet() ? netOnList() : NET.onList;
  document.querySelectorAll('#players .pcard').forEach((c, i) => { const p = S.players[i]; if (!p) return;
    const nm = c.querySelector('.nm'); if (!nm || nm.querySelector('.net-dot')) return;
    const me = i === NET.mySeat, ok = on[i] !== false;
    nm.insertAdjacentHTML('afterbegin', `<span class="net-dot ${ok ? 'on' : 'off'}" title="${me ? 'Ty' : ok ? 'Online' : 'Odpojen'}">${me ? '⭐' : ok ? '🟢' : '🔴'}</span>`);
    if (isHostNet() && p.remote && !ok && !p.ai) c.insertAdjacentHTML('beforeend', `<button class="btn btn-dark btn-sm net-hand" data-handover="${i}">🤖 Předat počítači</button>`);
    if (p.aiTakeover) c.insertAdjacentHTML('beforeend', '<div class="net-ai-note">🤖 Za odpojeného hraje počítač</div>'); });
}
// ---------- Setup: 3. režim „🌐 Online hra“ ----------
function netRenderSetup() { if ($('screen-setup').classList.contains('active') && setup && setup.mode === 'online') renderSetup(); netBar(); }
function netSetupPanel(ab) {
  const q = netQuery(), roomQ = netNorm(q.get('room') || '');
  const box = el('div', 'net-setup'); box.id = 'net-setup';
  if (!NET.role) {
    const saved = netLoadGuest();
    box.innerHTML = `<div class="net-cols"><div class="net-card"><h3>🏠 Založit hru</h3><p>Staneš se hostitelem: hra běží na tvém zařízení a přátelům pošleš kód nebo odkaz.</p><button class="btn btn-gold" id="net-host">🏠 Založit online hru</button></div>
      <div class="net-card"><h3>🔗 Připojit se</h3><label>Kód hry <input id="net-code" placeholder="GRUM-1234" maxlength="9" value="${roomQ || (saved && saved.code) || ''}"></label>
      <label>Tvoje jméno <input id="net-name" maxlength="18" value="${(saved && saved.name) || ''}" placeholder="Jméno"></label><button class="btn btn-gold" id="net-join">🔗 Připojit se ke hře</button></div></div>
      <div id="net-status" class="net-status">${NET.status || ''}</div>`;
    ab.appendChild(box);
    box.querySelector('#net-host').onclick = () => { const me = setup.players[0]; me.ai = false; me.kind = 'host'; setup.players = [me]; setup.n = 1; setupTab = 0; netHost(false); renderSetup(); };
    box.querySelector('#net-join').onclick = () => { setup.players = []; netJoin(box.querySelector('#net-code').value, box.querySelector('#net-name').value); };
    return;
  }
  const link = netLink(NET.code || '');
  box.innerHTML = `<div class="net-room"><div class="net-room-l">Kód hry</div><div class="net-room-code" id="net-room-code">${NET.code || '…'}</div>
    ${isHostNet() ? `<div class="net-link" id="net-link">${link}</div><div class="net-btns"><button class="btn btn-gold btn-sm" id="net-copy">📋 Kopírovat odkaz</button>${navigator.share ? '<button class="btn btn-dark btn-sm" id="net-share">📤 Sdílet</button>' : ''}</div>` : ''}</div>
    <div id="net-status" class="net-status">${NET.status || ''}</div>
    <div class="net-seats">${setup.players.map((p, i) => `<span class="net-seat ${p.ai ? 'ai' : ''}">${i === 0 ? '👑' : p.ai ? '🤖' : isHostNet() ? (NET.conns[i] ? (NET.conns[i].relay ? '🛰' : '🟢') : '🔴') : p.on !== false ? '🟢' : '🔴'} ${p.name}${i === NET.mySeat ? ' (ty)' : ''}</span>`).join('')}</div>
    ${isHostNet() ? `<div class="net-btns"><button class="btn btn-dark btn-sm" id="net-add-ai" ${setup.players.length >= MAX_PLAYERS ? 'disabled' : ''}>➕ 🤖 Přidat počítač</button><button class="btn btn-dark btn-sm" id="net-leave">✖ Zrušit místnost</button></div>` :
      `<p class="hint">${NET.welcomed ? 'Čeká se, až hostitel spustí hru…' : '⏳ Připojuji se k hostiteli…'}</p><div class="net-btns"><button class="btn btn-dark btn-sm" id="net-leave">✖ Odejít</button></div>`}`;
  ab.appendChild(box);
  const cp = box.querySelector('#net-copy'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(link); toast('Odkaz zkopírován.'); } catch (e) { toast(link); } };
  const sh = box.querySelector('#net-share'); if (sh) sh.onclick = () => navigator.share({ title: 'Grumpstone – online hra', text: `Pojď hrát Grumpstone! Kód hry: ${NET.code}`, url: link }).catch(() => {});
  const ad = box.querySelector('#net-add-ai'); if (ad) ad.onclick = () => netAddAI();
  box.querySelector('#net-leave').onclick = () => { netLeave(); initSetup(); setup.mode = 'online'; renderSetup(); };
  if (isHostNet() && setup.players.some(p => p.ai)) {
    ab.appendChild(el('h3', '', 'Obtížnost počítače'));
    const dg = el('div', 'seg seg-wide'); dg.id = 'ai-diff';
    [['normal', '🙂 Normální'], ['hard', '😈 Těžká']].forEach(([d, t]) => { const b = el('button', setup.diff === d ? 'on' : '', t); b.dataset.diff = d; b.onclick = () => { setup.diff = d; netLobbyBroadcast(); }; dg.appendChild(b); });
    ab.appendChild(dg);
  }
}
function netSeatChanged(i) {
  if (isGuest() && i === NET.mySeat) { const pl = setup.players[i]; netSend(NET.hostConn, { t: 'seat', name: pl.name, hero: pl.hero, color: pl.color }); }
  else if (isHostNet() && !netInGame()) netLobbyBroadcast();
}
const netCanEditSeat = i => !NET.role ? true : isGuest() ? i === NET.mySeat : (i === 0 || !!(setup.players[i] && setup.players[i].ai));
// ---------- ZÁLOŽNÍ SPOJENÍ PŘES SERVER (MQTT přes WebSocket, bez účtu) ----------
// Když se telefony nespojí napřímo (WebRTC za NAT/CGNAT), jdou zprávy přes veřejný MQTT server. Obsah je zašifrovaný klíčem z kódu hry.
const NET_RELAYS = [
  { url: 'wss://public.cloud.shiftr.io', user: 'public', pass: 'public' }, // port 443 – projde i přísnými sítěmi
  { url: 'wss://broker.hivemq.com:8884/mqtt' },
  { url: 'wss://broker.emqx.io:8084/mqtt' },
  { url: 'wss://test.mosquitto.org:8081/mqtt' }];
const netMode = () => { const q = netQuery().get('net'); if (q) return q; try { return localStorage.getItem('grumpstone_netmode') || 'auto'; } catch (e) { return 'auto'; } };
const netRelayList = () => { const u = netQuery().get('relay'); return u ? [{ url: u }] : NET_RELAYS; };
class NetMQ { // minimální klient MQTT 3.1.1 (QoS 0) přes WebSocket
  constructor(cfg, onMsg, onClose) { Object.assign(this, { cfg, onMsg, onClose, buf: new Uint8Array(0), pid: 1, ok: false }); }
  connect(ms = 7000) {
    return new Promise((res, rej) => {
      let done = false; const fin = (e) => { if (done) return; done = true; clearTimeout(t); e ? rej(e) : res(this); };
      const t = setTimeout(() => { fin(new Error('timeout')); this.close(); }, ms);
      let ws; try { ws = new WebSocket(this.cfg.url, 'mqtt'); } catch (e) { return fin(e); }
      this.ws = ws; ws.binaryType = 'arraybuffer';
      ws.onopen = () => { const enc = new TextEncoder(), s = x => { const b = enc.encode(x); return [b.length >> 8, b.length & 255, ...b]; };
        const id = 'gs' + Math.random().toString(36).slice(2, 12); let fl = 2; const pl = [...s(id)];
        if (this.cfg.user) { fl |= 0xC0; pl.push(...s(this.cfg.user), ...s(this.cfg.pass || '')); }
        this.raw(0x10, [...s('MQTT'), 4, fl, 0, 40, ...pl]); };
      ws.onmessage = e => { const d = new Uint8Array(e.data), b = new Uint8Array(this.buf.length + d.length); b.set(this.buf); b.set(d, this.buf.length); this.buf = b; this.parse(fin); };
      ws.onerror = () => fin(new Error('ws'));
      ws.onclose = () => { const was = this.ok; this.ok = false; clearInterval(this.ping); fin(new Error('closed')); if (was && this.onClose) this.onClose(this); };
    });
  }
  parse(fin) {
    for (;;) {
      const b = this.buf; if (b.length < 2) return;
      let len = 0, mul = 1, i = 1, c; do { if (i >= b.length) return; c = b[i++]; len += (c & 127) * mul; mul *= 128; } while (c & 128);
      if (b.length < i + len) return;
      const ty = b[0] >> 4, body = b.subarray(i, i + len); this.buf = b.slice(i + len);
      if (ty === 2) { if (body[1] === 0) { this.ok = true; this.ping = setInterval(() => this.raw(0xC0, []), 20000); fin(); } else fin(new Error('connack ' + body[1])); }
      else if (ty === 3) { const tl = (body[0] << 8) | body[1], topic = new TextDecoder().decode(body.subarray(2, 2 + tl)); const q = (b[0] >> 1) & 3;
        try { this.onMsg(topic, body.slice(2 + tl + (q ? 2 : 0)), this); } catch (e) { console.error(e); } }
    }
  }
  raw(h, arr) { if (!this.ws || this.ws.readyState !== 1) return false; const L = []; let n = arr.length; do { let d = n & 127; n = Math.floor(n / 128); if (n) d |= 128; L.push(d); } while (n);
    const out = new Uint8Array(1 + L.length + arr.length); out[0] = h; out.set(L, 1); out.set(arr, 1 + L.length); this.ws.send(out); return true; }
  sub(topic) { const b = new TextEncoder().encode(topic), id = this.pid++; this.raw(0x82, [id >> 8, id & 255, b.length >> 8, b.length & 255, ...b, 0]); }
  pub(topic, data) { const b = new TextEncoder().encode(topic), out = new Uint8Array(2 + b.length + data.length); out[0] = b.length >> 8; out[1] = b.length & 255; out.set(b, 2); out.set(data, 2 + b.length);
    if (!this.ws || this.ws.readyState !== 1) return false; const L = []; let n = out.length; do { let d = n & 127; n = Math.floor(n / 128); if (n) d |= 128; L.push(d); } while (n);
    const pk = new Uint8Array(1 + L.length + out.length); pk[0] = 0x30; pk.set(L, 1); pk.set(out, 1 + L.length); this.ws.send(pk); return true; }
  close() { this.ok = false; clearInterval(this.ping); try { this.raw(0xE0, []); this.ws.close(); } catch (e) {} }
}
// šifrování + komprese + dělení na kousky
const NR = { key: null, keyCode: null, base: '', id: 'r' + Math.random().toString(36).slice(2, 10), seq: 0, last: {}, parts: {}, q: Promise.resolve() };
const b64e = u => { let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); };
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function netRelayKey(code) {
  if (NR.keyCode === code) return; const enc = new TextEncoder();
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode('grumpstone-kh|' + code)));
  const t = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode('topic|' + code)));
  NR.key = await crypto.subtle.importKey('raw', h, 'AES-GCM', false, ['encrypt', 'decrypt']); NR.keyCode = code;
  NR.base = 'grumpstone-kh/' + Array.from(t.subarray(0, 8), x => x.toString(16).padStart(2, '0')).join('');
}
async function netPipe(data, stream) { if (typeof CompressionStream === 'undefined') return null; const s = new Blob([data]).stream().pipeThrough(stream); return new Uint8Array(await new Response(s).arrayBuffer()); }
async function netPack(m) {
  let raw = new TextEncoder().encode(JSON.stringify(m)), z = 0;
  if (raw.length > 600) { const c = await netPipe(raw, new CompressionStream('deflate-raw')).catch(() => null); if (c) { raw = c; z = 1; } }
  const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, NR.key, raw));
  const all = new Uint8Array(13 + ct.length); all[0] = z; all.set(iv, 1); all.set(ct, 13); return all;
}
async function netUnpack(all) {
  const ct = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.subarray(1, 13) }, NR.key, all.subarray(13));
  let raw = new Uint8Array(ct); if (all[0] === 1) raw = await netPipe(raw, new DecompressionStream('deflate-raw'));
  return JSON.parse(new TextDecoder().decode(raw));
}
// Spolehlivé doručení přes MQTT (QoS 0): pořadová čísla pro každý směr, potvrzení (ack), opakované odeslání, stará/zdvojená zpráva se zahodí.
const NET_CHUNK = 12000;
NR.out = {}; NR.buf = {};
const netInbox = () => NET.role === 'host' ? NR.base + '/h' : NR.base + '/g/' + NR.id;
const netPubJ = (mq, topic, o) => mq && mq.ok && mq.pub(topic, new TextEncoder().encode(JSON.stringify(o)));
function netRelayXmit(o, s) {
  const e = o.pend.get(s); if (!e || !e.d) return; e.t = Date.now(); e.tries++;
  const b = Math.min(...o.pend.keys()), r = netInbox();
  e.d.forEach((d, i) => netPubJ(o.mq, o.topic, { f: NR.id, r, s, b, i, n: e.d.length, d }));
}
function netRelaySend(mq, topic, m) {
  const o = NR.out[topic] = NR.out[topic] || { topic, seq: 0, pend: new Map() }; o.mq = mq;
  const s = ++o.seq, kind = m.t === 'state' ? 'state' : 'x';
  if (kind === 'state') o.pend.forEach((e, k) => { if (e.kind === 'state') o.pend.delete(k); }); // novější stav nahradí starší
  const e = { kind, tries: 0, t: Date.now(), d: null }; o.pend.set(s, e);
  NR.q = NR.q.then(async () => { if (!NR.key) return; const b = b64e(await netPack(m)), n = Math.max(1, Math.ceil(b.length / NET_CHUNK));
    e.d = Array.from({ length: n }, (_, i) => b.slice(i * NET_CHUNK, (i + 1) * NET_CHUNK)); if (o.pend.has(s)) netRelayXmit(o, s); }).catch(err => console.warn('relay send', err));
}
setInterval(() => { const now = Date.now(); Object.values(NR.out).forEach(o => o.pend.forEach((e, s) => {
  if (!e.d || now - e.t < 2500) return; if (e.tries >= 15) { o.pend.delete(s); return; } netRelayXmit(o, s); })); }, 1000);
function netRelayCtl(mq, topic, c) { netPubJ(mq, topic, { f: NR.id, r: netInbox(), c }); }
// příjem: cb(f, m, mq, r) pro zprávy v pořadí; ctl(f, c, mq, r) pro řídicí (ka/bye)
function netRelayRecv(payload, mq, cb, ctl) {
  if (NR.drop == null) NR.drop = +(netQuery().get('drop') || 0); if (NR.drop && Math.random() < NR.drop) return; // test: ztráta paketů
  let p; try { p = JSON.parse(new TextDecoder().decode(payload)); } catch (e) { return; }
  if (!p || !p.f || p.f === NR.id) return;
  if (p.c) return ctl && ctl(p.f, p.c, mq, p.r);
  if (p.a != null) { const o = NR.out[p.r]; if (o) { o.mq = mq; o.pend.forEach((e, k) => { if (k <= p.a) o.pend.delete(k); }); } if (ctl) ctl(p.f, 'ack', mq, p.r); return; }
  if (typeof p.s !== 'number' || typeof p.r !== 'string') return;
  const ack = () => netPubJ(mq, p.r, { f: NR.id, r: netInbox(), a: NR.last[p.f] || 0 });
  let L = NR.last[p.f] || 0; if (p.b - 1 > L) { L = NR.last[p.f] = p.b - 1; } // odesílatel to vzdal → přeskočit
  if (p.s <= L) return ack();
  const k = p.f + ':' + p.s, part = NR.parts[k] = NR.parts[k] || { got: 0, d: [], t: Date.now() };
  if (part.d[p.i] != null) return; part.d[p.i] = p.d; part.got++;
  if (part.got < p.n) return;
  delete NR.parts[k];
  Object.keys(NR.parts).forEach(x => { if (Date.now() - NR.parts[x].t > 60000) delete NR.parts[x]; });
  const data = part.d.join('');
  NR.rq = (NR.rq || Promise.resolve()).then(async () => {
    let m; try { m = await netUnpack(b64d(data)); } catch (e) { return; }
    const bf = NR.buf[p.f] = NR.buf[p.f] || new Map(); let L2 = NR.last[p.f] || 0;
    if (p.s <= L2) return ack(); bf.set(p.s, m);
    [...bf.keys()].forEach(x => { if (x <= L2) bf.delete(x); });
    while (bf.has(L2 + 1)) { const mm = bf.get(L2 + 1); bf.delete(L2 + 1); L2++; NR.last[p.f] = L2; cb(p.f, mm, mq, p.r); }
    if (!bf.size && L2 < p.s) { /* čeká se na chybějící */ }
    ack();
  });
}
class NetRelayConn { // vypadá jako PeerJS DataConnection (on/send/close/open)
  constructor(peerId, mq, topic) { Object.assign(this, { peer: peerId, mq, topic, open: true, relay: true, ev: {}, seen: Date.now() }); }
  on(e, f) { (this.ev[e] = this.ev[e] || []).push(f); return this; }
  emit(e, x) { (this.ev[e] || []).forEach(f => { try { f(x); } catch (er) { console.error(er); } }); }
  send(m) { if (this.open) netRelaySend(this.mq, this.topic, m); }
  ctl(c) { netRelayCtl(this.mq, this.topic, c); }
  close() { if (!this.open) return; this.ctl('bye'); this.open = false; this.emit('close'); }
}
async function netRelayConnectAny(onMsg, onClose, list) {
  for (const cfg of list || netRelayList()) {
    const mq = new NetMQ(cfg, onMsg, onClose);
    try { await mq.connect(); return mq; } catch (e) { mq.close(); }
  }
  return null;
}
function netRelayStop() { const R = NET.relay; NET.relay = null; if (!R) return; R.dead = true; clearInterval(R.ka); clearInterval(R.hello); clearTimeout(R.t); (R.mqs || []).forEach(m => m.close()); if (R.mq) R.mq.close(); }
// hostitel: poslouchá na všech serverech zároveň
async function netRelayHost() {
  netRelayStop(); if (netMode() === 'p2p' || !window.crypto || !crypto.subtle) return;
  const R = NET.relay = { mqs: [], conns: new Map(), code: NET.code, dead: false };
  await netRelayKey(NET.code); if (R.dead) return;
  const topicH = NR.base + '/h';
  const touch = (f, mq) => { const c = R.conns.get(f); if (c) { c.mq = mq; c.seen = Date.now(); } return c; };
  const onMsg = (topic, payload, mq) => netRelayRecv(payload, mq, (f, m, mq2, r) => {
    if (R.dead) return; let c = R.conns.get(f);
    if (!c || !c.open) { if (m.t !== 'hello') return; c = new NetRelayConn(f, mq2, r); R.conns.set(f, c); netHostConn(c); }
    touch(f, mq2); c.emit('data', m);
  }, (f, k, mq2) => { if (R.dead) return; const c = touch(f, mq2);
    if (k === 'bye' && c) { R.conns.delete(f); c.open = false; c.emit('close'); } });
  const start = cfg => { if (R.dead) return; const mq = new NetMQ(cfg, onMsg, () => { R.mqs = R.mqs.filter(x => x !== mq); if (!R.dead) setTimeout(() => start(cfg), 3000); });
    mq.connect().then(() => { if (R.dead) return mq.close(); R.mqs.push(mq); mq.sub(topicH); NET.relayOpen = true; netHostReady(); })
      .catch(() => { mq.close(); if (!R.dead) setTimeout(() => start(cfg), 15000); }); };
  netRelayList().forEach(start);
  R.ka = setInterval(() => { R.conns.forEach((c, f) => { if (!c.open) return R.conns.delete(f);
    if (Date.now() - c.seen > 30000) { R.conns.delete(f); c.open = false; c.emit('close'); } else c.ctl('ka'); }); }, 5000);
}
// host: přepnutí na záložní server
async function netRelayGuest() {
  if (!isGuest() || NET.left || (NET.relay && !NET.relay.dead)) return;
  if (netMode() === 'p2p' || !window.crypto || !crypto.subtle) return;
  NET.via = 'relay'; const code = NET.code;
  if (NET.hostConn && !NET.hostConn.relay) { const old = NET.hostConn; NET.hostConn = null; try { old.close(); } catch (e) {} }
  if (NET.peer) { const p = NET.peer; NET.peer = null; try { p.destroy(); } catch (e) {} }
  const R = NET.relay = { dead: false, code };
  await netRelayKey(code);
  netStatus(NET.welcomed ? '⏳ Obnovuji spojení přes server…' : `⏳ Přímé spojení nejde – zkouším záložní spojení přes server…`);
  let conn = null;
  const onMsg = (topic, payload, mq) => netRelayRecv(payload, mq, (f, m) => { if (R.dead || !conn) return; conn.seen = Date.now(); conn.emit('data', m); },
    (f, k) => { if (R.dead || !conn) return; conn.seen = Date.now(); if (k === 'bye') lost(); });
  const lost = () => { if (R.dead || NET.relay !== R) return; if (conn) conn.open = false; clearInterval(R.ka); clearInterval(R.hello);
    if (NET.hostConn === conn) NET.hostConn = null; netStatus('⚠️ Spojení přerušeno – připojuji znovu přes server…'); netBar();
    if (R.mq) R.mq.close(); R.mq = null; R.t = setTimeout(go, 2500); };
  const go = async () => {
    if (R.dead || NET.relay !== R) return;
    const mq = await netRelayConnectAny(onMsg, () => lost());
    if (R.dead || NET.relay !== R) { if (mq) mq.close(); return; }
    if (!mq) { netStatus('⚠️ Server pro záložní spojení je nedostupný – zkouším znovu…'); R.t = setTimeout(go, 4000); return; }
    R.mq = mq; mq.sub(NR.base + '/g/' + NR.id);
    const o = NR.out[NR.base + '/h']; if (o) o.mq = mq; // nedoručené zprávy půjdou novým spojením
    conn = new NetRelayConn('host', mq, NR.base + '/h'); conn.seen = Date.now(); NET.hostConn = conn;
    conn.on('data', m => { try { netGuestMsg(m); } catch (e) { console.error(e); } });
    const saved = netLoadGuest(), token = saved && saved.code === code ? saved.token : null;
    const hello = () => conn.send({ t: 'hello', name: NET.name || (saved && saved.name) || '', token, gid: NR.id, v: NET_PROTO });
    hello(); clearInterval(R.hello); R.hello = setInterval(() => { if (NET.welcomedVia !== conn) hello(); else clearInterval(R.hello); }, 30000);
    clearInterval(R.ka); R.ka = setInterval(() => { if (!conn.open) return; conn.ctl('ka'); if (NET.welcomedVia === conn && Date.now() - conn.seen > 30000) lost(); }, 5000);
  };
  go();
}
// stav pro hlášky
function netViaLabel() { return NET.via === 'relay' ? '🛰 Připojeno přes server' : '🌐 Připojeno (přímo)'; }
let netWake = null;
async function netWakeLock(on) { try { if (on && !netWake && navigator.wakeLock && document.visibilityState === 'visible') { netWake = await navigator.wakeLock.request('screen'); netWake.addEventListener('release', () => { netWake = null; }); } else if (!on && netWake) { netWake.release(); netWake = null; } } catch (e) {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && NET.role) netWakeLock(true); });
// ---------- přesměrování akcí: u hosta se akce posílají hostiteli ----------
function netWrap(name, fn, conv) { NET_REAL[name] = fn; return function (...a) { if (isGuest()) { netSendAct(name, conv ? conv(...a) : a); return name === 'boardShip' ? true : undefined; } return fn.apply(this, a); }; }
moveTo = netWrap('moveTo', moveTo, id => { panelLoc = id; return [id]; });
stay = netWrap('stay', stay); endTurn = netWrap('endTurn', endTurn);
rollPending = netWrap('rollPending', rollPending); choosePending = netWrap('choosePending', choosePending);
combatRoll = netWrap('combatRoll', combatRoll); combatChoose = netWrap('combatChoose', combatChoose); combatDrink = netWrap('combatDrink', combatDrink);
closeCombat = netWrap('closeCombat', closeCombat); pvpRoll = netWrap('pvpRoll', pvpRoll); startFinale = netWrap('startFinale', startFinale);
npcPick = netWrap('npcPick', npcPick); npcRoll = netWrap('npcRoll', npcRoll); npcDecide = netWrap('npcDecide', npcDecide); npcQuest = netWrap('npcQuest', npcQuest); finishNpc = netWrap('finishNpc', finishNpc);
boardShip = netWrap('boardShip', boardShip); overflowSell = netWrap('overflowSell', overflowSell); itemAct = netWrap('itemAct', itemAct);
tradePropose = netWrap('tradePropose', tradePropose); tradeAnswer = netWrap('tradeAnswer', tradeAnswer); useAbility = netWrap('useAbility', useAbility); setNpcOn = netWrap('setNpcOn', setNpcOn);
{ const real = startPvp; NET_REAL.startPvp = qi => real(cur(), S.players[qi]); startPvp = (p, q) => isGuest() ? netSendAct('startPvp', [S.players.indexOf(q)]) : real(p, q); }
{ const real = confirmAbility; confirmAbility = function () {
    if (!isGuest()) return real();
    const loc = BY_ID[panelLoc], p = cur(); if (!selAbility || !loc || p.loc !== loc.id || !S.canUse || S.pending || S.combat) return;
    const a = ABILITIES[selAbility]; if ((a.classLock && a.classLock(p)) || (a.req && a.req(p, loc, selOpt))) return;
    if (a.mountPick && !mountChoice) { openMountModal(); return; }
    netSendAct('useAbility', [selAbility, selOpt, mountChoice]); mountChoice = null; }; }
{ const real = passTurn; passTurn = (...a) => isGuest() ? undefined : real(...a); }

// ---------- OVLÁDÁNÍ ----------
function setZoom(z) { zoom = Math.max(1, Math.min(3, z)); fitUnits(); }

function bind() {
  $('btn-back').onclick = () => { if (NET.role) netLeave(); show('screen-title'); initTitle(); };
  $('btn-play').onclick = () => { if (setup.mode === 'online') return netStart(); newGame(); startGame(); };
  $('btn-end').onclick = () => endTurn();
  $('npc-continue').onclick = () => finishNpc();
  $('btn-trade').onclick = () => openTrade();
  $('trade-close').onclick = () => $('trade').classList.add('hidden');
  document.addEventListener('click', e => { if (aiTurnNow() || !myTurnNet()) return; const c = e.target.closest('.ichip[data-item]'); if (c && c.isConnected && !c.closest('#trade') && !c.closest('#item-modal')) openItem(c.dataset.item);
    const u = e.target.closest('[data-unequip]'), q = e.target.closest('[data-equip]'); if (!u && !q) return; const me = cur();
    if (u) { const r = itemAct('unequip', u.dataset.unequip); if (r) toast(r); }
    if (q) { const id = q.dataset.equip, r = NET.role === 'guest' ? null : (canWear(me, ITEM_BY_ID[id]) || equipConflict(me, ITEM_BY_ID[id])); if (r) openItem(id); else itemAct('equip', id); } });
  $('npc-img').onclick = () => $('npc').classList.toggle('zoom-art');
  $('npc-help-btn').onclick = () => $('help').classList.remove('hidden');
  $('menu-help').onclick = () => { $('menu').classList.add('hidden'); $('help').classList.remove('hidden'); };
  $('help-close').onclick = () => $('help').classList.add('hidden');
  $('menu-npc').onclick = () => setNpcOn(S.npcOn === false);
  $('btn-stay').onclick = () => stay();
  $('btn-confirm').onclick = () => confirmAbility();
  $('panel-close').onclick = () => closePanel();
  $('panel-backdrop').onclick = () => closePanel();
  $('btn-zoom-in').onclick = () => setZoom(zoom + 0.5);
  $('btn-zoom-out').onclick = () => setZoom(zoom - 0.5);
  $('btn-labels').onclick = () => $('board').classList.toggle('hide-labels');
  $('btn-here').onclick = () => centerOnActive();
  $('btn-menu').onclick = () => $('menu').classList.remove('hidden');
  $('menu-close').onclick = () => $('menu').classList.add('hidden');
  $('menu-new').onclick = () => { netLeave(); aiGen++; clearTimeout(aiTimer); document.body.classList.remove('ai-turn'); if ($('ai-bar')) $('ai-bar').classList.add('hidden'); $('menu').classList.add('hidden'); $('npc').classList.add('hidden'); closePanel(true); initSetup(); show('screen-setup'); };
  $('menu-title').onclick = () => { netLeave(); aiGen++; clearTimeout(aiTimer); document.body.classList.remove('ai-turn'); if ($('ai-bar')) $('ai-bar').classList.add('hidden'); $('menu').classList.add('hidden'); $('npc').classList.add('hidden'); closePanel(true); initTitle(); show('screen-title'); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !aiTurnNow() && myTurnNet()) closePanel(); });
  document.addEventListener('click', e => { if (e.target.closest('#net-retry')) { const c = NET.code, n = NET.name; e.stopPropagation(); netJoin(c, n); return; } const h = e.target.closest('[data-handover]'); if (h) { e.stopPropagation(); netHandover(+h.dataset.handover); } }, true);
}

bind(); initTitle();
window.GS = { get NET() { return NET; }, NR, netMode, netRelayGuest, netHost, netJoin, netStart, netAddAI, netHandover, netLeave, netRemoveSeat, netIce, netNorm, isGuest, myTurnNet, itemAct, tradePropose, tradeAnswer, combatDrink, setNpcOn, BOSS_RESPAWN, bossRespawnTick, pendingRespawns, bossRespawnAt, finishBossFight, isAI, focusMatch, finishNpc, combatRoll, ROLE, HEROES, aiStep, aiRun, aiKick, aiSetSpeed, aiEstimate, aiActions, aiGoal, aiCfg, AI_DIFFS, get aiStats() { return aiStats; }, get aiDelay() { return aiDelay; }, useAbility, npcPick, npcRoll, npcDecide, npcQuest, overflowSell, setAiCount, setGameMode, get setup() { return setup; }, renderSetup, newGame, startGame, isCheat, CHEAT_WIN, CHEAT_PUNCH, rollPending, seaWhy, isMole, tunnelVia, COAL_PRICE, collectCoal, coalOpts, MOLE_WATER, LADJ, canSwim, SWIM_HEROES, heroById, WIN_GP, checkFinale, openFinale, startFinale, showVictory, declareWinner, chaOnlyWhy, SHIPS, SHIP_PRICE, shipOf, moveKind, boardShip, openShipModal, shipWhy, reachable, OFFSHORE, PORTS, MAINLAND, xpNeed, addXp, MAX_LEVEL, XP_PER_LEVEL, shopStock, shopView, SHOP_SLOTS, PRICE, TIER_LV, BM_PRICE, arenaDiff, npcDiff, MIN_DIE, mountName, isNatural, hasMount, MAX_PLAYERS, forceQuestStat: v => { FORCE_QSTAT = v; }, completeQuests, MOUNTS, stepsOf, openMountModal, closePanel, placeBoss: (id, loc, pi) => { S.bosses = S.bosses || {}; const b = BOSS_BY_ID[id]; S.bosses[id] = { sh: b.sh, hp: b.hp, dead: false, active: true, loc, for: pi == null ? null : pi, since: S.round }; renderAll(); }, bossRoundStart, spawnBossFor, activeBosses, tierForLevel, focusOfHero, unforce: () => { FORCE_ROLLS = []; }, CB, BOSS_BY_ID, bossState, bossAt, startBossFight, startPvp, pvpBlock, cardPool, atkKeyOf, closeCombat, forceCards: a => { FORCE_CARDS = a; }, forceLoot: v => { FORCE_LOOT = v; }, approachOf, heroCtx, combatChoose, EQUIP_MAX, BAG_MAX, PAWN, TRADE_MULT, loadoutProblem, itemType, unequipItem, sellItem, migrateGear, hasRoom, renderOverflow, swapOptions, force: a => FORCE_ROLLS.push(...a), forceSearch: id => { FORCE_SEARCH = id; }, ITEMS, ITEM_BY_ID, giveItem, equipItem, canWear, itemBonus, tradeBlock, openTrade, SEARCH, addStatus, openItem, makeDie, get S() { return S; }, ADJ, BY_ID, ABILITIES, NPC, moveTo, stay, endTurn, passTurn, heroStat, stat, combatKey, trainLock, makeQuest, distances, rollAbilities, renderAll, openPanel }; // pro testy // pro testy
})();

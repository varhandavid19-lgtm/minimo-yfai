# minimo · YFAI — projekt pro Claude Code

Firemní portál interních webových aplikací YFAI. Tohle je ŽIVÁ aplikace, kterou
vyvíjíme — starý repozitář `Nakupni-pozadavky` je jen archiv, nesahej na něj.
Tento soubor čteš automaticky u každého úkolu — drž se ho.

Majitel projektu (David) není programátor. Vysvětluj změny česky a lidsky.

## Co portál dělá
Jedno přihlášení platí pro všechny moduly. Na rozcestníku jsou dlaždice a každý
modul je vlastní stránka.

## Struktura — JEDNA STRÁNKA = JEDEN MODUL
- `index.html` — rozcestník: přihlášení a dlaždice modulů (pole `MODULES`)
- `nakup.html` — Nákupní požadavky
- `dovolenky.html` — Plánování směn a přítomnosti
- `opravy.html` — Externí opravy (zatím vidí jen správce podle e-mailu)
- `engineering.html` — Engineering: prostoje, KPI, import ze Symesticu
  (zatím vidí jen správce podle e-mailu)
- `nastaveni.html` — uživatelé, úrovně a přístupy k modulům
- `header.js` + `header.css` — SPOLEČNÁ hlavička všech modulů.
  Nová stránka ji vykreslí přes `window.uheaderHTML({module, cur, user, level,
  logoutAttr, modules})`. Když přidáváš modul, přidej odkaz i sem.

Nový modul = nová stránka + dlaždice v `MODULES` v `index.html` + odkaz
v `header.js`. Nerozděluj jeden modul do více souborů.

## Technický stack — NEMĚNIT
- **Žádný build:** čistý HTML + CSS + vanilla JavaScript (ES modules). Žádné npm,
  bundler, TypeScript ani framework (React/Vue…). Musí běžet na GitHub Pages
  bez jakékoli kompilace.
- **Hosting:** GitHub Pages, větev `main`, kořen repozitáře. Po sloučení do `main`
  se web sám vystaví do 1–2 minut.
- **Databáze:** Firebase Firestore, projekt `nakupni-pozadavky` (sdílený všemi moduly).
- **Přihlašování:** Firebase Authentication, e-mail + heslo.
- Firebase SDK se importuje z CDN v `<script type="module">` na začátku souboru.

## Firebase config — NECHAT V KÓDU
`firebaseConfig` je přímo v každé stránce. To je správně a bezpečné — jde o
veřejné frontendové klíče. NEODSTRAŇUJ je, NEPŘESOUVEJ do .env, NEZAVÁDĚJ kvůli
nim build proces. Bezpečnost řeší pravidla Firestore, ne skrývání klíčů.

## Datový model (Firestore)
- kolekce `requests` — jeden dokument = jeden nákupní požadavek
- kolekce `opravy` — externí opravy
- kolekce `people`, `absences`, `shifts`, `rotations` — plánování směn
- kolekce `users` — id dokumentu = uid uživatele; pole `name`, `level`, `role`,
  `positions`, `perms`, `modules` (přístup k modulům: none / read / write)
- dokument `meta/config` — účty, úseky, stroje, povinná pole, kurzy, čítače
  `seq` (nákup) a `seqOpr` (opravy)
- kolekce `downtimes` — jeden dokument = jeden prostoj ze Symesticu.
  Id dokumentu je `datum_linka_časZačátku`, takže opakovaný import nikdy nezaloží
  duplicitu. NEPŘEVÁDĚJ na `addDoc` s náhodným id.
- kolekce `dt_days` — denní souhrn prostojů (id = `RRRR-MM-DD`). Přehled a KPI čtou
  jen tyhle malé dokumenty, ne jednotlivé prostoje — jinak by aplikace prožrala
  bezplatný limit čtení ve Firestore. Souhrn se po importu vždy přepočítá z databáze.
- kolekce `dt_imports` — historie importů (kdo, kdy, jaký soubor, kolik řádků)
- kolekce `scrap` a `sc_months` — zmetky v eurech proti tržbám (projekt × linka)
  a jejich měsíční souhrny
- kolekce `problems` a `actions` — problem solving (5× Proč, kořenová příčina,
  ověření účinnosti) a opatření k nim (corrective / preventive, owner, termín)
- kolekce `tasks` — akční plán managementu (tasky s posuny termínů a přílohami)
- dokument `meta/engcfg` — nastavení standardu řízení výkonu a čítače čísel
- Úrovně uživatelů: `basic`, `warehouse`, `approver`, `wadmin`, `superadmin`,
  s můstkem na staré role (`zadavatel`, `skladnik`, `schvalovatel`, `admin`).
  Práva jsou v kódu a SOUČASNĚ vynucená bezpečnostními pravidly Firestore
  na serveru (soubor `firestore.rules`).

## Modul Engineering (`engineering.html`)
Prostoje na linkách, KPI a import týdenního reportu z interního systému Symestic.
- Report (Downtimes) má sloupce `Segment`, `Reason`, `Start time`, `End time`,
  `Duration`, `Net duration`, `Comment`. Poznají se podle názvu, na pořadí nezáleží.
  Umí se načíst `.xlsx` i `.csv`.
- Knihovna na čtení Excelu (SheetJS) se stahuje z CDN, až když někdo opravdu
  importuje. Když se nestáhne, aplikace nabídne CSV, které umí přečíst sama.
- Časy z Excelu se počítají v UTC (`fromSerial`), aby se prostoj neposunul
  o hodinu podle nastavení počítače. Nepřepisuj na `new Date(...)` s místním časem.
- Modul zatím vidí jen správce podle e-mailu (pole `OWNERS`), stejně jako Externí
  opravy. Importovat smí jen role `admin` — vynuceno i pravidly Firestore.
- KPI: prostoje po linkách, changeover time, podíl nezařazených prostojů.
  Scrap a cycle time čekají na odpovídající report ze Symesticu — dlaždice pro ně
  v přehledu už jsou a hlásí, že data zatím nejsou.

## Řízení výkonu linek (záložka Řízení v modulu Engineering)
Standard vyžádaný vedením: týdenní výkon linky pod prahem (výchozí 90 %) povinně
spouští problem solving na úrovni Process Engineera.
- Výkon = (plánovaný čas − prostoje) ÷ plánovaný čas. Plánovaný čas je
  `plannedHoursPerDay` × počet dní, ze kterých máme data — proto neúplný týden
  povinnou analýzu automaticky nespouští (`w.dayCount >= 5`).
- Nastavení standardu je v dokumentu `meta/engcfg` (práh, opakování, eskalace,
  ověření účinnosti, ownery, vyloučené skupiny důvodů). Tam jsou i čítače
  `seqPs` a `seqAct` pro čísla PS-rok-XXX a AK-rok-XXX — generují se TRANSAKCÍ.
- Problém nelze uzavřít, dokud nemá kořenovou příčinu, aspoň jedno preventivní
  opatření, všechna opatření hotová a vyplněné ověření účinnosti. Tohle je jádro
  zadání, NERUŠ to.
- Corrective a preventive opatření se rozlišují polem `type` — nemíchej je.
- Rozepsané hodnoty v okně problému se před každým překreslením přenesou do
  paměti funkcí `collectPs()`. Bez toho by se text ztratil při odmítnutém uložení.

## Akční plán managementu (záložka Akční plán)
Tabulka tasků přesně podle sloupců, které chce vedení: číslo, oblast, typ, zadáno,
zadal, task, očekávaný výstup–důkaz, owner, termín původní, posuny, platný termín,
počet posunů, stav, po termínu, uzavřeno.
- Číslo je `PREFIX-XXX` podle oblasti (ENG, LOG, PRD, QUA, CI, LAU) — čítače
  `seqTask<PREFIX>` v `meta/engcfg`, generují se TRANSAKCÍ.
- Platný termín, počet posunů a „po termínu" se NIKDY neukládají, počítají se
  z `dueOrig` a pole `moves`. Nepřidávej je do dokumentu.
- Posun termínu jde uložit jen s důvodem — každý posun má datum, důvod, kdo a kdy.
- Barvy drží legendu z Excelu: bílé vyplňuje uživatel, žluté jsou posuny,
  šedé se dopočítají.
- Přílohy jdou do Firebase Storage pod `tasky/<idTasku>/…`, stejně jako nákup
  ukládá do `nabidky/<idPožadavku>/…`. Limit 5 MB na soubor.
- Rozepsané hodnoty v okně se před překreslením ukládají do paměti
  (`collectTask()`, `moveDraft`) — bez toho by se text ztratil při odmítnutém uložení.

## Chování, které se NESMÍ rozbít
- KAŽDÝ nově založený požadavek má VŽDY stav „nový", pro všechny role bez výjimky
  (i skladník a admin). Při zakládání NEBĚŽÍ žádný automatický přeskok na
  „ve schvalování", ani když má požadavek vyplněnou cenu. Vynuceno na třech místech:
  akce `save` (`if(isNew)editing.status='nový'`), funkce `createRequest`
  (`status:'nový'`) a pravidla Firestore (`allow create` povoluje jen `nový`).
- Automatika „cena vyplněná → ve schvalování" (`applyAutoStatus`) platí POUZE při
  POZDĚJŠÍ úpravě existujícího požadavku, ne při jeho založení. Bez ceny zůstává
  „nový" a sklad ho má „poptat" (tlačítko Poptat).
- Ke schválení stačí JEDEN schvalovatel. Schválit lze i požadavek bez ceny.
- Pořadové číslo `NP-<rok>-<XXX>` se generuje TRANSAKCÍ nad `meta/config.seq`.
  Nepřeváděj na obyčejný zápis — jinak dva lidé naráz dostanou stejné číslo.
- Logo „YFAI minimo“ v hlavičce je inline SVG ve funkci `logoSvg()`. Neodstraňuj.
- Podbarvení řádků tabulky podle stavu (nový = bílý). Neruš bez vyžádání.

## Pracovní postup
- Po každé úpravě založ pull request s krátkým českým popisem, co a proč se mění.
- V PR napiš, na co si mám dát po sloučení pozor (a že web naběhne za 1–2 min,
  a ať dám Ctrl+F5).
- Když měníš datový model nebo role, uprav i `firestore.rules` a v PR mě upozorni,
  že je musím RUČNĚ publikovat ve Firebase konzoli (Firestore → Rules → Publish).
  Do Firebase konzole nevidíš, publikaci musí udělat člověk.
- Nikdy neměň víc věcí najednou, než o kolik jsem požádal. Drobné, přehledné změny.

## Když si nejsi jistý
Radši se zeptej v PR nebo navrhni variantu, než abys přepsal něco z výše
uvedeného seznamu „nesmí se rozbít“.

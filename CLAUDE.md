# Nákupní požadavky — projekt pro Claude Code

Interní webová aplikace pro evidenci nákupních požadavků ve výrobní firmě (YFAI).
Tento soubor čteš automaticky u každého úkolu — drž se ho.

Majitel projektu (David) není programátor. Vysvětluj změny česky a lidsky.

## Co aplikace dělá
Lidé se přihlásí, založí nákupní požadavek (skladové číslo, popis, množství,
cena, účet, úsek/stroj, priorita, …). Schvalovatel ho schválí nebo zamítne,
sklad mění stavy a doplňuje datum dodání. Vše je jedna webová aplikace.

## Technický stack — NEMĚNIT
- **Jeden jediný soubor:** `index.html` v kořeni repozitáře. Veškerý HTML, CSS
  i JavaScript jsou v něm. Nerozděluj do více souborů.
- **Žádný build:** čistý HTML + CSS + vanilla JavaScript (ES modules). Žádné npm,
  bundler, TypeScript ani framework (React/Vue…). Musí běžet na GitHub Pages
  bez jakékoli kompilace.
- **Hosting:** GitHub Pages, větev `main`, kořen repozitáře. Adresa:
  `https://varhandavid19-lgtm.github.io/Nakupni-pozadavky/`. Po sloučení do `main`
  se web sám vystaví do 1–2 minut.
- **Databáze:** Firebase Firestore, projekt `nakupni-pozadavky`.
- **Přihlašování:** Firebase Authentication, e-mail + heslo.
- Firebase SDK se importuje z CDN v `<script type="module">` na začátku souboru.

## Firebase config — NECHAT V KÓDU
`firebaseConfig` je přímo v `index.html`. To je správně a bezpečné — jde o
veřejné frontendové klíče. NEODSTRAŇUJ je, NEPŘESOUVEJ do .env, NEZAVÁDĚJ kvůli
nim build proces. Bezpečnost řeší pravidla Firestore, ne skrývání klíčů.

## Datový model (Firestore)
- kolekce `requests` — jeden dokument = jeden požadavek
- kolekce `users` — id dokumentu = uid uživatele; pole `name`, `role`, `team`
- dokument `meta/config` — účty, úseky, stroje, povinná pole, kurzy, čítač `seq`
- Role a úrovně: `zadavatel` (1), `skladnik` (2), `schvalovatel` (3), `admin` (4).
  Práva jsou v objektu `ROLES` v kódu a SOUČASNĚ vynucená bezpečnostními pravidly
  Firestore na serveru (soubor `firestore.rules`).

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

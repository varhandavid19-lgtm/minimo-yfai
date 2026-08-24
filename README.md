# minimo · YFAI — firemní portál

Rozcestník interních webových aplikací YFAI. Jeden účet (Firebase Authentication)
platí pro všechny moduly, protože všechny běží na stejné adrese a nad stejným
Firebase projektem **`nakupni-pozadavky`**.

## Struktura
- `index.html` — rozcestník (přihlášení + dlaždice modulů)
- `nakup.html` — modul **Nákupní požadavky** (převzato 1:1)
- `dovolenky.html` — modul **Dovolenky** (přepojeno na projekt `nakupni-pozadavky`)
- `opravy.html` — modul **Externí opravy**
- `engineering.html` — modul **Engineering** (prostoje, KPI, import ze Symesticu)
- další moduly (Docházka, Údržba, Reklamace) — připravují se

Čistý HTML + CSS + vanilla JavaScript (ES modules z CDN). Žádný build, běží na
GitHub Pages. Firebase config jsou veřejné frontendové klíče — je správné mít je
v kódu, zabezpečení řeší pravidla Firestore.

## Data ve Firestore (projekt nakupni-pozadavky)
- `requests`, `users`, `meta/config` — Nákupní požadavky (beze změny)
- `people`, `absences`, `shifts`, `rotations` — Dovolenky
- `opravy` — Externí opravy
- `downtimes`, `dt_days`, `dt_imports` — Engineering (prostoje ze Symesticu)

## Po nasazení
- Zapnout GitHub Pages (větev `main`, kořen).
- Do pravidel Firestore projektu `nakupni-pozadavky` přidat bloky pro `people`
  a `absences` — viz `firestore-pravidla-pridat.txt`.
- Znovu zadat lidi/záznamy v Dovolenkách (data se přenášejí z původního projektu).

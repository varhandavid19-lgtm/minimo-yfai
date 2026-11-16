/* ==========================================================
   Serverové funkce minima — e-mailové notifikace modulu Úkoly pro LAMA AGENCY.
   E-maily odcházejí přes schránku na Seznamu (smtp.seznam.cz). Adresa i heslo
   jsou v trezoru Googlu (Secret Manager) jako SMTP_USER a SMTP_PASS — nastavují se
   příkazem `firebase functions:secrets:set …`, v kódu ani v repozitáři nejsou.

   Komu se posílá, si správce nastaví v aplikaci (lama.html → ✉️ Notifikace),
   ukládá se do dokumentu meta/lamacfg, pole `notify`:
     notify: { agency:   {to:'a@x.cz, b@y.cz', newTask:true, done:true, remind:true, overdue:true},
               facility: {...}, internal: {...}, admin: {...} }

   Totéž pro 📋 Požadavky na správce v Plánování směn (lama.html?mode=plan):
   kolekce plan_tasks, nastavení v meta/plancfg.notify = { plan: {...} },
   funkce planNewTask / planDone / planDaily (společný kód: makeHandlers, SOURCES).

   Funkce:
   - lamaNewTask  — nový úkol → e-mail adresátům jeho záložky
   - lamaDone     — úkol přepnut na „hotovo" → e-mail i s tím, kdo ho dokončil
   - lamaDaily    — každé ráno v 7:00 (Praha) jeden e-mail na záložku:
                    „Blíží se termín" (úkol přešel 1/3 nebo 2/3 doby od zadání
                    do termínu — každá připomínka jen jednou, značí se do
                    úkolu do pole `remind`) a „Po termínu" (všechny otevřené
                    úkoly po termínu).
   ========================================================== */
const { setGlobalOptions } = require('firebase-functions/v2');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const nodemailer = require('nodemailer');
const Anthropic = require('@anthropic-ai/sdk');

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: 'europe-west1', maxInstances: 3 });

const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');
// Klíč k Anthropicu (čtení nabídek v Nákupních požadavcích). V kódu NIKDY není,
// nastavuje se příkazem `firebase functions:secrets:set ANTHROPIC_API_KEY`.
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

/* Zdroje úkolů. Stejné funkce obsluhují LAMA (lama.html) i 📋 Požadavky na správce
   v Plánování směn (lama.html?mode=plan, kolekce plan_tasks, nastavení meta/plancfg).
   lists musí odpovídat LISTS v lama.html (pro plan: režim mode=plan). */
const BASE_URL = 'https://varhandavid19-lgtm.github.io/minimo-yfai/';
const SOURCES = {
  lama: { coll: 'lama', cfg: 'meta/lamacfg', url: BASE_URL + 'lama.html', def: 'agency',
          where: 'v modulu Úkoly pro LAMA AGENCY',
          lists: { agency: 'Úkoly pro LAMA AGENCY', facility: 'Facility meeting',
                   internal: 'Interní LAMA', admin: 'Požadavky na správce' } },
  plan: { coll: 'plan_tasks', cfg: 'meta/plancfg', url: BASE_URL + 'dovolenky.html', def: 'plan',
          where: 'v Plánování směn → 📋 Požadavky na správce',
          lists: { plan: 'Požadavky na správce (Plánování směn)' } }
};

/* ===== pomůcky ===== */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dateCz = s => { const p = String(s || '').slice(0, 10).split('-'); return p.length === 3 ? `${+p[2]}. ${+p[1]}. ${p[0]}` : String(s || ''); };
/* Dnešní datum v Praze jako RRRR-MM-DD (server běží v UTC). */
const todayPrague = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Prague' }).format(new Date());
const dayNum = ds => Math.round(Date.parse(ds + 'T00:00:00Z') / 86400000);
/* Adresy z políčka v aplikaci — oddělené čárkou, středníkem nebo mezerou. */
const parseTo = s => [...new Set(String(s || '').split(/[\s,;]+/).map(x => x.trim().toLowerCase())
  .filter(x => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(x)))];

async function notifyCfgOf(src) {
  const s = await db.doc(src.cfg).get();
  return (s.exists && s.data().notify) || {};
}

let transport = null;
function mailer() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: 'smtp.seznam.cz', port: 465, secure: true,
      auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() }
    });
  }
  return transport;
}
/* Odešle e-mail a zapíše ho do mail_log (kdo, co, kdy, jestli prošel). */
async function send(to, subject, html, text) {
  const rec = { to, subject, at: FieldValue.serverTimestamp() };
  try {
    const info = await mailer().sendMail({
      from: `"minimo YFAI" <${SMTP_USER.value()}>`, to: to.join(', '), subject, html, text
    });
    rec.ok = true; rec.id = info.messageId || '';
    logger.info('E-mail odeslán', { to, subject });
  } catch (e) {
    rec.ok = false; rec.error = String(e && e.message || e);
    logger.error('E-mail se nepodařilo odeslat', { to, subject, error: rec.error });
  }
  await db.collection('mail_log').add(rec);
  return rec.ok;
}

/* Obsluha jednoho zdroje úkolů (SOURCES.lama / SOURCES.plan) — e-maily i ranní přehled. */
function makeHandlers(src) {
const APP_URL = src.url, LISTS = src.lists;
const listOf = t => (LISTS[t && t.list] ? t.list : src.def);
const notifyCfg = () => notifyCfgOf(src);
const wrap = (title, body) => `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#16233a;max-width:640px">
  <div style="background:#1b4b8f;color:#fff;padding:12px 16px;border-radius:8px 8px 0 0;font-weight:700">minimo · YFAI — ${esc(title)}</div>
  <div style="border:1px solid #dde4ec;border-top:0;border-radius:0 0 8px 8px;padding:14px 16px">${body}
    <p style="margin:18px 0 0"><a href="${APP_URL}" style="background:#0d7377;color:#fff;padding:9px 14px;border-radius:6px;text-decoration:none;font-weight:700">Otevřít v minimu</a></p>
    <p style="margin:14px 0 0;font-size:11px;color:#6b7a90">Automatická zpráva z minima. Odběr upravuje správce ${esc(src.where)} → ✉️ Notifikace.</p>
  </div></div>`;
const taskRow = t => `<tr>
  <td style="padding:6px 8px;border-bottom:1px solid #eef1f5;white-space:nowrap"><b>${esc(t.no)}</b></td>
  <td style="padding:6px 8px;border-bottom:1px solid #eef1f5">${esc(t.task)}${t.area ? `<br><span style="color:#6b7a90;font-size:12px">${esc(t.area)}</span>` : ''}</td>
  <td style="padding:6px 8px;border-bottom:1px solid #eef1f5;white-space:nowrap">${esc(dateCz(t.due))}</td>
  <td style="padding:6px 8px;border-bottom:1px solid #eef1f5;white-space:nowrap">${esc(t.priority || 'běžná')}</td></tr>`;
const taskTable = (rows) => `<table style="border-collapse:collapse;width:100%;font-size:13px">
  <tr style="background:#eef3fb;text-align:left"><th style="padding:6px 8px">Č.</th><th style="padding:6px 8px">Úkol</th>
  <th style="padding:6px 8px">Termín</th><th style="padding:6px 8px">Priorita</th></tr>${rows.map(taskRow).join('')}</table>`;
const taskLine = t => `${t.no} · ${t.task} · termín ${dateCz(t.due)}${t.priority && t.priority !== 'běžná' ? ' · ' + t.priority : ''}`;

/* ===== 1) nový úkol ===== */
const newTask = async (event) => {
  const t = event.data && event.data.data(); if (!t) return;
  const list = listOf(t);
  const c = (await notifyCfg())[list] || {};
  const to = parseTo(c.to);
  if (!to.length || c.newTask === false) return;
  const subject = `Nový úkol ${t.no} — ${LISTS[list]}: ${String(t.task || '').slice(0, 60)}`;
  const body = `<p>V záložce <b>${esc(LISTS[list])}</b> přibyl nový úkol:</p>${taskTable([t])}
    <p style="margin:10px 0 0;color:#41506b">Zadal: ${esc(t.createdBy || '')} · ${esc(dateCz(t.createdOn))}</p>`;
  await send(to, subject, wrap('nový úkol', body),
    `Nový úkol v záložce ${LISTS[list]}:\n${taskLine(t)}\nZadal: ${t.createdBy || ''}\n\n${APP_URL}`);
};

/* ===== 1b) úkol hotový — i s tím, kdo dokončení zaklikl (pole closedBy) =====
   Posílá se jen při přechodu do stavu „hotovo", ne při každé další úpravě. */
const done = async (event) => {
  const before = event.data && event.data.before.data(), t = event.data && event.data.after.data();
  if (!before || !t || before.status === 'hotovo' || t.status !== 'hotovo') return;
  const list = listOf(t);
  const c = (await notifyCfg())[list] || {};
  const to = parseTo(c.to);
  if (!to.length || c.done === false) return;
  const who = t.closedBy || 'neuvedeno';
  const when = dateCz(t.closedOn || todayPrague());
  const subject = `Úkol ${t.no} hotov — ${LISTS[list]}: ${String(t.task || '').slice(0, 60)}`;
  const body = `<p>V záložce <b>${esc(LISTS[list])}</b> byl úkol označen jako <b style="color:#1f9254">hotový</b>:</p>${taskTable([t])}
    <p style="margin:10px 0 0;color:#41506b">Dokončení zaklikl(a): <b>${esc(who)}</b> · ${esc(when)}</p>
    ${t.note ? `<p style="margin:6px 0 0;color:#41506b">Poznámka: ${esc(t.note)}</p>` : ''}`;
  await send(to, subject, wrap('úkol hotov', body),
    `Úkol hotov v záložce ${LISTS[list]}:\n${taskLine(t)}\nDokončení zaklikl(a): ${who} · ${when}${t.note ? '\nPoznámka: ' + t.note : ''}\n\n${APP_URL}`);
};

/* ===== 2+3) ranní připomínky a souhrn po termínu ===== */
/* Které připomínky (1/3, 2/3 doby) úkol dnes nově dosáhl. Úkol po termínu
   připomínky nedostává — ten patří do souhrnu „Po termínu". */
function dueReminders(t, today) {
  if (!t.due || !t.createdOn) return [];
  const a = dayNum(String(t.createdOn).slice(0, 10)), b = dayNum(String(t.due).slice(0, 10)), d = dayNum(today);
  if (!(b > a) || d > b) return [];
  const sent = t.remind || {};
  const hit = [];
  [1, 2].forEach(k => {
    const at = a + Math.ceil((b - a) * k / 3);
    if (d >= at && !sent['t' + k]) hit.push('t' + k);
  });
  return hit;
}

const daily = async () => {
  const today = todayPrague();
  const cfg = await notifyCfg();
  const snap = await db.collection(src.coll).get();
  const byList = {};
  const marks = [];   // [ref, {remind}] — zapíše se až po odeslání
  snap.forEach(doc => {
    const t = doc.data();
    if (t.status === 'hotovo') return;
    const list = listOf(t);
    const L = byList[list] || (byList[list] = { soon: [], late: [], soonRefs: [] });
    if (t.due && t.due < today) { L.late.push(t); return; }
    const hit = dueReminders(t, today);
    if (hit.length) {
      L.soon.push(t);
      const remind = Object.assign({}, t.remind || {});
      hit.forEach(k => { remind[k] = today; });
      L.soonRefs.push([doc.ref, { remind }]);
    }
  });
  for (const list of Object.keys(byList)) {
    const c = cfg[list] || {}, to = parseTo(c.to), L = byList[list];
    if (!to.length) continue;
    const soon = c.remind === false ? [] : L.soon.sort((x, y) => String(x.due).localeCompare(String(y.due)));
    const late = c.overdue === false ? [] : L.late.sort((x, y) => String(x.due).localeCompare(String(y.due)));
    if (!soon.length && !late.length) continue;
    const parts = [], text = [];
    if (late.length) {
      parts.push(`<h3 style="color:#c0392b;margin:0 0 6px">Po termínu (${late.length})</h3>${taskTable(late)}`);
      text.push('PO TERMÍNU:', ...late.map(taskLine), '');
    }
    if (soon.length) {
      parts.push(`<h3 style="color:#b7791f;margin:${late.length ? '16px' : '0'} 0 6px">Blíží se termín (${soon.length})</h3>
        <p style="margin:0 0 6px;color:#41506b;font-size:12px">Uplynula třetina nebo dvě třetiny doby od zadání do termínu.</p>${taskTable(soon)}`);
      text.push('BLÍŽÍ SE TERMÍN:', ...soon.map(taskLine), '');
    }
    const subject = `${LISTS[list]}: ${late.length ? late.length + ' po termínu' : ''}${late.length && soon.length ? ', ' : ''}${soon.length ? soon.length + ' blíží se termín' : ''}`;
    const ok = await send(to, subject, wrap(`ranní přehled ${dateCz(today)}`, parts.join('')), text.join('\n') + '\n' + APP_URL);
    if (ok && c.remind !== false) marks.push(...L.soonRefs);
  }
  for (const [ref, data] of marks) await ref.update(data);
  logger.info('Ranní přehled hotov', { src: src.coll, today, lists: Object.keys(byList).length, marked: marks.length });
};
return { newTask, done, daily };
}

const LAMA = makeHandlers(SOURCES.lama), PLAN = makeHandlers(SOURCES.plan);
const opts = doc => ({ document: doc, secrets: [SMTP_USER, SMTP_PASS] });
const morning = { schedule: '0 7 * * *', timeZone: 'Europe/Prague', secrets: [SMTP_USER, SMTP_PASS] };
// Úkoly pro LAMA AGENCY (názvy funkcí beze změny, ať se při nasazení nic nemaže)
exports.lamaNewTask = onDocumentCreated(opts('lama/{id}'), LAMA.newTask);
exports.lamaDone    = onDocumentUpdated(opts('lama/{id}'), LAMA.done);
exports.lamaDaily   = onSchedule(morning, LAMA.daily);
// 📋 Požadavky na správce v Plánování směn
exports.planNewTask = onDocumentCreated(opts('plan_tasks/{id}'), PLAN.newTask);
exports.planDone    = onDocumentUpdated(opts('plan_tasks/{id}'), PLAN.done);
exports.planDaily   = onSchedule(morning, PLAN.daily);

/* ==========================================================
   AI ČTENÍ NABÍDEK (Claude) — pro tlačítko „+ Import požadavků" v nakup.html

   Proč to běží na serveru: klíč k Anthropicu je jako platební karta. V prohlížeči
   by si ho přečetl kdokoliv, kdo si zobrazí zdroj stránky. Tahle funkce drží klíč
   u sebe (Secret Manager) a prohlížeči vrací jen hotový seznam položek.

   Volá se z prohlížeče přes httpsCallable(functions,'readOffer') a dostane
   { data: <soubor v base64>, mime: 'application/pdf' | 'image/…' }.
   Vrací { items: [{popis, mnozstvi, jednotka, cena, mena}, …] }.
   ========================================================== */
const OFFER_MODEL = 'claude-opus-5-5';
const OFFER_MIMES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const OFFER_MAX_BYTES = 5 * 1024 * 1024;        // stejný strop jako přílohy v aplikaci

const OFFER_SYSTEM = `Jsi asistent nákupního oddělení výrobní firmy. V přiloženém souboru je cenová NABÍDKA od dodavatele.
Vypiš POUZE skutečné položky k objednání — každý produkt jako jednu položku.

Pro každou položku vrať:
- popis: název/označení položky, klidně včetně kódu dílu od dodavatele
- mnozstvi: objednávané množství jako číslo; když v nabídce není, dej 1
- jednotka: ks, m nebo kg; když to z nabídky nepoznáš, dej ks
- cena: cena za JEDNU jednotku BEZ DPH jako číslo; když cena není uvedená, dej 0
- mena: CZK, EUR nebo USD; když není uvedená, odhadni ji podle jazyka a formátu nabídky

Pravidla:
- Přeskoč souhrnné řádky (mezisoučet, DPH, celkem k úhradě), hlavičky, patičky, adresy, bankovní spojení a obchodní podmínky.
- Když je u řádku jen celková cena za řádek, přepočti ji na cenu za jednotku (celkem ÷ množství).
- Čísla vracej jako čísla s desetinnou tečkou, bez měny a bez mezer uvnitř.
- Raději vynech řádek, u kterého si nejsi jistý, že je to objednávaná položka, než abys vymýšlel údaje.
- Když v souboru žádná nabídka ani položky nejsou, vrať prázdný seznam.`;

/* Pevný tvar odpovědi. Model nemůže vrátit nic jiného — nemusíme tedy hádat,
   co přišlo, a odpadá parsování volného textu. */
const OFFER_SCHEMA = {
  type: 'object',
  properties: {
    polozky: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          popis:    { type: 'string' },
          mnozstvi: { type: 'number' },
          jednotka: { type: 'string', enum: ['ks', 'm', 'kg'] },
          cena:     { type: 'number' },
          mena:     { type: 'string', enum: ['CZK', 'EUR', 'USD'] }
        },
        required: ['popis', 'mnozstvi', 'jednotka', 'cena', 'mena'],
        additionalProperties: false
      }
    }
  },
  required: ['polozky'],
  additionalProperties: false
};

exports.readOffer = onCall({
  secrets: [ANTHROPIC_API_KEY],
  timeoutSeconds: 300,          // velké PDF se čte i přes minutu
  memory: '512MiB',
  cors: true
}, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Na čtení nabídek musíš být přihlášený.');

  const data = String((req.data && req.data.data) || '');
  const mime = String((req.data && req.data.mime) || '').toLowerCase();
  const name = String((req.data && req.data.name) || 'nabídka');
  if (!data) throw new HttpsError('invalid-argument', 'Nepřišel žádný soubor.');
  if (!OFFER_MIMES.has(mime)) {
    throw new HttpsError('invalid-argument',
      'Tenhle typ souboru číst neumím. Pošli PDF, nebo obrázek ve formátu PNG, JPG, WEBP či GIF.');
  }
  // base64 je zhruba o třetinu delší než soubor sám
  if (Math.floor(data.length * 3 / 4) > OFFER_MAX_BYTES) {
    throw new HttpsError('invalid-argument', 'Nabídka je větší než 5 MB.');
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
  const fileBlock = mime === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image',    source: { type: 'base64', media_type: mime, data } };

  let res;
  try {
    res = await client.beta.messages.create({
      model: OFFER_MODEL,
      max_tokens: 8000,
      // Když bezpečnostní klasifikátor požadavek odmítne, server ho sám zkusí
      // na náhradním modelu, místo aby čtení spadlo.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: OFFER_SYSTEM,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: OFFER_SCHEMA } },
      messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: 'Vypiš položky z téhle nabídky.' }] }]
    });
  } catch (e) {
    logger.error('Čtení nabídky selhalo', { name, mime, err: e && e.message });
    const st = e && e.status;
    if (st === 401 || st === 403) throw new HttpsError('failed-precondition', 'Klíč k Anthropicu je neplatný nebo chybí. Řekni o tom správci.');
    if (st === 429) throw new HttpsError('resource-exhausted', 'Anthropic je zrovna vytížený. Zkus to za chvíli znovu.');
    if (st === 400 && /credit|balance/i.test(String(e && e.message))) {
      throw new HttpsError('failed-precondition', 'Na účtu u Anthropicu došel kredit. Řekni o tom správci.');
    }
    throw new HttpsError('internal', 'Nabídku se nepodařilo přečíst: ' + (e && e.message || 'neznámá chyba'));
  }

  if (res.stop_reason === 'refusal') {
    throw new HttpsError('failed-precondition', 'Model odmítl soubor zpracovat. Zkus jinou nabídku, nebo řádky vyplň ručně.');
  }

  const txt = (res.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  let parsed;
  try { parsed = JSON.parse(txt); }
  catch (e) { throw new HttpsError('internal', 'Odpověď od AI se nepodařilo přečíst. Zkus to prosím znovu.'); }

  const items = Array.isArray(parsed && parsed.polozky) ? parsed.polozky : [];
  const u = res.usage || {};
  logger.info('Nabídka přečtena', {
    name, mime, items: items.length, model: res.model,
    inTokens: u.input_tokens, outTokens: u.output_tokens, by: req.auth.token && req.auth.token.email
  });
  return { items };
});

/* ============================================================
   Jednotná hlavička minimo · YFAI — jedno místo pro vzhled i logiku.
   window.uheaderHTML(opts) vrací HTML hlavičky (totožné ve všech modulech).
   Chování (hodiny, menu, jazyk, mobil/PC) je nezávislé na modulech
   a funguje i po překreslení stránky.
   ============================================================ */
(function(){
  var LOGO = '<svg viewBox="0 0 300 138" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="YFAI minimo">'
    + '<defs><pattern id="yfaihdr" patternUnits="userSpaceOnUse" x="0" y="8" width="10" height="9.8">'
    + '<rect x="0" y="0" width="10" height="5.9" fill="#1f66b5"/></pattern></defs>'
    + '<text x="150" y="86" text-anchor="middle" fill="url(#yfaihdr)" font-family="\'Arial Black\',Arial,sans-serif" '
    + 'font-weight="900" font-size="108" textLength="244" lengthAdjust="spacingAndGlyphs">YFAI</text>'
    + '<text x="150" y="128" text-anchor="middle" fill="#111418" font-family="Arial,Helvetica,sans-serif" '
    + 'font-weight="700" font-size="42" letter-spacing="1" textLength="246" lengthAdjust="spacingAndGlyphs">minimo</text></svg>';
  var CZ = '<svg viewBox="0 0 60 40" width="24" height="16"><rect width="60" height="20" fill="#fff"/>'
    + '<rect y="20" width="60" height="20" fill="#d7141a"/><path d="M0 0 30 20 0 40Z" fill="#11457e"/></svg>';
  var GB = '<svg viewBox="0 0 60 40" width="24" height="16"><rect width="60" height="40" fill="#012169"/>'
    + '<path d="M0 0 60 40M60 0 0 40" stroke="#fff" stroke-width="8"/>'
    + '<path d="M0 0 60 40M60 0 0 40" stroke="#c8102e" stroke-width="4"/>'
    + '<path d="M30 0V40M0 20H60" stroke="#fff" stroke-width="12"/>'
    + '<path d="M30 0V40M0 20H60" stroke="#c8102e" stroke-width="6"/></svg>';

  // Kreslená hlava lamy z pohledu mírně z boku — ikona modulu Úkoly pro LAMA AGENCY (stejná je v index.html).
  var LLAMA = '<svg viewBox="0 0 64 64" width="1.2em" height="1.2em" style="vertical-align:-.25em;flex:none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lama"><g stroke="#5a3b22" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M41 25c4-6 7-14 5-20-5 4-8 11-9 18z" fill="#f3e3c7"/><path d="M20 28C14 21 11 10 14 4c6 5 9 14 10 22z" fill="#f3e3c7"/><path d="M42 20c2-4 3-8 3-11-2 3-4 7-4.5 10z" fill="#eba9a2" stroke="none"/><path d="M17.5 22c-2-5-3-10-2-13 2 4 4 9 4.5 13z" fill="#eba9a2" stroke="none"/><path d="M19 27c0-7 6-12 14-12s11 4 11 10v12c0 10-5 20-12 20s-13-8-13-19z" fill="#f3e3c7"/><path d="M21 23c-2-6 3-10 7-8 1-5 8-5 9 0 4-2 8 2 7 8-6 3-17 3-23 0z" fill="#fff8ec"/><path d="M29 45c0-5 4-8 9-8s9 3 9 8-4 9-9 9-9-4-9-9z" fill="#fff8ec" stroke-width="1.6"/><path d="M37.5 43Q40 44.6 42.6 42.8M40.2 44.2v3M36.5 49.5q3.5 2.4 6.6-.5" fill="none" stroke-width="1.6"/></g><ellipse cx="27.5" cy="32" rx="2.7" ry="3.3" fill="#2b1d12"/><ellipse cx="40.3" cy="31.6" rx="2.1" ry="3" fill="#2b1d12"/><circle cx="28.4" cy="30.9" r=".9" fill="#fff"/><circle cx="40.9" cy="30.6" r=".7" fill="#fff"/><circle cx="24" cy="39.5" r="2.7" fill="#f0a3a0" opacity=".55"/><circle cx="44.3" cy="38.3" r="1.6" fill="#f0a3a0" opacity=".45"/></svg>';

  /* ===== Překlady (CZ/EN) – sdílené pro všechny moduly =====
     T('český text') vrátí anglicky, když je zvolená EN; jinak vrátí češtinu.
     Chybějící překlad = zůstane česky (nic se nerozbije). Moduly si svoje texty
     přidávají přes window.registerI18N({...}). PŘEKLÁDAJÍ SE JEN SYSTÉMOVÉ POPISKY,
     ne data (ta se do T() nedávají). */
  var I18N = {};
  function lang(){ try{ return localStorage.getItem('minimo-lang') || 'cs'; }catch(e){ return 'cs'; } }
  function tr(cs){ if(lang()!=='en') return cs; var e = I18N[cs]; return (e===undefined ? cs : e); }
  window.registerI18N = function(m){ if(!m) return; for(var k in m){ if(Object.prototype.hasOwnProperty.call(m,k)) I18N[k]=m[k]; } };
  window.minimoLang = lang;
  window.T = tr;
  /* Základní slovník: menu, hlavička a běžná slova napříč moduly. */
  window.registerI18N({
    'Přepnout modul':'Switch module',
    'Hlavní stránka':'Home',
    'Nákupní požadavky':'Purchase requests',
    'Plánování směn':'Shift planning',
    'Plánování směn a přítomnosti':'Shift & attendance planning',
    'Externí opravy':'External repairs',
    'Engineering':'Engineering',
    'Shopfloor walk':'Shopfloor walk',
    'Úkoly pro LAMA AGENCY':'LAMA AGENCY tasks',
    'Nastavení':'Settings',
    'Odhlásit':'Log out',
    'Moduly':'Modules',
    'Menu modulů':'Modules menu',
    'týden':'week',
    '🖥️ Zobrazit jako na počítači':'🖥️ Desktop view',
    '📱 Přepnout na mobilní zobrazení':'📱 Mobile view',
    /* Běžné popisky napříč moduly (tlačítka, hlavičky, hlášky). */
    'Uložit':'Save','Uložit změny':'Save changes','Zrušit':'Cancel','Smazat':'Delete',
    'Upravit':'Edit','Zavřít':'Close','Přidat':'Add','Přidat řádek':'Add row',
    'Odebrat':'Remove','Zpět':'Back','Hledat':'Search','Hledat…':'Search…',
    'Vše':'All','Ano':'Yes','Ne':'No','Hotovo':'Done','Načítám…':'Loading…',
    'Uloženo.':'Saved.','Historie':'History','Export':'Export','Export CSV':'Export CSV',
    'Stav':'Status','Priorita':'Priority','Datum':'Date','Poznámka':'Note',
    'Popis':'Description','Dodavatel':'Supplier','Výrobce':'Manufacturer',
    'Množství':'Quantity','Množ.':'Qty','Cena':'Price','Celkem':'Total','Měna':'Currency',
    'Účet':'Account','Linka':'Line','Stroj':'Machine','Owner':'Owner','Termín':'Deadline',
    'Jméno':'Name','E-mail':'E-mail','Telefon':'Phone','Role':'Role','Útvar':'Team',
    'Datum dodání':'Delivery date','Skladové číslo':'Stock number',
    'běžná':'normal','kritická':'critical','nízká':'low','vysoká':'high',
    'Připojuji se k Firebase.':'Connecting to Firebase.',
    'Nemáš oprávnění':'No permission','← Zpět na hlavní stránku':'← Back to home',
    'jen pro čtení':'read only','Zpět na hlavní stránku':'Back to home',
    /* Přihlášení + chybové hlášky (stejné ve všech modulech). */
    'Heslo':'Password','Přihlásit se':'Sign in','Přihlašuji…':'Signing in…',
    'Neplatný e-mail.':'Invalid e-mail.','Účet neexistuje.':'Account does not exist.',
    'Nesprávné heslo.':'Incorrect password.','Nesprávný e-mail nebo heslo.':'Incorrect e-mail or password.',
    'Příliš mnoho pokusů, zkuste to za chvíli.':'Too many attempts, try again shortly.',
    'Přihlašování e-mailem není ve Firebase zapnuté.':'E-mail sign-in is not enabled in Firebase.',
    'Přihlášení se nezdařilo (':'Sign-in failed (',
    'Neznámá chyba':'Unknown error','Otevřít':'Open','Zrušit filtr':'Clear filter',
    'Nic neodpovídá filtru.':'Nothing matches the filter.','↻ Načíst znovu':'↻ Reload',
    '⭳ Export CSV':'⭳ Export CSV'
  });

  /* Automatický překlad vykreslené stránky: projde textové uzly a atributy
     (placeholder/title/aria-label) a nahradí jen ty, které PŘESNĚ (po oříznutí
     mezer) odpovídají popisku ve slovníku. Data se tím nepřekládají — uživatelský
     text se shodou s celým popiskem prakticky nikdy netrefí. Volá se po každém
     překreslení modulu: window.i18nApply(korenovyPrvek). */
  window.i18nApply = function(root){
    if(lang()!=='en') return;
    root = root || document.body; if(!root) return;
    try{
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes=[], n;
      while((n=w.nextNode())) nodes.push(n);
      for(var i=0;i<nodes.length;i++){
        var t=nodes[i], raw=t.nodeValue; if(!raw) continue;
        var key=raw.trim(); if(!key) continue;
        var e=I18N[key];
        if(e!==undefined && e!==key) t.nodeValue = raw.replace(key, e);
      }
      var attrs=['placeholder','title','aria-label'];
      var els=root.querySelectorAll('[placeholder],[title],[aria-label]');
      for(var j=0;j<els.length;j++){
        for(var a=0;a<attrs.length;a++){
          var v=els[j].getAttribute(attrs[a]); if(v==null) continue;
          var k=v.trim(), en=I18N[k];
          if(en!==undefined && en!==k) els[j].setAttribute(attrs[a], v.replace(k,en));
        }
      }
    }catch(e){ /* překlad nikdy nesmí shodit stránku */ }
  };

  window.uheaderHTML = function(o){
    o = o || {};
    function link(href, ico, label, key){
      // o.modules (pole klíčů) omezí, které moduly se v menu ukážou; „portal" je vždy vidět
      if(o.modules && key!=='portal' && o.modules.indexOf(key)<0) return '';
      return '<a class="'+(o.cur===key?'cur':'')+'" href="'+href+'">'+ico+' '+label+'</a>';
    }
    // Externí opravy zatím vidí v menu jen správce (podle e-mailu)
    var OPRAVY_OWNERS = ['david.varhan@yanfeng.com','varhan@minimo.yfai','varhandavid19@gmail.com'];
    function opravyLink(){
      var who = String(o.email||o.user||'').trim().toLowerCase();
      if(OPRAVY_OWNERS.indexOf(who)<0) return '';
      return '<a class="'+(o.cur==='opravy'?'cur':'')+'" href="opravy.html">🛠️ '+tr('Externí opravy')+'</a>';
    }
    // Engineering vidí správci (podle e-mailu) a lidé s pozicí PE nebo PE coordinator.
    // Pozice se předávají v o.positions — stejný seznam je i v pravidlech Firestore.
    var ENG_POSITIONS = ['IMM PE','SLUSH PE','FOAM PE','ASSY PE','GB/DP PE','PE coordinator'];
    function engineeringLink(){
      var who = String(o.email||o.user||'').trim().toLowerCase();
      var pos = o.positions || [];
      var ok = OPRAVY_OWNERS.indexOf(who)>=0;
      for(var i=0;i<pos.length && !ok;i++) if(ENG_POSITIONS.indexOf(String(pos[i]).trim())>=0) ok=true;
      if(!ok) return '';
      return '<a class="'+(o.cur==='engineering'?'cur':'')+'" href="engineering.html">🏭 '+tr('Engineering')+'</a>';
    }
    // Shopfloor walk: výchozí přístup mají správci a PE koordinátoři. Ruční nastavení
    // u uživatele (o.mods.shopfloor = none/read/write) má vždy přednost.
    // Stejná logika je v index.html, shopfloor.html, nastaveni.html a v pravidlech Firestore.
    var SFW_POSITIONS = ['PE coordinator'];
    function shopfloorLink(){
      var set = (o.mods || {}).shopfloor;
      var ok;
      if(set==='none') return '';
      else if(set==='read' || set==='write') ok = true;
      else {
        var who = String(o.email||o.user||'').trim().toLowerCase();
        var pos = o.positions || [];
        ok = OPRAVY_OWNERS.indexOf(who)>=0;
        for(var i=0;i<pos.length && !ok;i++) if(SFW_POSITIONS.indexOf(String(pos[i]).trim())>=0) ok=true;
      }
      if(!ok) return '';
      return '<a class="'+(o.cur==='shopfloor'?'cur':'')+'" href="shopfloor.html">🚶 '+tr('Shopfloor walk')+'</a>';
    }
    // Úkoly pro LAMA AGENCY: výchozí přístup mají jen správci. Komukoli dalšímu
    // (třeba teamleaderovi agentury) ho David nastaví v Nastavení (o.mods.lama).
    // Stejná logika je v index.html, lama.html, nastaveni.html a v pravidlech Firestore.
    function lamaLink(){
      var set = (o.mods || {}).lama;
      if(set==='none') return '';
      var ok = (set==='read' || set==='write')
        || OPRAVY_OWNERS.indexOf(String(o.email||o.user||'').trim().toLowerCase())>=0;
      if(!ok) return '';
      return '<a class="'+(o.cur==='lama'?'cur':'')+'" href="lama.html">'+LLAMA+' '+tr('Úkoly pro LAMA AGENCY')+'</a>';
    }
    return '<header class="uhdr">'
      + '<div class="uh-menuwrap">'
        + '<button class="uh-menu" id="mm-btn" aria-label="'+tr('Menu modulů')+'" title="'+tr('Moduly')+'">☰</button>'
        + '<nav class="mm-panel" id="mm-panel" hidden>'
          + '<div class="mm-h">'+tr('Přepnout modul')+'</div>'
          + link('index.html','🏠',tr('Hlavní stránka'),'portal')
          + link('nakup.html','🛒',tr('Nákupní požadavky'),'nakup')
          + link('dovolenky.html','🗓️',tr('Plánování směn'),'dovolenky')
          + opravyLink()
          + engineeringLink()
          + shopfloorLink()
          + lamaLink()
          + link('nastaveni.html','⚙️',tr('Nastavení'),'nastaveni')
          + '<div class="mm-sep"></div>'
          + '<button class="mm-view">'+tr('🖥️ Zobrazit jako na počítači')+'</button>'
        + '</nav>'
      + '</div>'
      + '<div class="uh-brand">'+LOGO+'</div>'
      + '<div class="uh-title"><b>minimo · YFAI</b><span>'+tr(o.module||'')+'</span></div>'
      + '<div class="uh-right">'
        + '<div class="uh-clock" id="uh-clock"><div class="t">--:--:--</div><div class="d">—</div></div>'
        + '<div class="uh-user"><div class="n">'+(o.user||'')+'</div><div class="l">'+(o.level||'')+'</div></div>'
        + '<div class="uh-lang"><button data-lang="cs" title="Čeština">'+CZ+'</button>'
          + '<button data-lang="en" title="English">'+GB+'</button></div>'
        + '<button class="uh-logout" '+(o.logoutAttr||'id="btn-logout"')+'>'+tr('Odhlásit')+'</button>'
      + '</div>'
    + '</header>';
  };

  /* ---------- chování ---------- */
  var vp = document.querySelector('meta[name="viewport"]');
  function applyView(){
    var v = localStorage.getItem('minimo-view') || 'auto';
    if(vp) vp.setAttribute('content', v==='desktop' ? 'width=1200' : 'width=device-width, initial-scale=1');
    document.querySelectorAll('.mm-view').forEach(function(b){
      b.textContent = tr((v==='desktop') ? '📱 Přepnout na mobilní zobrazení' : '🖥️ Zobrazit jako na počítači');
    });
  }
  function applyLang(){
    var l = localStorage.getItem('minimo-lang') || 'cs';
    document.querySelectorAll('.uh-lang button').forEach(function(b){
      b.classList.toggle('on', b.getAttribute('data-lang')===l);
    });
  }
  function isoWeek(d){
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;                 // Po=1 … Ne=7
    t.setUTCDate(t.getUTCDate() + 4 - day);        // čtvrtek téhož ISO týdne
    var ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil((((t - ys) / 86400000) + 1) / 7);
  }
  function tick(){
    var el = document.getElementById('uh-clock'); if(!el) return;
    var d = new Date(), p = function(n){ return (n<10?'0':'')+n; };
    var t = el.querySelector('.t'), dd = el.querySelector('.d');
    if(t) t.textContent = p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());
    if(dd) dd.textContent = d.toLocaleDateString(lang()==='en'?'en-GB':'cs-CZ',{weekday:'short',day:'numeric',month:'numeric',year:'numeric'})
      + ' · ' + tr('týden') + ' ' + isoWeek(d);
  }
  function refresh(){ tick(); applyLang(); }
  setInterval(refresh, 1000);
  // brzké obnovení, aby hodiny naskočily hned po vykreslení hlavičky (ne až po vteřině)
  [150,350,650,1000,1600].forEach(function(ms){ setTimeout(refresh, ms); });

  document.addEventListener('click', function(e){
    var panel = document.getElementById('mm-panel');
    if(e.target.closest('#mm-btn')){ e.stopPropagation(); if(panel){ applyView(); panel.hidden = !panel.hidden; } return; }
    var lb = e.target.closest('.uh-lang button');
    if(lb){ localStorage.setItem('minimo-lang', lb.getAttribute('data-lang')); location.reload(); return; }
    if(e.target.closest('.mm-view')){
      var cur = localStorage.getItem('minimo-view') || 'auto';
      localStorage.setItem('minimo-view', cur==='desktop' ? 'auto' : 'desktop'); applyView(); return;
    }
    if(panel && !e.target.closest('#mm-panel')) panel.hidden = true;
  });
  document.addEventListener('keydown', function(e){
    if(e.key==='Escape'){ var p=document.getElementById('mm-panel'); if(p) p.hidden=true; }
  });

  applyView(); refresh();
  document.addEventListener('DOMContentLoaded', function(){ applyView(); refresh(); });
})();

/* Le QG de Léo — affichage. Rien à modifier ici : l'horaire est dans horaire.source.js (privé, chiffré
   dans horaire.chiffre.js), les jeux dans jeux.js et la ville de la météo dans config.js. */
(function () {
  const CFG = window.QG_CONFIG || {}, JEUX = window.QG_JEUX || [], C = window.QG_CYCLE;
  let H = null, cycle = null; // remplis une fois l'horaire déverrouillé
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const min = hm => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
  const heure = hm => { const [h, m] = hm.split(":"); return h + "h" + m; };

  /* ── L'heure du Québec (ou une date d'essai : ?date=2026-11-16&heure=10:20) ── */
  function maintenant() {
    const p = new URLSearchParams(location.search);
    if (p.get("date")) {
      const [h, m] = (p.get("heure") || "10:00").split(":").map(Number);
      return { date: C.versDate(p.get("date")), minutes: h * 60 + m };
    }
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date()).map(x => [x.type, x.value]));
    return { date: new Date(+parts.year, +parts.month - 1, +parts.day, 12), minutes: +parts.hour * 60 + +parts.minute };
  }
  const fmt = (d, o) => new Intl.DateTimeFormat("fr-CA", o).format(d);
  const jourSemaine = d => cap(fmt(d, { weekday: "long" }));
  const dateCourte = d => fmt(d, { day: "numeric", month: "long" });

  /* ── Cours et activités d'une date ── */
  function speciaux(jour) {
    const c = H.cours[jour] || {};
    return H.periodes.filter(p => !p.pause && c[p.debut])
      .map(p => ({ debut: p.debut, m: H.matieres[c[p.debut]] })).filter(x => x.m);
  }
  function activitesDu(date) {
    const k = C.cle(date);
    return (H.activites || []).filter(a =>
      a.jours.includes(date.getDay()) && (!a.depuis || k >= a.depuis) && (!a.jusquau || k <= a.jusquau));
  }
  function blocs(jour) {
    const c = H.cours[jour] || {};
    return H.periodes.map(p => {
      if (p.pause) return { ...p, type: "pause", nom: p.pause };
      const id = c[p.debut] || "classe";
      return { ...p, type: id === "classe" ? "classe" : "special", m: H.matieres[id] || H.matieres.classe };
    });
  }

  /* ── Une tuile ── */
  function tuile(etiquette, date, info) {
    const badge = info.ecole
      ? `<div class="jour-badge" aria-label="Jour ${info.jour} du cycle"><span>JOUR</span><b>${info.jour}</b></div>`
      : `<div class="jour-badge off"><span>CONGÉ</span><b>OFF</b></div>`;
    const acts = activitesDu(date);
    const pucesActs = acts.map(a => `<span class="puce" style="--c:${a.couleur || "#ff2e9a"}"><b>${esc(a.nom)}</b> ${heure(a.debut)}</span>`).join("");
    let corps;
    if (info.ecole) {
      const s = speciaux(info.jour);
      const pucesCours = s.length
        ? s.map(b => `<span class="puce" style="--c:${b.m.couleur}"><b>${esc(b.m.nom)}</b> ${heure(b.debut)}</span>`).join("")
        : `<span class="puce vide">Journée en classe</span>`;
      corps = `<div class="puces">${pucesCours}${pucesActs}</div>`;
    } else {
      corps = `<div class="conge-raison">${esc(info.raison)}</div>${acts.length ? `<div class="puces">${pucesActs}</div>` : ""}`;
    }
    return `
      <div class="tile-text">
        <div class="day-label">${etiquette}</div>
        <div class="day-big">${jourSemaine(date)} <span class="day-sub">${dateCourte(date)}</span></div>
        ${corps}
        <div class="voir">Voir l'horaire <span aria-hidden="true">→</span></div>
      </div>
      ${badge}`;
  }

  /* ── L'horaire complet (fenêtre) ── */
  function lignesHoraire(info, date, minutes, actif) {
    let html = "";
    if (info.ecole) {
      html += blocs(info.jour).map(b => {
        const enCours = actif && minutes >= min(b.debut) && minutes < min(b.fin);
        const passe = actif && minutes >= min(b.fin);
        const cls = ["bloc", b.type, enCours ? "maintenant" : "", passe ? "passe" : ""].join(" ");
        const now = enCours ? '<span class="now-pill">MAINTENANT</span>' : "";
        if (b.type === "pause") return `<li class="${cls}"><span class="t">${heure(b.debut)}</span><span class="pause-nom">${esc(b.nom)}</span>${now}</li>`;
        return `<li class="${cls}" style="--c:${b.m.couleur}"><span class="t">${heure(b.debut)}<small>${heure(b.fin)}</small></span><span class="sigle" aria-hidden="true">${esc(b.m.sigle)}</span><span class="nom">${esc(b.m.nom)}</span>${now}</li>`;
      }).join("");
    }
    const acts = activitesDu(date);
    if (acts.length) {
      if (info.ecole) html += `<li class="bloc pause"><span class="t"></span><span class="pause-nom">Après l'école</span></li>`;
      html += acts.map(a => {
        const enCours = actif && minutes >= min(a.debut) && minutes < min(a.fin);
        const passe = actif && minutes >= min(a.fin);
        return `<li class="bloc special${enCours ? " maintenant" : ""}${passe ? " passe" : ""}" style="--c:${a.couleur || "#ff2e9a"}"><span class="t">${heure(a.debut)}<small>${heure(a.fin)}</small></span><span class="sigle" aria-hidden="true">★</span><span class="nom">${esc(a.nom)}</span>${enCours ? '<span class="now-pill">MAINTENANT</span>' : ""}</li>`;
      }).join("");
    }
    return html;
  }

  let quelle = null; // "auj", "demain" ou "meteo"
  function ouvrir(q) {
    quelle = q; rendreFenetre();
    const f = $("fenetre"); f.hidden = false; document.body.classList.add("fenetre-ouverte");
    ($("code") || $("fermer")).focus();
  }

  /* ── Le code secret ── */
  const CLE_STOCKAGE = "qg-leo-code";
  const lire = () => { try { return localStorage.getItem(CLE_STOCKAGE); } catch (e) { return null; } };
  const ecrire = v => { try { v ? localStorage.setItem(CLE_STOCKAGE, v) : localStorage.removeItem(CLE_STOCKAGE); } catch (e) {} };
  const deB64 = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
  async function dechiffrer(mdp) {
    const c = window.QG_HORAIRE_CHIFFRE; if (!c || !crypto.subtle) throw new Error("indisponible");
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(mdp), "PBKDF2", false, ["deriveKey"]);
    const cle = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: deB64(c.sel), iterations: c.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const brut = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(c.iv) }, cle, deB64(c.donnees));
    return JSON.parse(new TextDecoder().decode(brut));
  }
  async function deverrouiller(mdp, retenir) {
    const h = await dechiffrer(mdp);           // lance une erreur si le code est mauvais
    H = h; cycle = C.creer(H);
    if (retenir) ecrire(mdp);
    $("verrouiller").hidden = false;
    rendreHoraire();
  }
  function rendreFenetreCode() {
    $("fenetre-boite").className = "fenetre-boite c-auj";
    $("fenetre-contenu").innerHTML = `
      <div class="day-label">ACCÈS COMMANDANT</div>
      <h2 class="fen-titre" id="fenetre-titre">Code secret</h2>
      <p class="code-aide">Entre le code pour voir l'horaire. On ne te le redemandera plus sur cet appareil.</p>
      <form class="code-form" id="code-form" autocomplete="off">
        <label class="sr" for="code">Code secret</label>
        <input id="code" type="password" autocomplete="current-password" autocapitalize="none" spellcheck="false" placeholder="ex. mot-mot-00">
        <label class="code-retenir"><input id="retenir" type="checkbox" checked> Se souvenir sur cet appareil</label>
        <button class="code-btn" type="submit">Déverrouiller</button>
        <div class="code-erreur" id="code-erreur" role="alert"></div>
      </form>`;
    $("code-form").addEventListener("submit", async e => {
      e.preventDefault();
      const v = $("code").value.trim(); if (!v) return;
      const btn = e.target.querySelector("button"); btn.disabled = true; btn.textContent = "Vérification…";
      try {
        const q = quelle; await deverrouiller(v, $("retenir").checked);
        quelle = q; rendreFenetre(); $("fermer").focus();
      } catch (err) {
        btn.disabled = false; btn.textContent = "Déverrouiller";
        $("code-erreur").textContent = err.message === "indisponible" ? "Ce navigateur ne peut pas ouvrir l'horaire." : "Ce n'est pas le bon code. Réessaie!";
        $("code").select();
      }
    });
  }
  function fermer() {
    $("fenetre").hidden = true; document.body.classList.remove("fenetre-ouverte");
    const t = $({ auj: "tuile-aujourdhui", demain: "tuile-demain", meteo: "tuile-meteo" }[quelle]); quelle = null; if (t) t.focus();
  }
  function rendreFenetre() {
    if (!quelle) return;
    if (quelle === "meteo") return rendreFenetreMeteo();
    if (!H) return rendreFenetreCode();
    const { date, minutes } = maintenant();
    const d = quelle === "auj" ? date : C.plusJours(date, 1);
    const info = cycle.info(d);
    const actif = quelle === "auj";
    const lignes = lignesHoraire(info, d, minutes, actif);
    $("fenetre-boite").className = "fenetre-boite " + (quelle === "auj" ? "c-auj" : "c-demain");
    $("fenetre-contenu").innerHTML = `
      <div class="day-top">
        <div>
          <div class="day-label">${quelle === "auj" ? "AUJOURD'HUI" : "PROCHAIN JOUR"}</div>
          <h2 class="fen-titre" id="fenetre-titre">${jourSemaine(d)} <span class="day-sub">${dateCourte(d)}</span></h2>
        </div>
        ${info.ecole ? `<div class="jour-badge"><span>JOUR</span><b>${info.jour}</b></div>` : `<div class="jour-badge off"><span>CONGÉ</span><b>OFF</b></div>`}
      </div>
      ${info.ecole ? "" : `<div class="conge-boite"><div class="conge-raison">${esc(info.raison)}</div><p>${lignes ? "Pas d'école, mais il y a une activité :" : "Pas d'école. Mission libre, commandant!"}</p></div>`}
      ${lignes ? `<ol class="blocs">${lignes}</ol>` : ""}`;
  }

  /* ── Rendu des tuiles ── */
  const tuileVerrou = (etiquette, date) => `
      <div class="tile-text">
        <div class="day-label">${etiquette}</div>
        <div class="day-big">${jourSemaine(date)} <span class="day-sub">${dateCourte(date)}</span></div>
        <div class="verrou-txt">Horaire verrouillé</div>
        <div class="voir">Entrer le code secret <span aria-hidden="true">→</span></div>
      </div>
      <div class="jour-badge off verrou-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></div>`;

  function rendreHoraire() {
    const { date, minutes } = maintenant();
    const demainDate = C.plusJours(date, 1);

    $("header-date").textContent = jourSemaine(date) + " " + fmt(date, { day: "numeric", month: "short" });
    const h = Math.floor(minutes / 60);
    $("salut").textContent = (h >= 5 && h < 12 ? "BON MATIN" : h >= 12 && h < 17 ? "BON APRÈS-MIDI" : h >= 17 && h < 21 ? "BONNE SOIRÉE" : "BONNE NUIT") + ", COMMANDANT !";

    if (!H) {
      $("tuile-aujourdhui").innerHTML = tuileVerrou("AUJOURD'HUI", date);
      $("tuile-demain").innerHTML = tuileVerrou("PROCHAIN JOUR", demainDate);
      return rendreFenetre();
    }
    const auj = cycle.info(date);
    const demain = cycle.info(demainDate);

    $("tuile-aujourdhui").innerHTML = tuile("AUJOURD'HUI", date, auj);
    let t2 = tuile("PROCHAIN JOUR", demainDate, demain);
    if (!demain.ecole) {
      const p = cycle.prochain(demainDate);
      if (p) t2 = t2.replace('<div class="voir">', `<div class="retour">Retour à l'école : <span>${jourSemaine(p.date).toLowerCase()} ${fmt(p.date, { day: "numeric", month: "short" })}</span> <span>· Jour ${p.jour}</span></div><div class="voir">`);
    }
    $("tuile-demain").innerHTML = t2;
    rendreFenetre();
  }

  /* ── Météo (Open-Meteo, sans clé) ── */
  const CODES = [
    [[0], "Ensoleillé", "soleil"], [[1], "Plutôt ensoleillé", "soleil-nuage"], [[2], "Partiellement nuageux", "soleil-nuage"],
    [[3], "Nuageux", "nuage"], [[45, 48], "Brouillard", "brume"],
    [[51, 53, 55, 56, 57], "Bruine", "pluie"], [[61, 63, 65, 66, 67, 80, 81, 82], "Pluie", "pluie"],
    [[71, 73, 75, 77, 85, 86], "Neige", "neige"], [[95, 96, 99], "Orages", "orage"]
  ];
  const decode = c => { for (const [l, t, i] of CODES) if (l.includes(c)) return { texte: t, icone: i }; return { texte: "—", icone: "nuage" }; };
  const ICONES = {
    soleil: `<circle cx="32" cy="32" r="12" fill="#ffd000"/><g stroke="#ffd000" stroke-width="4" stroke-linecap="round"><path d="M32 6v7M32 51v7M6 32h7M51 32h7M13.6 13.6l5 5M45.4 45.4l5 5M13.6 50.4l5-5M45.4 18.6l5-5"/></g>`,
    nuage: `<path d="M18 46h28a11 11 0 0 0 0-22 15 15 0 0 0-28.5 4A9 9 0 0 0 18 46z" fill="#d7e6ff"/>`,
    "soleil-nuage": `<circle cx="24" cy="22" r="10" fill="#ffd000"/><g stroke="#ffd000" stroke-width="3.5" stroke-linecap="round"><path d="M24 4v5M6 22h5M11 9l3.5 3.5M37 9l-3.5 3.5"/></g><path d="M22 50h26a10 10 0 0 0 0-20 14 14 0 0 0-26.5 3.5A8.3 8.3 0 0 0 22 50z" fill="#d7e6ff"/>`,
    pluie: `<path d="M18 38h28a10 10 0 0 0 0-20 14 14 0 0 0-26.5 3.5A8.3 8.3 0 0 0 18 38z" fill="#d7e6ff"/><g stroke="#3fdcff" stroke-width="4" stroke-linecap="round"><path d="M22 46l-3 8M33 46l-3 8M44 46l-3 8"/></g>`,
    neige: `<path d="M18 38h28a10 10 0 0 0 0-20 14 14 0 0 0-26.5 3.5A8.3 8.3 0 0 0 18 38z" fill="#d7e6ff"/><g fill="#fff"><circle cx="21" cy="49" r="3.2"/><circle cx="32" cy="54" r="3.2"/><circle cx="43" cy="49" r="3.2"/></g>`,
    orage: `<path d="M18 36h28a10 10 0 0 0 0-20 14 14 0 0 0-26.5 3.5A8.3 8.3 0 0 0 18 36z" fill="#b9c8e6"/><path d="M34 38l-8 12h7l-4 10 12-15h-7l4-7z" fill="#ffd000"/>`,
    brume: `<g stroke="#d7e6ff" stroke-width="4.5" stroke-linecap="round"><path d="M12 24h40M8 34h44M14 44h36"/></g>`
  };
  const icone = (n, cls) => `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true">${ICONES[n] || ICONES.nuage}</svg>`;
  const deg = v => Math.round(v) + "°";

  function conseil(minAuj, codeAuj) {
    const i = decode(codeAuj).icone;
    if (i === "pluie" || i === "orage") return "Prends ton imperméable!";
    if (i === "neige") return "Tuque et mitaines au rendez-vous!";
    if (minAuj <= 0) return "Ça gèle : habille-toi chaudement!";
    if (minAuj <= 8) return "Prends un manteau chaud.";
    return "Belle journée pour jouer dehors!";
  }

  /* ── Quoi porter : 3 tenues ── */
  const PEAU = "#f1c7a4";
  const TENUES = [
    { nom: "Short", svg: `<circle cx="20" cy="10" r="6.5" fill="${PEAU}"/>
      <rect x="6.5" y="25" width="3.2" height="9" rx="1.6" fill="${PEAU}"/><rect x="30.3" y="25" width="3.2" height="9" rx="1.6" fill="${PEAU}"/>
      <path d="M12 19h16l5 6-3 3-3-2v9H13v-9l-3 2-3-3z" fill="#3fdcff"/>
      <rect x="14" y="41" width="3.6" height="9" rx="1.6" fill="${PEAU}"/><rect x="22.4" y="41" width="3.6" height="9" rx="1.6" fill="${PEAU}"/>
      <path d="M13 34h14l1 8h-6l-2-3-2 3h-6z" fill="#ff8a00"/>` },
    { nom: "Habit long", svg: `<circle cx="20" cy="10" r="6.5" fill="${PEAU}"/>
      <path d="M12 19h16l4 5 1.5 12-3.5.5-2-9V35H12v-7.5l-2 9-3.5-.5L8 24z" fill="#ff2e9a"/>
      <path d="M13 34h14l.5 16h-6L20 40l-1.5 10h-6z" fill="#2f8fff"/>` },
    { nom: "Habit d'hiver", svg: `<circle cx="20" cy="11" r="6.5" fill="${PEAU}"/>
      <path d="M13 9q0-8 7-8t7 8z" fill="#cff100"/><rect x="12" y="7" width="16" height="3.6" rx="1.6" fill="#ff8a00"/><circle cx="20" cy="1.6" r="2.2" fill="#fff"/>
      <path d="M11.5 20h17l4.5 5 1.5 13-3.5.5-2.5-10V41h-17V28.5l-2.5 10-3.5-.5L7 25z" fill="#b14dff"/>
      <path d="M20 22v19" stroke="#071d3b" stroke-width="1.5"/>
      <rect x="12.5" y="17" width="15" height="4.5" rx="2.2" fill="#ff2e9a"/><rect x="22" y="19" width="4" height="9" rx="1.6" fill="#ff2e9a"/>
      <path d="M13.5 41h13l.4 6h-5.4L20 44l-1.5 3h-5.4z" fill="#2f8fff"/>
      <rect x="12.5" y="46.5" width="6.5" height="4.5" rx="1.8" fill="#ffd000"/><rect x="21" y="46.5" width="6.5" height="4.5" rx="1.8" fill="#ffd000"/>` }
  ];
  // 0 = short, 1 = habit long, 2 = habit d'hiver (selon le plus chaud et le plus froid de la journée)
  const niveauTenue = (max, min) => max >= 20 ? 0 : (max >= 10 && min > 0) ? 1 : 2;
  const tenueHTML = (niv, cls) => `<div class="tenues ${cls}">${TENUES.map((x, i) =>
    `<div class="tenue${i === niv ? " on" : ""}"${i === niv ? "" : ' aria-hidden="true"'}><svg viewBox="0 0 40 52" aria-hidden="true">${x.svg}</svg><span>${x.nom}</span></div>`).join("")}</div>`;

  /* Thermomètre : bleus quand il fait froid, verts quand c'est frais, jaunes puis rouges quand il fait chaud. */
  const PALIERS = [[-20, [26, 60, 200]], [-10, [47, 120, 255]], [0, [63, 200, 255]], [6, [60, 225, 150]], [12, [150, 235, 30]],
    [18, [230, 240, 0]], [24, [255, 170, 0]], [30, [255, 46, 77]]];
  function couleurTemp(t) {
    if (t <= PALIERS[0][0]) return `rgb(${PALIERS[0][1]})`;
    for (let i = 1; i < PALIERS.length; i++) {
      const [t1, c1] = PALIERS[i], [t0, c0] = PALIERS[i - 1];
      if (t <= t1) { const f = (t - t0) / (t1 - t0); return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * f))})`; }
    }
    return `rgb(${PALIERS[PALIERS.length - 1][1]})`;
  }
  function thermometre(t) {
    const bas = -25, haut = 35, y0 = 8, hTube = 110, X = 34;
    const pos = v => (Math.max(bas, Math.min(haut, v)) - bas) / (haut - bas);
    const y = y0 + hTube * (1 - pos(t)), coul = couleurTemp(t);
    const stops = PALIERS.map(([v, c]) => `<stop offset="${pos(v).toFixed(3)}" stop-color="rgb(${c})"/>`).join("");
    return `<svg class="thermo" viewBox="0 0 64 146" role="img" aria-label="Thermomètre : ${deg(t)}">
      <defs><linearGradient id="thermo-g" gradientUnits="userSpaceOnUse" x1="0" y1="${y0 + hTube}" x2="0" y2="${y0}">${stops}</linearGradient>
      <clipPath id="thermo-c"><rect x="${X - 5}" y="${y}" width="10" height="${y0 + hTube - y + 14}"/></clipPath></defs>
      <g transform="translate(11 16)"><circle r="6" fill="#ffd000"/><g stroke="#ffd000" stroke-width="2.2" stroke-linecap="round"><path d="M0-11v2.8M0 8.2V11M-11 0h2.8M8.2 0H11M-7.8-7.8l2 2M5.8 5.8l2 2M-7.8 7.8l2-2M5.8-5.8l2-2"/></g></g>
      <g transform="translate(11 120)" stroke="#9fe8ff" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M0-9V9M-7.8-4.5 7.8 4.5M-7.8 4.5 7.8-4.5"/><path d="M-2.8-7 0-4.4 2.8-7M-2.8 7 0 4.4 2.8 7"/></g>
      <rect x="${X - 7}" y="${y0 - 2}" width="14" height="${hTube + 12}" rx="7" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.22)" stroke-width="1.5"/>
      <rect x="${X - 5}" y="${y0}" width="10" height="${hTube + 10}" rx="5" fill="url(#thermo-g)" opacity=".16"/>
      <rect x="${X - 5}" y="${y0}" width="10" height="${hTube + 10}" rx="5" fill="${coul}" clip-path="url(#thermo-c)"/>
      <circle cx="${X}" cy="130" r="13" fill="${coul}" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>
      <circle cx="${X - 3.8}" cy="125.5" r="3.2" fill="#fff" opacity=".45"/>
    </svg>`;
  }

  let meteo = null; // dernières données reçues

  function rendreMeteo() {
    const m = meteo; if (!m) return;
    const a = decode(m.code), d = decode(m.demain.code);
    $("tuile-meteo").innerHTML = `
      <div class="tile-text">
        <div class="day-label">MÉTÉO · ${esc((CFG.meteo.ville || "").toUpperCase())}${m.apercu ? ' <span class="etat">APERÇU</span>' : ""}</div>
        <div class="meteo-now">${icone(a.icone, "m-ico")}<div><div class="m-temp">${deg(m.temp)}</div><div class="m-texte">${a.texte} · ${deg(m.max)} / ${deg(m.min)}</div></div></div>
        ${tenueHTML(niveauTenue(m.max, m.min), "mini")}
        <div class="voir">Voir demain <span aria-hidden="true">→</span></div>
      </div>
      ${thermometre(m.temp)}`;
    rendreFenetre();
  }

  const MOMENTS = [["Matin", 8], ["Midi", 12], ["Après-midi", 15], ["Soir", 18]];
  function rendreFenetreMeteo() {
    const m = meteo; if (!m) return;
    const { date } = maintenant();
    const dd = C.plusJours(date, 1), dm = m.demain, d = decode(dm.code), a = decode(m.code);
    $("fenetre-boite").className = "fenetre-boite c-meteo";
    $("fenetre-contenu").innerHTML = `
      <div class="day-top">
        <div>
          <div class="day-label">MÉTÉO DE DEMAIN · ${esc((CFG.meteo.ville || "").toUpperCase())}${m.apercu ? ' <span class="etat">APERÇU</span>' : ""}</div>
          <h2 class="fen-titre" id="fenetre-titre">${jourSemaine(dd)} <span class="day-sub">${dateCourte(dd)}</span></h2>
        </div>
      </div>
      <div class="mf-hero">
        ${icone(d.icone, "mf-ico")}
        <div>
          <div class="mf-temp">${deg(dm.max)}<span> / ${deg(dm.min)}</span></div>
          <div class="mf-texte">${d.texte}</div>
        </div>
      </div>
      <div class="mf-stats">
        <div><span>Pluie ou neige</span><b>${dm.precip == null ? "—" : dm.precip + " %"}</b></div>
        <div><span>Vent max</span><b>${dm.vent == null ? "—" : Math.round(dm.vent) + " km/h"}</b></div>
        <div><span>Coucher du soleil</span><b>${dm.coucher || "—"}</b></div>
      </div>
      <div class="mf-moments-titre">AU FIL DE LA JOURNÉE</div>
      <div class="mf-moments">${MOMENTS.map(([nom, h], i) => {
        const x = dm.heures[i]; if (!x) return "";
        const dx = decode(x.code);
        return `<div class="mf-moment"><span class="mm-nom">${nom}</span><span class="mm-h">${h}h</span>${icone(dx.icone, "mm-ico")}<b>${deg(x.temp)}</b>${x.precip != null ? `<small>${x.precip} %</small>` : ""}</div>`;
      }).join("")}</div>
      <div class="mf-moments-titre">QUOI PORTER DEMAIN</div>
      ${tenueHTML(niveauTenue(dm.max, dm.min), "grands")}
      <div class="mf-conseil"><span aria-hidden="true">✦</span> ${conseil(dm.min, dm.code)}</div>
      <div class="mf-auj">Aujourd'hui : ${deg(m.temp)} maintenant, ${a.texte.toLowerCase()} · ${deg(m.max)} / ${deg(m.min)}</div>`;
  }

  async function chargerMeteo() {
    const M = CFG.meteo; if (!M) return;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${M.lat}&longitude=${M.lon}` +
      `&current=temperature_2m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset` +
      `&hourly=temperature_2m,weather_code,precipitation_probability` +
      `&timezone=America%2FToronto&forecast_days=2`;
    const hhmm = iso => iso ? iso.slice(11, 16).replace(":", "h") : null;
    try {
      const r = await fetch(url); if (!r.ok) throw 0;
      const j = await r.json(), dl = j.daily, hr = j.hourly;
      const jour2 = dl.time[1];
      const heures = MOMENTS.map(([, h]) => {
        const i = hr.time.indexOf(jour2 + "T" + String(h).padStart(2, "0") + ":00");
        return i < 0 ? null : { temp: hr.temperature_2m[i], code: hr.weather_code[i], precip: hr.precipitation_probability[i] };
      });
      meteo = {
        apercu: false, temp: j.current.temperature_2m, code: j.current.weather_code,
        max: dl.temperature_2m_max[0], min: dl.temperature_2m_min[0],
        demain: {
          code: dl.weather_code[1], max: dl.temperature_2m_max[1], min: dl.temperature_2m_min[1],
          precip: dl.precipitation_probability_max[1], vent: dl.wind_speed_10m_max[1],
          lever: hhmm(dl.sunrise[1]), coucher: hhmm(dl.sunset[1]), heures
        }
      };
    } catch (e) {
      // Pas de réseau (ex. dans l'aperçu) : on montre un aperçu fixe.
      meteo = {
        apercu: true, temp: 6, code: 3, max: 6, min: -2,
        demain: {
          code: 3, max: 5, min: -1, precip: 10, vent: 15, lever: "6h45", coucher: "16h26",
          heures: [{ temp: -1, code: 3, precip: 5 }, { temp: 3, code: 3, precip: 10 }, { temp: 5, code: 2, precip: 10 }, { temp: 2, code: 3, precip: 5 }]
        }
      };
    }
    rendreMeteo();
  }

  /* ── Les jeux ── */
  function rendreJeux() {
    $("game-grid").innerHTML = JEUX.map((j, i) => `
      <a class="game-card ${esc(j.theme || "space")}" href="${esc(j.lien)}" target="_blank" rel="noopener" aria-label="Jouer à ${esc(j.nom)}">
        <div class="game-art">
          <span class="game-index">${String(i + 1).padStart(2, "0")} / ${esc(j.categorie || "JEU")}</span>
          <div class="game-image"><img src="${esc(j.icone)}" alt="" width="207" height="207"></div>
        </div>
        <div class="game-bottom">
          <div><span class="game-type">${esc(j.sousTitre || "")}</span><h3>${esc(j.nom)}</h3></div>
          <span class="play-circle" aria-hidden="true">↗</span>
        </div>
      </a>`).join("");
    $("count-pill").innerHTML = `<span class="count-spark">✦</span> ${JEUX.length} UNIVERS À EXPLORER`;
  }

  /* ── Événements ── */
  for (const [id, q] of [["tuile-aujourdhui", "auj"], ["tuile-demain", "demain"], ["tuile-meteo", "meteo"]]) {
    const t = $(id);
    t.addEventListener("click", () => ouvrir(q));
    t.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrir(q); } });
  }
  $("fermer").addEventListener("click", fermer);
  $("fenetre").addEventListener("click", e => { if (e.target.id === "fenetre") fermer(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && quelle) fermer(); });

  $("verrouiller").addEventListener("click", () => { ecrire(null); H = null; cycle = null; $("verrouiller").hidden = true; rendreHoraire(); });

  rendreJeux();
  rendreHoraire();
  const memo = lire();
  if (memo) deverrouiller(memo, false).catch(() => ecrire(null)); // code changé : on le redemande
  chargerMeteo();
  setInterval(rendreHoraire, 60 * 1000);
  setInterval(chargerMeteo, 30 * 60 * 1000);
})();

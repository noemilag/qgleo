/* Calcul du jour du cycle (1 à 6) pour n'importe quelle date. Rien à modifier ici. */
(function (racine) {
  const pad = n => String(n).padStart(2, "0");
  const cle = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const versDate = s => { const [a, m, j] = s.split("-").map(Number); return new Date(a, m - 1, j, 12); };
  const plusJours = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  function creer(H) {
    // Déplie les plages "début..fin" en dates simples.
    const sans = {};
    for (const [k, raison] of Object.entries(H.sansEcole || {})) {
      if (k.includes("..")) {
        const [a, b] = k.split("..").map(versDate);
        for (let d = a; d <= b; d = plusJours(d, 1)) sans[cle(d)] = raison;
      } else sans[k] = raison;
    }
    const debut = versDate(H.premierJour), fin = versDate(H.dernierJour);
    const N = H.nbJoursCycle || 6, forcer = H.forcerJour || {};

    // Table complète de l'année : date → numéro du jour.
    const table = {};
    let n = 0;
    for (let d = new Date(debut); d <= fin; d = plusJours(d, 1)) {
      const k = cle(d), wd = d.getDay();
      if (wd === 0 || wd === 6 || sans[k]) continue;
      n = forcer[k] ? forcer[k] : (n % N) + 1;
      table[k] = n;
    }

    /* Infos sur une date : { ecole: true, jour: 2 } ou { ecole: false, raison: "…" } */
    function info(d) {
      const k = cle(d), wd = d.getDay();
      if (table[k]) return { ecole: true, jour: table[k], cle: k };
      let raison;
      if (d < debut) raison = "Vacances d'été";
      else if (d > fin) raison = "Vacances d'été";
      else if (wd === 0 || wd === 6) raison = "Fin de semaine";
      else raison = sans[k] || "Pas d'école";
      return { ecole: false, raison, cle: k };
    }

    /* Prochain jour d'école strictement après d (sur 120 jours au plus). */
    function prochain(d) {
      for (let i = 1; i <= 120; i++) {
        const x = plusJours(d, i), r = info(x);
        if (r.ecole) return { date: x, ...r };
      }
      return null;
    }
    return { info, prochain, table };
  }

  const api = { creer, cle, versDate, plusJours };
  if (typeof module !== "undefined") module.exports = api; else racine.QG_CYCLE = api;
})(typeof window !== "undefined" ? window : globalThis);

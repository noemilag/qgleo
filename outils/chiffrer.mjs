#!/usr/bin/env node
/* Chiffre l'horaire privé pour le déposer sur GitHub sans qu'il soit lisible.
   Chiffrer   : node outils/chiffrer.mjs "mot de passe"
                (lit horaire.source.js, écrit horaire.chiffre.js)
   Déchiffrer : node outils/chiffrer.mjs "mot de passe" --dechiffrer
                (lit horaire.chiffre.js, recrée horaire.source.js)
   AES-GCM 256 bits, clé dérivée du mot de passe (PBKDF2-SHA-256, 250 000 tours). */
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
const { subtle } = globalThis.crypto;
const ITER = 250000;
const [mdp, mode] = process.argv.slice(2);
if (!mdp) { console.error('Utilisation : node outils/chiffrer.mjs "mot de passe" [--dechiffrer]'); process.exit(1); }
const b64 = u8 => Buffer.from(u8).toString("base64");
const deB64 = s => new Uint8Array(Buffer.from(s, "base64"));
async function cle(sel) {
  const base = await subtle.importKey("raw", new TextEncoder().encode(mdp), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey({ name: "PBKDF2", salt: sel, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
if (mode === "--dechiffrer") {
  const ctx = { window: {} }; vm.runInNewContext(readFileSync("horaire.chiffre.js", "utf8"), ctx);
  const c = ctx.window.QG_HORAIRE_CHIFFRE;
  const brut = await subtle.decrypt({ name: "AES-GCM", iv: deB64(c.iv) }, await cle(deB64(c.sel)), deB64(c.donnees));
  writeFileSync("horaire.source.js", "window.QG_HORAIRE = " + JSON.stringify(JSON.parse(new TextDecoder().decode(brut)), null, 2) + ";\n");
  console.log("horaire.source.js recréé.");
} else {
  const ctx = { window: {} }; vm.runInNewContext(readFileSync("horaire.source.js", "utf8"), ctx);
  const sel = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const brut = new TextEncoder().encode(JSON.stringify(ctx.window.QG_HORAIRE));
  const chiffre = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, await cle(sel), brut));
  writeFileSync("horaire.chiffre.js", "/* Horaire chiffré : illisible sans le mot de passe. Voir outils/chiffrer.mjs. */\nwindow.QG_HORAIRE_CHIFFRE = " +
    JSON.stringify({ v: 1, iter: ITER, sel: b64(sel), iv: b64(iv), donnees: b64(chiffre) }) + ";\n");
  console.log("horaire.chiffre.js écrit (" + chiffre.length + " octets).");
}

# Le Quartier général de Léo

Le QG de Léo : ses jeux, la météo du jour et sa journée d'école (aujourd'hui et le prochain jour).

Site : https://noemilag.github.io/qgleo/

## Ce qui est privé

L'horaire (cours, congés, activités) est **chiffré** dans `horaire.chiffre.js` : sans le code secret, c'est illisible, même en lisant le code du dépôt. Sur chaque appareil, on entre le code une fois et il est retenu. Le bouton « Verrouiller l'horaire », en bas de la page, l'oublie (pratique sur un appareil partagé).

Les jeux et la météo restent accessibles sans code. La page demande aux moteurs de recherche de ne pas l'indexer.

`horaire.source.js` (la version lisible) n'est **jamais** déposé sur GitHub (voir `.gitignore`).

## Les fichiers

| Fichier | À quoi il sert |
| --- | --- |
| `jeux.js` | La liste des jeux (nom, icône, lien, couleur) |
| `config.js` | La ville pour la météo |
| `horaire.chiffre.js` | L'horaire, chiffré |
| `outils/chiffrer.mjs` | Chiffre et déchiffre l'horaire |
| `cycle.js` | Calcule le Jour 1 à 6 de chaque date |
| `app.js` | L'affichage |
| `styles.css` | Le look |
| `assets/`, `images/`, `icones/` | Icônes des jeux, bannière, logo, icônes de l'app |

## Modifier l'horaire

Il faut Node.js (version 20 ou plus).

```sh
node outils/chiffrer.mjs "le code secret" --dechiffrer   # recrée horaire.source.js
# … modifier horaire.source.js …
node outils/chiffrer.mjs "le code secret"                # réécrit horaire.chiffre.js
```

Puis déposer seulement `horaire.chiffre.js`.

- **Tempête ou fermeture** : ajouter la date dans `sansEcole`. Le cycle se décale tout seul.
- **Journée de réserve utilisée** : enlever la date de `sansEcole`.
- **L'école annonce un autre numéro** : l'ajouter dans `forcerJour`, ex. `"2027-01-18": 3`.
- **Changer le code secret** : déchiffrer avec l'ancien, rechiffrer avec le nouveau. Les appareils redemanderont le code.

## Tester une autre date

Ajouter à l'adresse : `?date=2026-11-16&heure=10:20`

## Ajouter un jeu

Déposer son icône dans `assets/`, puis copier un bloc dans `jeux.js`.

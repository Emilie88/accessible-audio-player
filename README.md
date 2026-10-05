# AudioVerse

AudioVerse est une application web de podcasts et d’écoute audio. Elle associe un lecteur accessible au clavier à une API Node.js qui conserve la bibliothèque, les favoris et les fichiers audio ajoutés sur la machine qui héberge le serveur. C’est une bibliothèque locale à un seul utilisateur : il n’y a ni compte ni authentification.

## Fonctionnalités

- Lecture, pause, recherche dans la piste, saut de 10 secondes, volume et raccourcis clavier.
- Catalogue de démonstration chargé depuis l’API.
- Recherche par titre ou artiste, et filtre des favoris.
- Ajout et suppression de fichiers audio personnels (50 Mo maximum).
- Favoris et bibliothèque conservés après redémarrage.
- Interface adaptée au mobile, avec libellés accessibles et retours d’erreur visibles.

Formats acceptés pour l’ajout : MP3, WAV, OGG, FLAC, AAC, M4A et WEBM.

## Prérequis

- Node.js 20 ou ultérieur
- npm

## Installation et démarrage

```bash
npm install
npm run dev
```

Une seule commande démarre à la fois l’interface et l’API. Ouvrir l’adresse affichée dans le terminal (par défaut `http://127.0.0.1:5173`). Les ports peuvent être modifiés avec les variables `VITE_PORT` et `API_PORT`.

Pour lancer la version de production :

```bash
npm run build
npm start
```

L’application compilée et l’API sont alors servies ensemble sur `http://localhost:3000`. Le port peut être modifié avec la variable d’environnement `PORT`.

## Stockage

Au premier lancement de l’API, AudioVerse crée le dossier `data/` à la racine du projet :

- `data/tracks.json` contient le catalogue et l’état des favoris.
- `data/uploads/` contient les fichiers audio importés.

Ce dossier est ignoré par Git. Pour sauvegarder la bibliothèque, sauvegarder `data/`. Pour la réinitialiser, arrêter le serveur puis supprimer ce dossier.

Le serveur écoute uniquement sur la machine locale par défaut. Pour un usage sur un réseau ou un déploiement, configurez un stockage persistant et ajoutez une authentification et des protections d’accès avant de l’exposer à d’autres personnes.

Le catalogue de démonstration utilise des fichiers audio distants SoundHelix ; leur disponibilité dépend de ce service. Les fichiers importés, eux, sont lus depuis le serveur AudioVerse.

## API

| Méthode | Route | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Vérifier que le serveur répond. |
| `GET` | `/api/tracks` | Obtenir la bibliothèque. Le paramètre `q` filtre par titre ou artiste. |
| `POST` | `/api/tracks?title=…&artist=…` | Importer un fichier audio brut avec son type MIME. |
| `PATCH` | `/api/tracks/:id/favorite` | Inverser l’état favori d’une piste. |
| `DELETE` | `/api/tracks/:id` | Supprimer une piste ; les fichiers importés sont aussi effacés. |
| `GET` | `/audio/:filename` | Lire un fichier importé, y compris les requêtes HTTP Range. |

L’ajout requiert un type MIME audio accepté. Le serveur valide le titre, l’artiste et la taille du fichier (50 Mo maximum).

## Vérification

```bash
npm test
npm run lint
npm run build
```

Les tests vérifient l’interface et les routes de l’API, notamment l’import, la lecture par plages d’octets, les favoris et la suppression.

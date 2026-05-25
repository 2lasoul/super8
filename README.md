# Archives familiales Super 8

Application web pour partager et annoter des films de famille numérisés (Super 8 → MP4).

## Stack

- **Next.js 14** (App Router, TypeScript)
- **MySQL 8** via Docker
- **Nginx** pour servir les fichiers vidéo
- **Docker Compose** pour l'orchestration

---

## Installation

### 1. Cloner le repo

```bash
git clone <url-du-repo>
cd super8
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
```

Éditer `.env` et renseigner :
- `DB_PASSWORD` — mot de passe MySQL
- `DB_ROOT_PASSWORD` — mot de passe root MySQL
- `ADMIN_PASSWORD` — mot de passe de l'interface `/admin`
- `JWT_SECRET` — générer avec `openssl rand -hex 32`

### 3. Lancer

```bash
docker compose up --build -d
```

L'app démarre sur **http://localhost:3000**

---

## URLs

| Page | URL |
|------|-----|
| Frise chronologique | http://localhost:3000 |
| Login admin | http://localhost:3000/admin/login |
| Administration films | http://localhost:3000/admin |
| Référentiel (branches/personnes/lieux…) | http://localhost:3000/admin/referentiel |

---

## Ajouter des vidéos

Déposer les fichiers MP4 dans `public/videos/` :

```
public/
└── videos/
    ├── vacances-1972.mp4
    └── noel-1974.mp4
```

URL à saisir dans l'admin : `/videos/vacances-1972.mp4`

> **Important** : les MP4 doivent avoir le moov atom en début de fichier pour que le seek fonctionne.
> Convertir si nécessaire : `ffmpeg -i input.mp4 -movflags faststart -c copy output.mp4`

### Obtenir la durée en secondes

```bash
ffprobe -v quiet -show_entries format=duration -of csv=p=0 mon-film.mp4
```

Ou utiliser le bouton **⏱ Auto** dans l'interface admin (charge les métadonnées via l'URL).

---

## Commandes Docker utiles

```bash
# Lancer en arrière-plan
docker compose up -d

# Arrêter
docker compose down

# Rebuild après modification du code
docker compose up --build -d

# Voir les logs
docker compose logs -f app

# Accéder à MySQL
docker compose exec db mysql -u super8 -p super8

# Réinitialiser la BDD (supprime toutes les données)
docker compose down -v
docker compose up --build -d
```

---

## Structure du projet

```
super8/
├── public/
│   └── videos/          ← Déposer les MP4 ici
├── sql/
│   ├── migration.sql    ← Schéma BDD (exécuté automatiquement au premier démarrage)
│   └── add_referentiel.sql  ← Migration pour bases existantes
├── src/
│   ├── app/
│   │   ├── page.tsx                    ← Frise chronologique
│   │   ├── film/[id]/page.tsx          ← Lecteur public
│   │   ├── admin/
│   │   │   ├── page.tsx                ← Liste films
│   │   │   ├── login/page.tsx          ← Authentification
│   │   │   ├── film/[id]/page.tsx      ← Éditeur de segments
│   │   │   └── referentiel/page.tsx    ← Gestion des tags
│   │   └── api/                        ← Routes API REST
│   └── lib/
│       ├── db.ts           ← Pool MySQL
│       ├── auth.ts         ← Sessions JWT
│       ├── types.ts        ← Types TypeScript + utilitaires
│       └── referentiel.tsx ← Hook + composant TagInput
├── .env.example         ← Modèle de configuration (committer)
├── .env                 ← Configuration locale (NE PAS committer)
├── docker-compose.yml
├── Dockerfile
└── nginx-videos.conf
```

---

## Workflow d'annotation

1. Aller dans `/admin/referentiel` → créer les branches, personnes, événements, lieux
2. Aller dans `/admin` → ajouter un film (URL + durée)
3. Cliquer sur le film → éditeur de segments
4. Regarder la vidéo, cliquer **⏱ Ici** pour capturer les timecodes début/fin
5. Renseigner les tags via l'autocomplétion
6. Répéter jusqu'à 100% de couverture

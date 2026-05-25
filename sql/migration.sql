-- Base de données : super8
-- Créer la base si elle n'existe pas encore
CREATE DATABASE IF NOT EXISTS super8 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE super8;

-- Films
CREATE TABLE IF NOT EXISTS films (
  id          VARCHAR(120) NOT NULL PRIMARY KEY,
  titre       VARCHAR(255) NOT NULL,
  fichier_url VARCHAR(1000) NOT NULL,
  duree       INT NOT NULL DEFAULT 0,   -- durée en secondes
  annee       SMALLINT,
  annee_fin   SMALLINT,
  date_label  VARCHAR(100),             -- ex : "Été 1972"
  description TEXT,
  branches    JSON,                     -- ex : ["martin","commun"]
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Segments (timecodes annotés)
CREATE TABLE IF NOT EXISTS segments (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  film_id     VARCHAR(120) NOT NULL,
  tc_debut    INT NOT NULL,             -- secondes
  tc_fin      INT NOT NULL,             -- secondes
  titre       VARCHAR(255),
  personnes   JSON,                     -- ex : ["Mamie","Papie"]
  evenements  JSON,                     -- ex : ["Vacances","Plage"]
  lieux       JSON,                     -- ex : ["Arcachon"]
  date_label  VARCHAR(100),
  branches    JSON,
  note        TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE,
  INDEX idx_film (film_id),
  CONSTRAINT chk_tc CHECK (tc_debut >= 0 AND tc_fin > tc_debut)
);


-- Aucune donnée de démonstration — ajouter vos films via /admin

-- Référentiel (bibliothèque de tags)
CREATE TABLE IF NOT EXISTS referentiel (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  categorie  ENUM('branche','personne','evenement','lieu') NOT NULL,
  valeur     VARCHAR(255) NOT NULL,
  couleur    VARCHAR(7),     -- ex : #AFA9EC (optionnel, pour les branches)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cat_val (categorie, valeur)
);

-- Script de migration pour bases existantes
-- (sans effet si la table vient d'être créée)

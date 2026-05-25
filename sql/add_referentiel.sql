-- Script à exécuter si vous avez déjà une base super8 existante
-- et souhaitez ajouter la table référentiel sans tout recréer.

USE super8;

CREATE TABLE IF NOT EXISTS referentiel (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  categorie  ENUM('branche','personne','evenement','lieu') NOT NULL,
  valeur     VARCHAR(255) NOT NULL,
  couleur    VARCHAR(7),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cat_val (categorie, valeur)
);

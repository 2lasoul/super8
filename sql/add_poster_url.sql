-- Migration pour bases existantes
USE super8;
ALTER TABLE films ADD COLUMN IF NOT EXISTS poster_url VARCHAR(1000) DEFAULT NULL;

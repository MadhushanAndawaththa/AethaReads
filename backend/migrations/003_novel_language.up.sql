ALTER TABLE novels
ADD COLUMN IF NOT EXISTS language VARCHAR(20) NOT NULL DEFAULT 'en';

UPDATE novels
SET language = 'en'
WHERE language IS NULL OR TRIM(language) = '';

CREATE INDEX IF NOT EXISTS idx_novels_language ON novels(language);
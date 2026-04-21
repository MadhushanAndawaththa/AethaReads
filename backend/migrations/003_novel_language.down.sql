DROP INDEX IF EXISTS idx_novels_language;

ALTER TABLE novels
DROP COLUMN IF EXISTS language;
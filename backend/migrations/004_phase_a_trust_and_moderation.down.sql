DROP INDEX IF EXISTS idx_reviews_hidden;
DROP INDEX IF EXISTS idx_comments_hidden;
DROP INDEX IF EXISTS idx_audit_logs_action_created_at;
DROP INDEX IF EXISTS idx_audit_logs_actor_created_at;
DROP INDEX IF EXISTS idx_email_verification_tokens_expires_at;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS email_verification_tokens;

ALTER TABLE reviews DROP COLUMN IF EXISTS hidden_reason;
ALTER TABLE reviews DROP COLUMN IF EXISTS hidden;

ALTER TABLE comments DROP COLUMN IF EXISTS hidden_reason;
ALTER TABLE comments DROP COLUMN IF EXISTS hidden;

ALTER TABLE users DROP COLUMN IF EXISTS suspension_reason;
ALTER TABLE users DROP COLUMN IF EXISTS suspended_at;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
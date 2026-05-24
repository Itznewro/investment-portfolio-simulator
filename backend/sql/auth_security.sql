BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
  ADD COLUMN IF NOT EXISTS mfa_pending_secret TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE users
SET email_verified = TRUE,
    email_verified_at = COALESCE(email_verified_at, NOW()),
    updated_at = NOW()
WHERE email_verified = FALSE
  AND password_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS otp_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('register', 'login', 'reset_password')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE otp_codes
  DROP CONSTRAINT IF EXISTS otp_codes_purpose_check;

ALTER TABLE otp_codes
  ADD CONSTRAINT otp_codes_purpose_check
  CHECK (purpose IN ('register', 'login', 'reset_password'));

CREATE INDEX IF NOT EXISTS idx_users_email_lower
  ON users (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_otp_codes_active_lookup
  ON otp_codes (user_id, purpose, expires_at DESC)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_otp_codes_email_purpose
  ON otp_codes (LOWER(email), purpose, created_at DESC);

COMMIT;

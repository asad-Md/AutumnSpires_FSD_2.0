-- Add columns for End-to-End Encryption (E2EE) keys
-- These columns store the user's public identity key and their encrypted private key backup.
-- Run this in Supabase SQL Editor

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "public_key" text,
ADD COLUMN IF NOT EXISTS "encrypted_private_key" text,
ADD COLUMN IF NOT EXISTS "key_salt" text,
ADD COLUMN IF NOT EXISTS "key_iv" text;

-- Add comments to explain usage
COMMENT ON COLUMN "User"."public_key" IS 'Base64 encoded ECDH P-256 Public Key for E2EE';
COMMENT ON COLUMN "User"."encrypted_private_key" IS 'Private Key encrypted with user recovery password (AES-GCM)';
COMMENT ON COLUMN "User"."key_salt" IS 'Salt used for PBKDF2 key derivation when encrypting private key';
COMMENT ON COLUMN "User"."key_iv" IS 'Initialization Vector used for AES-GCM encryption of private key';

-- The existing RLS policy (user_select_policy) already allows authenticated users 
-- to read all users' public data including public_key, which is needed for E2EE.
-- No additional RLS changes needed since fix_permissions.sql has:
-- using ( auth.role() = 'authenticated' );

-- Users can only UPDATE their own E2EE keys
CREATE POLICY "user_update_e2ee_policy"
  ON public."User"
  FOR UPDATE
  USING ("id" = auth.uid()::text)
  WITH CHECK ("id" = auth.uid()::text);

-- Existing digests remain authoritative; historical one-way codes remain valid.
ALTER TABLE classroom_codes ADD COLUMN code_envelope text;
ALTER TABLE classroom_codes ADD CONSTRAINT classroom_code_envelope_length
  CHECK (code_envelope IS NULL OR length(code_envelope) BETWEEN 40 AND 512);

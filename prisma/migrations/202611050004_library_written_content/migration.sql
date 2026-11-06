ALTER TABLE materials ADD COLUMN body text,
  ADD COLUMN resource_use text NOT NULL DEFAULT 'STUDY',
  ADD COLUMN content_kind text NOT NULL DEFAULT 'FILE';
ALTER TABLE materials ADD CONSTRAINT material_body_length CHECK (body IS NULL OR char_length(body) <= 20000),
  ADD CONSTRAINT material_resource_use CHECK (resource_use IN ('STUDY','RECOMMENDED','COMPLEMENTARY')),
  ADD CONSTRAINT material_content_kind CHECK (content_kind IN ('TEXT','FILE'));

BEGIN;
ALTER TABLE files DROP CONSTRAINT file_extension_check,
  ADD CONSTRAINT file_extension_check CHECK (extension IN ('pdf','doc','docx','ppt','pptx','xlsx','jpg','jpeg','png','zip'));
ALTER TABLE chat_attachments DROP CONSTRAINT chat_attachments_extension_check,
  ADD CONSTRAINT chat_attachments_extension_check CHECK (extension IN ('pdf','doc','docx','ppt','pptx'));
COMMIT;

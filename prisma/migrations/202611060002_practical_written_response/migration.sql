ALTER TABLE attempts ADD COLUMN practical_response TEXT NOT NULL DEFAULT '';
ALTER TABLE attempts ADD CONSTRAINT attempts_practical_response_length CHECK (char_length(practical_response) <= 5000);

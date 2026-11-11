CREATE TABLE classroom_invitation_batches (
    classroom_id uuid NOT NULL,
    request_id uuid NOT NULL,
    created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    receipt_envelope text NOT NULL,
    CONSTRAINT classroom_invitation_batches_pkey PRIMARY KEY (classroom_id, request_id),
    CONSTRAINT classroom_invitation_batches_classroom_id_fkey FOREIGN KEY (classroom_id)
        REFERENCES classrooms(id) ON DELETE RESTRICT ON UPDATE NO ACTION
);

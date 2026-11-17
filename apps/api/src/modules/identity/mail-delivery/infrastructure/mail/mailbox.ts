import validator from "validator";
import { MailError } from "./mail-error.ts";

/** Validate one bare delivery mailbox; never derive or rewrite an account identity. */
export function validateMailbox(input: unknown): string {
  // Inspect before trimming so surrounding CR/LF/TAB cannot hide header injection.
  if (typeof input !== "string" || /[\u0000-\u001f\u007f-\u009f\uD800-\uDFFF]/u.test(input)) {
    throw new MailError("MAIL_INPUT_INVALID");
  }
  const mailbox = input.trim();
  // The final @ separates the domain even when a quoted local part contains @.
  // Enforce user policy before any validator/transport IDNA or case conversion.
  const domain = mailbox.slice(mailbox.lastIndexOf("@") + 1);
  if (domain !== domain.toLowerCase() || !validator.isEmail(mailbox, {
    allow_display_name: false,
    require_display_name: false,
    allow_utf8_local_part: true,
    allow_ip_domain: false,
    require_tld: true,
    allow_underscores: false,
    ignore_max_length: false,
    domain_specific_validation: false,
  })) {
    throw new MailError("MAIL_INPUT_INVALID");
  }
  return mailbox;
}

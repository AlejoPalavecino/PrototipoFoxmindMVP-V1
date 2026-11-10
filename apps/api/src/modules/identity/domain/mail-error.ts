export class MailError extends Error {
  constructor(readonly code: "MAIL_CONFIGURATION_INVALID" | "MAIL_INPUT_INVALID" | "MAIL_DELIVERY_UNAVAILABLE") {
    super(code);
    this.name = "MailError";
  }
}

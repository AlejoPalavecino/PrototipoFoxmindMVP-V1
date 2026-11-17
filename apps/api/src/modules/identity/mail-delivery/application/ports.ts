/** Delivery contract; acceptance is not proof of recipient delivery. */
export interface AccountMailInput { readonly to: string; readonly token: string }
export interface MailAcceptance { readonly status: 'accepted' }
export interface AccountMailSender {
  sendVerification(input: AccountMailInput): Promise<MailAcceptance>;
  sendRecovery(input: AccountMailInput): Promise<MailAcceptance>;
}

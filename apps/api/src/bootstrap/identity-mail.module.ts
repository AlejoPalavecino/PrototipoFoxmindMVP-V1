import { Module, Inject, Injectable, type DynamicModule, type OnModuleDestroy } from "@nestjs/common";
import { AccountMailService as AccountMailAdapter } from "../modules/identity/mail-delivery/infrastructure/mail/account-mail.service.ts";
import { MAIL_CONFIGURATION, validateMailConfiguration, type MailConfiguration } from "../modules/identity/mail-delivery/infrastructure/mail/configuration.ts";

/** Nest lifecycle belongs to the host; the SMTP adapter owns only delivery and close. */
@Injectable()
export class AccountMailService extends AccountMailAdapter implements OnModuleDestroy {
  constructor(@Inject(MAIL_CONFIGURATION) configuration: MailConfiguration) { super(configuration); }
  onModuleDestroy(): Promise<void> { return this.close(); }
}

@Module({})
export class MailModule {
  static register(configuration: MailConfiguration): DynamicModule {
    const validated = validateMailConfiguration(configuration);
    return {
      module: MailModule,
      providers: [{ provide: MAIL_CONFIGURATION, useValue: validated }, AccountMailService],
      exports: [AccountMailService],
    };
  }
}

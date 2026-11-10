import { Module, type DynamicModule } from "@nestjs/common";
import { AccountMailService } from "../modules/identity/infrastructure/mail/account-mail.service.ts";
import { MAIL_CONFIGURATION, validateMailConfiguration, type MailConfiguration } from "../modules/identity/infrastructure/mail/configuration.ts";

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

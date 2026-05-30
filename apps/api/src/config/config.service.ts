import { Injectable } from "@nestjs/common";
import { AppConfig, getAppConfig } from "./app.config";

@Injectable()
export class ConfigService {
  private readonly config: AppConfig = getAppConfig();

  get nodeEnv(): AppConfig["nodeEnv"] {
    return this.config.nodeEnv;
  }

  get port(): number {
    return this.config.port;
  }

  get apiPrefix(): string {
    return this.config.apiPrefix;
  }

  get corsOrigins(): string[] {
    return this.config.corsOrigins;
  }

  get databaseUrl(): string | undefined {
    return this.config.databaseUrl;
  }
}

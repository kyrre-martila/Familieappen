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

  get databaseUrl(): string {
    return this.config.databaseUrl;
  }

  get authJwtSecret(): string {
    return this.config.authJwtSecret;
  }

  get adminSessionSecret(): string {
    return this.config.adminSessionSecret;
  }

  get adminSessionTtlSeconds(): number {
    return this.config.adminSessionTtlSeconds;
  }

  get adminCookieDomain(): string | undefined {
    return this.config.adminCookieDomain;
  }
}

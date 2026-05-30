import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { ConfigService } from "../config";

interface PrismaClientConnection {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $queryRaw<T = unknown>(query: TemplateStringsArray): Promise<T>;
}

type PrismaClientConstructor = new (options: {
  adapter: PrismaPg;
}) => PrismaClientConnection;

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private clientInstance?: PrismaClientConnection;

  constructor(private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.databaseUrl);
  }

  get client(): PrismaClientConnection {
    return this.getClient();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.clientInstance) {
      await this.clientInstance.$disconnect();
    }
  }

  async checkConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private getClient(): PrismaClientConnection {
    if (!this.clientInstance) {
      this.clientInstance = this.createClient();
    }

    return this.clientInstance;
  }

  private createClient(): PrismaClientConnection {
    const { PrismaClient } = require("@prisma/client") as {
      PrismaClient: PrismaClientConstructor;
    };
    const adapter = new PrismaPg({ connectionString: this.config.databaseUrl });

    return new PrismaClient({ adapter });
  }
}

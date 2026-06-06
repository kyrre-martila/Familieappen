import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { ConfigService } from "../config";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaDelegate = {
  findUnique(args: Record<string, unknown>): Promise<any>;
  findFirst(args: Record<string, unknown>): Promise<any>;
  findMany(args: Record<string, unknown>): Promise<any[]>;
  create(args: Record<string, unknown>): Promise<any>;
  delete(args: Record<string, unknown>): Promise<any>;
  deleteMany(args: Record<string, unknown>): Promise<any>;
  update(args: Record<string, unknown>): Promise<any>;
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  count(args: Record<string, unknown>): Promise<number>;
};

interface UserDelegate extends PrismaDelegate {
  findUnique(args: Record<string, unknown>): Promise<UserRecord | null>;
  create(args: Record<string, unknown>): Promise<UserRecord>;
}

interface PrismaClientConnection {
  user: UserDelegate;
  family: PrismaDelegate;
  familyMember: PrismaDelegate;
  shoppingList: PrismaDelegate;
  shoppingListItem: PrismaDelegate;
  mealPlan: PrismaDelegate;
  mealPlanDay: PrismaDelegate & {
    upsert(args: Record<string, unknown>): Promise<any>;
  };
  task: PrismaDelegate;
  calendarEvent: PrismaDelegate;
  calendarEventParticipant: PrismaDelegate;
  reminder: PrismaDelegate;
  reminderAudienceMember: PrismaDelegate;
  wishlistItem: PrismaDelegate;
  wishlistShareInvitation: PrismaDelegate;
  familyInvitation: PrismaDelegate;
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $queryRaw<T = unknown>(query: TemplateStringsArray): Promise<T>;
  $transaction<T>(callback: (transaction: PrismaClientConnection) => Promise<T>): Promise<T>;
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

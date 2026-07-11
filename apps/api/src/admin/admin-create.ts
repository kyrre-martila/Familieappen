import { PrismaPg } from "@prisma/adapter-pg";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { config } from "dotenv";

type PrismaClientConnection = {
  adminUser: {
    findUnique(args: Record<string, unknown>): Promise<any>;
    create(args: Record<string, unknown>): Promise<any>;
  };
  $disconnect(): Promise<void>;
};

type PrismaClientConstructor = new (options: { adapter: PrismaPg }) => PrismaClientConnection;

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_KEY_LENGTH = 64;

export interface AdminCreateArgs {
  email?: string;
  name?: string;
  password?: string;
  role?: "SUPER_ADMIN" | "SUPPORT" | "ANALYST" | "AD_MANAGER";
}

export function parseAdminCreateArgs(argv: string[]): AdminCreateArgs {
  const parsed: AdminCreateArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [key, inlineValue] = arg.startsWith("--") ? arg.split("=", 2) : [arg, undefined];

    if (!["--email", "--name", "--password", "--role"].includes(key)) {
      throw new Error(`Unknown option: ${key}`);
    }

    const value = inlineValue ?? argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${key} requires a value`);
    }

    if (!inlineValue) {
      index += 1;
    }

    if (key === "--email") parsed.email = value;
    if (key === "--name") parsed.name = value;
    if (key === "--password") parsed.password = value;
    if (key === "--role") parsed.role = validateAdminRole(value);
  }

  return parsed;
}

export function validateAdminEmail(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("--email is required");
  }

  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("--email must be a valid email address");
  }

  return email;
}

export function validateAdminName(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("--name is required");
  }

  const name = value.trim();
  if (name.length < 1 || name.length > 100) {
    throw new Error("--name must be between 1 and 100 characters");
  }

  return name;
}

export function validateAdminRole(value: unknown): "SUPER_ADMIN" | "SUPPORT" | "ANALYST" | "AD_MANAGER" {
  if (typeof value !== "string") {
    throw new Error("--role must be one of SUPER_ADMIN, SUPPORT, ANALYST, AD_MANAGER");
  }

  if (!["SUPER_ADMIN", "SUPPORT", "ANALYST", "AD_MANAGER"].includes(value)) {
    throw new Error("--role must be one of SUPER_ADMIN, SUPPORT, ANALYST, AD_MANAGER");
  }

  return value as "SUPER_ADMIN" | "SUPPORT" | "ANALYST" | "AD_MANAGER";
}

export function validateAdminPassword(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Password is required");
  }

  if (value.length < 8 || value.length > 1024) {
    throw new Error("Password must be between 8 and 1024 characters");
  }

  return value;
}

export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;

  return `${PASSWORD_HASH_PREFIX}:${salt}:${derivedKey.toString("base64url")}`;
}

async function readPasswordFromPrompt(): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error("Password must be provided with --password or ADMIN_PASSWORD when stdin is not interactive");
  }

  const readline = createInterface({ input, output });
  try {
    return await readline.question("Admin password: ");
  } finally {
    readline.close();
  }
}

async function main(): Promise<void> {
  config();
  const args = parseAdminCreateArgs(process.argv.slice(2));
  const email = validateAdminEmail(args.email);
  const name = validateAdminName(args.name);
  const password = validateAdminPassword(args.password ?? process.env.ADMIN_PASSWORD ?? await readPasswordFromPrompt());
  const role = args.role ?? "SUPER_ADMIN";
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to create an admin user");
  }

  const { PrismaClient } = require("@prisma/client") as { PrismaClient: PrismaClientConstructor };
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const adminUserDelegate = prisma.adminUser;
    const existingAdmin = await adminUserDelegate.findUnique({ where: { email }, select: { id: true } });
    if (existingAdmin) {
      throw new Error(`Admin user already exists for ${email}`);
    }

    const admin = await adminUserDelegate.create({
      data: {
        email,
        name,
        passwordHash: await hashAdminPassword(password),
        role,
        active: true
      },
      select: { id: true, email: true, role: true }
    });

    console.log(`Created ${admin.role} admin ${admin.email} (${admin.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common";
import { ConfigService } from "./config";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix(config.apiPrefix);
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useStaticAssets("/app/uploads", { prefix: "/uploads/" });

  await app.listen(config.port);
}

void bootstrap();

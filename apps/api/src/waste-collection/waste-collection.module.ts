import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { FamiliesModule } from "../families";
import { PrismaModule } from "../prisma";
import { MinRenovasjonClient } from "./providers/min-renovasjon.client";
import { MinRenovasjonProvider } from "./providers/min-renovasjon.provider";
import { WasteCollectionController } from "./waste-collection.controller";
import { WasteCollectionCron } from "./waste-collection.cron";
import { WasteCollectionService } from "./waste-collection.service";
import { FamilyAddressController } from "./family-address.controller";
@Module({ imports: [PrismaModule, FamiliesModule, AuthModule], controllers: [WasteCollectionController, FamilyAddressController], providers: [MinRenovasjonClient, MinRenovasjonProvider, WasteCollectionService, WasteCollectionCron], exports: [WasteCollectionService] })
export class WasteCollectionModule {}

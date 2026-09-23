CREATE TABLE "family_addresses" (
  "id" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "streetName" TEXT NOT NULL,
  "houseNumber" INTEGER NOT NULL,
  "houseLetter" TEXT,
  "postalCode" TEXT NOT NULL,
  "postalPlace" TEXT NOT NULL,
  "municipalityNumber" TEXT NOT NULL,
  "municipalityName" TEXT NOT NULL,
  "addressCode" TEXT NOT NULL,
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "family_addresses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "family_addresses_familyId_key" ON "family_addresses"("familyId");

CREATE TABLE "waste_collection_subscriptions" (
  "id" TEXT NOT NULL, "familyId" TEXT NOT NULL, "addressId" TEXT NOT NULL,
  "provider" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true,
  "selectedFractionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "lastSyncStartedAt" TIMESTAMP(3), "lastSuccessfulSyncAt" TIMESTAMP(3),
  "nextSyncAt" TIMESTAMP(3), "lastSyncStatus" TEXT, "lastSyncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "waste_collection_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "waste_collection_subscriptions_familyId_key" ON "waste_collection_subscriptions"("familyId");
CREATE UNIQUE INDEX "waste_collection_subscriptions_addressId_key" ON "waste_collection_subscriptions"("addressId");
CREATE INDEX "waste_collection_subscriptions_enabled_nextSyncAt_idx" ON "waste_collection_subscriptions"("enabled", "nextSyncAt");

CREATE TABLE "waste_collection_fractions" (
  "id" TEXT NOT NULL, "subscriptionId" TEXT NOT NULL, "providerFractionId" TEXT NOT NULL,
  "name" TEXT NOT NULL, "icon" TEXT, "standardFractionId" TEXT, "standardFractionIcon" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "waste_collection_fractions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "waste_collection_fractions_subscriptionId_providerFractionId_key" ON "waste_collection_fractions"("subscriptionId", "providerFractionId");

CREATE TABLE "waste_collection_events" (
  "id" TEXT NOT NULL, "subscriptionId" TEXT NOT NULL, "fractionId" TEXT NOT NULL,
  "provider" TEXT NOT NULL, "providerFractionId" TEXT NOT NULL, "collectionDate" DATE NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "waste_collection_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "waste_collection_events_subscriptionId_providerFractionId_collectionDate_key" ON "waste_collection_events"("subscriptionId", "providerFractionId", "collectionDate");
CREATE INDEX "waste_collection_events_subscriptionId_collectionDate_idx" ON "waste_collection_events"("subscriptionId", "collectionDate");

ALTER TABLE "family_addresses" ADD CONSTRAINT "family_addresses_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waste_collection_subscriptions" ADD CONSTRAINT "waste_collection_subscriptions_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waste_collection_subscriptions" ADD CONSTRAINT "waste_collection_subscriptions_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "family_addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waste_collection_fractions" ADD CONSTRAINT "waste_collection_fractions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "waste_collection_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waste_collection_events" ADD CONSTRAINT "waste_collection_events_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "waste_collection_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waste_collection_events" ADD CONSTRAINT "waste_collection_events_fractionId_fkey" FOREIGN KEY ("fractionId") REFERENCES "waste_collection_fractions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

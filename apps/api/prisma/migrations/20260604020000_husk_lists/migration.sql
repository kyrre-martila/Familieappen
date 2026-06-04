CREATE TABLE "husk_lists" (
  "id" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "icon" TEXT NOT NULL DEFAULT 'home',
  "description" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "husk_lists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "husk_list_audience_members" (
  "id" TEXT NOT NULL,
  "listId" TEXT NOT NULL,
  "familyMemberId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "husk_list_audience_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "husk_list_items" (
  "id" TEXT NOT NULL,
  "listId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "completedAt" TIMESTAMP(3),
  "assignedFamilyMemberId" TEXT,
  "dueDate" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "husk_list_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "husk_lists_familyId_idx" ON "husk_lists"("familyId");
CREATE UNIQUE INDEX "husk_list_audience_members_listId_familyMemberId_key" ON "husk_list_audience_members"("listId", "familyMemberId");
CREATE INDEX "husk_list_audience_members_listId_idx" ON "husk_list_audience_members"("listId");
CREATE INDEX "husk_list_audience_members_familyMemberId_idx" ON "husk_list_audience_members"("familyMemberId");
CREATE INDEX "husk_list_items_listId_idx" ON "husk_list_items"("listId");
CREATE INDEX "husk_list_items_assignedFamilyMemberId_idx" ON "husk_list_items"("assignedFamilyMemberId");

ALTER TABLE "husk_lists" ADD CONSTRAINT "husk_lists_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "husk_list_audience_members" ADD CONSTRAINT "husk_list_audience_members_listId_fkey" FOREIGN KEY ("listId") REFERENCES "husk_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "husk_list_audience_members" ADD CONSTRAINT "husk_list_audience_members_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "husk_list_items" ADD CONSTRAINT "husk_list_items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "husk_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "husk_list_items" ADD CONSTRAINT "husk_list_items_assignedFamilyMemberId_fkey" FOREIGN KEY ("assignedFamilyMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

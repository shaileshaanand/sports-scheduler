-- DropForeignKey
ALTER TABLE "SportSession" DROP CONSTRAINT "SportSession_ownerId_fkey";

-- AddForeignKey
ALTER TABLE "SportSession" ADD CONSTRAINT "SportSession_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "SportSession" DROP CONSTRAINT "SportSession_sportId_fkey";

-- AddForeignKey
ALTER TABLE "SportSession" ADD CONSTRAINT "SportSession_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

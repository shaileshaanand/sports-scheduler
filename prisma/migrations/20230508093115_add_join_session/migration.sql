-- CreateTable
CREATE TABLE "_SportSessionParticipants" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_SportSessionParticipants_AB_unique" ON "_SportSessionParticipants"("A", "B");

-- CreateIndex
CREATE INDEX "_SportSessionParticipants_B_index" ON "_SportSessionParticipants"("B");

-- AddForeignKey
ALTER TABLE "_SportSessionParticipants" ADD CONSTRAINT "_SportSessionParticipants_A_fkey" FOREIGN KEY ("A") REFERENCES "SportSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SportSessionParticipants" ADD CONSTRAINT "_SportSessionParticipants_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

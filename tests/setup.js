import { PrismaClient } from "@prisma/client";
import { beforeEach } from "vitest";

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.$transaction([
    prisma.user.deleteMany(),
    prisma.sport.deleteMany(),
    prisma.sportSession.deleteMany(),
  ]);
});

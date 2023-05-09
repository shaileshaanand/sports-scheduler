import { PrismaClient } from "@prisma/client";
import { Router } from "express";

const prisma = new PrismaClient();
const adminRouter = Router();

adminRouter.get("/", async (req, res) => {
  const sports = await prisma.sport.findMany();
  res.render("admin/index.njk", { sports });
});

export default adminRouter;

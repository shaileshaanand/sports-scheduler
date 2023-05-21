import { PrismaClient } from "@prisma/client";
import { Router } from "express";

const prisma = new PrismaClient();
const adminRouter = Router();

adminRouter.get("/", async (req, res) => {
  const sports = await prisma.sport.findMany();
  res.render("admin/index.njk", { sports });
});

adminRouter.get("/reports", async (req, res) => {
  req.log.info({ startDate: req.query.startDate, endDate: req.query.endDate });
  const where = {};
  if (req.query.startDate) {
    where.startsAt = {
      gte: new Date(req.query.startDate),
    };
  }
  if (req.query.endDate) {
    where.startsAt = {
      ...where.startsAt,
      lte: new Date(req.query.endDate),
    };
  }
  const sports = await prisma.sport.findMany({
    include: {
      sessions: {
        include: {
          participants: true,
        },
        where,
      },
    },
  });
  const sessionData = sports.map((sport) => {
    return {
      sport: sport.name,
      sessions: sport.sessions.length,
    };
  });

  const participationData = sports.map((sport) => {
    return {
      sport: sport.name,
      participation: sport.sessions.reduce((acc, session) => {
        return acc + session.participants.length;
      }, 0),
    };
  });

  res.render("admin/reports.njk", {
    currentPage: "reports",
    user: req.user,
    sessionData: JSON.stringify(sessionData),
    participationData: JSON.stringify(participationData),
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });
});

export default adminRouter;

import { Router } from "express";
import { z } from "zod";

import prisma from "../lib/prisma.js";

const adminRouter = Router();

adminRouter.get("/", async (req, res) => {
  const sports = await prisma.sport.findMany();
  res.render("admin/index.njk", { sports });
});

adminRouter.get("/reports", async (req, res) => {
  const params = z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      sport: z.preprocess((sportId) => {
        if ([undefined, null].includes(sportId)) {
          return sportId;
        }
        return Number(sportId);
      }, z.number().optional()),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return new Date(data.startDate) < new Date(data.endDate);
        }
        return true;
      },
      {
        message: "Start date must be before end date",
      }
    )
    .parse(req.query);
  const where = {
    startsAt: {
      lte: new Date(),
    },
  };
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
    sports,
    currentSport: sports.find((sport) => sport.id === params.sport),
  });
});

export default adminRouter;

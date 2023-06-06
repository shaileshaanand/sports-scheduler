import { Router } from "express";
import { z } from "zod";

import CustomError from "../lib/CustomError.js";
import prisma from "../lib/prisma.js";
import ensureAdmin from "../middlewares/ensureAdmin.js";

const sportRouter = Router();

const sportParser = z.object({
  name: z.string().min(1).max(255),
});

sportRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const sport = await prisma.sport.findUnique({
    where: { id },
    include: {
      sessions: {
        include: {
          participants: true,
        },
        where: {
          cancelled: false,
          startsAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          startsAt: "asc",
        },
      },
    },
  });
  sport.sessions.map((session) => {
    session.participating = session.participants.some(
      (participant) => participant.id === req.user.id
    );
  });
  res.render("sport/index.njk", { sport, user: req.user });
});

sportRouter.post("/", ensureAdmin, async (req, res) => {
  const data = sportParser.parse(req.body);
  await prisma.sport.create({ data });
  res.redirect("/");
});

sportRouter.put("/:id", ensureAdmin, async (req, res) => {
  const data = sportParser.parse(req.body);
  const id = Number(req.params.id);
  await prisma.sport.update({
    where: { id },
    data,
  });
  res.redirect(`/sport/${id}`);
});

sportRouter.delete("/:id", ensureAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await prisma.sport.delete({
    where: { id },
  });
  res.redirect("/");
});

sportRouter.post("/:id/session", async (req, res) => {
  const id = Number(req.params.id);
  const data = z
    .object({
      name: z.string().min(1).max(255),
      venue: z.string().min(1).max(255),
      totalSlots: z.preprocess((x) => Number(x), z.number().min(2)),
      startsAt: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
        .transform((x) => new Date(x)),
      endsAt: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
        .transform((x) => new Date(x)),
      participants: z.string().min(2),
    })
    .refine((x) => x.startsAt < x.endsAt, {
      message: "Starts at must be before ends at",
      path: ["startsAt", "endsAt"],
    })
    .refine((x) => x.startsAt > new Date(), {
      message: "Starts at must be in the future",
      path: ["startsAt"],
    })
    .parse(req.body);

  const userIds = JSON.parse(data.participants);

  if (userIds.length > data.totalSlots) {
    throw new CustomError("Too many participants", "back");
  }

  await prisma.sportSession.create({
    data: {
      ...data,
      startsAt: new Date(data.startsAt),
      sport: {
        connect: { id },
      },
      owner: {
        connect: { id: req.user.id },
      },
      participants: {
        connect: userIds.map((id) => ({ id })),
      },
    },
  });
  res.redirect(`/sport/${id}`);
});

sportRouter.get("/:id/session/:sessionId", async (req, res) => {
  const id = Number(req.params.sessionId);
  const [session, sport] = await Promise.all([
    prisma.sportSession.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    }),
    prisma.sport.findUnique({
      where: { id: Number(req.params.id) },
    }),
  ]);
  const joined = session.participants.some((x) => x.id === req.user.id);
  res.render("sport/session.njk", { session, sport, user: req.user, joined });
});
sportRouter.post("/:id/session/:sessionId/join", async (req, res) => {
  const id = Number(req.params.sessionId);
  const session = await prisma.sportSession.findUnique({
    where: { id },
    include: {
      participants: true,
    },
  });
  if (session.participants.length >= session.totalSlots) {
    throw new CustomError("Session is full", "back");
  }
  if (session.participants.some((x) => x.id === req.user.id)) {
    throw new CustomError("Already joined", "back");
  }
  if (session.endsAt < new Date()) {
    throw new CustomError("Session has already ended", "back");
  }
  if (session.startsAt < new Date()) {
    throw new CustomError("Session has already started", "back");
  }
  if (session.cancelled) {
    throw new CustomError(
      `Session has been cancelled due to ${session.cancellationReason}`,
      "back"
    );
  }

  await prisma.sportSession.update({
    where: { id },
    data: {
      participants: {
        connect: { id: req.user.id },
      },
    },
  });
  res.redirect("back");
});

sportRouter.post("/:id/session/:sessionId/leave", async (req, res) => {
  const id = Number(req.params.sessionId);
  const session = await prisma.sportSession.findUnique({
    where: { id },
    include: {
      participants: true,
    },
  });
  if (!session.participants.some((x) => x.id === req.user.id)) {
    throw new CustomError("Not joined", "back");
  }
  if (session.endsAt < new Date()) {
    throw new CustomError("Session has already ended", "back");
  }
  if (session.startsAt < new Date()) {
    throw new CustomError("Session has already started", "back");
  }
  if (session.cancelled) {
    throw new CustomError("Session has been cancelled", "back");
  }
  await prisma.sportSession.update({
    where: { id },
    data: {
      participants: {
        disconnect: { id: req.user.id },
      },
    },
  });
  res.redirect("back");
});

sportRouter.post("/:id/session/:sessionId/cancel", async (req, res) => {
  const id = Number(req.params.sessionId);
  const session = await prisma.sportSession.findFirst({
    where: { id, ownerId: req.user.id },
  });
  if (!session) {
    throw new CustomError("Not owner", "back");
  }
  if (session.endsAt < new Date()) {
    throw new CustomError("Session has already ended", "back");
  }
  if (session.startsAt < new Date()) {
    throw new CustomError("Session has already started", "back");
  }
  const cancellationReason = z
    .string()
    .min(1)
    .max(255)
    .parse(req.body.cancellationReason);

  await prisma.sportSession.update({
    where: { id },
    data: {
      cancelled: true,
      cancellationReason,
    },
  });
  res.redirect(`/sport/${req.params.id}/`);
});

export default sportRouter;

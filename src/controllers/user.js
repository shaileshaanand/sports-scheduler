import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import passport from "passport";
import { z } from "zod";

import { hashPassword } from "../lib/encryptPassword";

const prisma = new PrismaClient();

const userRouter = Router();

userRouter.post("/", async (req, res) => {
  const data = z
    .object({
      firstName: z.string().min(1).max(255),
      lastName: z.string().max(255).optional(),
      email: z.string().email().min(5).max(255),
      password: z.string().min(8).max(255),
    })
    .parse(req.body);
  const user = await prisma.user.create({
    data: {
      ...data,
      password: await hashPassword(data.password),
    },
  });
  req.login(user, (err) => {
    if (err) {
      throw err;
    }
    res.redirect("/");
  });
});

userRouter.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/user/login",
    failureFlash: true,
  }),
  (req, res) => {
    res.redirect("/");
  }
);

userRouter.get("/register", async (req, res) => {
  res.render("register.njk");
});

userRouter.get("/login", async (req, res) => {
  res.render("login.njk");
});

userRouter.get("/logout", async (req, res) => {
  req.logout((err) => {
    if (err) {
      throw err;
    }
    res.redirect("/");
  });
});

userRouter.get("/sessions", async (req, res) => {
  const hostedSessions = await prisma.sportSession.findMany({
    where: {
      ownerId: req.user.id,
    },
    include: {
      participants: true,
    },
  });
  const participatingSessions = await prisma.sportSession.findMany({
    where: {
      participants: {
        some: {
          id: req.user.id,
        },
      },
    },
    include: {
      participants: true,
    },
  });
  hostedSessions.forEach((session) => {
    session.participating = session.participants.some(
      (participant) => participant.id === req.user.id
    );
  });
  participatingSessions.forEach((session) => {
    session.participating = session.participants.some(
      (participant) => participant.id === req.user.id
    );
  });
  res.render("user/sessions.njk", {
    hostedSessions,
    participatingSessions,
    currentPage: "mySessions",
    user: req.user,
  });
});

export default userRouter;

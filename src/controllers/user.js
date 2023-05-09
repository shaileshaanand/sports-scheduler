import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { Router } from "express";
import passport from "passport";
import { z } from "zod";

const prisma = new PrismaClient();

const userRouter = Router();

const SALT_ROUNDS = 10;

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
      password: await bcrypt.hash(data.password, SALT_ROUNDS),
    },
  });
  req.login(user, (err) => {
    if (err) {
      throw err;
    }
  });
  res.redirect("/");
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

userRouter.post("/logout", async (req, res) => {
  req.logout((err) => {
    if (err) {
      throw err;
    }
    res.redirect("/");
  });
});

export default userRouter;

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import express from "express";
import session from "express-session";
import nunjucks from "nunjucks";
import passport from "passport";
import LocalStrategy from "passport-local";

import userRouter from "./controllers/user.js";

const app = express();
const prisma = new PrismaClient();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      });
      if (!user) {
        return done("No user found");
      }
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return done("Incorrect password");
      }
      return done(null, user);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });
  done(null, user);
});

nunjucks.configure("src/views", {
  autoescape: true,
  express: app,
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/user", userRouter);

export default app;

import crypto from "crypto";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import bunyan from "bunyan";
import { ensureLoggedIn } from "connect-ensure-login";
import flash from "connect-flash";
import express from "express";
import session from "express-session";
import methodOverride from "method-override";
import nunjucks from "nunjucks";
import passport from "passport";
import LocalStrategy from "passport-local";
import "express-async-errors";

import adminRouter from "./controllers/admin.js";
import sportRouter from "./controllers/sport.js";
import userRouter from "./controllers/user.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();
const prisma = new PrismaClient();

export const log = bunyan.createLogger({
  name: "sports-tracker",
  serializers: bunyan.stdSerializers,
});

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
app.use(flash());
app.use(passport.session());
app.use(methodOverride("_method"));
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

app.use((req, res, next) => {
  req.log = log.child({ req_id: crypto.randomUUID() }, true);
  req.log.info({ req });
  res.on("finish", () => req.log.info({ res }));
  next();
});

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
        return done(null, false, { message: "No user found" });
      }
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return done(null, false, { message: "Incorrect password" });
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

app.get("/", async (req, res) => {
  if (req.user) {
    const sports = await prisma.sport.findMany();
    return res.render("index.njk", { user: req.user, sports });
  }
  return res.render("home.njk");
});

app.use("/user", userRouter);
app.use("/admin", ensureLoggedIn("/user/login"), adminRouter);
app.use("/sport", ensureLoggedIn("/user/login"), sportRouter);

app.use(errorHandler);
export default app;

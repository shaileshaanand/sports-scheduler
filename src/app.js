import crypto from "crypto";

import { PrismaClient } from "@prisma/client";
import bodyParser from "body-parser";
import bunyan from "bunyan";
import { ensureLoggedIn } from "connect-ensure-login";
import flash from "connect-flash";
import RedisStore from "connect-redis";
import cookieParser from "cookie-parser";
import { doubleCsrf } from "csrf-csrf";
import { format, formatDistanceStrict, formatDistanceToNow } from "date-fns";
import express from "express";
import session from "express-session";
import methodOverride from "method-override";
import nunjucks from "nunjucks";
import passport from "passport";
import LocalStrategy from "passport-local";
import { createClient } from "redis";

import "express-async-errors";

import adminRouter from "./controllers/admin.js";
import apiRouter from "./controllers/api.js";
import sportRouter from "./controllers/sport.js";
import userRouter from "./controllers/user.js";
import { verifyPassword } from "./lib/encryptPassword.js";
import ensureAdmin from "./middlewares/ensureAdmin.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();
const prisma = new PrismaClient();
const redisClient = createClient({ url: process.env.REDIS_URL });

export const log = bunyan.createLogger({
  name: "sports-tracker",
  serializers: bunyan.stdSerializers,
});

const logLevels = {
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARNING",
  50: "ERROR",
  60: "CRITICAL",
};

bunyan.prototype._emit = (function (originalFunction) {
  return function (rec, noemit) {
    rec.severity = logLevels[rec.level];
    return originalFunction.call(this, rec, noemit);
  };
})(bunyan.prototype._emit);

redisClient.connect().catch((msg) => log.error(msg));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
    store: new RedisStore({
      client: redisClient,
      prefix: "session:",
    }),
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
      const passwordMatch = await verifyPassword(password, user.password);
      if (!passwordMatch) {
        return done(null, false, { message: "Incorrect password" });
      }
      return done(null, user);
    }
  )
);

app.use(cookieParser());

const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getTokenFromRequest: (req) => req.body._csrf,
});

app.use(doubleCsrfProtection);
app.use((req, res, next) => {
  env.addGlobal("csrfToken", req.csrfToken());
  next();
});
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

const env = nunjucks.configure("src/views", {
  autoescape: true,
  express: app,
});

env.addGlobal("formatToDate", (date) => {
  return format(date, "do MMM yyyy");
});

env.addGlobal("formatToTime", (date) => {
  return format(date, "h:mm a");
});

env.addGlobal("formatDistance", (start, end) => {
  return formatDistanceStrict(start, end);
});

env.addGlobal("formatDistanceFromNow", (start) => {
  return formatDistanceToNow(start, { addSuffix: true });
});

env.addGlobal("pluralizeIfmultiple", (word, count) => {
  return count === 1 ? word : `${word}s`;
});

env.addGlobal("isPast", (date) => {
  return date < new Date();
});

env.addGlobal("isRunning", (start, end) => {
  return start < new Date() && end > new Date();
});

env.addFilter("upcoming", (sessions) => {
  return sessions.filter(
    (session) => session.startsAt > new Date() && !session.cancelled
  );
});

env.addFilter("past", (sessions) => {
  return sessions.filter(
    (session) => session.startsAt < new Date() && !session.cancelled
  );
});

env.addFilter("cancelled", (sessions) => {
  return sessions.filter((session) => session.cancelled);
});

app.get("/", async (req, res) => {
  if (req.user) {
    const sports = await prisma.sport.findMany({
      include: {
        sessions: {
          where: {
            cancelled: false,
            startsAt: {
              gt: new Date(),
            },
          },
        },
      },
    });
    return res.render("index.njk", {
      user: req.user,
      sports,
      currentPage: "sports",
    });
  }
  return res.render("home.njk");
});

app.use("/user", userRouter);
app.use("/admin", ensureLoggedIn("/user/login"), ensureAdmin, adminRouter);
app.use("/sport", ensureLoggedIn("/user/login"), sportRouter);
app.use("/api", ensureLoggedIn("/user/login"), apiRouter);

app.use(errorHandler);
export default app;

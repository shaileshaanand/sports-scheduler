import { Router } from "express";
import z from "zod";

import prisma from "../lib/prisma.js";
const apiRouter = Router();

apiRouter.get("/user", async (req, res) => {
  const searchString = z.string().min(3).max(255).parse(req.query.search);
  const users = await prisma.user.findMany({
    where: {
      OR: [
        {
          firstName: {
            contains: searchString,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: searchString,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: searchString,
            mode: "insensitive",
          },
        },
      ],
    },
  });
  res.json(users.filter((user) => user.id !== req.user.id));
});

export default apiRouter;

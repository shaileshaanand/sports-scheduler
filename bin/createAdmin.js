import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/encryptPassword.js";

const prisma = new PrismaClient();

// read email and password from the command line
const firstName = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];

// create a new user
const user = await prisma.user.create({
  data: {
    firstName,
    email,
    password: await hashPassword(password),
    role: "ADMIN",
  },
});

console.log(user);

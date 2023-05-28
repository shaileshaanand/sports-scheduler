import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/encryptPassword";

const prisma = new PrismaClient();

export const userFactory = async ({
  email = null,
  firstName = null,
  lastName = null,
  password = null,
} = {}) => {
  const user = await prisma.user.create({
    data: {
      email: email || faker.internet.email(),
      firstName: firstName || faker.person.firstName(),
      lastName: lastName || faker.person.lastName(),
      password: await hashPassword(password || faker.internet.password()),
    },
  });
  return user;
};

export const sportFactory = async ({ name = null } = {}) => {
  const sport = await prisma.sport.create({
    data: {
      name: name || faker.name.firstName(),
    },
  });
  return sport;
};

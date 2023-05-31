import { faker } from "@faker-js/faker";

import { hashPassword } from "../src/lib/encryptPassword";
import prisma from "../src/lib/prisma.js";

export const userFactory = async ({
  email = null,
  firstName = null,
  lastName = null,
  password = null,
  role = "USER",
} = {}) => {
  const rawPassword = password || faker.internet.password();
  const user = await prisma.user.create({
    data: {
      email: email || faker.internet.email(),
      firstName: firstName || faker.person.firstName(),
      lastName: lastName || faker.person.lastName(),
      password: await hashPassword(rawPassword),
      role,
    },
  });
  user.rawPassword = rawPassword;
  return user;
};

export const sportFactory = async ({ name = null } = {}) => {
  const sport = await prisma.sport.create({
    data: {
      name: name || faker.lorem.words(2),
    },
  });
  return sport;
};

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

export const sportSessionFactory = async ({
  owner = null,
  sport = null,
  name = null,
  venue = null,
  startsAt = null,
  endsAt = null,
  totalSlots = null,
  cancelled = null,
  cancellationReason = null,
  participants = [],
} = {}) => {
  const startsAtTime = startsAt || faker.date.future();
  const endsAtTime =
    endsAt ||
    faker.date.future({
      refDate: startsAtTime,
    });
  const sportSession = await prisma.sportSession.create({
    data: {
      name: name || faker.lorem.words(3),
      venue: venue || faker.lorem.words(2),
      startsAt: startsAtTime,
      endsAt: endsAtTime,
      totalSlots: totalSlots || faker.number.int({ min: 10, max: 1000 }),
      cancelled: cancelled || false,
      cancellationReason: cancellationReason || null,
      owner: {
        connect: {
          id: owner ? owner.id : (await userFactory()).id,
        },
      },
      sport: {
        connect: {
          id: sport ? sport.id : (await sportFactory()).id,
        },
      },
      participants: {
        connect: participants.map((participant) => ({
          id: participant.id,
        })),
      },
    },
    include: {
      owner: true,
      sport: true,
    },
  });
  return sportSession;
};

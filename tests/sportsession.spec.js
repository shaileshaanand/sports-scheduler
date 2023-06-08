import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";
import { add } from "date-fns";
import supertest from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import app from "../src/app.js";

import { sportFactory, sportSessionFactory, userFactory } from "./factories.js";
import {
  formatDate,
  formPayload,
  getLoginCookie,
  setupCsrf,
} from "./helpers.js";

const prisma = new PrismaClient();

const client = supertest(app);
let _csrf, csrfCookie;
describe("SportSession", () => {
  beforeAll(async () => {
    [_csrf, csrfCookie] = await setupCsrf(client);
  });

  beforeEach(async (ctx) => {
    ctx.user = await userFactory();
    ctx.loginCookie = await getLoginCookie(client, ctx.user);
  });

  it("should not create a session without login", async (ctx) => {
    const startsAtDate = faker.date.future();
    const startsAt = formatDate(startsAtDate);
    const payload = {
      name: faker.lorem.words(3),
      venue: faker.lorem.words(2),
      startsAt,
      endsAt: formatDate(
        faker.date.future({
          refDate: startsAtDate,
        })
      ),
      totalSlots: faker.number.int({ min: 10, max: 1000 }),
      participants: JSON.stringify([ctx.user.id]),
    };
    const sport = await sportFactory();

    const response = await client
      .post(`/sport/${sport.id}/session`)
      .set("Cookie", csrfCookie)
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const createdSportSession = await prisma.sportSession.findMany();
    expect(createdSportSession.length).toBe(0);
  });

  it("should not create a session without _csrf", async (ctx) => {
    const startsAtDate = faker.date.future();
    const startsAt = formatDate(startsAtDate);
    const payload = {
      name: faker.lorem.words(3),
      venue: faker.lorem.words(2),
      startsAt,
      endsAt: formatDate(
        faker.date.future({
          refDate: startsAtDate,
        })
      ),
      totalSlots: faker.number.int({ min: 10, max: 1000 }),
      participants: JSON.stringify([ctx.user.id]),
    };
    const sport = await sportFactory();

    const response = await client
      .post(`/sport/${sport.id}/session`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload(payload));

    expect(response.status).toBe(403);
    const createdSportSession = await prisma.sportSession.findMany();
    expect(createdSportSession.length).toBe(0);
  });

  it("should create a session if logged in as user", async (ctx) => {
    const startsAtDate = faker.date.future();
    const startsAt = formatDate(startsAtDate);
    const payload = {
      name: faker.lorem.words(3),
      venue: faker.lorem.words(2),
      startsAt,
      endsAt: formatDate(
        faker.date.future({
          refDate: startsAtDate,
        })
      ),
      totalSlots: faker.number.int({ min: 10, max: 1000 }),
      participants: JSON.stringify([ctx.user.id]),
    };
    const sport = await sportFactory();

    const response = await client
      .post(`/sport/${sport.id}/session`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const createdSportSession = await prisma.sportSession.findMany();
    expect(createdSportSession.length).toBe(1);
  });

  it("should not create a session startAt is greater than endsAt", async (ctx) => {
    const startsAtDate = faker.date.future();
    const startsAt = formatDate(startsAtDate);
    const payload = {
      name: faker.lorem.words(3),
      venue: faker.lorem.words(2),
      startsAt,
      endsAt: formatDate(
        faker.date.past({
          refDate: startsAtDate,
        })
      ),
      totalSlots: faker.number.int({ min: 10, max: 1000 }),
      participants: JSON.stringify([ctx.user.id]),
    };
    const sport = await sportFactory();

    const response = await client
      .post(`/sport/${sport.id}/session`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const createdSportSession = await prisma.sportSession.findMany();
    expect(createdSportSession.length).toBe(0);
  });

  it("should not create a session if totalSlots is less than initial participants", async (ctx) => {
    const startsAtDate = faker.date.future();
    const startsAt = formatDate(startsAtDate);
    const [user2, user3, sport] = await Promise.all([
      userFactory(),
      userFactory(),
      sportFactory(),
    ]);

    const payload = {
      name: faker.lorem.words(3),
      venue: faker.lorem.words(2),
      startsAt,
      endsAt: formatDate(
        faker.date.future({
          refDate: startsAtDate,
        })
      ),
      totalSlots: 2,
      participants: JSON.stringify([ctx.user.id, user2.id, user3.id]),
    };

    const response = await client
      .post(`/sport/${sport.id}/session`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));
    expect(response.status).toBe(302);
    const createdSportSessions = await prisma.sportSession.findMany();
    expect(createdSportSessions.length).toBe(0);
  });

  it("should create a session with no participants", async (ctx) => {
    const startsAtDate = faker.date.future();
    const startsAt = formatDate(startsAtDate);
    const payload = {
      name: faker.lorem.words(3),
      venue: faker.lorem.words(2),
      startsAt,
      endsAt: formatDate(
        faker.date.future({
          refDate: startsAtDate,
        })
      ),
      totalSlots: faker.number.int({ min: 10, max: 1000 }),
      participants: JSON.stringify([]),
    };
    const sport = await sportFactory();

    const response = await client
      .post(`/sport/${sport.id}/session`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const createdSportSession = await prisma.sportSession.findFirst({
      include: {
        participants: true,
      },
    });
    expect(createdSportSession).not.toBeNull();
    expect(createdSportSession.participants).toEqual([]);
    expect(createdSportSession.totalSlots).toBe(payload.totalSlots);
    expect(createdSportSession.name).toBe(payload.name);
    expect(createdSportSession.venue).toBe(payload.venue);
    expect(createdSportSession.startsAt).toEqual(new Date(payload.startsAt));
    expect(createdSportSession.endsAt).toEqual(new Date(payload.endsAt));
    expect(createdSportSession.sportId).toBe(sport.id);
    expect(createdSportSession.ownerId).toBe(ctx.user.id);
    expect(createdSportSession.participants.length).toBe(0);
    expect(createdSportSession.cancelled).toBe(false);
    expect(createdSportSession.cancellationReason).toBeNull();
  });

  it("should not create a session if participant's session overlaps", async (ctx) => {
    const user = await userFactory();
    const startsAt = faker.date.future();
    const endsAt = add(startsAt, { hours: 1 });
    await sportSessionFactory({
      participants: [user],
      startsAt: startsAt,
      endsAt,
    });
    const startsAtDate = add(startsAt, { minutes: 30 });
    const startsAtForPayload = formatDate(startsAtDate);
    const payload = {
      name: faker.lorem.words(3),
      venue: faker.lorem.words(2),
      startsAt: startsAtForPayload,
      endsAt: formatDate(
        add(startsAtDate, {
          hours: 1,
        })
      ),
      totalSlots: faker.number.int({ min: 10, max: 1000 }),
      participants: JSON.stringify([user.id]),
    };
    const sport = await sportFactory();

    const response = await client
      .post(`/sport/${sport.id}/session`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const createdSportSession = await prisma.sportSession.findMany();
    expect(createdSportSession.length).toBe(1);
  });

  it("should not create a session if owner's session overlaps", async (ctx) => {
    const startsAt = faker.date.future();
    const endsAt = add(startsAt, { hours: 1 });
    await sportSessionFactory({
      participants: [ctx.user],
      startsAt,
      endsAt,
    });
    const startsAtDate = add(startsAt, { minutes: 30 });
    const startsAtForPayload = formatDate(startsAtDate);
    const payload = {
      name: faker.lorem.words(3),
      venue: faker.lorem.words(2),
      startsAt: startsAtForPayload,
      endsAt: formatDate(
        add(startsAtDate, {
          hours: 1,
        })
      ),
      totalSlots: faker.number.int({ min: 10, max: 1000 }),
      participants: JSON.stringify([ctx.user.id]),
    };
    const sport = await sportFactory();

    const response = await client
      .post(`/sport/${sport.id}/session`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const createdSportSession = await prisma.sportSession.findMany({
      include: {
        participants: true,
      },
    });
    expect(createdSportSession.length).toBe(1);
  });

  it("should create a session if participant's session does not overlap", async (ctx) => {
    const user = await userFactory();
    const startsAt = faker.date.future();
    const endsAt = add(startsAt, { hours: 1 });
    await sportSessionFactory({
      participants: [user],
      startsAt: startsAt,
      endsAt,
    });
    const startsAtDate = add(startsAt, { hours: 2 });
    const startsAtForPayload = formatDate(startsAtDate);
    const payload = {
      name: faker.lorem.words(3),
      venue: faker.lorem.words(2),
      startsAt: startsAtForPayload,
      endsAt: formatDate(
        add(startsAtDate, {
          hours: 1,
        })
      ),
      totalSlots: faker.number.int({ min: 10, max: 1000 }),
      participants: JSON.stringify([user.id]),
    };
    const sport = await sportFactory();

    const response = await client
      .post(`/sport/${sport.id}/session`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const createdSportSession = await prisma.sportSession.findMany();
    expect(createdSportSession.length).toBe(2);
  });

  it("should create a session if owner's session does not overlap", async (ctx) => {
    const startsAt = faker.date.future();
    const endsAt = add(startsAt, { hours: 1 });
    await sportSessionFactory({
      participants: [ctx.user],
      startsAt,
      endsAt,
    });
    const startsAtDate = add(startsAt, { hours: 3 });
    const startsAtForPayload = formatDate(startsAtDate);
    const payload = {
      name: faker.lorem.words(3),
      venue: faker.lorem.words(2),
      startsAt: startsAtForPayload,
      endsAt: formatDate(
        add(startsAtDate, {
          hours: 1,
        })
      ),
      totalSlots: faker.number.int({ min: 10, max: 1000 }),
      participants: JSON.stringify([ctx.user.id]),
    };
    const sport = await sportFactory();

    const response = await client
      .post(`/sport/${sport.id}/session`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const createdSportSession = await prisma.sportSession.findMany({
      include: {
        participants: true,
      },
    });
    expect(createdSportSession.length).toBe(2);
  });

  it("should create a session with participants", async (ctx) => {
    const startsAtDate = faker.date.future();
    const startsAt = formatDate(startsAtDate);
    const [user2, user3, sport] = await Promise.all([
      userFactory(),
      userFactory(),
      sportFactory(),
    ]);

    const payload = {
      name: faker.lorem.words(3),
      venue: faker.lorem.words(2),
      startsAt,
      endsAt: formatDate(
        faker.date.future({
          refDate: startsAtDate,
        })
      ),
      totalSlots: 3,
      participants: JSON.stringify([ctx.user.id, user2.id, user3.id]),
    };

    const response = await client
      .post(`/sport/${sport.id}/session`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const createdSportSession = await prisma.sportSession.findFirst({
      include: {
        participants: true,
      },
    });
    expect(createdSportSession).not.toBeNull();
    expect(createdSportSession.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ctx.user.id,
        }),
        expect.objectContaining({
          id: user2.id,
        }),
        expect.objectContaining({
          id: user3.id,
        }),
      ])
    );
    expect(createdSportSession.totalSlots).toBe(payload.totalSlots);
    expect(createdSportSession.name).toBe(payload.name);
    expect(createdSportSession.venue).toBe(payload.venue);
    expect(createdSportSession.startsAt).toEqual(new Date(payload.startsAt));
    expect(createdSportSession.endsAt).toEqual(new Date(payload.endsAt));
    expect(createdSportSession.sportId).toBe(sport.id);
    expect(createdSportSession.ownerId).toBe(ctx.user.id);
    expect(createdSportSession.participants.length).toBe(3);
    expect(createdSportSession.cancelled).toBe(false);
    expect(createdSportSession.cancellationReason).toBeNull();
  });

  it("should not be able to join a session if session is full", async (ctx) => {
    const [user1, user2] = await Promise.all([userFactory(), userFactory()]);
    const session = await sportSessionFactory({
      owner: ctx.user,
      totalSlots: 2,
      participants: [user1, user2],
    });

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/join`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        participants: true,
      },
    });
    expect(updatedSession.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: user1.id,
        }),
        expect.objectContaining({
          id: user2.id,
        }),
      ])
    );
    expect(updatedSession.participants.length).toBe(2);
  });
  it("should not be able to join a session if session has ended", async (ctx) => {
    const user = await userFactory();
    const endsAt = faker.date.past();
    const startsAt = faker.date.past({
      refDate: endsAt,
    });
    const session = await sportSessionFactory({
      owner: user,
      startsAt,
      endsAt,
    });

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/join`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        participants: true,
      },
    });
    expect(updatedSession.participants.length).toBe(0);
  });

  it("should not be able to join a session if session is started but not ended", async (ctx) => {
    const user = await userFactory();
    const endsAt = faker.date.future();
    const startsAt = faker.date.past();
    const session = await sportSessionFactory({
      owner: user,
      startsAt,
      endsAt,
    });

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/join`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        participants: true,
      },
    });
    expect(updatedSession.participants.length).toBe(0);
  });

  it("should not be able to join a session if session is cancelled", async (ctx) => {
    const user = await userFactory();
    const session = await sportSessionFactory({
      owner: user,
      cancelled: true,
      cancellationReason: faker.lorem.words(3),
    });

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/join`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        participants: true,
      },
    });
    expect(updatedSession.participants.length).toBe(0);
  });
  it("should not be able to join a session if session overlaps", async (ctx) => {
    const startsAt = faker.date.future();
    const endsAt = add(startsAt, { hours: 1 });
    await sportSessionFactory({
      participants: [ctx.user],
      startsAt,
      endsAt,
    });
    const session = await sportSessionFactory({
      startsAt: add(startsAt, { minutes: 30 }),
      endsAt: add(startsAt, { minutes: 90 }),
    });

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/join`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        participants: true,
      },
    });
    expect(updatedSession.participants.length).toBe(0);
  });

  it("should be able to join a session if session does not overlap", async (ctx) => {
    const startsAt = faker.date.future();
    const endsAt = add(startsAt, { hours: 1 });
    await sportSessionFactory({
      participants: [ctx.user],
      startsAt,
      endsAt,
    });
    const session = await sportSessionFactory({
      startsAt: add(startsAt, { hours: 3 }),
      endsAt: add(startsAt, { hours: 4 }),
    });

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/join`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        participants: true,
      },
    });
    expect(updatedSession.participants.length).toBe(1);
    expect(updatedSession.participants[0].id).toBe(ctx.user.id);
  });

  it("should not be able to join a session without csrf", async () => {
    const user = await userFactory();
    const loginCookie = await getLoginCookie(client, user);
    const session = await sportSessionFactory({
      owner: user,
    });

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/join`)
      .set("Cookie", [csrfCookie, loginCookie])
      .send();

    expect(response.status).toBe(403);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        participants: true,
      },
    });
    expect(updatedSession.participants.length).toBe(0);
  });

  it("should be able to join a session if not joined", async () => {
    const user = await userFactory();
    const loginCookie = await getLoginCookie(client, user);
    const session = await sportSessionFactory({
      owner: user,
    });

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/join`)
      .set("Cookie", [csrfCookie, loginCookie])
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        participants: true,
      },
    });
    expect(updatedSession.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: user.id,
        }),
      ])
    );
    expect(updatedSession.participants.length).toBe(1);
  });

  it("should not be able to leave a session if session has ended", async (ctx) => {
    const user = await userFactory();
    const endsAt = faker.date.past();
    const startsAt = faker.date.past({
      refDate: endsAt,
    });
    const session = await sportSessionFactory({
      owner: user,
      startsAt,
      endsAt,
      participants: [ctx.user],
    });

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/leave`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        participants: true,
      },
    });
    expect(updatedSession.participants.length).toBe(1);
  });

  it("should not be able to leave a session if session is cancelled", async (ctx) => {
    const user = await userFactory();
    const session = await sportSessionFactory({
      owner: user,
      cancelled: true,
      cancellationReason: faker.lorem.words(3),
      participants: [ctx.user],
    });

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/leave`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        participants: true,
      },
    });
    expect(updatedSession.participants.length).toBe(1);
  });

  it("should not be able to leave a session without csrf", async () => {
    const user = await userFactory();
    const loginCookie = await getLoginCookie(client, user);
    const session = await sportSessionFactory({
      owner: user,
      participants: [user],
    });

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/leave`)
      .set("Cookie", [csrfCookie, loginCookie])
      .send();

    expect(response.status).toBe(403);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        participants: true,
      },
    });
    expect(updatedSession.participants.length).toBe(1);
  });

  it("should not be able to leave a session if session is started but not ended", async (ctx) => {
    const user = await userFactory();
    const endsAt = faker.date.future();
    const startsAt = faker.date.past();
    const session = await sportSessionFactory({
      owner: user,
      startsAt,
      endsAt,
      participants: [ctx.user],
    });

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/leave`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        participants: true,
      },
    });
    expect(updatedSession.participants.length).toBe(1);
  });

  it("should not be able to leave a session if session is cancelled", async (ctx) => {
    const user = await userFactory();
    const session = await sportSessionFactory({
      owner: user,
      cancelled: true,
      cancellationReason: faker.lorem.words(3),
      participants: [ctx.user],
    });

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/leave`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        participants: true,
      },
    });
    expect(updatedSession.participants.length).toBe(1);
  });

  it("should be able to leave a session if joined", async (ctx) => {
    const user = await userFactory();
    const session = await sportSessionFactory({
      owner: user,
      participants: [ctx.user],
    });

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/leave`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
      include: {
        participants: true,
      },
    });
    expect(updatedSession.participants.length).toBe(0);
  });

  it("should not be able cancel a session if not owner", async (ctx) => {
    const user = await userFactory();
    const session = await sportSessionFactory({
      owner: user,
    });
    const cancellationReason = faker.lorem.words(3);

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/cancel`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ cancellationReason, _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
    });
    expect(updatedSession.cancelled).toBe(false);
    expect(updatedSession.cancellationReason).toBeNull();
  });

  it("should not be able cancel if session has ended", async (ctx) => {
    const endsAt = faker.date.past();
    const startsAt = faker.date.past({
      refDate: endsAt,
    });
    const session = await sportSessionFactory({
      owner: ctx.user,
      endsAt,
      startsAt,
    });
    const cancellationReason = faker.lorem.words(3);

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/cancel`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ cancellationReason, _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
    });
    expect(updatedSession.cancelled).toBe(false);
    expect(updatedSession.cancellationReason).toBeNull();
  });

  it("should not be able to cancel if session is started but not ended", async (ctx) => {
    const endsAt = faker.date.future();
    const startsAt = faker.date.past();
    const session = await sportSessionFactory({
      owner: ctx.user,
      startsAt,
      endsAt,
    });
    const cancellationReason = faker.lorem.words(3);

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/cancel`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ cancellationReason, _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
    });
    expect(updatedSession.cancelled).toBe(false);
    expect(updatedSession.cancellationReason).toBeNull();
  });

  it("should be able to cancel session without csrf", async (ctx) => {
    const session = await sportSessionFactory({
      owner: ctx.user,
    });
    const cancellationReason = faker.lorem.words(3);

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/cancel`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ cancellationReason }));

    expect(response.status).toBe(403);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
    });
    expect(updatedSession.cancelled).toBe(false);
    expect(updatedSession.cancellationReason).toBeNull();
  });

  it("should be able to cancel if session is not started", async (ctx) => {
    const session = await sportSessionFactory({
      owner: ctx.user,
    });
    const cancellationReason = faker.lorem.words(3);

    const response = await client
      .post(`/sport/${session.sportId}/session/${session.id}/cancel`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ cancellationReason, _csrf }));

    expect(response.status).toBe(302);
    const updatedSession = await prisma.sportSession.findUnique({
      where: {
        id: session.id,
      },
    });
    expect(updatedSession.cancelled).toBe(true);
    expect(updatedSession.cancellationReason).toBe(cancellationReason);
  });

  it("should not show details of a session if not logged in", async (ctx) => {
    const session = await sportSessionFactory({
      owner: ctx.user,
    });

    const response = await client.get(
      `/sport/${session.sportId}/session/${session.id}`
    );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/user/login");
  });

  it("should show details of a session", async (ctx) => {
    const session = await sportSessionFactory({
      owner: ctx.user,
    });

    const response = await client
      .get(`/sport/${session.sportId}/session/${session.id}`)
      .set("Cookie", [csrfCookie, ctx.loginCookie]);

    expect(response.status).toBe(200);
    expect(response.text).toContain(session.name);
  });

  it("should list user's sessions", async (ctx) => {
    const sessions = await Promise.all([
      sportSessionFactory({
        owner: ctx.user,
      }),
      sportSessionFactory({
        owner: ctx.user,
      }),
      sportSessionFactory({
        owner: ctx.user,
      }),
      sportSessionFactory(),
    ]);

    const response = await client
      .get(`/user/sessions`)
      .set("Cookie", [csrfCookie, ctx.loginCookie]);

    expect(response.status).toBe(200);
    sessions.slice(0, 3).forEach((session) => {
      expect(response.text).toContain(session.name);
    });
  });
});

describe.each([
  ["name", ""],
  ["name", null],
  ["venue", ""],
  ["venue", null],
  ["startsAt", ""],
  ["startsAt", formatDate(faker.date.past())],
  ["endsAt", ""],
  ["endsAt", formatDate(faker.date.past())],
  ["endsAt", null],
  ["totalSlots", ""],
  ["totalSlots", 0],
  ["totalSlots", -1],
  ["totalSlots", 1],
  ["totalSlots", null],
  ["participants", ""],
  ["participants", null],
])("should not create a session ", async (field, value) => {
  beforeAll(async () => {
    [_csrf, csrfCookie] = await setupCsrf(client);
  });

  beforeEach(async (ctx) => {
    ctx.user = await userFactory();
    ctx.loginCookie = await getLoginCookie(client, ctx.user);
  });

  it(`if ${field} is ${JSON.stringify(value)}`, async (ctx) => {
    const startsAtDate = faker.date.future();
    const startsAt = formatDate(startsAtDate);
    const payload = {
      name: faker.lorem.words(3),
      venue: faker.lorem.words(2),
      startsAt,
      endsAt: formatDate(
        faker.date.future({
          refDate: startsAtDate,
        })
      ),
      totalSlots: faker.number.int({ min: 10, max: 1000 }),
      participants: JSON.stringify([ctx.user.id]),
    };
    payload[field] = value;
    const sport = await sportFactory();

    const response = await client
      .post(`/sport/${sport.id}/session`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const createdSportSession = await prisma.sportSession.findMany();
    expect(createdSportSession.length).toBe(0);
  });
});

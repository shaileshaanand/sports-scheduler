import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";
import supertest from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import app from "../src/app";

import { sportFactory, userFactory } from "./factories";
import { formPayload, getLoginCookie, setupCsrf } from "./helpers";

let _csrf, csrfCookie;
const client = supertest(app);
const prisma = new PrismaClient();
describe("Sport user tests", () => {
  beforeAll(async () => {
    [_csrf, csrfCookie] = await setupCsrf(client);
  });

  beforeEach(async (ctx) => {
    ctx.user = await userFactory();
    ctx.loginCookie = await getLoginCookie(client, ctx.user);
  });

  it("should not create a sport if logged in as user", async (ctx) => {
    const payload = {
      name: faker.lorem.word(),
    };

    const response = await client
      .post("/sport")
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(200);
    const createdSport = await prisma.sport.findFirst();
    expect(createdSport).toBeNull();
  });

  it("should not edit a sport if logged in as user", async (ctx) => {
    const sport = await sportFactory();

    const payload = {
      name: faker.lorem.word(),
    };

    const response = await client
      .put(`/sport/${sport.id}`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(200);
    const updatedSport = await prisma.sport.findFirst();
    expect(updatedSport.name).not.toBe(payload.name);
  });

  it("should not delete a sport if logged in as user", async (ctx) => {
    const sport = await sportFactory();

    const response = await client
      .delete(`/sport/${sport.id}`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(200);
    const deletedSport = await prisma.sport.findFirst();
    expect(deletedSport).not.toBeNull();
  });

  it("should not create a sport if not logged in", async () => {
    const payload = {
      name: faker.lorem.word(),
    };

    const response = await client
      .post("/sport")
      .set("Cookie", csrfCookie)
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const createdSport = await prisma.sport.findFirst();
    expect(createdSport).toBeNull();
  });

  it("should not edit a sport if not logged in", async () => {
    const sport = await sportFactory();

    const payload = {
      name: faker.lorem.word(),
    };

    const response = await client
      .put(`/sport/${sport.id}`)
      .set("Cookie", csrfCookie)
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const updatedSport = await prisma.sport.findFirst();
    expect(updatedSport.name).not.toBe(payload.name);
  });

  it("should not delete a sport if not logged in", async () => {
    const sport = await sportFactory();

    const response = await client
      .delete(`/sport/${sport.id}`)
      .set("Cookie", csrfCookie)
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(302);
    const deletedSport = await prisma.sport.findFirst();
    expect(deletedSport).not.toBeNull();
  });

  it("should list all sports if logged in as user", async (ctx) => {
    const sports = await Promise.all([
      sportFactory(),
      sportFactory(),
      sportFactory(),
    ]);
    const response = await client.get("/").set("Cookie", ctx.loginCookie);

    expect(response.status).toBe(200);
    sports.map((sport) => {
      expect(response.text).toContain(sport.name);
    });
  });

  it("should not list all sports if not logged in", async () => {
    const sports = await Promise.all([
      sportFactory(),
      sportFactory(),
      sportFactory(),
    ]);
    const response = await client.get("/");

    expect(response.status).toBe(200);
    sports.map((sport) => {
      expect(response.text).not.toContain(sport.name);
    });
  });
});

describe("Sport admin tests", () => {
  beforeAll(async () => {
    [_csrf, csrfCookie] = await setupCsrf(client);
  });

  beforeEach(async (ctx) => {
    ctx.user = await userFactory({ role: "ADMIN" });
    ctx.loginCookie = await getLoginCookie(client, ctx.user);
  });

  it("should create a sport if logged in as admin", async (ctx) => {
    const payload = {
      name: faker.lorem.word(),
    };

    const response = await client
      .post("/sport")
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const createdSport = await prisma.sport.findFirst();
    expect(createdSport.name).toBe(payload.name);
  });

  it("should edit a sport if logged in as admin", async (ctx) => {
    const sport = await sportFactory();

    const payload = {
      name: faker.lorem.word(),
    };

    const response = await client
      .put(`/sport/${sport.id}`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const updatedSport = await prisma.sport.findFirst();
    expect(updatedSport.name).toBe(payload.name);
  });

  it("should delete a sport if logged in as admin", async (ctx) => {
    const sport = await sportFactory();

    const response = await client
      .delete(`/sport/${sport.id}`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf }));

    expect(response.status).toBe(302);
    const deletedSport = await prisma.sport.findFirst();
    expect(deletedSport).toBeNull();
  });

  it("should list all sports if logged in as admin", async (ctx) => {
    const sports = await Promise.all([
      sportFactory(),
      sportFactory(),
      sportFactory(),
    ]);

    const response = await client
      .get("/")
      .set("Cookie", [csrfCookie, ctx.loginCookie]);

    expect(response.status).toBe(200);
    sports.map((sport) => {
      expect(response.text).toContain(sport.name);
    });
  });

  it("should not create a sport without name", async (ctx) => {
    const payload = {
      name: "",
    };

    const response = await client
      .post("/sport")
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({ _csrf, ...payload }));

    expect(response.status).toBe(302);
    const createdSport = await prisma.sport.findFirst();
    expect(createdSport).toBeNull();
  });

  it("should not create a sport without _csrf", async (ctx) => {
    const payload = {
      name: faker.lorem.word(),
    };

    const response = await client
      .post("/sport")
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload(payload));

    expect(response.status).toBe(403);
    const createdSport = await prisma.sport.findFirst();
    expect(createdSport).toBeNull();
  });

  it("should not edit a sport without _csrf", async (ctx) => {
    const sport = await sportFactory();

    const payload = {
      name: faker.lorem.word(),
    };

    const response = await client
      .put(`/sport/${sport.id}`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload(payload));

    expect(response.status).toBe(403);
    const updatedSport = await prisma.sport.findFirst();
    expect(updatedSport.name).not.toBe(payload.name);
  });

  it("should not delete a sport without _csrf", async (ctx) => {
    const sport = await sportFactory();

    const response = await client
      .delete(`/sport/${sport.id}`)
      .set("Cookie", [csrfCookie, ctx.loginCookie])
      .send(formPayload({}));

    expect(response.status).toBe(403);
    const deletedSport = await prisma.sport.findFirst();
    expect(deletedSport).not.toBeNull();
  });
});

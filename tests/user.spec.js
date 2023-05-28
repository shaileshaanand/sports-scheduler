import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";
import supertest from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import app from "../src/app.js";
import { verifyPassword } from "../src/lib/encryptPassword.js";

import { userFactory } from "./factories.js";
import { extractLoginCookie, formPayload, setupCsrf } from "./helpers.js";

const prisma = new PrismaClient();
const client = supertest(app);

let _csrf, csrfCookie;

describe("Login", () => {
  beforeAll(async () => {
    [_csrf, csrfCookie] = await setupCsrf(client);
  });

  it("should not login a user without correct email", async () => {
    const userPayload = {
      email: faker.internet.email(),
      password: faker.internet.password(),
    };
    await userFactory(userPayload);

    const response = await client
      .post("/user/session")
      .set("Cookie", csrfCookie)
      .send(
        formPayload({ _csrf, ...userPayload, email: faker.internet.email() })
      );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/user/login");
    expect(true).toBe(true);
  });

  it("should not login a user without correct password", async () => {
    const userPayload = {
      email: faker.internet.email(),
      password: faker.internet.password(),
    };
    await userFactory(userPayload);

    const response = await client
      .post("/user/session")
      .set("Cookie", csrfCookie)
      .send(
        formPayload({
          _csrf,
          ...userPayload,
          password: faker.internet.password(),
        })
      );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/user/login");
    expect(true).toBe(true);
  });

  it("should login a user", async () => {
    const userPayload = {
      email: faker.internet.email(),
      password: faker.internet.password(),
    };
    const user = await userFactory(userPayload);

    const response = await client
      .post("/user/session")
      .set("Cookie", csrfCookie)
      .send(
        formPayload({
          _csrf,
          ...userPayload,
        })
      );

    const loginCookie = extractLoginCookie(response);

    const homeResponse = await client.get("/").set("Cookie", loginCookie);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/");
    expect(homeResponse.status).toBe(200);
    expect(homeResponse.text).toContain(user.firstName);
    expect(true).toBe(true);
  });

  it("should not login a user without csrf token", async () => {
    const userPayload = {
      email: faker.internet.email(),
      password: faker.internet.password(),
    };
    await userFactory(userPayload);

    const response = await client.post("/user/session").send(
      formPayload({
        ...userPayload,
      })
    );

    expect(response.status).toBe(403);
    expect(true).toBe(true);
  });
});

describe("Registration", () => {
  beforeAll(async () => {
    [_csrf, csrfCookie] = await setupCsrf(client);
  });

  it.each([null, "", "abc", "123", "abc@def"])(
    "should not register a user is email is %o",
    async (email) => {
      const userPayload = {
        email,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        password: faker.internet.password(),
      };

      const response = await client
        .post("/user")
        .set("Cookie", csrfCookie)
        .send(formPayload({ _csrf, ...userPayload }));

      const createdUsers = await prisma.user.findMany({});

      expect(response.status).toBe(302);
      expect(createdUsers).toHaveLength(0);
    }
  );

  it.each([null, ""])(
    "should not register a user without first name ",
    async (firstName) => {
      const userPayload = {
        email: faker.internet.email(),
        firstName,
        lastName: faker.person.lastName(),
        password: faker.internet.password(),
      };

      const response = await client
        .post("/user")
        .set("Cookie", csrfCookie)
        .send(formPayload({ _csrf, ...userPayload }));

      const createdUsers = await prisma.user.findMany({});

      expect(response.status).toBe(302);
      expect(createdUsers).toHaveLength(0);
    }
  );

  it.each([null, "", faker.string.alpha({ length: { min: 1, max: 7 } })])(
    "should not register a user if password is %o",
    async (password) => {
      const userPayload = {
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        password,
      };

      const response = await client
        .post("/user")
        .set("Cookie", csrfCookie)
        .send(formPayload({ _csrf, ...userPayload }));

      const createdUsers = await prisma.user.findMany({});

      expect(response.status).toBe(302);
      expect(createdUsers).toHaveLength(0);
    }
  );

  it("should register a user", async () => {
    const userPayload = {
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      password: faker.internet.password(),
    };

    const response = await client
      .post("/user")
      .set("Cookie", csrfCookie)
      .send(formPayload({ _csrf, ...userPayload }));

    const loginCookie = extractLoginCookie(response);
    const homeResponse = await client.get("/").set("Cookie", loginCookie);

    const createdUsers = await prisma.user.findMany({});
    const createdUser = await prisma.user.findUnique({
      where: { email: userPayload.email },
    });

    expect(response.status).toBe(302);
    expect(createdUsers).toHaveLength(1);
    expect(createdUser.email).toBe(userPayload.email);
    expect(createdUser.firstName).toBe(userPayload.firstName);
    expect(createdUser.lastName).toBe(userPayload.lastName);
    expect(createdUser.password).not.toBe(userPayload.password);
    expect(
      await verifyPassword(userPayload.password, createdUser.password)
    ).toBe(true);
    expect(homeResponse.status).toBe(200);
    expect(homeResponse.text).toContain(userPayload.firstName);
  });

  it("should register a user without lastName", async () => {
    const userPayload = {
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      password: faker.internet.password(),
    };

    const response = await client
      .post("/user")
      .set("Cookie", csrfCookie)
      .send(formPayload({ _csrf, ...userPayload }));

    const createdUsers = await prisma.user.findMany({});
    const createdUser = await prisma.user.findUnique({
      where: { email: userPayload.email },
    });

    expect(response.status).toBe(302);
    expect(createdUsers).toHaveLength(1);
    expect(createdUser.email).toBe(userPayload.email);
    expect(createdUser.firstName).toBe(userPayload.firstName);
    expect(createdUser.lastName).toBeNull();
    expect(createdUser.password).not.toBe(userPayload.password);
    expect(
      await verifyPassword(userPayload.password, createdUser.password)
    ).toBe(true);
  });

  it("should not register a user without csrf token", async () => {
    const userPayload = {
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      password: faker.internet.password(),
    };

    const response = await client.post("/user").send(formPayload(userPayload));

    const createdUsers = await prisma.user.findMany({});

    expect(response.status).toBe(403);
    expect(createdUsers).toHaveLength(0);
  });
});

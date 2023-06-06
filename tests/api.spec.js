import supertest from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import app from "../src/app.js";

import { userFactory } from "./factories.js";
import { getLoginCookie } from "./helpers.js";

const client = supertest(app);
describe("API", () => {
  beforeEach(async (ctx) => {
    ctx.user = await userFactory();
    ctx.loginCookie = await getLoginCookie(client, ctx.user);
  });

  it("Should search all users ", async (ctx) => {
    const users = await Promise.all([
      userFactory({
        firstName: "Doey",
      }),
      userFactory({
        lastName: "Doe",
      }),
      userFactory({
        email: "jodoer@example.com",
      }),
      userFactory(),
    ]);
    const response = await client
      .get("/api/user?search=doe")
      .set("Cookie", ctx.loginCookie);

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(3);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: users[0].id,
        }),
        expect.objectContaining({
          id: users[1].id,
        }),
        expect.objectContaining({
          id: users[2].id,
        }),
        expect.not.objectContaining({
          id: ctx.user.id,
        }),
        expect.not.objectContaining({
          id: users[3].id,
        }),
      ])
    );
    response.body.forEach((user) => {
      expect(user.password).toBeUndefined();
    });
  });
});

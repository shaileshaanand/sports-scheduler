import { describe, expect, it } from "vitest";

import checkEventOverlap from "../checkEventOverlap.js";

describe("checkEventOverlap", () => {
  it("returns true if two events overlap", () => {
    expect(
      checkEventOverlap([
        {
          startsAt: new Date("2021-01-01T10:00:00"),
          endsAt: new Date("2021-01-01T11:00:00"),
        },
        {
          startsAt: new Date("2021-01-01T10:30:00"),
          endsAt: new Date("2021-01-01T11:30:00"),
        },
      ])
    ).not.toBe(false);
  });

  it("returns false if two events don't overlap", () => {
    expect(
      checkEventOverlap([
        {
          startsAt: new Date("2021-01-01T10:00:00"),
          endsAt: new Date("2021-01-01T11:00:00"),
        },
        {
          startsAt: new Date("2021-01-01T11:00:00"),
          endsAt: new Date("2021-01-01T12:00:00"),
        },
      ])
    ).toBe(false);
  });

  it("returns false if multiple events overlap", () => {
    expect(
      checkEventOverlap([
        {
          startsAt: new Date("2021-01-01T10:00:00"),
          endsAt: new Date("2021-01-01T11:00:00"),
        },
        {
          startsAt: new Date("2021-01-01T10:30:00"),
          endsAt: new Date("2021-01-01T11:30:00"),
        },
        {
          startsAt: new Date("2021-01-01T11:00:00"),
          endsAt: new Date("2021-01-01T12:00:00"),
        },
      ])
    ).not.toBe(false);
  });

  it("returns false if multiple events don't overlap", () => {
    expect(
      checkEventOverlap([
        {
          startsAt: new Date("2021-01-01T10:00:00"),
          endsAt: new Date("2021-01-01T10:30:00"),
        },
        {
          startsAt: new Date("2021-01-01T11:00:00"),
          endsAt: new Date("2021-01-01T11:30:00"),
        },
        {
          startsAt: new Date("2021-01-01T12:00:00"),
          endsAt: new Date("2021-01-01T13:00:00"),
        },
      ])
    ).toBe(false);
  });
});

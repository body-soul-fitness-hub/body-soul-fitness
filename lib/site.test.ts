import { describe, expect, it } from "vitest";
import { getSiteUrl } from "./site";

describe("getSiteUrl", () => {
  it("uses the public Body & Soul domain by default", () => {
    expect(getSiteUrl()).toBe("https://www.bodyandsoul.co.in");
  });
});

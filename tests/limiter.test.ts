import { rateLimiter } from "../src/limiter";

describe("RateLimiter basics", () => {
  beforeEach(() => {
    rateLimiter.configure({ global: { read: 2, windowMs: 50 } });
  });

  it("allows up to the configured global read count", async () => {
    await expect(
      rateLimiter.register("read", "users/1")
    ).resolves.toBeUndefined();
    await expect(
      rateLimiter.register("read", "users/2")
    ).resolves.toBeUndefined();
  });

  it("throws on exceeding the limit", async () => {
    await rateLimiter.register("read", "users/1");
    await rateLimiter.register("read", "users/2");
    await expect(rateLimiter.register("read", "users/3")).rejects.toThrow();
  });
});

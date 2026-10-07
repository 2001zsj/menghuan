import { it, expect } from "vitest";
import { YucNodeAcquisition } from "./yuc-fetch.js";
import { observeLocalReal } from "./local-real-observation.js";
const scope = () => ({
  id: "30000000-0000-4000-8000-000000000001",
  purpose: "local-noncommercial-evaluation",
  dataNature: "real",
  approvedPage: "https://yuc.wiki/202610/",
  createdAt: new Date(Date.now() - 1000).toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  enabled: false,
  publicDisplay: false,
  actor: "Codex engineering review",
});
it("mocked transport restriction or malformed DOM stops without a second request", async () => {
  for (const body of [
    "<title>Just a moment</title><div>challenge</div>",
    "<main>unrecognized layout</main>",
  ]) {
    let requests = 0;
    const acquisition = new YucNodeAcquisition({
      enabled: true,
      wire: async () => {
        requests++;
        return {
          status: 200,
          headers: { "content-type": "text/html" },
          body: (async function* () {
            yield Buffer.from(body);
          })(),
          close() {},
        };
      },
    });
    await expect(observeLocalReal(acquisition, scope())).rejects.toThrow();
    await expect(observeLocalReal(acquisition, scope())).rejects.toThrow();
    expect(requests).toBe(1);
  }
});
it("invalid local scope makes zero wire calls", async () => {
  let requests = 0;
  const a = new YucNodeAcquisition({
    enabled: true,
    wire: async () => {
      requests++;
      throw new Error("must not call");
    },
  });
  await expect(observeLocalReal(a, { ...scope(), publicDisplay: true })).rejects.toThrow();
  expect(requests).toBe(0);
});
